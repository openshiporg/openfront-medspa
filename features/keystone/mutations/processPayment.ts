import { graphql } from "@keystone-6/core";
import { configuredTaxRate } from "../checkoutInput";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { assertPracticeRecord, requireActorPractice } from "../workflowAuth";
import { assertPaymentTransition, paymentRecordStatus, type PaymentLifecycleStatus } from "../payment-lifecycle";
import {
  confirmProviderPayment,
  createProviderPaymentSession,
  paymentProviderFromRecord,
  refundProviderPayment,
} from "../utils/paymentProviderAdapter";


function operator(context: Context) {
  return permissions.canManageFinance({ session: context.session as any });
}

function denied(extra = {}) {
  return { success: false, error: "You must be an authorized medspa operator", ...extra };
}

async function paymentTransaction<T>(
  context: Context,
  lockKeys: string[],
  work: (sudo: Context) => Promise<T>,
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await context.transaction(async (transactionContext: Context) => {
        for (const key of [...new Set(lockKeys)].sort()) {
          await transactionContext.prisma.$executeRawUnsafe(
            "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            "medspa-payment-lifecycle",
            key,
          );
        }
        return work(transactionContext.sudo());
      }, {
        maxWait: 5_000,
        timeout: 30_000,
        isolationLevel: "Serializable" as any,
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = error?.code === "P2034" || error?.extensions?.prisma?.code === "P2034"
        || /write conflict|deadlock|please retry your transaction/i.test(message);
      if (!retryable || attempt === 3) throw error;
    }
  }
  throw new Error("Payment transaction retry exhausted");
}

const SAFE_PAYMENT_ERRORS = new Set([
  "Appointment not found",
  "Appointment is not eligible for payment",
  "Appointment already has a payment",
  "Appointment has no payable line items",
  "Payment provider is unavailable",
  "Payment session not found",
  "Provider has not completed the payment",
  "Invalid refund amount",
  "Completed payment not found",
  "No tip to distribute",
  "Idempotency key is invalid",
  "Idempotency key was already used for another operation",
]);

function safeError(error: unknown) {
  console.error("Payment workflow failed:", error);
  if (error instanceof Error && (error.message.startsWith("Invalid payment transition") || SAFE_PAYMENT_ERRORS.has(error.message))) {
    return error.message;
  }
  return "Payment operation failed";
}

async function loadProvider(sudo: Context, providerCode?: string | null) {
  const providers = await sudo.query.PaymentProvider.findMany({
    where: providerCode
      ? { code: { equals: providerCode }, isInstalled: { equals: true } }
      : { isInstalled: { equals: true }, isDefault: { equals: true } },
    take: 1,
    query: "id code adapter config isInstalled isDefault",
  });
  const provider = providers[0];
  if (!provider) throw new Error("Payment provider is unavailable");
  return provider;
}

async function loadSession(sudo: Context, sessionId: string) {
  return sudo.query.PaymentSession.findOne({
    where: { id: sessionId },
    query: `
      id amount currency status providerReference idempotencyKey data
      provider { id code adapter config isInstalled }
      payment { id status totalAmount refundedAmount appointment { id } }
      appointment { id status client { user { email } } }
    `,
  });
}

