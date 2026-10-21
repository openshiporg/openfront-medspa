import type { PaymentAdapter } from "./types";

const reference = (idempotencyKey: string) => `manual_${idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

export const manualPaymentAdapter: PaymentAdapter = {
  async createSession({ amount, currency, idempotencyKey }) {
    return {
      status: "pending",
      providerReference: reference(idempotencyKey),
      clientSecret: null,
      data: { amount, currency: currency.toLowerCase() },
    };
  },
  async confirm({ providerReference, amount }) {
    return {
      status: "completed",
      providerReference,
      amount,
      data: { completedAt: new Date().toISOString() },
    };
  },
  async refund({ providerReference, amount }) {
    return {
      status: "refunded",
      providerReference,
      amount,
      data: { refundedAt: new Date().toISOString() },
    };
  },
  async parseWebhook() {
    return { isValid: false, eventId: "unsupported", type: "unsupported", providerReference: null, status: null };
  },
};
