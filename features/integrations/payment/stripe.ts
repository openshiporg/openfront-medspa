import Stripe from "stripe";
import {
  ProviderRejectedError,
  type PaymentAdapter,
  type PaymentAdapterStatus,
  type PaymentWebhookRefund,
  type ProviderRefund,
  type ProviderRefundStatus,
} from "./types";

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function stripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured");
  // A bounded retry budget; idempotency keys make the retries safe.
  return new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 30_000 });
}

/**
 * Stripe answered with a definitive 4xx: nothing was created. Connection errors, timeouts,
 * 5xx and rate limits are ambiguous and are rethrown untouched so the caller records `unknown`.
 */
function definitiveRejection(error: unknown): ProviderRejectedError | null {
  const stripeError = error as { type?: string; statusCode?: number; message?: string; code?: string };
  const status = stripeError?.statusCode;
  if (stripeError?.type === "StripeInvalidRequestError" || stripeError?.type === "StripeCardError") {
    if (typeof status === "number" && status >= 400 && status < 500 && status !== 429 && status !== 409) {
      return new ProviderRejectedError(stripeError.message || "Stripe rejected the request", stripeError.code);
    }
  }
  return null;
}

function mapRefundStatus(status: string | null | undefined): ProviderRefundStatus {
  if (status === "succeeded") return "succeeded";
  if (status === "failed") return "failed";
  if (status === "canceled") return "canceled";
  if (status === "requires_action") return "requires_action";
  return "pending";
}

function toProviderRefund(refund: Stripe.Refund): ProviderRefund {
  return {
    providerRefundId: refund.id,
    status: mapRefundStatus(refund.status),
    amount: refund.amount,
    currency: refund.currency,
    failureReason: refund.failure_reason ?? null,
  };
}

function refundPaymentIntent(refund: Stripe.Refund): string | null {
  const intent = refund.payment_intent;
  return intent ? (typeof intent === "string" ? intent : intent.id) : null;
}

function mapCheckoutState(session: Stripe.Checkout.Session): "paid" | "open" | "expired" | "unpaid" {
  if (session.payment_status === "paid") return "paid";
  if (session.status === "expired") return "expired";
  if (session.status === "open") return "open";
  return "unpaid";
}

function sessionPaymentIntent(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  return intent ? (typeof intent === "string" ? intent : intent.id) : null;
}

function mapStatus(status: Stripe.PaymentIntent.Status): PaymentAdapterStatus {
  if (status === "succeeded") return "completed";
  if (status === "requires_action" || status === "requires_payment_method" || status === "requires_confirmation") return "requires_action";
  if (status === "processing") return "authorized";
  if (status === "canceled") return "cancelled";
  return "pending";
}