export const processPayment = graphql.field({
  type: graphql.object<{
    success: boolean; paymentId: string | null; paymentSessionId: string | null;
    error: string | null; clientSecret: string | null; status: string | null;
  }>()({
    name: "ProcessPaymentResult",
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      paymentId: graphql.field({ type: graphql.String }),
      paymentSessionId: graphql.field({ type: graphql.String }),
      error: graphql.field({ type: graphql.String }),
      clientSecret: graphql.field({ type: graphql.String }),
      status: graphql.field({ type: graphql.String }),
    },
  }),
  args: {
    appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    paymentMethod: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    providerCode: graphql.arg({ type: graphql.String }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    tipAmount: graphql.arg({ type: graphql.Int }),
    discountAmount: graphql.arg({ type: graphql.Int }),
  },
  async resolve(source, args, context: Context) {
    if (!operator(context)) return { success: false, paymentId: null, paymentSessionId: null, error: "You must be an authorized medspa operator", clientSecret: null, status: null };
    // Settlement is owned exclusively by completeAppointmentCheckout so money can
    // never bypass clinical evidence, settled snapshots, benefits, and custody.
    return { success: false, paymentId: null, paymentSessionId: null, error: "Use controlled appointment checkout", clientSecret: null, status: null };
    /* legacy unreachable compatibility source; remove after generated-client activation
    try {
      return await paymentTransaction(context, [`idempotency:${args.idempotencyKey}`, `appointment:${args.appointmentId}`], async (sudo) => {
      if (args.idempotencyKey.trim().length < 12 || args.idempotencyKey.length > 200) throw new Error("Idempotency key is invalid");
      if (!new Set(["credit_card", "debit_card", "cash", "gift_card", "apple_pay", "google_pay"]).has(args.paymentMethod)) {
        throw new Error("Payment operation failed");
      }
      if ((args.tipAmount || 0) < 0 || (args.discountAmount || 0) < 0 || (args.tipAmount || 0) > 10_000_000 || (args.discountAmount || 0) > 10_000_000) {
        throw new Error("Payment operation failed");
      }
      const existing = (await sudo.query.PaymentSession.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1,
        query: "id status data appointment { id } payment { id }",
      }))[0];
      if (existing) {
        if (existing.appointment?.id !== args.appointmentId) throw new Error("Idempotency key was already used for another operation");
        const data = existing.data && typeof existing.data === "object" ? existing.data as Record<string, any> : {};
        return { success: true, paymentId: existing.payment?.id || null, paymentSessionId: existing.id, error: null, clientSecret: data.clientSecret || null, status: existing.status };
      }

      const appointment = await sudo.query.Appointment.findOne({
        where: { id: args.appointmentId },
        query: `id status payment { id status } practice { taxRate } lineItems { price quantity } client { user { email } }`,
      });
      if (!appointment) throw new Error("Appointment not found");
      if (!["confirmed", "in_progress"].includes(appointment.status || "")) throw new Error("Appointment is not eligible for payment");
      if (appointment.payment?.id) throw new Error("Appointment already has a payment");

      const subtotalCents = appointment.lineItems.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
      if (subtotalCents <= 0) throw new Error("Appointment has no payable line items");
      const tipCents = Math.max(0, args.tipAmount || 0);
      const discountCents = Math.max(0, args.discountAmount || 0);
      const taxCents = Math.round(subtotalCents * configuredTaxRate(process.env.TAX_RATE, appointment.practice?.taxRate));
      const totalCents = Math.max(0, subtotalCents + taxCents + tipCents - discountCents);
      const provider = await loadProvider(sudo, args.providerCode);
      const providerConfig = paymentProviderFromRecord(provider as { code: string; adapter: string; config?: unknown });
      const adapterResult = await createProviderPaymentSession({
        provider: providerConfig, amount: totalCents, currency: "usd", idempotencyKey: args.idempotencyKey,
        metadata: { appointmentId: appointment.id, operatorId: context.session!.itemId },
      });

      const session = await sudo.query.PaymentSession.createOne({
        data: {
          appointment: { connect: { id: appointment.id } }, provider: { connect: { id: provider.id } },
          idempotencyKey: args.idempotencyKey, amount: totalCents, currency: "usd", status: adapterResult.status,
          providerReference: adapterResult.providerReference,
          data: { ...(adapterResult.data || {}), clientSecret: adapterResult.clientSecret || null },
        }, query: "id",
      });
      const completed = adapterResult.status === "completed";
      const payment = await sudo.query.Payment.createOne({
        data: {
          subtotal: subtotalCents, tax: taxCents, tip: tipCents, discount: discountCents,
          totalAmount: totalCents, paymentMethod: args.paymentMethod,
          status: paymentRecordStatus(adapterResult.status), appointment: { connect: { id: appointment.id } },
          session: { connect: { id: session.id } }, processedBy: { connect: { id: context.session!.itemId } },
          processedAt: completed ? new Date().toISOString() : undefined,
          receiptEmail: appointment.client?.user?.email || "",
        }, query: "id",
      });
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { payment: { connect: { id: payment.id } }, ...(completed ? { completedAt: new Date().toISOString() } : {}) }, query: "id" });
      if (completed) await sudo.query.Appointment.updateOne({ where: { id: appointment.id }, data: { status: "completed" }, query: "id" });
      return { success: true, paymentId: payment.id, paymentSessionId: session.id, error: null, clientSecret: adapterResult.clientSecret || null, status: adapterResult.status };
      });
    } catch (error) {
      return { success: false, paymentId: null, paymentSessionId: null, error: safeError(error), clientSecret: null, status: null };
    }
    */
  },
});

