import type { Context } from ".keystone/types";
import { getPaymentAdapter, type ProviderRefund, type PaymentWebhookRefund } from "../integrations/payment";
import { paymentProviderFromRecord } from "./utils/paymentProviderAdapter";
import { assertPaymentTransition, paymentRecordStatus, type PaymentLifecycleStatus } from "./payment-lifecycle";
import {
  advanceRefundAttempt,
  applyProviderRefund,
  refundIdempotencyKey,
  type RefundAttemptPatch,
  type RefundAttemptRecord,
  type RefundAttemptStore,
  type RefundStep,
} from "./refundOutboxCore";

/**
 * Registered marker the PaymentProvider guard checks before a processor-backed adapter may be installed.
 * It is a code constant (not a flag): it exists only because the processor, the claim lease, the
 * webhook reconciliation and the dashboard retry below are all wired.
 */
export const REFUND_OUTBOX_PROCESSOR = Object.freeze({
  registered: true as const,
  processor: "processRefundOutbox",
  reconcilesWebhooks: ["refund.created", "refund.updated", "refund.failed", "charge.refunded"] as const,
});

const LEASE_SECONDS = 120;
const DEFAULT_BATCH = 10;

type Sudo = ReturnType<Context["sudo"]>;

const ATTEMPT_QUERY = "id idempotencyKey amountMinor currencyCode status providerReference providerRefundId attemptCount submitStartedAt needsReview refund { id } paymentSession { id } practice { id }";

function toRecord(row: any): RefundAttemptRecord {
  return {
    id: row.id,
    refundId: row.refund?.id ?? "",
    amountMinor: Number(row.amountMinor),
    currencyCode: String(row.currencyCode || ""),
    status: row.status,
    providerReference: row.providerReference || "",
    providerRefundId: row.providerRefundId || "",
    attemptCount: Number(row.attemptCount || 0),
    submitStartedAt: row.submitStartedAt ? new Date(row.submitStartedAt) : null,
    needsReview: row.needsReview === true,
  };
}

/** Money already promised to the provider (pending or completed refunds); failed ones are refundable again. */
export function refundableMinor(totalMinor: number, refunds: ReadonlyArray<{ amountMinor: number | null; status: string | null }>) {
  const reserved = refunds.filter(r => r.status === "pending" || r.status === "completed").reduce((sum, r) => sum + Number(r.amountMinor || 0), 0);
  return Math.max(0, totalMinor - reserved);
}

export interface RequestRefundInput {
  practiceId: string;
  paymentId: string;
  sessionId: string;
  amountMinor: number;
  currencyCode: string;
  reason: string;
  /** Caller-scoped key; replays return the same Refund. */
  idempotencyKey: string;
  providerReference: string;
  actorId: string | null;
}

/**
 * Writes the Refund and its outbox attempt. Call inside the caller's serializable transaction so both
 * commit together or not at all. No provider call happens here.
 */
export async function enqueueRefund(sudo: Sudo, input: RequestRefundInput) {
  const existing = (await sudo.query.Refund.findMany({
    where: { practice: { id: { equals: input.practiceId } }, idempotencyKey: { equals: input.idempotencyKey } },
    take: 1, query: "id status payment { id } attempt { id }",
  }))[0];
  if (existing) {
    if (existing.payment?.id !== input.paymentId) throw new Error("Idempotency key was already used for another operation");
    return { refundId: existing.id, attemptId: existing.attempt?.id ?? null, replayed: true };
  }
  const refund = await sudo.query.Refund.createOne({
    data: {
      practice: { connect: { id: input.practiceId } }, payment: { connect: { id: input.paymentId } },
      amountMinor: input.amountMinor, currencyCode: input.currencyCode.toUpperCase(), reason: input.reason,
      idempotencyKey: input.idempotencyKey, providerReference: input.providerReference, status: "pending",
      data: { method: "processor", actorId: input.actorId },
    },
    query: "id",
  });
  const attempt = await sudo.query.RefundAttempt.createOne({
    data: {
      practice: { connect: { id: input.practiceId } }, paymentSession: { connect: { id: input.sessionId } },
      idempotencyKey: refundIdempotencyKey(refund.id), amountMinor: input.amountMinor, currencyCode: input.currencyCode.toLowerCase(),
      status: "pending", providerReference: input.providerReference,
    },
    query: "id",
  });
  await sudo.query.Refund.updateOne({ where: { id: refund.id }, data: { attempt: { connect: { id: attempt.id } } }, query: "id" });
  return { refundId: refund.id, attemptId: attempt.id, replayed: false };
}

