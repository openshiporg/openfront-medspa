import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "./access";
import { requireActorPractice, assertPracticeRecord } from "./workflowAuth";
import { trustedOrigin } from "./lib/trustedOrigin";
import { sendGiftCardEmail } from "./lib/mail";
import { assertPaymentTransition, paymentRecordStatus, type PaymentLifecycleStatus } from "./payment-lifecycle";
import { createProviderCheckout, getProviderCheckoutStatus, paymentProviderFromRecord } from "./utils/paymentProviderAdapter";
import { cardPaymentFields, decideDepositSettlement, type DepositCheckoutFacts } from "./depositCheckoutCore";
import { onlineDepositProvider } from "./depositCheckout";
import { enqueueRefund, paymentLifecycleTransaction, processRefunds } from "./refunds";
import { CardAmountMismatch, CheckoutQuote, runControlledCheckout, type CheckoutArgs } from "./mutations/completeAppointmentCheckout";

/*
 * Two Stripe Checkout flows that sit beside the booking deposit (depositCheckout.ts) and reuse its rules:
 *  - checkout_card: the front desk charges the visit total by card (keyed in on Stripe's page, or sent to the
 *    client as a payment link). The sale is written only after Stripe reports it paid, by the same
 *    controlled checkout that records cash, so totals, inventory, commissions and benefits stay one code path.
 *  - gift_card: a storefront visitor buys a gift card; it activates when the payment settles.
 * The webhook and the return pages both settle, and both are idempotent.
 */

type Sudo = ReturnType<Context["sudo"]>;
export const HOSTED_PURPOSES = new Set(["checkout_card", "gift_card"]);

function dataOf(session: { data?: unknown } | null | undefined): Record<string, any> {
  return session?.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
}

// ---------------------------------------------------------------- desk card payment

export type DeskCardInput = Omit<CheckoutArgs, "paymentMethod" | "idempotencyKey">;

const DESK_SESSION_QUERY = "id status amount currency providerReference data practice { id } appointment { id } payment { id } provider { id code adapter config }";

export async function openDeskCardSessions(sudo: Sudo, appointmentId: string) {
  const rows = (await sudo.query.PaymentSession.findMany({
    where: { appointment: { id: { equals: appointmentId } }, status: { in: ["pending", "requires_action"] } },
    orderBy: { createdAt: "desc" }, take: 10, query: DESK_SESSION_QUERY,
  })) as any[];
  return rows.filter(row => dataOf(row).purpose === "checkout_card");
}

