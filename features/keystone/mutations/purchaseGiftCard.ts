import { createHash } from "node:crypto";
import { graphql } from "@keystone-6/core";
import { aggregateIdempotencyKey } from "../aggregateIdempotencyKey";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { assertActiveActor, assertPracticeRecord, requireActorPractice } from "../workflowAuth";
import { sendGiftCardEmail } from "../lib/mail";
import { assertPaymentTransition, paymentRecordStatus, type PaymentLifecycleStatus } from "../payment-lifecycle";
import { confirmProviderPayment, createProviderPaymentSession, paymentProviderFromRecord } from "../utils/paymentProviderAdapter";
import { serializableWorkflow } from "./serializableWorkflow";

function giftCardCode(idempotencyKey: string) {
  const compact = createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 12).toUpperCase();
  return compact.match(/.{1,4}/g)!.join("-");
}

function operator(context: Context) {
  return permissions.canManageFinance({ session: context.session as any });
}

function validKey(value: string) {
  return value.trim().length >= 12 && value.length <= 200;
}

// Gift cards remain unpublished until purchasing, activation, expiry, refund, and redemption share a settled ledger.
function giftCardPurchasingEnabled() { return false; }

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Gift-card payment operation failed";
  if (/^(Gift card|Payment|Provider|Purchaser|Idempotency|Invalid payment transition)/.test(message)) return message;
  console.error("Gift-card payment workflow failed:", error);
  return "Gift-card payment operation failed";
}

async function defaultProvider(sudo: Context, practiceId: string, providerCode?: string | null) {
  const providers = await sudo.query.PaymentProvider.findMany({
    where: providerCode
      ? { practice: { id: { equals: practiceId } }, code: { equals: providerCode }, isInstalled: { equals: true } }
      : { practice: { id: { equals: practiceId } }, isInstalled: { equals: true }, isDefault: { equals: true } },
    take: 1,
    query: "id code adapter config",
  });
  if (!providers[0]) throw new Error("Payment provider is unavailable");
  return providers[0];
}

type PurchaseResult = { success: boolean; giftCardId: string | null; paymentSessionId: string | null; clientSecret: string | null; error: string | null };

