import assert from "node:assert/strict";
import { test } from "node:test";
import { ProviderRejectedError, type ProviderRefund } from "../integrations/payment/types";
import {
  advanceRefundAttempt,
  applyProviderRefund,
  refundIdempotencyKey,
  type RefundAttemptPatch,
  type RefundAttemptRecord,
  type RefundAttemptStore,
} from "./refundsCore";
import { REFUND_PROCESSOR, refundableMinor } from "./refunds";

const provider = { code: "pp_stripe", adapter: "stripe" as const, config: {} };

function newAttempt(overrides: Partial<RefundAttemptRecord> = {}): RefundAttemptRecord {
  return {
    id: "att_1", refundId: "ref_1", amountMinor: 5000, currencyCode: "usd", status: "pending",
    providerReference: "pi_test_1", providerRefundId: "", attemptCount: 0, submitStartedAt: null, needsReview: false,
    ...overrides,
  };
}

/** In-memory store + fake processor that records every call, so tests can count real refunds. */
function harness(options: {
  submit?: (call: { idempotencyKey: string; amount?: number }) => Promise<any>;
  lookup?: (call: { providerRefundId?: string | null; attemptId: string }) => Promise<ProviderRefund | null>;
  attempt?: Partial<RefundAttemptRecord>;
  noLookup?: boolean;
} = {}) {
  const state = { attempt: newAttempt(options.attempt), settled: [] as string[], failed: [] as string[] };
  const provider$ = { refunds: new Map<string, ProviderRefund>(), submitCalls: 0, lookupCalls: 0, order: [] as string[] };
  const store: RefundAttemptStore = {
    async patch(_id: string, patch: RefundAttemptPatch) { state.attempt = { ...state.attempt, ...patch } as RefundAttemptRecord; },
    async settleSucceeded(_a, providerRefundId) { if (state.attempt.status === "succeeded") return; state.attempt = { ...state.attempt, status: "succeeded", providerRefundId }; state.settled.push(providerRefundId); },
    async settleFailed(_a, reason) { if (state.attempt.status === "failed") return; state.attempt = { ...state.attempt, status: "failed" }; state.failed.push(reason); },
  };
  const adapter = {
    async refund(input: any) {
      provider$.submitCalls += 1;
      provider$.order.push("submit");
      if (options.submit) return options.submit({ idempotencyKey: input.idempotencyKey, amount: input.amount });
      // Stripe semantics: the same idempotency key returns the same refund, so it can never create a second one.
      const existing = provider$.refunds.get(input.idempotencyKey);
      const refund = existing ?? { providerRefundId: `re_${provider$.refunds.size + 1}`, status: "succeeded" as const, amount: input.amount, currency: "usd" };
      provider$.refunds.set(input.idempotencyKey, refund);
      return { status: "refunded", providerReference: input.providerReference, amount: refund.amount, currency: refund.currency, data: { refundId: refund.providerRefundId, status: refund.status } };
    },
    ...(options.noLookup ? {} : {
      async getRefundStatus(input: any) {
        provider$.lookupCalls += 1;
        provider$.order.push("lookup");
        if (options.lookup) return options.lookup(input);
        return [...provider$.refunds.values()][0] ?? null;
      },
    }),
  };
  return { state, provider$, deps: { adapter: adapter as any, provider, store, now: () => new Date("2026-10-29T12:00:00Z") } };
}

test("provider key is refund:<refundId> and stays the same for the whole attempt", async () => {
  assert.equal(refundIdempotencyKey("ref_1"), "refund:ref_1");
  const keys: string[] = [];
  const h = harness({ submit: async ({ idempotencyKey }) => { keys.push(idempotencyKey); throw new Error("socket hang up"); }, lookup: async () => null });
  await advanceRefundAttempt(h.deps, h.state.attempt); // submit → ambiguous
  await advanceRefundAttempt(h.deps, h.state.attempt); // lookup finds nothing → resubmit with the same key
  assert.deepEqual(keys, ["refund:ref_1", "refund:ref_1"]);
});