export async function paymentLifecycleTransaction<T>(context: Context, lockKey: string, work: (sudo: Sudo) => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await context.transaction(async (tx: Context) => {
        await tx.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", "medspa-payment-lifecycle", lockKey);
        return work(tx.sudo());
      }, { maxWait: 5_000, timeout: 30_000, isolationLevel: "Serializable" as any });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = error?.code === "P2034" || error?.extensions?.prisma?.code === "P2034" || /write conflict|deadlock|please retry your transaction/i.test(message);
      if (!retryable || attempt === 3) throw error;
    }
  }
  throw new Error("Refund transaction retry exhausted");
}

function createStore(context: Context): RefundAttemptStore {
  const sudoRoot = context.sudo();
  return {
    async patch(attemptId: string, patch: RefundAttemptPatch) {
      await sudoRoot.query.RefundAttempt.updateOne({ where: { id: attemptId }, data: patch as any, query: "id" });
    },

    async settleSucceeded(attempt, providerRefundId) {
      const row = await sudoRoot.query.RefundAttempt.findOne({ where: { id: attempt.id }, query: "paymentSession { id }" });
      const sessionId = row?.paymentSession?.id;
      if (!sessionId) throw new Error("Refund attempt has no payment session");
      await paymentLifecycleTransaction(context, `session:${sessionId}`, async sudo => {
        const current = await sudo.query.RefundAttempt.findOne({ where: { id: attempt.id }, query: "status" });
        if (current?.status === "succeeded") return; // idempotent: a webhook and the worker may both arrive
        const session = await sudo.query.PaymentSession.findOne({
          where: { id: sessionId },
          query: "id status amount data payment { id refundedAmount totalAmount } appointment { id }",
        });
        if (!session?.payment) throw new Error("Payment session not found");
        const now = new Date().toISOString();
        const cumulative = Number(session.payment.refundedAmount || 0) + attempt.amountMinor;
        if (cumulative > Number(session.amount)) throw new Error("Refund exceeds the captured payment");
        const target: PaymentLifecycleStatus = cumulative < Number(session.amount) ? "partially_refunded" : "refunded";
        assertPaymentTransition(session.status as PaymentLifecycleStatus, target);
        await sudo.query.RefundAttempt.updateOne({ where: { id: attempt.id }, data: { status: "succeeded", providerRefundId, completedAt: now, lastError: "", nextAttemptAt: null, needsReview: false }, query: "id" });
        await sudo.query.Refund.updateOne({ where: { id: attempt.refundId }, data: { status: "completed", processedAt: now, providerReference: providerRefundId }, query: "id" });
        const data = session.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
        await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: target, refundedAt: now, data: { ...data, lastRefundId: providerRefundId } }, query: "id" });
        const refund = await sudo.query.Refund.findOne({ where: { id: attempt.refundId }, query: "reason" });
        await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: paymentRecordStatus(target), refundedAmount: cumulative, refundReason: refund?.reason || "", refundedAt: now }, query: "id" });
        if (data.purpose === "appointment_deposit" && target === "refunded" && session.appointment?.id) {
          await sudo.query.Appointment.updateOne({ where: { id: session.appointment.id }, data: { depositPaid: false }, query: "id" });
        }
      });
    },

    async settleFailed(attempt, reason) {
      await paymentLifecycleTransaction(context, `refund:${attempt.refundId}`, async sudo => {
        const current = await sudo.query.RefundAttempt.findOne({ where: { id: attempt.id }, query: "status" });
        if (current?.status === "failed" || current?.status === "succeeded") return;
        const now = new Date().toISOString();
        await sudo.query.RefundAttempt.updateOne({ where: { id: attempt.id }, data: { status: "failed", completedAt: now, lastError: reason.slice(0, 500), nextAttemptAt: null }, query: "id" });
        await sudo.query.Refund.updateOne({ where: { id: attempt.refundId }, data: { status: "failed", processedAt: now }, query: "id" });
      });
    },
  };
}

async function loadProvider(sudo: Sudo, sessionId: string) {
  const session = await sudo.query.PaymentSession.findOne({ where: { id: sessionId }, query: "provider { id code adapter config isInstalled }" });
  const provider = session?.provider;
  if (!provider) throw new Error("Payment provider is unavailable");
  return paymentProviderFromRecord(provider as { code: string; adapter: string; config?: unknown });
}

/** Leases up to `limit` due attempts. A crashed worker's lease simply expires. */
async function claimAttempts(context: Context, limit: number, attemptIds?: string[]): Promise<string[]> {
  const rows = await context.sudo().prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `UPDATE "RefundAttempt" SET "leaseUntil" = now() + ($1 || ' seconds')::interval
     WHERE id IN (
       SELECT id FROM "RefundAttempt"
       WHERE status IN ('pending','submitted','unknown') AND "needsReview" = false
         AND "nextAttemptAt" IS NOT NULL AND "nextAttemptAt" <= now()
         AND ("leaseUntil" IS NULL OR "leaseUntil" < now())
         AND ($3::text[] IS NULL OR id = ANY($3::text[]))
       ORDER BY "nextAttemptAt" ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED
     ) RETURNING id`,
    String(LEASE_SECONDS), limit, attemptIds ?? null,
  );
  return rows.map(row => row.id);
}