/** Prices the visit with the controlled checkout (no writes), then opens a Stripe Checkout for exactly that total. */
export async function startDeskCardCheckout(context: Context, input: DeskCardInput) {
  const actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
  await assertPracticeRecord(context, "Appointment", input.appointmentId);
  const canManagePractice = permissions.canManagePractice({ session: context.session as any });
  const sudo = context.sudo();
  const provider = await onlineDepositProvider(sudo, actor.practiceId);
  if (!provider) throw new Error("Card payments need Stripe connected under Payments");

  let quote: CheckoutQuote | null = null;
  try {
    const result = await runControlledCheckout(context, { ...actor, canManagePractice }, { ...input, paymentMethod: "card", idempotencyKey: `card-quote:${randomUUID()}` }, { kind: "quote" });
    if (!result.success) throw new Error(result.error || "Checkout is unavailable");
  } catch (error) {
    if (!(error instanceof CheckoutQuote)) throw error;
    quote = error;
  }
  if (!quote) throw new Error("Checkout is unavailable");
  if (quote.total < 50) throw new Error("Nothing is due by card. Record the checkout as cash");

  const open = (await openDeskCardSessions(sudo, input.appointmentId)).find(row => {
    const data = dataOf(row);
    return row.amount === quote!.total && data.inputHash === inputHash(input) && data.checkoutUrl && Date.parse(data.checkoutExpiresAt || "") > Date.now() + 5 * 60_000;
  });
  if (open) return { url: dataOf(open).checkoutUrl as string, sessionId: open.id as string, amount: quote.total };

  const key = `${actor.practiceId}:checkout-card:${input.appointmentId}:${randomUUID()}`;
  const base = `${trustedOrigin()}/dashboard/platform/checkout/${encodeURIComponent(input.appointmentId)}`;
  const checkout = await createProviderCheckout({
    provider: paymentProviderFromRecord(provider as { code: string; adapter: string; config?: unknown }),
    amount: quote.total, currency: "usd", idempotencyKey: key, description: quote.description,
    successUrl: `${base}?card=return`, cancelUrl: `${base}?card=cancelled`,
    customerEmail: quote.email,
    metadata: { purpose: "checkout_card", appointmentId: input.appointmentId, practiceId: actor.practiceId },
  });
  const sessionId = await paymentLifecycleTransaction(context, `appointment:${input.appointmentId}`, async tx => {
    const session = await tx.query.PaymentSession.createOne({
      data: {
        practice: { connect: { id: actor.practiceId } }, appointment: { connect: { id: input.appointmentId } }, provider: { connect: { id: provider.id } },
        idempotencyKey: key, amount: quote!.total, currency: "usd", status: "pending", providerReference: checkout.providerReference,
        data: {
          purpose: "checkout_card", checkoutUrl: checkout.url, checkoutExpiresAt: checkout.expiresAt, checkoutSessionId: checkout.providerReference,
          // The sale is replayed from this snapshot once Stripe confirms payment.
          input: JSON.parse(JSON.stringify({ ...input, retailItems: input.retailItems ?? [] })), inputHash: inputHash(input), actorId: actor.actorId, canManagePractice,
        },
      },
      query: "id",
    });
    // Linked to the appointment only when the sale is written, because Appointment.payment means "checked out".
    const payment = await tx.query.Payment.createOne({
      data: {
        idempotencyKey: `${key}:payment`, practice: { connect: { id: actor.practiceId } }, session: { connect: { id: session.id } },
        subtotal: quote!.total, tax: 0, tip: 0, discount: 0, totalAmount: quote!.total, paymentMethod: "credit_card", status: "pending",
        receiptEmail: quote!.email || "", notes: `Card payment for appointment ${input.appointmentId}`,
      },
      query: "id",
    });
    await tx.query.PaymentSession.updateOne({ where: { id: session.id }, data: { payment: { connect: { id: payment.id } } }, query: "id" });
    return session.id as string;
  });
  return { url: checkout.url, sessionId, amount: quote.total };
}

function inputHash(input: DeskCardInput) {
  return createHash("sha256").update(JSON.stringify({
    a: input.appointmentId, t: input.tipAmount, d: input.discountAmount, r: input.discountReason || null,
    i: input.retailItems ?? [], p: input.clientPackageId || null, m: input.clientMembershipId || null,
  })).digest("hex");
}

export type HostedSettleOutcome = "completed" | "expired" | "review" | "refund_queued" | "none";