export const confirmPayment = graphql.field({
  type: graphql.object<{ success: boolean; error: string | null; status: string | null }>()({
    name: "ConfirmPaymentResult",
    fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), error: graphql.field({ type: graphql.String }), status: graphql.field({ type: graphql.String }) },
  }),
  args: { paymentSessionId: graphql.arg({ type: graphql.nonNull(graphql.ID) }) },
  async resolve(source, { paymentSessionId }, context: Context) {
    try { requireActorPractice(context, permissions.canManageFinance); await assertPracticeRecord(context, "PaymentSession", paymentSessionId); }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : "Payment session not found", status: null }; }
    try {
      return await paymentTransaction(context, [`session:${paymentSessionId}`], async (sudo) => {
      const session = await loadSession(sudo, paymentSessionId);
      if (!session?.provider || !session.providerReference || !session.payment) throw new Error("Payment session not found");
      const initialData = session.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
      if (initialData.purpose !== "appointment_deposit") throw new Error("Use the controlled settlement or reversal workflow");
      if (session.status === "completed") return { success: true, error: null, status: "completed" };
      if (!session.appointment?.status || !["pending", "confirmed"].includes(session.appointment.status)) throw new Error("Cancelled or completed appointments cannot be revived by a late deposit confirmation");
      assertPaymentTransition(session.status as PaymentLifecycleStatus, "completed");
      const result = await confirmProviderPayment({ provider: paymentProviderFromRecord(session.provider as { code: string; adapter: string; config?: unknown }), providerReference: session.providerReference, amount: session.amount, idempotencyKey: `${session.idempotencyKey}:confirm` });
      assertPaymentTransition(session.status as PaymentLifecycleStatus, result.status);
      if (result.status !== "completed") throw new Error("Provider has not completed the payment");
      const now = new Date().toISOString();
      const sessionData = session.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: "completed", completedAt: now, data: { ...sessionData, ...(result.data || {}) } }, query: "id" });
      await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: "completed", processedAt: now }, query: "id" });
      if (session.appointment?.id) {
        await sudo.query.Appointment.updateOne({
          where: { id: session.appointment.id },
          data: sessionData.purpose === "appointment_deposit"
            ? { depositPaid: true, ...(session.appointment.status === "pending" ? { status: "confirmed", confirmedAt: now } : {}) }
            : { status: "completed" },
          query: "id",
        });
      }
      return { success: true, error: null, status: "completed" };
      });
    } catch (error) { return { success: false, error: safeError(error), status: null }; }
  },
});

export const refundPayment = graphql.field({
  type: graphql.object<{ success: boolean; refundId: string | null; error: string | null; status: string | null }>()({
    name: "RefundPaymentResult",
    fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), refundId: graphql.field({ type: graphql.String }), error: graphql.field({ type: graphql.String }), status: graphql.field({ type: graphql.String }) },
  }),
  args: { paymentSessionId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), amount: graphql.arg({ type: graphql.Int }), reason: graphql.arg({ type: graphql.String }) },
  async resolve(source, { paymentSessionId, amount, reason }, context: Context) {
    try { requireActorPractice(context, permissions.canManageFinance); await assertPracticeRecord(context, "PaymentSession", paymentSessionId); }
    catch (error) { return { success: false, refundId: null, error: error instanceof Error ? error.message : "Payment session not found", status: null }; }
    try {
      return await paymentTransaction(context, [`session:${paymentSessionId}`], async (sudo) => {
      const session = await loadSession(sudo, paymentSessionId);
      if (!session?.provider || !session.providerReference || !session.payment) throw new Error("Payment session not found");
      const initialData = session.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
      if (initialData.purpose !== "appointment_deposit") throw new Error("Use the controlled settlement reversal workflow");
      if (session.provider.adapter !== "manual") throw new Error("Processor refunds require a durable outbox and webhook reconciliation workflow");
      const alreadyRefunded = Number(session.payment.refundedAmount || 0);
      const refundCents = amount ?? (session.amount - alreadyRefunded);
      const cumulativeRefund = alreadyRefunded + refundCents;
      if (refundCents <= 0 || cumulativeRefund > session.amount) throw new Error("Invalid refund amount");
      const target: PaymentLifecycleStatus = cumulativeRefund < session.amount ? "partially_refunded" : "refunded";
      assertPaymentTransition(session.status as PaymentLifecycleStatus, target);
      const result = await refundProviderPayment({ provider: paymentProviderFromRecord(session.provider as { code: string; adapter: string; config?: unknown }), providerReference: session.providerReference, amount: refundCents, idempotencyKey: `${session.idempotencyKey}:refund:${refundCents}` });
      const now = new Date().toISOString();
      const sessionData = session.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: target, refundedAt: now, data: { ...sessionData, ...(result.data || {}) } }, query: "id" });
      await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: paymentRecordStatus(target), refundedAmount: cumulativeRefund, refundReason: reason || "", refundedAt: now }, query: "id" });
      if (sessionData.purpose === "appointment_deposit" && target === "refunded" && session.appointment?.id) {
        await sudo.query.Appointment.updateOne({ where: { id: session.appointment.id }, data: { depositPaid: false }, query: "id" });
      }
      return { success: true, refundId: typeof result.data?.refundId === "string" ? result.data.refundId : null, error: null, status: target };
      });
    } catch (error) { return { success: false, refundId: null, error: safeError(error), status: null }; }
  },
});

