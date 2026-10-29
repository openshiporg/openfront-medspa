import {
  ProviderRejectedError,
  type PaymentAdapter,
  type PaymentProviderConfig,
  type ProviderRefund,
} from "../integrations/payment/types";

/**
 * Refund outbox state machine (pure: no database, no framework).
 *
 *   pending ──submit──▶ submitted ──provider settles──▶ succeeded | failed
 *      │                    │
 *      └── ambiguous ──▶ unknown ──re-query──▶ (found: follow provider) | (absent: resubmit, same key)
 *
 * Rules:
 *  - The provider key is `refund:<refundId>` and never changes for an attempt.
 *  - Once `submitStartedAt` is set the provider is ALWAYS re-queried before any further submit.
 *  - Only a lookup that definitively finds nothing allows a resubmit; a failed lookup stays unknown.
 *  - A provider result that disagrees with our amount or currency parks the attempt for review.
 */

export type RefundAttemptStatus = "pending" | "submitted" | "succeeded" | "failed" | "unknown";

export interface RefundAttemptRecord {
  id: string;
  refundId: string;
  amountMinor: number;
  currencyCode: string;
  status: RefundAttemptStatus;
  providerReference: string;
  providerRefundId: string;
  attemptCount: number;
  submitStartedAt: Date | null;
  needsReview: boolean;
  lastError?: string;
}

export type RefundAttemptPatch = Partial<{
  status: RefundAttemptStatus;
  providerRefundId: string;
  attemptCount: number;
  submitStartedAt: Date | null;
  nextAttemptAt: Date | null;
  needsReview: boolean;
  lastError: string;
}>;

export interface RefundAttemptStore {
  patch(attemptId: string, patch: RefundAttemptPatch): Promise<void>;
  /** Atomically: attempt → succeeded, Refund → completed, Payment/session/appointment projections. Idempotent. */
  settleSucceeded(attempt: RefundAttemptRecord, providerRefundId: string): Promise<void>;
  /** Atomically: attempt → failed, Refund → failed. The reserved amount becomes refundable again. */
  settleFailed(attempt: RefundAttemptRecord, reason: string): Promise<void>;
}

export interface RefundOutboxDeps {
  adapter: Pick<PaymentAdapter, "refund" | "getRefundStatus">;
  provider: PaymentProviderConfig;
  store: RefundAttemptStore;
  now?: () => Date;
}

export type RefundStep =
  | "skipped"
  | "succeeded"
  | "failed"
  | "submitted"
  | "unknown"
  | "needs_review";

export const MAX_REFUND_ATTEMPTS = 8;
const SUBMITTED_RECHECK_MS = 5 * 60_000;

export function refundIdempotencyKey(refundId: string) {
  return `refund:${refundId}`;
}

export function refundBackoffMs(attemptCount: number) {
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attemptCount));
}

const terminal = (status: RefundAttemptStatus) => status === "succeeded" || status === "failed";

async function park(deps: RefundOutboxDeps, attempt: RefundAttemptRecord, reason: string): Promise<RefundStep> {
  await deps.store.patch(attempt.id, { status: "unknown", needsReview: true, lastError: reason.slice(0, 500), nextAttemptAt: null });
  return "needs_review";
}

/**
 * Applies what the provider says about this refund. Used by the worker (after a submit or a lookup)
 * and by the signed `refund.updated` webhook, so every path converges on the same rules.
 */
export async function applyProviderRefund(deps: RefundOutboxDeps, attempt: RefundAttemptRecord, found: ProviderRefund): Promise<RefundStep> {
  const now = (deps.now ?? (() => new Date()))();
  if (found.amount !== attempt.amountMinor || found.currency.toLowerCase() !== attempt.currencyCode.toLowerCase()) {
    return park(deps, attempt, `Provider refund ${found.providerRefundId} is ${found.amount} ${found.currency}; expected ${attempt.amountMinor} ${attempt.currencyCode}`);
  }
  if (attempt.providerRefundId && attempt.providerRefundId !== found.providerRefundId) {
    return park(deps, attempt, `Provider returned refund ${found.providerRefundId}, attempt already holds ${attempt.providerRefundId}`);
  }

  if (attempt.status === "succeeded") {
    // A later failure of a refund we already marked paid cannot be undone automatically.
    if (found.status === "failed" || found.status === "canceled") return park(deps, attempt, `Provider reports refund ${found.providerRefundId} ${found.status} after it was recorded as succeeded`);
    return "skipped";
  }
  if (attempt.status === "failed") {
    if (found.status === "succeeded" || found.status === "pending") return park(deps, attempt, `Provider reports refund ${found.providerRefundId} ${found.status} after it was recorded as failed`);
    return "skipped";
  }

  if (found.status === "succeeded") {
    await deps.store.settleSucceeded(attempt, found.providerRefundId);
    return "succeeded";
  }
  if (found.status === "failed" || found.status === "canceled") {
    await deps.store.settleFailed(attempt, found.failureReason || `Provider ${found.status}`);
    return "failed";
  }
  await deps.store.patch(attempt.id, {
    status: "submitted",
    providerRefundId: found.providerRefundId,
    lastError: "",
    nextAttemptAt: new Date(now.getTime() + SUBMITTED_RECHECK_MS),
  });
  return "submitted";
}