/** Applies a Checkout fact to a desk card session: paid writes the sale; a sale that can no longer be written is refunded. */
export async function settleDeskCardCheckout(context: Context, sessionId: string, facts: DepositCheckoutFacts): Promise<{ outcome: HostedSettleOutcome; refundAttemptId: string | null; error?: string | null }> {
  const sudo = context.sudo();
  const session: any = await sudo.query.PaymentSession.findOne({ where: { id: sessionId }, query: DESK_SESSION_QUERY });
  const data = dataOf(session);
  if (!session || data.purpose !== "checkout_card" || !session.practice?.id || !session.appointment?.id) return { outcome: "none", refundAttemptId: null };
  const decision = decideDepositSettlement({ status: session.status, amount: session.amount, currency: session.currency, providerReference: data.checkoutSessionId || session.providerReference }, facts);
  if (decision.action === "none") return { outcome: "none", refundAttemptId: null };
  if (decision.action === "review") {
    await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { data: { ...data, needsReview: true, reviewReason: decision.reason } }, query: "id" });
    return { outcome: "review", refundAttemptId: null };
  }
  if (decision.action === "expire") {
    await paymentLifecycleTransaction(context, `session:${session.id}`, async tx => {
      const current: any = await tx.query.PaymentSession.findOne({ where: { id: session.id }, query: "status" });
      if (!["pending", "requires_action"].includes(current?.status)) return;
      await tx.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: "cancelled", failedAt: new Date().toISOString() }, query: "id" });
      if (session.payment?.id) await tx.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: paymentRecordStatus("cancelled") }, query: "id" });
    });
    return { outcome: "expired", refundAttemptId: null };
  }

  const input = data.input as DeskCardInput;
  let error: string | null = null;
  try {
    const result = await runControlledCheckout(context, { actorId: data.actorId, practiceId: session.practice.id, canManagePractice: data.canManagePractice === true },
      { ...input, paymentMethod: "card", idempotencyKey: `card-checkout:${session.id}` },
      { kind: "card", sessionId: session.id, paymentIntentId: decision.paymentIntentId });
    if (result.success) return { outcome: "completed", refundAttemptId: null };
    error = result.error;
  } catch (failure) {
    error = failure instanceof CardAmountMismatch ? "The visit total changed after the card was charged" : failure instanceof Error ? failure.message : "Checkout failed";
  }

  // The card is paid but the sale could not be written (already checked out, total changed, ...): give it back.
  const refundAttemptId = await paymentLifecycleTransaction(context, `session:${session.id}`, async tx => {
    const current: any = await tx.query.PaymentSession.findOne({ where: { id: session.id }, query: "status data" });
    if (!["pending", "requires_action"].includes(current?.status) || dataOf(current).transactionId) return null; // settled concurrently
    const now = new Date().toISOString();
    assertPaymentTransition(current.status as PaymentLifecycleStatus, "completed");
    await tx.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: "completed", completedAt: now, providerReference: decision.paymentIntentId, data: { ...dataOf(current), paymentIntentId: decision.paymentIntentId, checkoutUrl: null, failedCheckout: error } }, query: "id" });
    if (!session.payment?.id) return null;
    await tx.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: "completed", processedAt: now, stripePaymentIntentId: decision.paymentIntentId, ...cardPaymentFields(facts.card) }, query: "id" });
    const queued = await enqueueRefund(tx, {
      practiceId: session.practice.id, paymentId: session.payment.id, sessionId: session.id, amountMinor: session.amount, currencyCode: session.currency,
      reason: `Card paid but checkout was not completed: ${error}`.slice(0, 500), idempotencyKey: `${session.practice.id}:card-unapplied:${session.id}`,
      providerReference: decision.paymentIntentId, actorId: null,
    });
    return queued.attemptId;
  });
  return refundAttemptId ? { outcome: "refund_queued", refundAttemptId, error } : { outcome: "completed", refundAttemptId: null };
}

/** The desk returns from Stripe (or presses "Check card payment"): read each open card session back from Stripe. */
export async function confirmDeskCardCheckout(context: Context, appointmentId: string) {
  requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
  await assertPracticeRecord(context, "Appointment", appointmentId);
  const sessions = await openDeskCardSessions(context.sudo(), appointmentId);
  let outcome: HostedSettleOutcome = "none";
  let error: string | null = null;
  for (const session of sessions) {
    const facts = await getProviderCheckoutStatus({ provider: paymentProviderFromRecord(session.provider), providerReference: dataOf(session).checkoutSessionId || session.providerReference });
    const settled = await settleDeskCardCheckout(context, session.id, facts);
    if (settled.refundAttemptId) await processRefunds(context, [settled.refundAttemptId]).catch(() => undefined);
    if (settled.outcome !== "none" && outcome !== "completed") { outcome = settled.outcome; error = settled.error || null; }
  }
  return { outcome, error };
}

// ---------------------------------------------------------------- online gift cards

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GIFT_CARD_MIN = 2_500;
export const GIFT_CARD_MAX = 50_000;