export async function purchaseGiftCardTransaction(
  context: Context,
  args: {
    amount: number; recipientEmail?: string | null; recipientName?: string | null; message?: string | null;
    purchaserEmail: string; purchaserName: string; providerCode?: string | null; idempotencyKey: string;
  },
): Promise<PurchaseResult> {
  const denied = { success: false, giftCardId: null, paymentSessionId: null, clientSecret: null };
  let actor;
  try { actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required"); await assertActiveActor(context); }
  catch (error) { return { ...denied, error: error instanceof Error ? error.message : "Authorized finance access is required" }; }
  if (!Number.isInteger(args.amount) || args.amount < 2_500 || args.amount > 50_000) return { ...denied, error: "Gift card amount must be between $25 and $500" };
  if (!validKey(args.idempotencyKey)) return { ...denied, error: "Idempotency key is invalid" };
  const purchaserEmail = args.purchaserEmail.trim().toLowerCase();
  const recipientEmail = (args.recipientEmail || purchaserEmail).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return { ...denied, error: "Gift card email is invalid" };
  if (args.purchaserName.trim().length > 120 || (args.recipientName?.length || 0) > 120 || (args.message?.length || 0) > 2_000) return { ...denied, error: "Gift card details are too long" };
  if (!giftCardPurchasingEnabled()) return { ...denied, error: "Gift-card purchasing is disabled until the settled tender and liability ledger is implemented" };
  const scopedPurchaseKey = aggregateIdempotencyKey(actor.practiceId, `gift-card:${args.idempotencyKey}`);

  try {
    return await serializableWorkflow(context, "medspa-gift-card", [`purchase:${scopedPurchaseKey}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.PaymentSession.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedPurchaseKey } }, take: 1,
        query: "id amount data",
      }))[0];
      if (existing) {
        const data = existing.data && typeof existing.data === "object" ? existing.data as Record<string, any> : {};
        if (data.purpose !== "gift_card" || existing.amount !== args.amount) throw new Error("Idempotency key was already used for another operation");
        return { success: true, giftCardId: data.giftCardId || null, paymentSessionId: existing.id, clientSecret: data.clientSecret || null, error: null };
      }
      const purchaser = (await sudo.query.User.findMany({ where: { email: { equals: purchaserEmail }, practice: { id: { equals: actor.practiceId } } }, take: 1, query: "id" }))[0];
      if (!purchaser) throw new Error("Purchaser must have an authenticated client account");
      const provider = await defaultProvider(sudo, actor.practiceId, args.providerCode);
      const adapter = await createProviderPaymentSession({
        provider: paymentProviderFromRecord(provider as { code: string; adapter: string; config?: unknown }),
        amount: args.amount, currency: "usd", idempotencyKey: scopedPurchaseKey,
        metadata: { purpose: "gift_card", purchaserId: purchaser.id },
      });
      // Expiry/cash-redemption/escheat behavior is jurisdiction-owned; no national
      // default is fabricated in the bounded launch.
      const completed = adapter.status === "completed";
      const giftCard = await sudo.query.GiftCard.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } }, code: giftCardCode(scopedPurchaseKey), initialValue: args.amount, currentBalance: args.amount,
          recipientEmail, recipientName: args.recipientName?.trim() || args.purchaserName.trim(),
          message: args.message?.trim() || "", isActive: completed,
          purchasedBy: { connect: { id: purchaser.id } },
        },
        query: "id",
      });
      const now = new Date().toISOString();
      const session = await sudo.query.PaymentSession.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } }, provider: { connect: { id: provider.id } }, idempotencyKey: scopedPurchaseKey,
          amount: args.amount, currency: "usd", status: adapter.status, providerReference: adapter.providerReference,
          completedAt: completed ? now : undefined,
          data: { ...(adapter.data || {}), purpose: "gift_card", clientSecret: adapter.clientSecret || null, giftCardId: giftCard.id },
        },
        query: "id",
      });
      const payment = await sudo.query.Payment.createOne({
        data: {
          idempotencyKey: aggregateIdempotencyKey(scopedPurchaseKey, "payment"),
          practice: { connect: { id: actor.practiceId } }, subtotal: args.amount, tax: 0, tip: 0, discount: 0, totalAmount: args.amount,
          paymentMethod: "credit_card", status: paymentRecordStatus(adapter.status),
          session: { connect: { id: session.id } }, processedBy: { connect: { id: context.session!.itemId } },
          processedAt: completed ? now : undefined, receiptEmail: purchaserEmail,
          notes: `Gift-card purchase ${giftCard.id}`,
        },
        query: "id",
      });
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { payment: { connect: { id: payment.id } } }, query: "id" });
      if (completed) {
        await sudo.query.GiftCardTransaction.createOne({
          data: { practice: { connect: { id: actor.practiceId } }, giftCard: { connect: { id: giftCard.id } }, type: "purchase", amount: args.amount, idempotencyKey: `${scopedPurchaseKey}:purchase`, notes: `provider:${provider.code}` },
          query: "id",
        });
      }
      return { success: true, giftCardId: giftCard.id, paymentSessionId: session.id, clientSecret: adapter.clientSecret || null, error: null };
    });
  } catch (error) {
    return { ...denied, error: safeError(error) };
  }
}

export const purchaseGiftCard = graphql.field({
  type: graphql.object<PurchaseResult>()({
    name: "PurchaseGiftCardResult",
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), giftCardId: graphql.field({ type: graphql.String }),
      paymentSessionId: graphql.field({ type: graphql.String }), clientSecret: graphql.field({ type: graphql.String }), error: graphql.field({ type: graphql.String }),
    },
  }),
  args: {
    amount: graphql.arg({ type: graphql.nonNull(graphql.Int) }), recipientEmail: graphql.arg({ type: graphql.String }),
    recipientName: graphql.arg({ type: graphql.String }), message: graphql.arg({ type: graphql.String }),
    purchaserEmail: graphql.arg({ type: graphql.nonNull(graphql.String) }), purchaserName: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    providerCode: graphql.arg({ type: graphql.String }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return purchaseGiftCardTransaction(context, args); },
});

type ConfirmResult = { success: boolean; error: string | null; code: string | null };

export async function confirmGiftCardPurchaseTransaction(context: Context, paymentSessionId: string): Promise<ConfirmResult> {
  let actor;
  try { actor = requireActorPractice(context, permissions.canManageFinance); await assertPracticeRecord(context, "PaymentSession", paymentSessionId); }
  catch (error) { return { success: false, error: error instanceof Error ? error.message : "Payment session not found", code: null }; }
  try {
    const result = await serializableWorkflow(context, "medspa-gift-card", [`session:${paymentSessionId}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const session = await sudo.query.PaymentSession.findOne({
        where: { id: paymentSessionId },
        query: "id status providerReference idempotencyKey amount data payment { id } provider { code adapter config }",
      });
      if (!session?.provider || !session.providerReference || !session.payment) throw new Error("Payment session not found");
      const data = session.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
      if (data.purpose !== "gift_card" || !data.giftCardId) throw new Error("Gift card session is invalid");
      const giftCard = await sudo.query.GiftCard.findOne({ where: { id: data.giftCardId }, query: "id code initialValue recipientEmail recipientName isActive" });
      if (!giftCard) throw new Error("Gift card not found");
      if (session.status === "completed" && giftCard.isActive) return { code: giftCard.code, email: null as null | { to: string; recipientName: string; amount: number; code: string } };
      assertPaymentTransition(session.status as PaymentLifecycleStatus, "completed");
      const providerResult = await confirmProviderPayment({
        provider: paymentProviderFromRecord(session.provider as { code: string; adapter: string; config?: unknown }),
        providerReference: session.providerReference, amount: session.amount,
        idempotencyKey: `${session.idempotencyKey}:confirm`,
      });
      assertPaymentTransition(session.status as PaymentLifecycleStatus, providerResult.status);
      if (providerResult.status !== "completed") throw new Error("Provider has not completed the payment");
      const now = new Date().toISOString();
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: "completed", completedAt: now, data: { ...data, ...(providerResult.data || {}) } }, query: "id" });
      await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: "completed", processedAt: now }, query: "id" });
      await sudo.query.GiftCard.updateOne({ where: { id: giftCard.id }, data: { isActive: true }, query: "id" });
      const existingPurchase = (await sudo.query.GiftCardTransaction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: `${session.idempotencyKey}:purchase` } }, take: 1, query: "id" }))[0];
      if (!existingPurchase) {
        await sudo.query.GiftCardTransaction.createOne({
          data: { practice: { connect: { id: actor.practiceId } }, giftCard: { connect: { id: giftCard.id } }, type: "purchase", amount: giftCard.initialValue, idempotencyKey: `${session.idempotencyKey}:purchase`, notes: `provider:${session.provider.code}` },
          query: "id",
        });
      }
      return {
        code: giftCard.code,
        email: giftCard.recipientEmail ? { to: giftCard.recipientEmail, recipientName: giftCard.recipientName || "There", amount: giftCard.initialValue / 100, code: giftCard.code || "" } : null,
      };
    });
    if (result.email && process.env.NODE_ENV !== "test") {
      try { await sendGiftCardEmail({ ...result.email, senderName: "A client" }); } catch (error) { console.error("Gift card email failed:", error); }
    }
    return { success: true, error: null, code: result.code };
  } catch (error) {
    return { success: false, error: safeError(error), code: null };
  }
}