test("a pending attempt submits once and settles on success; reprocessing it is a no-op", async () => {
  const h = harness();
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "succeeded");
  assert.deepEqual(h.state.settled, ["re_1"]);
  assert.equal(h.provider$.submitCalls, 1);
  assert.equal(h.provider$.lookupCalls, 0, "a first attempt has nothing to re-query");
  // Processing the same (now terminal) attempt again — e.g. a webhook raced the worker — does nothing.
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "skipped");
  assert.equal(h.provider$.submitCalls, 1);
  assert.deepEqual(h.state.settled, ["re_1"]);
});

test("idempotent: a duplicate settle for the same provider refund does not apply twice", async () => {
  const h = harness();
  const found: ProviderRefund = { providerRefundId: "re_1", status: "succeeded", amount: 5000, currency: "usd" };
  assert.equal(await applyProviderRefund(h.deps, h.state.attempt, found), "succeeded");
  assert.equal(await applyProviderRefund(h.deps, h.state.attempt, found), "skipped");
  assert.deepEqual(h.state.settled, ["re_1"]);
});

test("unknown result never double-refunds: the provider is re-queried BEFORE any resubmit", async () => {
  let reachedProvider = 0;
  const h = harness({
    // The request reached Stripe and created the refund, but the response was lost.
    submit: async ({ amount }) => { reachedProvider += 1; h.provider$.refunds.set("k", { providerRefundId: "re_77", status: "succeeded", amount: amount!, currency: "usd" }); throw new Error("ETIMEDOUT"); },
    lookup: async () => h.provider$.refunds.get("k") ?? null,
  });
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "unknown");
  assert.equal(h.state.attempt.status, "unknown");
  assert.notEqual(h.state.attempt.submitStartedAt, null, "intent is persisted before the provider call");

  // Second processing: must look first, find re_77, and settle without a second submit.
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "succeeded");
  assert.equal(reachedProvider, 1, "only one request ever reached the provider");
  assert.deepEqual(h.provider$.order, ["submit", "lookup"]);
  assert.deepEqual(h.state.settled, ["re_77"]);
});

test("a crash after the provider call (nothing recorded but submitStartedAt) is recovered by lookup, not resend", async () => {
  const h = harness({ attempt: { status: "pending", submitStartedAt: new Date("2026-10-29T11:59:00Z"), attemptCount: 1 }, lookup: async () => ({ providerRefundId: "re_9", status: "succeeded", amount: 5000, currency: "usd" }) });
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "succeeded");
  assert.equal(h.provider$.submitCalls, 0);
  assert.deepEqual(h.state.settled, ["re_9"]);
});

test("if the lookup itself fails the outcome stays unknown and nothing is resubmitted", async () => {
  const h = harness({ attempt: { status: "unknown", submitStartedAt: new Date("2026-10-29T11:59:00Z"), attemptCount: 1 }, lookup: async () => { throw new Error("stripe 503"); } });
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "unknown");
  assert.equal(h.provider$.submitCalls, 0);
  assert.equal(h.state.attempt.status, "unknown");
});

test("an adapter that cannot read refund status is parked rather than risking a double refund", async () => {
  const h = harness({ noLookup: true, attempt: { status: "unknown", submitStartedAt: new Date("2026-10-29T11:59:00Z"), attemptCount: 1 } });
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "needs_review");
  assert.equal(h.provider$.submitCalls, 0);
  assert.equal(h.state.attempt.needsReview, true);
});

test("definitive provider rejection fails the refund so the amount becomes refundable again", async () => {
  const h = harness({ submit: async () => { throw new ProviderRejectedError("charge already fully refunded", "charge_already_refunded"); } });
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "failed");
  assert.equal(h.state.attempt.status, "failed");
  assert.match(h.state.failed[0], /already fully refunded/);
});