export function giftCardAccessToken(sessionId: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`medspa-gift-card:${sessionId}`).digest("base64url");
}
function validGiftCardToken(sessionId: string, token: string | null | undefined) {
  const expected = giftCardAccessToken(sessionId);
  if (!expected || typeof token !== "string" || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function giftCardCode(seed: string) {
  return createHash("sha256").update(seed).digest("hex").slice(0, 12).toUpperCase().match(/.{1,4}/g)!.join("-");
}

export type OnlineGiftCardInput = {
  amount: number; purchaserName: string; purchaserEmail: string;
  recipientName?: string | null; recipientEmail?: string | null; message?: string | null;
};

export function validateOnlineGiftCard(input: OnlineGiftCardInput) {
  if (!Number.isInteger(input.amount) || input.amount < GIFT_CARD_MIN || input.amount > GIFT_CARD_MAX) return "Gift card amount must be between $25 and $500";
  const purchaserName = (input.purchaserName || "").trim();
  const purchaserEmail = (input.purchaserEmail || "").trim().toLowerCase();
  const recipientEmail = (input.recipientEmail || "").trim().toLowerCase() || purchaserEmail;
  if (!purchaserName) return "Gift card purchaser name is required";
  if (!EMAIL.test(purchaserEmail) || !EMAIL.test(recipientEmail)) return "Gift card email is invalid";
  if (purchaserName.length > 120 || (input.recipientName?.length || 0) > 120 || (input.message?.length || 0) > 500) return "Gift card details are too long";
  return null;
}

/** The one practice this storefront sells for: active, published, with an active primary location. */
async function storefrontPractice(sudo: Sudo) {
  const rows = await sudo.query.Practice.findMany({
    where: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } },
    take: 2, query: "id name",
  });
  if (rows.length !== 1) throw new Error("Gift cards aren't available online right now");
  return rows[0] as { id: string; name: string };
}

export async function startGiftCardCheckout(context: Context, input: OnlineGiftCardInput) {
  const invalid = validateOnlineGiftCard(input);
  if (invalid) throw new Error(invalid);
  const sudo = context.sudo();
  const practice = await storefrontPractice(sudo);
  const provider = await onlineDepositProvider(sudo, practice.id);
  if (!provider) throw new Error("Gift cards aren't available online right now");
  const purchaserEmail = input.purchaserEmail.trim().toLowerCase();
  const recipientEmail = (input.recipientEmail || "").trim().toLowerCase() || purchaserEmail;
  const purchaserName = input.purchaserName.trim();
  const recipientName = input.recipientName?.trim() || purchaserName;
  const ref = randomUUID();
  const key = `${practice.id}:gift-card-online:${ref}`;
  const token = giftCardAccessToken(ref);
  if (!token) throw new Error("Gift cards aren't available online right now");
  const back = `${trustedOrigin()}/gift-cards?ref=${encodeURIComponent(ref)}&token=${encodeURIComponent(token)}`;
  const checkout = await createProviderCheckout({
    provider: paymentProviderFromRecord(provider as { code: string; adapter: string; config?: unknown }),
    amount: input.amount, currency: "usd", idempotencyKey: key, description: `${practice.name} gift card`,
    successUrl: `${back}&purchase=return`, cancelUrl: `${back}&purchase=cancelled`, customerEmail: purchaserEmail,
    metadata: { purpose: "gift_card", practiceId: practice.id },
  });
  const signedIn = context.session?.itemId ? await sudo.query.User.findOne({ where: { id: context.session.itemId }, query: "id practice { id }" }) : null;
  await paymentLifecycleTransaction(context, `gift-card:${key}`, async tx => {
    const giftCard = await tx.query.GiftCard.createOne({
      data: {
        practice: { connect: { id: practice.id } }, code: giftCardCode(key), initialValue: input.amount, currentBalance: input.amount,
        recipientEmail, recipientName, message: input.message?.trim() || "", isActive: false,
        ...(signedIn?.practice?.id === practice.id ? { purchasedBy: { connect: { id: signedIn.id } } } : {}),
      },
      query: "id",
    });
    const session = await tx.query.PaymentSession.createOne({
      data: {
        practice: { connect: { id: practice.id } }, provider: { connect: { id: provider.id } }, idempotencyKey: key,
        amount: input.amount, currency: "usd", status: "pending", providerReference: checkout.providerReference,
        data: { purpose: "gift_card", channel: "online", giftCardId: giftCard.id, checkoutUrl: checkout.url, checkoutExpiresAt: checkout.expiresAt, checkoutSessionId: checkout.providerReference, purchaserName, purchaserEmail, ref },
      },
      query: "id",
    });
    const sessionId = session.id;
    const payment = await tx.query.Payment.createOne({
      data: {
        idempotencyKey: `${key}:payment`, practice: { connect: { id: practice.id } }, session: { connect: { id: sessionId } },
        subtotal: input.amount, tax: 0, tip: 0, discount: 0, totalAmount: input.amount, paymentMethod: "credit_card", status: "pending",
        receiptEmail: purchaserEmail, notes: `Online gift card for ${recipientName}`,
      },
      query: "id",
    });
    await tx.query.PaymentSession.updateOne({ where: { id: sessionId }, data: { payment: { connect: { id: payment.id } } }, query: "id" });
  });
  return { url: checkout.url };
}

