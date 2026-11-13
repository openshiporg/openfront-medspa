import { randomUUID } from "node:crypto";
import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { stripeConfigured } from "../integrations/payment/stripe";
import { assertActiveActor } from "./workflowAuth";
import { validGuestAccessToken } from "./lib/guestAccess";
import { trustedOrigin } from "./lib/trustedOrigin";
import { assertPaymentTransition, paymentRecordStatus, type PaymentLifecycleStatus } from "./payment-lifecycle";
import { createProviderCheckout, getProviderCheckoutStatus, paymentProviderFromRecord } from "./utils/paymentProviderAdapter";
import { cardPaymentFields, decideDepositSettlement, depositAppointmentAcceptsPayment, type DepositCheckoutFacts } from "./depositCheckoutCore";
import { enqueueRefund, paymentLifecycleTransaction, processRefunds } from "./refunds";

type Sudo = ReturnType<Context["sudo"]>;

const CHECKOUT_TTL_MS = 55 * 60_000; // Stripe Checkout minimum lifetime is 30 minutes; we ask for 1 hour.

/** The practice's installed Stripe provider, when online card payments are actually usable. */
export async function onlineDepositProvider(sudo: Sudo, practiceId: string) {
  if (!stripeConfigured()) return null;
  const rows = await sudo.query.PaymentProvider.findMany({
    where: { practice: { id: { equals: practiceId } }, adapter: { equals: "stripe" }, isInstalled: { equals: true } },
    take: 1, orderBy: { isDefault: "desc" }, query: "id code adapter config",
  });
  return rows[0] ?? null;
}

const APPOINTMENT_QUERY = "id status metadata depositAmount depositPaid practice { id } client { id user { id email } } provider { user { name } } lineItems { serviceTitle }";

/** A guest proves access with the confirmation-link token; a signed-in client must own the visit. */
async function loadAccessibleAppointment(context: Context, appointmentId: string, token?: string | null) {
  const sudo = context.sudo();
  const appointment: any = await sudo.query.Appointment.findOne({ where: { id: appointmentId }, query: APPOINTMENT_QUERY });
  if (!appointment) throw new Error("Appointment not found");
  if (token) {
    if (!validGuestAccessToken(appointmentId, token) || appointment.client?.id) throw new Error("Appointment not found");
  } else {
    const actor = await assertActiveActor(context).catch(() => null);
    if (!actor || appointment.practice?.id !== actor.practiceId || appointment.client?.user?.id !== actor.actorId) throw new Error("Appointment not found");
  }
  return { sudo, appointment };
}

function guestEmail(metadata: unknown): string {
  const guest = metadata && typeof metadata === "object" ? (metadata as Record<string, any>).guest : null;
  return guest && typeof guest.email === "string" ? guest.email.trim() : "";
}

function guestName(metadata: unknown): string {
  const guest = metadata && typeof metadata === "object" ? (metadata as Record<string, any>).guest : null;
  return guest && typeof guest.name === "string" ? guest.name.trim().slice(0, 120) : "";
}

const SESSION_QUERY = "id status amount currency providerReference data practice { id } payment { id status receiptEmail } appointment { id status depositPaid } provider { id code adapter config }";

function sessionData(session: { data?: unknown }): Record<string, any> {
  return session.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
}

export type DepositSettleOutcome = "completed" | "expired" | "review" | "refund_queued" | "none";

/**
 * Applies a provider Checkout fact to the local deposit. The webhook (inside its transaction) and the
 * return-page reconcile both call this, so both converge on the same rules and replays are no-ops.
 */
export async function settleDepositCheckout(sudo: Sudo, sessionId: string, facts: DepositCheckoutFacts): Promise<{ outcome: DepositSettleOutcome; refundAttemptId: string | null }> {
  const session: any = await sudo.query.PaymentSession.findOne({ where: { id: sessionId }, query: SESSION_QUERY });
  if (!session || sessionData(session).purpose !== "appointment_deposit") return { outcome: "none", refundAttemptId: null };
  const data = sessionData(session);
  const decision = decideDepositSettlement(
    { status: session.status, amount: session.amount, currency: session.currency, providerReference: data.checkoutSessionId || session.providerReference },
    facts,
  );
  const now = new Date().toISOString();

  if (decision.action === "none") return { outcome: "none", refundAttemptId: null };
  if (decision.action === "review") {
    await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { data: { ...data, needsReview: true, reviewReason: decision.reason } }, query: "id" });
    return { outcome: "review", refundAttemptId: null };
  }
  if (decision.action === "expire") {
    assertPaymentTransition(session.status as PaymentLifecycleStatus, "cancelled");
    await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: "cancelled", failedAt: now }, query: "id" });
    if (session.payment?.id) await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: paymentRecordStatus("cancelled") }, query: "id" });
    return { outcome: "expired", refundAttemptId: null };
  }

  assertPaymentTransition(session.status as PaymentLifecycleStatus, "completed");
  await sudo.query.PaymentSession.updateOne({
    where: { id: session.id },
    data: {
      status: "completed", completedAt: now,
      // Refunds are issued against the payment intent, so it becomes the session's provider reference.
      providerReference: decision.paymentIntentId,
      data: { ...data, checkoutSessionId: facts.providerReference, paymentIntentId: decision.paymentIntentId, checkoutUrl: null },
    },
    query: "id",
  });
  if (session.payment?.id) await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: "completed", processedAt: now, stripePaymentIntentId: decision.paymentIntentId, ...cardPaymentFields(facts.card), ...(!session.payment.receiptEmail && facts.card?.email ? { receiptEmail: facts.card.email } : {}) }, query: "id" });

  const appointment = session.appointment;
  if (appointment?.id && depositAppointmentAcceptsPayment(appointment.status)) {
    // Paying a deposit does not confirm the visit: confirmation keeps its scheduling-authority checks.
    await sudo.query.Appointment.updateOne({ where: { id: appointment.id }, data: { depositPaid: true }, query: "id" });
    return { outcome: "completed", refundAttemptId: null };
  }
  // Paid after the visit was cancelled or completed: give the money back through a refund.
  if (session.payment?.id && session.practice?.id) {
    const queued = await enqueueRefund(sudo, {
      practiceId: session.practice.id, paymentId: session.payment.id, sessionId: session.id, amountMinor: session.amount, currencyCode: session.currency,
      reason: "Deposit paid after the appointment was no longer open", idempotencyKey: `${session.practice.id}:late-deposit:${session.id}`,
      providerReference: decision.paymentIntentId, actorId: null,
    });
    return { outcome: "refund_queued", refundAttemptId: queued.attemptId };
  }
  return { outcome: "review", refundAttemptId: null };
}