export const stripePaymentAdapter: PaymentAdapter = {
  async createSession({ amount, currency, idempotencyKey, metadata }) {
    const intent = await stripeClient().paymentIntents.create(
      {
        amount,
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata,
      },
      { idempotencyKey },
    );
    return {
      status: mapStatus(intent.status),
      providerReference: intent.id,
      clientSecret: intent.client_secret,
      data: { status: intent.status },
    };
  },
  async confirm({ providerReference }) {
    const intent = await stripeClient().paymentIntents.retrieve(providerReference);
    return {
      status: mapStatus(intent.status),
      providerReference,
      amount: intent.amount_received,
      data: { status: intent.status },
    };
  },
  async refund({ providerReference, amount, currency, idempotencyKey, metadata }) {
    let refund: Stripe.Refund;
    try {
      refund = await stripeClient().refunds.create(
        { payment_intent: providerReference, ...(amount ? { amount } : {}), ...(metadata ? { metadata } : {}) },
        { idempotencyKey },
      );
    } catch (error) {
      throw definitiveRejection(error) ?? error;
    }
    if (currency && refund.currency !== currency.toLowerCase()) throw new Error("Stripe refund currency does not match the payment");
    return {
      status: refund.status === "succeeded" ? "refunded" : "pending",
      providerReference,
      amount: refund.amount,
      currency: refund.currency,
      data: { refundId: refund.id, status: refund.status, failureReason: refund.failure_reason ?? null },
    };
  },
  async getRefundStatus({ providerReference, providerRefundId, attemptId }) {
    const stripe = stripeClient();
    if (providerRefundId) return toProviderRefund(await stripe.refunds.retrieve(providerRefundId));
    // The submit may have reached Stripe without the response reaching us: find it by the attempt id we stamped on it.
    for await (const refund of stripe.refunds.list({ payment_intent: providerReference, limit: 100 })) {
      if (refund.metadata?.refundAttemptId === attemptId) return toProviderRefund(refund);
    }
    return null;
  },
  async createCheckout({ amount, currency, idempotencyKey, description, successUrl, cancelUrl, customerEmail, metadata }) {
    let session: Stripe.Checkout.Session;
    try {
      session = await stripeClient().checkout.sessions.create(
        {
          mode: "payment",
          line_items: [{ quantity: 1, price_data: { currency: currency.toLowerCase(), unit_amount: amount, product_data: { name: description } } }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          ...(customerEmail ? { customer_email: customerEmail } : {}),
          metadata,
          payment_intent_data: { metadata },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
        { idempotencyKey },
      );
    } catch (error) {
      throw definitiveRejection(error) ?? error;
    }
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { providerReference: session.id, url: session.url, expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null };
  },
  async getCheckoutStatus({ providerReference }) {
    const session = await stripeClient().checkout.sessions.retrieve(providerReference);
    return {
      providerReference: session.id,
      state: mapCheckoutState(session),
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "",
      paymentIntentId: sessionPaymentIntent(session),
      metadata: (session.metadata || {}) as Record<string, string>,
    };
  },
  async parseWebhook({ payload, headers }) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = headers["stripe-signature"];
    if (!secret || !signature) throw new Error("Stripe webhook verification is not configured");
    const event = stripeClient().webhooks.constructEvent(payload, signature, secret);
    const base = { isValid: true as const, eventId: event.id, type: event.type, data: { livemode: event.livemode } };

    if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed") {
      const refund = event.data.object as Stripe.Refund;
      const parsed: PaymentWebhookRefund = {
        providerRefundId: refund.id,
        providerReference: refundPaymentIntent(refund),
        status: mapRefundStatus(refund.status),
        amount: refund.amount,
        currency: refund.currency,
        attemptId: refund.metadata?.refundAttemptId || null,
      };
      // Refund state belongs to the outbox; the payment status is not moved from a bare event.
      return { ...base, providerReference: parsed.providerReference, status: null, amount: refund.amount, refund: parsed };
    }
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const intent = charge.payment_intent ? (typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id) : null;
      return { ...base, providerReference: intent, status: null, amount: charge.amount_refunded, refundSignal: true };
    }
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded" || event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        ...base,
        providerReference: session.id,
        status: null,
        amount: session.amount_total ?? 0,
        checkout: {
          providerReference: session.id,
          state: event.type === "checkout.session.expired" ? "expired" : event.type === "checkout.session.async_payment_failed" ? "unpaid" : mapCheckoutState(session),
          amount: session.amount_total ?? 0,
          currency: session.currency ?? "",
          paymentIntentId: sessionPaymentIntent(session),
        },
      };
    }

    const resource = event.data.object as Stripe.PaymentIntent;
    const providerReference = resource.object === "payment_intent" ? resource.id : null;
    const amount = resource.object === "payment_intent" ? resource.amount_received || resource.amount : undefined;
    const status = event.type === "payment_intent.succeeded"
      ? "completed"
      : event.type === "payment_intent.payment_failed"
        ? "requires_action"
        : event.type === "payment_intent.canceled"
          ? "cancelled"
          : null;
    return { ...base, providerReference, status, amount };
  },
};