type GiftCardEmail = { to: string; recipientName: string; senderName: string; amount: number; code: string; message?: string };

/** Activates the gift card when Stripe reports the Checkout paid. Run under the session's lifecycle lock. */
export async function settleGiftCardCheckout(sudo: Sudo, sessionId: string, facts: DepositCheckoutFacts): Promise<{ outcome: HostedSettleOutcome; email: GiftCardEmail | null }> {
  const session: any = await sudo.query.PaymentSession.findOne({ where: { id: sessionId }, query: "id status amount currency providerReference idempotencyKey data practice { id } payment { id }" });
  const data = dataOf(session);
  if (!session || data.purpose !== "gift_card" || data.channel !== "online" || !data.giftCardId) return { outcome: "none", email: null };
  const decision = decideDepositSettlement({ status: session.status, amount: session.amount, currency: session.currency, providerReference: data.checkoutSessionId || session.providerReference }, facts);
  const now = new Date().toISOString();
  if (decision.action === "none") return { outcome: "none", email: null };
  if (decision.action === "review") {
    await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { data: { ...data, needsReview: true, reviewReason: decision.reason } }, query: "id" });
    return { outcome: "review", email: null };
  }
  if (decision.action === "expire") {
    await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: "cancelled", failedAt: now }, query: "id" });
    if (session.payment?.id) await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: paymentRecordStatus("cancelled") }, query: "id" });
    return { outcome: "expired", email: null };
  }
  assertPaymentTransition(session.status as PaymentLifecycleStatus, "completed");
  await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: "completed", completedAt: now, providerReference: decision.paymentIntentId, data: { ...data, paymentIntentId: decision.paymentIntentId, checkoutUrl: null } }, query: "id" });
  if (session.payment?.id) await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: "completed", processedAt: now, stripePaymentIntentId: decision.paymentIntentId, ...cardPaymentFields(facts.card) }, query: "id" });
  const giftCard: any = await sudo.query.GiftCard.findOne({ where: { id: data.giftCardId }, query: "id code initialValue recipientEmail recipientName message" });
  if (!giftCard) return { outcome: "review", email: null };
  await sudo.query.GiftCard.updateOne({ where: { id: giftCard.id }, data: { isActive: true }, query: "id" });
  const purchaseKey = `${session.idempotencyKey}:purchase`;
  const existing = (await sudo.query.GiftCardTransaction.findMany({ where: { idempotencyKey: { equals: purchaseKey } }, take: 1, query: "id" }))[0];
  if (!existing) {
    await sudo.query.GiftCardTransaction.createOne({
      data: { practice: { connect: { id: session.practice.id } }, giftCard: { connect: { id: giftCard.id } }, type: "purchase", amount: giftCard.initialValue, idempotencyKey: purchaseKey, notes: `online:${decision.paymentIntentId}` },
      query: "id",
    });
  }
  return {
    outcome: "completed",
    email: giftCard.recipientEmail ? { to: giftCard.recipientEmail, recipientName: giftCard.recipientName || "there", senderName: data.purchaserName || "A friend", amount: giftCard.initialValue / 100, code: giftCard.code, message: giftCard.message || undefined } : null,
  };
}