test("amount mismatch: a provider refund for a different amount is never applied", async () => {
  const h = harness();
  const step = await applyProviderRefund(h.deps, h.state.attempt, { providerRefundId: "re_x", status: "succeeded", amount: 4999, currency: "usd" });
  assert.equal(step, "needs_review");
  assert.equal(h.state.settled.length, 0);
  assert.equal(h.state.attempt.needsReview, true);
  assert.match(h.state.attempt.lastError ?? "", /expected 5000/);
});

test("currency mismatch is parked for review too", async () => {
  const h = harness();
  assert.equal(await applyProviderRefund(h.deps, h.state.attempt, { providerRefundId: "re_x", status: "succeeded", amount: 5000, currency: "eur" }), "needs_review");
  assert.equal(h.state.settled.length, 0);
});

test("a submit result with the wrong amount is parked, not applied", async () => {
  const h = harness({ submit: async () => ({ status: "refunded", providerReference: "pi_test_1", amount: 1, currency: "usd", data: { refundId: "re_bad", status: "succeeded" } }) });
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "needs_review");
  assert.equal(h.state.settled.length, 0);
});

test("a webhook for a different provider refund id than the one already recorded is parked", async () => {
  const h = harness({ attempt: { status: "submitted", providerRefundId: "re_1", submitStartedAt: new Date(), attemptCount: 1 } });
  assert.equal(await applyProviderRefund(h.deps, h.state.attempt, { providerRefundId: "re_2", status: "succeeded", amount: 5000, currency: "usd" }), "needs_review");
  assert.equal(h.state.settled.length, 0);
});

test("pending at the provider keeps the attempt submitted; a later signed 'failed' makes it refundable again", async () => {
  const h = harness({ submit: async () => ({ status: "pending", providerReference: "pi_test_1", amount: 5000, currency: "usd", data: { refundId: "re_5", status: "pending" } }) });
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "submitted");
  assert.equal(h.state.attempt.status, "submitted");
  assert.equal(h.state.attempt.providerRefundId, "re_5");
  assert.equal(await applyProviderRefund(h.deps, h.state.attempt, { providerRefundId: "re_5", status: "failed", amount: 5000, currency: "usd", failureReason: "expired_or_canceled_card" }), "failed");
  assert.match(h.state.failed[0], /expired_or_canceled_card/);
});

test("a refund recorded as succeeded is never silently reversed by a later failed event", async () => {
  const h = harness({ attempt: { status: "succeeded", providerRefundId: "re_1" } });
  assert.equal(await applyProviderRefund(h.deps, h.state.attempt, { providerRefundId: "re_1", status: "failed", amount: 5000, currency: "usd" }), "needs_review");
});

test("attempts stop after the retry budget and are parked", async () => {
  const h = harness({ attempt: { status: "unknown", attemptCount: 8, submitStartedAt: new Date() } });
  assert.equal(await advanceRefundAttempt(h.deps, h.state.attempt), "needs_review");
  assert.equal(h.provider$.submitCalls, 0);
});

test("refundable amount excludes pending and completed refunds but not failed ones", () => {
  assert.equal(refundableMinor(10000, []), 10000);
  assert.equal(refundableMinor(10000, [{ amountMinor: 4000, status: "pending" }]), 6000);
  assert.equal(refundableMinor(10000, [{ amountMinor: 4000, status: "completed" }, { amountMinor: 6000, status: "pending" }]), 0);
  assert.equal(refundableMinor(10000, [{ amountMinor: 4000, status: "failed" }]), 10000);
});

test("the Stripe install guard is satisfied only by the registered refund processor", () => {
  assert.equal(REFUND_PROCESSOR.registered, true);
  assert.equal(REFUND_PROCESSOR.processor, "processRefunds");
  assert.ok(REFUND_PROCESSOR.reconcilesWebhooks.includes("refund.updated"));
  assert.ok(REFUND_PROCESSOR.reconcilesWebhooks.includes("charge.refunded"));
});
