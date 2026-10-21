import type { PaymentAdapter, PaymentProviderConfig } from "./types";

const adapters = {
  manual: async () => (await import("./manual")).manualPaymentAdapter,
  stripe: async () => (await import("./stripe")).stripePaymentAdapter,
} satisfies Record<PaymentProviderConfig["adapter"], () => Promise<PaymentAdapter>>;

export async function getPaymentAdapter(provider: PaymentProviderConfig): Promise<PaymentAdapter> {
  const loader = adapters[provider.adapter];
  if (!loader) throw new Error(`Unsupported payment adapter: ${provider.adapter}`);
  return loader();
}

export type {
  CreatePaymentSessionInput,
  PaymentAdapter,
  PaymentAdapterStatus,
  PaymentOperationInput,
  PaymentOperationResult,
  PaymentProviderConfig,
  PaymentSessionResult,
  PaymentWebhookInput,
  PaymentWebhookResult,
} from "./types";