export async function deliverGiftCardEmail(email: GiftCardEmail | null) {
  if (!email || process.env.NODE_ENV === "test") return;
  await sendGiftCardEmail(email).catch(error => console.error("Gift card email failed:", error));
}

export type GiftCardPurchaseView = { status: "paid" | "pending" | "expired" | "review"; amount: number; code: string | null; recipientName: string | null; recipientEmail: string | null };

/** Return page: reconcile with Stripe, then show the card. The bearer token comes from the success URL we built. */
export async function giftCardPurchaseStatus(context: Context, ref: string, token: string): Promise<GiftCardPurchaseView | null> {
  if (!/^[0-9a-f-]{36}$/.test(ref) || !validGiftCardToken(ref, token)) return null;
  const sudo = context.sudo();
  const session: any = (await sudo.query.PaymentSession.findMany({ where: { idempotencyKey: { endsWith: `:gift-card-online:${ref}` } }, take: 1, query: "id status amount providerReference data provider { code adapter config }" }))[0];
  const data = dataOf(session);
  if (!session || data.purpose !== "gift_card" || data.channel !== "online" || data.ref !== ref) return null;
  const sessionId = session.id as string;
  if (["pending", "requires_action"].includes(session.status) && session.provider) {
    const facts = await getProviderCheckoutStatus({ provider: paymentProviderFromRecord(session.provider), providerReference: data.checkoutSessionId || session.providerReference });
    const settled = await paymentLifecycleTransaction(context, `session-checkout:${session.id}`, tx => settleGiftCardCheckout(tx, session.id, facts));
    await deliverGiftCardEmail(settled.email);
  }
  const current: any = await sudo.query.PaymentSession.findOne({ where: { id: sessionId }, query: "status amount data" });
  const giftCard: any = await sudo.query.GiftCard.findOne({ where: { id: data.giftCardId }, query: "code isActive recipientName recipientEmail" });
  const paid = current.status === "completed" && giftCard?.isActive;
  return {
    status: paid ? "paid" : dataOf(current).needsReview ? "review" : current.status === "cancelled" ? "expired" : "pending",
    amount: current.amount, code: paid ? giftCard.code : null, recipientName: giftCard?.recipientName || null, recipientEmail: giftCard?.recipientEmail || null,
  };
}

// ---------------------------------------------------------------- webhook

/**
 * Settles a hosted-checkout webhook for these purposes. Returns null when the session belongs to another flow
 * (booking deposits keep their own transactional path in payment-webhook.ts).
 */
export async function settleHostedCheckoutWebhook(context: Context, providerId: string, checkout: DepositCheckoutFacts): Promise<{ applied: boolean; outcome: HostedSettleOutcome } | null> {
  const refs = [checkout.providerReference, checkout.paymentIntentId].filter((value): value is string => Boolean(value));
  const target = await context.sudo().query.PaymentSession.findMany({ where: { provider: { id: { equals: providerId } }, providerReference: { in: refs } }, take: 2, query: "id data" });
  if (target.length !== 1 || !HOSTED_PURPOSES.has(dataOf(target[0]).purpose)) return null;
  const sessionId = target[0].id as string;
  if (dataOf(target[0]).purpose === "checkout_card") {
    const settled = await settleDeskCardCheckout(context, sessionId, checkout);
    if (settled.refundAttemptId) await processRefunds(context, [settled.refundAttemptId]).catch(() => undefined);
    return { applied: settled.outcome !== "none", outcome: settled.outcome };
  }
  const settled = await paymentLifecycleTransaction(context, `session-checkout:${sessionId}`, tx => settleGiftCardCheckout(tx, sessionId, checkout));
  await deliverGiftCardEmail(settled.email);
  return { applied: settled.outcome !== "none", outcome: settled.outcome };
}