export const reverseAppointmentSettlement = graphql.field({
  type: graphql.object<{ success: boolean; refundId: string | null; error: string | null; status: string | null }>()({
    name: "ReverseAppointmentSettlementResult",
    fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), refundId: graphql.field({ type: graphql.ID }), error: graphql.field({ type: graphql.String }), status: graphql.field({ type: graphql.String }) },
  }),
  args: { paymentSessionId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), amount: graphql.arg({ type: graphql.nonNull(graphql.Int) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) },
  async resolve(_source, args, context: Context) {
    let actor; try { actor = requireActorPractice(context, permissions.canManageFinance); await assertPracticeRecord(context, "PaymentSession", args.paymentSessionId); }
    catch (error) { return { success: false, refundId: null, error: error instanceof Error ? error.message : "Payment session not found", status: null }; }
    if (!Number.isInteger(args.amount) || args.amount < 1 || args.reason.trim().length < 1 || args.reason.length > 1_000 || args.idempotencyKey.trim().length < 12 || args.idempotencyKey.length > 200) return { success: false, refundId: null, error: "Settlement reversal evidence is invalid", status: null };
    return { success: false, refundId: null, error: "Settlement reversal is disabled until refund, commission, package, membership, retail-custody, and client-balance projections reconcile atomically", status: null };
    try {
      return await paymentTransaction(context, [`session:${args.paymentSessionId}`, `reversal:${args.idempotencyKey}`], async sudo => {
        const existing = (await sudo.query.Refund.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id status payment { id }" }))[0];
        const session = await loadSession(sudo, args.paymentSessionId); const data = session?.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
        if (!session?.payment || session.provider?.adapter !== "manual" || data.purpose !== "controlled_checkout") throw new Error("Settlement reversal is unavailable for this payment");
        if (existing) { if (existing.payment?.id !== session.payment.id) throw new Error("Idempotency key was already used for another operation"); return { success: true, refundId: existing.id, error: null, status: existing.status }; }
        const threshold = Number(process.env.REFUND_MANAGER_APPROVAL_THRESHOLD_MINOR); if (!Number.isInteger(threshold) || threshold < 0) throw new Error("Refund approval threshold is not configured");
        if (args.amount > threshold && !permissions.canManagePractice({ session: context.session as any })) throw new Error("Practice-manager approval is required for this reversal");
        const alreadyRefunded = Number(session.payment.refundedAmount || 0), cumulative = alreadyRefunded + args.amount; if (cumulative > Number(session.payment.totalAmount || 0)) throw new Error("Invalid refund amount");
        const target: PaymentLifecycleStatus = cumulative < Number(session.payment.totalAmount || 0) ? "partially_refunded" : "refunded"; assertPaymentTransition(session.status as PaymentLifecycleStatus, target); const now = new Date().toISOString();
        const refund = await sudo.query.Refund.createOne({ data: { practice: { connect: { id: actor.practiceId } }, payment: { connect: { id: session.payment.id } }, amountMinor: args.amount, currencyCode: session.currency.toUpperCase(), reason: args.reason.trim(), idempotencyKey: args.idempotencyKey, providerReference: session.providerReference || "", status: "completed", processedAt: now, data: { method: "operator_recorded_cash", actorId: actor.actorId } }, query: "id status" });
        await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: target, refundedAt: now, data: { ...data, lastSettlementReversalId: refund.id } }, query: "id" });
        await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: paymentRecordStatus(target), refundedAmount: cumulative, refundReason: args.reason.trim(), refundedAt: now }, query: "id" });
        return { success: true, refundId: refund.id, error: null, status: target };
      });
    } catch (error) { return { success: false, refundId: null, error: safeError(error), status: null }; }
  },
});

export const distributeTip = graphql.field({
  type: graphql.object<{ success: boolean; error: string | null }>()({ name: "DistributeTipResult", fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), error: graphql.field({ type: graphql.String }) } }),
  args: { paymentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }) },
  async resolve(source, { paymentId }, context: Context) {
    if (!operator(context)) return denied();
    return { success: false, error: "Tip distribution requires an append-only payroll allocation workflow" };
    /* legacy boolean shortcut intentionally unreachable
    try {
      return await paymentTransaction(context, [`payment:${paymentId}`], async (sudo) => {
      const payment = await sudo.query.Payment.findOne({ where: { id: paymentId }, query: "id tip tipDistributed status" });
      if (!payment || payment.status !== "completed") throw new Error("Completed payment not found");
      if (payment.tipDistributed) return { success: true, error: null };
      if (!payment.tip || payment.tip <= 0) throw new Error("No tip to distribute");
      await sudo.query.Payment.updateOne({ where: { id: paymentId }, data: { tipDistributed: true }, query: "id" });
      return { success: true, error: null };
      });
    } catch (error) { return { success: false, error: safeError(error) }; }
    */
  },
});

export const paymentMutations = { processPayment, confirmPayment, refundPayment, reverseAppointmentSettlement, distributeTip };