export interface RefundOutboxSummary { claimed: number; results: Record<string, RefundStep | "error"> }

/**
 * Worker: claims due attempts under a lease and advances each one. Safe to run concurrently and
 * repeatedly; an unknown outcome is re-queried before it can ever be resubmitted.
 */
export async function processRefundOutbox(context: Context, options: { limit?: number; attemptIds?: string[] } = {}): Promise<RefundOutboxSummary> {
  const ids = await claimAttempts(context, options.limit ?? DEFAULT_BATCH, options.attemptIds);
  const results: RefundOutboxSummary["results"] = {};
  const sudo = context.sudo();
  const store = createStore(context);
  for (const id of ids) {
    try {
      const row = await sudo.query.RefundAttempt.findOne({ where: { id }, query: ATTEMPT_QUERY });
      if (!row?.paymentSession?.id || !row.refund?.id) { results[id] = "skipped"; continue; }
      const provider = await loadProvider(sudo, row.paymentSession.id);
      const adapter = await getPaymentAdapter(provider);
      results[id] = await advanceRefundAttempt({ adapter, provider, store }, toRecord(row));
    } catch (error) {
      console.error("Refund outbox attempt failed", id, error instanceof Error ? error.message : error);
      results[id] = "error";
      await sudo.query.RefundAttempt.updateOne({ where: { id }, data: { lastError: (error instanceof Error ? error.message : String(error)).slice(0, 500), nextAttemptAt: new Date(Date.now() + 60_000).toISOString() }, query: "id" }).catch(() => undefined);
    } finally {
      await sudo.query.RefundAttempt.updateOne({ where: { id }, data: { leaseUntil: null }, query: "id" }).catch(() => undefined);
    }
  }
  return { claimed: ids.length, results };
}

/** Dashboard "Retry refunds": make this practice's open attempts due now, then process them. */
export async function retryPracticeRefunds(context: Context, practiceId: string): Promise<RefundOutboxSummary> {
  await context.sudo().prisma.$executeRawUnsafe(
    `UPDATE "RefundAttempt" SET "nextAttemptAt" = now()
     WHERE "practice" = $1 AND status IN ('pending','submitted','unknown') AND "needsReview" = false AND ("leaseUntil" IS NULL OR "leaseUntil" < now())`,
    practiceId,
  );
  const open = await context.sudo().query.RefundAttempt.findMany({
    where: { practice: { id: { equals: practiceId } }, status: { in: ["pending", "submitted", "unknown"] }, needsReview: { equals: false } },
    take: 50, query: "id",
  });
  return processRefundOutbox(context, { limit: 50, attemptIds: open.map(row => row.id) });
}

/**
 * Applies a signed provider refund event to the matching attempt. Correlates by our attempt id
 * (stamped on the refund as metadata) or by the provider refund id; never by amount alone.
 */
export async function reconcileRefundFromWebhook(context: Context, providerCode: string, event: PaymentWebhookRefund): Promise<"applied" | "unmatched"> {
  const sudo = context.sudo();
  const where = event.attemptId
    ? { id: { equals: event.attemptId } }
    : { providerRefundId: { equals: event.providerRefundId } };
  const row = (await sudo.query.RefundAttempt.findMany({ where, take: 1, query: ATTEMPT_QUERY }))[0];
  if (!row?.paymentSession?.id || !row.refund?.id) return "unmatched";
  // The event must belong to the payment this attempt refunds.
  if (event.providerReference && row.providerReference && event.providerReference !== row.providerReference) return "unmatched";
  const session = await sudo.query.PaymentSession.findOne({ where: { id: row.paymentSession.id }, query: "provider { code }" });
  if (session?.provider?.code !== providerCode) return "unmatched";
  const found: ProviderRefund = { providerRefundId: event.providerRefundId, status: event.status, amount: event.amount, currency: event.currency };
  const provider = await loadProvider(sudo, row.paymentSession.id);
  const adapter = await getPaymentAdapter(provider);
  await applyProviderRefund({ adapter, provider, store: createStore(context) }, toRecord(row), found);
  return "applied";
}

/** `charge.refunded` only says "something was refunded": make that payment's open attempts due for a re-query. */
export async function signalRefundRecheck(context: Context, providerReference: string): Promise<number> {
  const count = await context.sudo().prisma.$executeRawUnsafe(
    `UPDATE "RefundAttempt" SET "nextAttemptAt" = now() WHERE "providerReference" = $1 AND status IN ('submitted','unknown') AND "needsReview" = false`,
    providerReference,
  );
  if (count > 0) await processRefundOutbox(context, { limit: 10 });
  return count;
}