async function openDepositSession(sudo: Sudo, appointmentId: string) {
  const rows = (await sudo.query.PaymentSession.findMany({
    where: { appointment: { id: { equals: appointmentId } }, status: { in: ["pending", "requires_action"] } },
    orderBy: { createdAt: "desc" }, take: 10, query: SESSION_QUERY,
  })) as any[];
  return rows.find(row => sessionData(row).purpose === "appointment_deposit") ?? null;
}

export async function startDepositCheckoutFlow(context: Context, args: { appointmentId: string; token?: string | null }) {
  const { sudo, appointment } = await loadAccessibleAppointment(context, args.appointmentId, args.token);
  if (!depositAppointmentAcceptsPayment(appointment.status)) throw new Error("This appointment is no longer open for a deposit");
  if (appointment.depositPaid) throw new Error("The deposit is already paid");
  const amount = Number(appointment.depositAmount || 0);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("This appointment does not require a deposit");
  const practiceId = appointment.practice.id as string;
  const provider = await onlineDepositProvider(sudo, practiceId);
  if (!provider) throw new Error("Online deposits are not available. The practice will collect the deposit.");

  const open = await openDepositSession(sudo, appointment.id);
  const openData = open ? sessionData(open) : {};
  if (open && open.amount === amount && typeof openData.checkoutUrl === "string" && openData.checkoutUrl && Date.parse(openData.checkoutExpiresAt || "") > Date.now() + 5 * 60_000) {
    return { url: openData.checkoutUrl as string };
  }

  const origin = trustedOrigin();
  const base = `${origin}/booking/${encodeURIComponent(appointment.id)}`;
  const tokenQuery = args.token ? `&token=${encodeURIComponent(args.token)}` : "";
  const key = `${practiceId}:deposit:${appointment.id}:${randomUUID()}`;
  const serviceName = appointment.lineItems?.map((line: any) => line.serviceTitle).filter(Boolean).join(", ") || "Appointment";
  const checkout = await createProviderCheckout({
    provider: paymentProviderFromRecord(provider as { code: string; adapter: string; config?: unknown }),
    amount, currency: "usd", idempotencyKey: key, description: `Deposit · ${serviceName}`,
    successUrl: `${base}?deposit=return${tokenQuery}`, cancelUrl: `${base}?deposit=cancelled${tokenQuery}`,
    customerEmail: appointment.client?.user?.email || guestEmail(appointment.metadata) || null,
    // Correlation only; the amount is never read back from metadata.
    metadata: { purpose: "appointment_deposit", appointmentId: appointment.id, practiceId },
  });

  await paymentLifecycleTransaction(context, `appointment:${appointment.id}`, async tx => {
    const session = await tx.query.PaymentSession.createOne({
      data: {
        practice: { connect: { id: practiceId } }, appointment: { connect: { id: appointment.id } }, provider: { connect: { id: provider.id } },
        idempotencyKey: key, amount, currency: "usd", status: "pending", providerReference: checkout.providerReference,
        data: { purpose: "appointment_deposit", checkoutUrl: checkout.url, checkoutExpiresAt: checkout.expiresAt, checkoutSessionId: checkout.providerReference },
      },
      query: "id",
    });
    // The Payment is deliberately not linked to Appointment.payment: that slot means "checked out" and would block checkout.
    const payment = await tx.query.Payment.createOne({
      data: {
        idempotencyKey: `${key}:payment`, practice: { connect: { id: practiceId } }, session: { connect: { id: session.id } },
        subtotal: amount, tax: 0, tip: 0, discount: 0, totalAmount: amount, paymentMethod: "credit_card", status: "pending",
        receiptEmail: appointment.client?.user?.email || guestEmail(appointment.metadata), notes: ["Online deposit", serviceName, appointment.client?.id ? "" : guestName(appointment.metadata)].filter(Boolean).join(" · "),
      },
      query: "id",
    });
    await tx.query.PaymentSession.updateOne({ where: { id: session.id }, data: { payment: { connect: { id: payment.id } } }, query: "id" });
  });
  return { url: checkout.url };
}

