import {
  getPaymentAdapter,
  type CreateCheckoutInput,
  type RefundLookupInput,
  type CreatePaymentSessionInput,
  type PaymentOperationInput,
  type PaymentProviderConfig,
  type PaymentWebhookInput,
} from "../../integrations/payment";

export async function createProviderPaymentSession(input: CreatePaymentSessionInput) {
  return (await getPaymentAdapter(input.provider)).createSession(input);
}

export async function confirmProviderPayment(input: PaymentOperationInput) {
  return (await getPaymentAdapter(input.provider)).confirm(input);
}

export async function refundProviderPayment(input: PaymentOperationInput) {
  return (await getPaymentAdapter(input.provider)).refund(input);
}

export async function getProviderRefundStatus(input: RefundLookupInput) {
  const adapter = await getPaymentAdapter(input.provider);
  if (!adapter.getRefundStatus) throw new Error("Payment provider cannot report refund status");
  return adapter.getRefundStatus(input);
}

export async function createProviderCheckout(input: CreateCheckoutInput) {
  const adapter = await getPaymentAdapter(input.provider);
  if (!adapter.createCheckout) throw new Error("Payment provider does not support hosted checkout");
  return adapter.createCheckout(input);
}

export async function getProviderCheckoutStatus(input: { provider: PaymentProviderConfig; providerReference: string }) {
  const adapter = await getPaymentAdapter(input.provider);
  if (!adapter.getCheckoutStatus) throw new Error("Payment provider does not support hosted checkout");
  return adapter.getCheckoutStatus(input);
}

export async function parseProviderWebhook(input: PaymentWebhookInput) {
  return (await getPaymentAdapter(input.provider)).parseWebhook(input);
}

export function paymentProviderFromRecord(record: {
  code: string;
  adapter: string;
  config?: unknown;
}): PaymentProviderConfig {
  if (record.adapter !== "manual" && record.adapter !== "stripe") {
    throw new Error(`Unsupported payment adapter: ${record.adapter}`);
  }
  return {
    code: record.code,
    adapter: record.adapter,
    config: record.config && typeof record.config === "object" ? record.config as Record<string, unknown> : {},
  };
}