/** Moves one claimed attempt as far as it can go right now. */
export async function advanceRefundAttempt(deps: RefundOutboxDeps, attempt: RefundAttemptRecord): Promise<RefundStep> {
  const now = (deps.now ?? (() => new Date()))();
  if (terminal(attempt.status) || attempt.needsReview) return "skipped";

  if (attempt.attemptCount >= MAX_REFUND_ATTEMPTS) {
    return park(deps, attempt, "Too many attempts without a confirmed provider outcome");
  }

  const backoff = (count: number) => new Date(now.getTime() + refundBackoffMs(count));
  const mustRequery = attempt.submitStartedAt !== null || attempt.status !== "pending" || Boolean(attempt.providerRefundId);

  if (mustRequery) {
    if (!deps.adapter.getRefundStatus) return park(deps, attempt, "Provider cannot report refund status, so a resubmit could double-refund");
    let found: ProviderRefund | null;
    try {
      found = await deps.adapter.getRefundStatus({
        provider: deps.provider,
        providerReference: attempt.providerReference,
        providerRefundId: attempt.providerRefundId || null,
        attemptId: attempt.id,
      });
    } catch (error) {
      await deps.store.patch(attempt.id, { status: "unknown", lastError: describe(error), nextAttemptAt: backoff(attempt.attemptCount) });
      return "unknown";
    }
    if (found) return applyProviderRefund(deps, attempt, found);
    // The provider has no refund for this attempt: submitting again (same key) cannot double-refund.
  }

  // Persist intent BEFORE the provider call, so a crash after the call is recovered by a re-query.
  const attemptCount = attempt.attemptCount + 1;
  await deps.store.patch(attempt.id, { submitStartedAt: now, attemptCount });
  attempt = { ...attempt, submitStartedAt: now, attemptCount };

  let result;
  try {
    result = await deps.adapter.refund({
      provider: deps.provider,
      providerReference: attempt.providerReference,
      amount: attempt.amountMinor,
      currency: attempt.currencyCode,
      idempotencyKey: refundIdempotencyKey(attempt.refundId),
      metadata: { refundAttemptId: attempt.id, refundId: attempt.refundId },
    });
  } catch (error) {
    if (error instanceof ProviderRejectedError || (error as { definitive?: boolean })?.definitive === true) {
      await deps.store.settleFailed(attempt, describe(error));
      return "failed";
    }
    // Timeout, connection reset, 5xx: the provider may or may not have acted.
    await deps.store.patch(attempt.id, { status: "unknown", lastError: describe(error), nextAttemptAt: backoff(attemptCount) });
    return "unknown";
  }

  const data = (result.data || {}) as { refundId?: unknown; status?: unknown; failureReason?: unknown };
  const providerRefundId = typeof data.refundId === "string" ? data.refundId : "";
  if (!providerRefundId) return park(deps, attempt, "Provider accepted the refund without returning a refund id");
  return applyProviderRefund(deps, attempt, {
    providerRefundId,
    status: typeof data.status === "string" ? normalizeStatus(data.status) : "pending",
    amount: Number(result.amount),
    currency: String(result.currency ?? attempt.currencyCode),
    failureReason: typeof data.failureReason === "string" ? data.failureReason : null,
  });
}

function normalizeStatus(value: string): ProviderRefund["status"] {
  return value === "succeeded" || value === "failed" || value === "canceled" || value === "requires_action" ? value : "pending";
}

function describe(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}