/** Reads the Checkout back from Stripe and records a paid deposit (the return page and "Check status" use this). */
export async function confirmDepositCheckoutFlow(context: Context, args: { appointmentId: string; token?: string | null }) {
  const { sudo, appointment } = await loadAccessibleAppointment(context, args.appointmentId, args.token);
  if (appointment.depositPaid) return { paid: true };
  const session = await openDepositSession(sudo, appointment.id);
  if (!session?.provider) return { paid: false };
  const checkoutId = sessionData(session).checkoutSessionId || session.providerReference;
  const facts = await getProviderCheckoutStatus({ provider: paymentProviderFromRecord(session.provider), providerReference: checkoutId });
  let refundAttemptId: string | null = null;
  const outcome = await paymentLifecycleTransaction(context, `appointment:${appointment.id}`, async tx => {
    const settled = await settleDepositCheckout(tx, session.id, { ...facts, providerReference: facts.providerReference });
    refundAttemptId = settled.refundAttemptId;
    return settled.outcome;
  });
  if (refundAttemptId) await processRefunds(context, [refundAttemptId]).catch(() => undefined);
  if (outcome === "review") throw new Error("The amount paid does not match the deposit. Contact the practice.");
  return { paid: outcome === "completed" };
}

const DepositResult = graphql.object<{ success: boolean; error: string | null; url: string | null; paid: boolean | null }>()({
  name: "StorefrontDepositResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    error: graphql.field({ type: graphql.String }),
    url: graphql.field({ type: graphql.String }),
    paid: graphql.field({ type: graphql.Boolean }),
  },
});

const safeMessages = /^(Appointment not found|This appointment is no longer open for a deposit|The deposit is already paid|This appointment does not require a deposit|Online deposits are not available.*|The amount paid does not match.*)$/;
const failure = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (!safeMessages.test(message)) console.error("Deposit checkout failed", error);
  return { success: false, error: safeMessages.test(message) ? message : "We couldn't open the deposit payment. Please try again.", url: null, paid: null };
};

export const startDepositCheckout = graphql.field({
  type: graphql.nonNull(DepositResult),
  args: { appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), token: graphql.arg({ type: graphql.String }) },
  async resolve(_source, args, context: Context) {
    try {
      const { url } = await startDepositCheckoutFlow(context, args);
      return { success: true, error: null, url, paid: null };
    } catch (error) { return failure(error); }
  },
});

export const confirmDepositCheckout = graphql.field({
  type: graphql.nonNull(DepositResult),
  args: { appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), token: graphql.arg({ type: graphql.String }) },
  async resolve(_source, args, context: Context) {
    try {
      const { paid } = await confirmDepositCheckoutFlow(context, args);
      return { success: true, error: null, url: null, paid };
    } catch (error) { return failure(error); }
  },
});

/**
 * A cancelled visit gives its unapplied online deposit back. Runs inside the cancel transaction (the Refund and its
 * outbox attempt commit with the cancellation); the caller submits the returned attempts after commit.
 * A no-show keeps the deposit.
 */
export async function queueDepositRefundsOnCancel(sudo: Sudo, appointmentId: string, practiceId: string): Promise<string[]> {
  const sessions = (await sudo.query.PaymentSession.findMany({
    where: { appointment: { id: { equals: appointmentId } }, status: { in: ["completed", "partially_refunded"] } },
    take: 50, query: "id amount currency status providerReference data payment { id refundedAmount refunds { amountMinor status } }",
  })) as any[];
  const attempts: string[] = [];
  for (const session of sessions) {
    const data = sessionData(session);
    if (data.purpose !== "appointment_deposit" || data.appliedToCheckout || !session.payment?.id || !session.providerReference) continue;
    const reserved = (session.payment.refunds || []).filter((r: any) => r.status === "pending" || r.status === "completed").reduce((sum: number, r: any) => sum + Number(r.amountMinor || 0), 0);
    const remaining = Number(session.amount) - reserved;
    if (remaining <= 0) continue;
    const queued = await enqueueRefund(sudo, {
      practiceId, paymentId: session.payment.id, sessionId: session.id, amountMinor: remaining, currencyCode: session.currency,
      reason: "Appointment cancelled: deposit returned", idempotencyKey: `${practiceId}:cancel-deposit:${session.id}`,
      providerReference: session.providerReference, actorId: null,
    });
    if (queued.attemptId && !queued.replayed) attempts.push(queued.attemptId);
  }
  return attempts;
}

export async function kickRefundAttempts(context: Context, attemptIds: string[]) {
  if (attemptIds.length) await processRefunds(context, attemptIds).catch(error => console.error("Refund submit failed", error));
}
