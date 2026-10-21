import {
  getPaymentAdapter,
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
