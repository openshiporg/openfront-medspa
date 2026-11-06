import { createHash } from "node:crypto";
import type { Context } from ".keystone/types";
import { canTransitionPayment, paymentRecordStatus, type PaymentLifecycleStatus } from "./payment-lifecycle";
import { parseProviderWebhook, paymentProviderFromRecord } from "./utils/paymentProviderAdapter";
import { processRefundOutbox, reconcileRefundFromWebhook, signalRefundRecheck } from "./refundOutbox";
import { settleDepositCheckout } from "./depositCheckout";
import { settleHostedCheckoutWebhook } from "./hostedCheckouts";

export type PaymentWebhookOutcome = {
  replayed: boolean;
  processed: boolean;
  status: string;
};

export async function reconcilePaymentWebhook(
  context: Context,
  providerCode: string,
  payload: string,
  headers: Record<string, string | undefined>,
): Promise<PaymentWebhookOutcome> {
  const provider = (await context.sudo().query.PaymentProvider.findMany({
    where: { code: { equals: providerCode }, isInstalled: { equals: true } },
    take: 1,
    query: "id code adapter config practice { id }",
  }))[0];
  if (!provider || provider.adapter !== "stripe") throw new Error("Payment webhook provider not found");

  // Signature verification happens before parsing, logging, elevation, or writes.
  const event = await parseProviderWebhook({
    provider: paymentProviderFromRecord(provider as { code: string; adapter: string; config?: unknown }),
    payload,
    headers,
  });
  if (!event.isValid || !event.eventId) throw new Error("Invalid payment webhook");

  const replayKey = `${provider.id}:${event.eventId}`;
  const payloadHash = createHash("sha256").update(payload).digest("hex");

  // Refund events belong to the outbox. They are applied through its own transactions (so not inside
  // the one below) and are idempotent, so a crash between apply and the receipt just replays safely.
  if (event.refund || event.refundSignal) {
    const sudo = context.sudo();
    const seen = (await (sudo.query as any).PaymentWebhookEvent.findMany({ where: { replayKey: { equals: replayKey } }, take: 1, query: "id status" }))[0];
    if (seen) return { replayed: true, processed: seen.status === "processed", status: seen.status };
    let applied = false;
    if (event.refund) applied = (await reconcileRefundFromWebhook(context, provider.code, event.refund)) === "applied";
    else if (event.providerReference) applied = (await signalRefundRecheck(context, event.providerReference)) > 0;
    const status = applied ? "processed" : "ignored";
    await (sudo.query as any).PaymentWebhookEvent.createOne({
      data: {
        practice: { connect: { id: provider.practice.id } }, provider: { connect: { id: provider.id } }, replayKey, eventId: event.eventId,
        type: event.type, providerReference: event.providerReference || "", payloadHash, status, data: event.data || {}, processedAt: new Date().toISOString(),
      },
      query: "id",
    }).catch(() => undefined); // a concurrent delivery of the same event already recorded it
    return { replayed: false, processed: applied, status };
  }

  // Desk card payments and online gift cards settle through their own locked workflows (the card one writes the sale).
  if (event.checkout) {
    const sudo = context.sudo();
    const seen = (await (sudo.query as any).PaymentWebhookEvent.findMany({ where: { replayKey: { equals: replayKey } }, take: 1, query: "id status" }))[0];
    if (seen) return { replayed: true, processed: seen.status === "processed", status: seen.status };
    const hosted = await settleHostedCheckoutWebhook(context, provider.id, event.checkout);
    if (hosted) {
      const status = hosted.applied ? "processed" : "ignored";
      await (sudo.query as any).PaymentWebhookEvent.createOne({
        data: {
          practice: { connect: { id: provider.practice.id } }, provider: { connect: { id: provider.id } }, replayKey, eventId: event.eventId,
          type: event.type, providerReference: event.providerReference || "", payloadHash, status, data: { ...(event.data || {}), outcome: hosted.outcome }, processedAt: new Date().toISOString(),
        },
        query: "id",
      }).catch(() => undefined);
      return { replayed: false, processed: hosted.applied, status };
    }
  }

  let refundAttemptToKick: string | null = null;
  const outcome = await context.transaction(async (transactionContext: Context) => {
    await transactionContext.prisma.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
      "medspa-payment-webhook",
      replayKey,
    );
    if (event.providerReference) {
      await transactionContext.prisma.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
        "medspa-payment-webhook-session",
        event.providerReference,
      );
    }
    const sudo = transactionContext.sudo();
    const existing = (await (sudo.query as any).PaymentWebhookEvent.findMany({
      where: { replayKey: { equals: replayKey } },
      take: 1,
      query: "id status",
    }))[0];
    if (existing) return { replayed: true, processed: existing.status === "processed", status: existing.status };

    if (event.checkout) {
      // Hosted-checkout events settle booking deposits. Correlate by the Checkout/intent id we stored, never by metadata.
      const refs = [event.checkout.providerReference, event.checkout.paymentIntentId].filter((value): value is string => Boolean(value));
      const target = (await sudo.query.PaymentSession.findMany({
        where: { provider: { id: { equals: provider.id } }, providerReference: { in: refs } }, take: 2, query: "id",
      }));
      let settled: Awaited<ReturnType<typeof settleDepositCheckout>> = { outcome: "none", refundAttemptId: null };
      if (target.length === 1) {
        await transactionContext.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", "medspa-payment-lifecycle", `session-checkout:${target[0].id}`);
        settled = await settleDepositCheckout(sudo, target[0].id, event.checkout);
        refundAttemptToKick = settled.refundAttemptId;
      }
      const applied = settled.outcome === "completed" || settled.outcome === "expired" || settled.outcome === "refund_queued";
      await (sudo.query as any).PaymentWebhookEvent.createOne({
        data: {
          practice: { connect: { id: provider.practice.id } }, provider: { connect: { id: provider.id } }, replayKey, eventId: event.eventId,
          type: event.type, providerReference: event.providerReference || "", payloadHash,
          status: applied ? "processed" : "ignored", data: { ...(event.data || {}), outcome: settled.outcome }, processedAt: new Date().toISOString(),
        },
        query: "id",
      });
      return { replayed: false, processed: applied, status: applied ? "processed" : "ignored" };
    }

    const sessions = event.providerReference
      ? await sudo.query.PaymentSession.findMany({
          where: {
            providerReference: { equals: event.providerReference },
            provider: { id: { equals: provider.id } },
          },
          take: 1,
          query: "id status amount idempotencyKey data payment { id status refundedAmount } appointment { id }",
        })
      : [];
    const session = sessions[0];
    let eventStatus: "processed" | "ignored" = "ignored";
    let targetStatus = event.status;

    if (session && targetStatus) {
      if (targetStatus === "refunded" && event.amount != null && event.amount < session.amount) {
        targetStatus = "partially_refunded";
      }
      if (!canTransitionPayment(session.status as PaymentLifecycleStatus, targetStatus)) {
        targetStatus = null;
      }
    }

    if (session && targetStatus) {
      const now = new Date().toISOString();
      const sessionData = session.data && typeof session.data === "object" ? session.data as Record<string, any> : {};
      await sudo.query.PaymentSession.updateOne({
        where: { id: session.id },
        data: {
          status: targetStatus,
          ...(targetStatus === "completed" ? { completedAt: now } : {}),
          ...(targetStatus === "refunded" || targetStatus === "partially_refunded" ? { refundedAt: now } : {}),
          data: { ...sessionData, ...(event.data || {}), lastWebhookEventId: event.eventId },
        },
        query: "id",
      });
      if (session.payment?.id) {
        await sudo.query.Payment.updateOne({
          where: { id: session.payment.id },
          data: {
            status: paymentRecordStatus(targetStatus),
            ...(targetStatus === "completed" ? { processedAt: now } : {}),
            ...(targetStatus === "refunded" || targetStatus === "partially_refunded"
              ? { refundedAmount: event.amount ?? session.amount, refundedAt: now }
              : {}),
          },
          query: "id",
        });
      }
      if (targetStatus === "completed" && sessionData.purpose === "gift_card" && typeof sessionData.giftCardId === "string") {
        const giftCard = await sudo.query.GiftCard.findOne({ where: { id: sessionData.giftCardId }, query: "id initialValue practice { id }" });
        if (giftCard) {
          await sudo.query.GiftCard.updateOne({ where: { id: giftCard.id }, data: { isActive: true }, query: "id" });
          const purchaseKey = `${session.idempotencyKey}:purchase`;
          const purchase = (await sudo.query.GiftCardTransaction.findMany({ where: { idempotencyKey: { equals: purchaseKey } }, take: 1, query: "id" }))[0];
          if (!purchase) await sudo.query.GiftCardTransaction.createOne({
            data: { practice: { connect: { id: provider.practice.id } }, giftCard: { connect: { id: giftCard.id } }, type: "purchase", amount: giftCard.initialValue, idempotencyKey: purchaseKey, notes: `webhook:${event.eventId}` },
            query: "id",
          });
        }
      }
      if (session.appointment?.id && sessionData.purpose === "appointment_deposit") {
        if (targetStatus === "completed") {
          await sudo.query.Appointment.updateOne({ where: { id: session.appointment.id }, data: { depositPaid: true, status: "confirmed", confirmedAt: now }, query: "id" });
        } else if (targetStatus === "refunded") {
          await sudo.query.Appointment.updateOne({ where: { id: session.appointment.id }, data: { depositPaid: false }, query: "id" });
        }
      }
      // Processor completion never marks treatment or appointment completion.
      eventStatus = "processed";
    }

    await (sudo.query as any).PaymentWebhookEvent.createOne({
      data: {
        practice: { connect: { id: provider.practice.id } }, provider: { connect: { id: provider.id } }, replayKey, eventId: event.eventId,
        type: event.type, providerReference: event.providerReference || "", payloadHash,
        status: eventStatus, data: event.data || {}, processedAt: new Date().toISOString(),
      },
      query: "id",
    });
    return { replayed: false, processed: eventStatus === "processed", status: eventStatus };
  }, { maxWait: 5_000, timeout: 30_000 });
  if (refundAttemptToKick) await processRefundOutbox(context, { attemptIds: [refundAttemptToKick], limit: 1 }).catch(() => undefined);
  return outcome;
}