export const confirmGiftCardPurchase = graphql.field({
  type: graphql.object<ConfirmResult>()({
    name: "ConfirmGiftCardPurchaseResult",
    fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), error: graphql.field({ type: graphql.String }), code: graphql.field({ type: graphql.String }) },
  }),
  args: { paymentSessionId: graphql.arg({ type: graphql.nonNull(graphql.ID) }) },
  resolve(_source, { paymentSessionId }, context: Context) { return confirmGiftCardPurchaseTransaction(context, paymentSessionId); },
});

type BalanceResult = { success: boolean; giftCardId: string | null; transactionId: string | null; currentBalance: number | null; error: string | null };

export async function applyGiftCardBalanceTransaction(
  context: Context,
  args: { giftCardId: string; action: string; amount: number; appointmentId?: string | null; reason?: string | null; idempotencyKey: string },
): Promise<BalanceResult> {
  const denied = { success: false, giftCardId: null, transactionId: null, currentBalance: null };
  let actor;
  try { actor = requireActorPractice(context, permissions.canManageFinance); await assertPracticeRecord(context, "GiftCard", args.giftCardId); if (args.appointmentId) await assertPracticeRecord(context, "Appointment", args.appointmentId); }
  catch (error) { return { ...denied, error: error instanceof Error ? error.message : "Gift card not found" }; }
  if (!new Set(["redemption", "refund"]).has(args.action)) return { ...denied, error: "Gift card action is invalid" };
  if (!Number.isInteger(args.amount) || args.amount <= 0 || args.amount > 10_000_000) return { ...denied, error: "Gift card amount must be positive integer cents" };
  if (!validKey(args.idempotencyKey)) return { ...denied, error: "Idempotency key is invalid" };
  if ((args.reason?.length || 0) > 1_000) return { ...denied, error: "Gift card reason is too long" };

  try {
    return await serializableWorkflow(context, "medspa-gift-card", [`card:${args.giftCardId}`, `balance:${args.idempotencyKey}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.GiftCardTransaction.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1,
        query: "id type amount giftCard { id currentBalance } appointment { id }",
      }))[0];
      if (existing) {
        if (existing.giftCard?.id !== args.giftCardId || existing.type !== args.action || Math.abs(existing.amount) !== args.amount || (existing.appointment?.id || null) !== (args.appointmentId || null)) {
          throw new Error("Idempotency key was already used for another gift card operation");
        }
        return { success: true, giftCardId: args.giftCardId, transactionId: existing.id, currentBalance: existing.giftCard.currentBalance, error: null };
      }
      const giftCard = await sudo.query.GiftCard.findOne({ where: { id: args.giftCardId }, query: "id initialValue currentBalance isActive expiresAt" });
      if (!giftCard) throw new Error("Gift card not found");
      if (giftCard.expiresAt && new Date(giftCard.expiresAt).getTime() <= Date.now()) throw new Error("Gift card has expired");
      if (args.action === "redemption" && (!giftCard.isActive || giftCard.currentBalance < args.amount)) throw new Error("Gift card has insufficient available balance");
      if (args.action === "refund" && giftCard.currentBalance + args.amount > giftCard.initialValue) throw new Error("Gift card refund exceeds its original value");
      if (args.appointmentId) {
        const appointment = await sudo.query.Appointment.findOne({ where: { id: args.appointmentId }, query: "id status" });
        if (!appointment) throw new Error("Gift card appointment not found");
      }
      const currentBalance = args.action === "redemption" ? giftCard.currentBalance - args.amount : giftCard.currentBalance + args.amount;
      const transaction = await sudo.query.GiftCardTransaction.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } }, giftCard: { connect: { id: giftCard.id } }, type: args.action,
          amount: args.action === "redemption" ? -args.amount : args.amount,
          appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : undefined,
          idempotencyKey: args.idempotencyKey, notes: args.reason?.trim() || "",
        },
        query: "id",
      });
      await sudo.query.GiftCard.updateOne({ where: { id: giftCard.id }, data: { currentBalance, isActive: currentBalance > 0 }, query: "id" });
      return { success: true, giftCardId: giftCard.id, transactionId: transaction.id, currentBalance, error: null };
    });
  } catch (error) {
    return { ...denied, error: safeError(error) };
  }
}

export const applyGiftCardBalance = graphql.field({
  type: graphql.object<BalanceResult>()({
    name: "ApplyGiftCardBalanceResult",
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), giftCardId: graphql.field({ type: graphql.ID }),
      transactionId: graphql.field({ type: graphql.ID }), currentBalance: graphql.field({ type: graphql.Int }),
      error: graphql.field({ type: graphql.String }),
    },
  }),
  args: {
    giftCardId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), action: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    amount: graphql.arg({ type: graphql.nonNull(graphql.Int) }), appointmentId: graphql.arg({ type: graphql.ID }),
    reason: graphql.arg({ type: graphql.String }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return applyGiftCardBalanceTransaction(context, args); },
});

export const giftCardMutations = { purchaseGiftCard, confirmGiftCardPurchase, applyGiftCardBalance };