// ---------------------------------------------------------------- GraphQL

const DeskCardResult = graphql.object<{ success: boolean; error: string | null; url: string | null; amount: number | null; outcome: string | null }>()({
  name: "DeskCardCheckoutResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), error: graphql.field({ type: graphql.String }),
    url: graphql.field({ type: graphql.String }), amount: graphql.field({ type: graphql.Int }), outcome: graphql.field({ type: graphql.String }),
  },
});

const message = (error: unknown, fallback: string) => {
  const text = error instanceof Error ? error.message : "";
  if (!text || /prisma|database|ECONN|stripe/i.test(text)) { console.error(fallback, error); return fallback; }
  return text.slice(0, 300);
};

export const startCardCheckout = graphql.field({
  type: graphql.nonNull(DeskCardResult),
  args: {
    appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), tipAmount: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
    discountAmount: graphql.arg({ type: graphql.nonNull(graphql.Int) }), discountReason: graphql.arg({ type: graphql.String }),
    retailItems: graphql.arg({ type: graphql.JSON }), clientPackageId: graphql.arg({ type: graphql.ID }), clientMembershipId: graphql.arg({ type: graphql.ID }),
  },
  async resolve(_source, args, context: Context) {
    try {
      const { url, amount } = await startDeskCardCheckout(context, args as DeskCardInput);
      return { success: true, error: null, url, amount, outcome: null };
    } catch (error) { return { success: false, error: message(error, "The card payment page could not be opened"), url: null, amount: null, outcome: null }; }
  },
});

export const confirmCardCheckout = graphql.field({
  type: graphql.nonNull(DeskCardResult),
  args: { appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }) },
  async resolve(_source, { appointmentId }, context: Context) {
    try {
      const { outcome, error } = await confirmDeskCardCheckout(context, appointmentId);
      return { success: true, error, url: null, amount: null, outcome };
    } catch (error) { return { success: false, error: message(error, "The card payment could not be checked"), url: null, amount: null, outcome: null }; }
  },
});

export const purchaseGiftCardOnline = graphql.field({
  type: graphql.nonNull(graphql.object<{ success: boolean; error: string | null; url: string | null }>()({
    name: "PurchaseGiftCardOnlineResult",
    fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), error: graphql.field({ type: graphql.String }), url: graphql.field({ type: graphql.String }) },
  })),
  args: {
    amount: graphql.arg({ type: graphql.nonNull(graphql.Int) }), purchaserName: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    purchaserEmail: graphql.arg({ type: graphql.nonNull(graphql.String) }), recipientName: graphql.arg({ type: graphql.String }),
    recipientEmail: graphql.arg({ type: graphql.String }), message: graphql.arg({ type: graphql.String }),
  },
  async resolve(_source, args, context: Context) {
    try { return { success: true, error: null, ...(await startGiftCardCheckout(context, args)) }; }
    catch (error) { return { success: false, error: message(error, "The gift card payment page could not be opened"), url: null }; }
  },
});

/** Mutation because reading the purchase back reconciles it with Stripe. */
export const confirmGiftCardOnline = graphql.field({
  type: graphql.object<GiftCardPurchaseView>()({
    name: "StorefrontGiftCardPurchase",
    fields: {
      status: graphql.field({ type: graphql.nonNull(graphql.String) }), amount: graphql.field({ type: graphql.nonNull(graphql.Int) }),
      code: graphql.field({ type: graphql.String }), recipientName: graphql.field({ type: graphql.String }), recipientEmail: graphql.field({ type: graphql.String }),
    },
  }),
  args: { ref: graphql.arg({ type: graphql.nonNull(graphql.ID) }), token: graphql.arg({ type: graphql.nonNull(graphql.String) }) },
  async resolve(_source, { ref, token }, context: Context) {
    try { return await giftCardPurchaseStatus(context, ref, token); } catch (error) { console.error("Gift card status failed", error); return null; }
  },
});
