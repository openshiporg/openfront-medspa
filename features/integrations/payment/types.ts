export type PaymentAdapterStatus =
  | "pending"
  | "requires_action"
  | "authorized"
  | "completed"
  | "failed"
  | "cancelled"
  | "partially_refunded"
  | "refunded";

export interface PaymentProviderConfig {
  code: string;
  adapter: "manual" | "stripe";
  config?: Record<string, unknown> | null;
}

export interface CreatePaymentSessionInput {
  provider: PaymentProviderConfig;
  amount: number;
  currency: string;
  idempotencyKey: string;
  metadata: Record<string, string>;
}

export interface PaymentSessionResult {
  status: PaymentAdapterStatus;
  providerReference: string;
  clientSecret?: string | null;
  data?: Record<string, unknown>;
}

export interface PaymentOperationInput {
  provider: PaymentProviderConfig;
  providerReference: string;
  amount?: number;
  idempotencyKey: string;
}

export interface PaymentOperationResult {
  status: PaymentAdapterStatus;
  providerReference: string;
  amount?: number;
  data?: Record<string, unknown>;
}

export interface PaymentWebhookInput {
  provider: PaymentProviderConfig;
  payload: string;
  headers: Record<string, string | undefined>;
}

export interface PaymentWebhookResult {
  isValid: boolean;
  eventId: string;
  type: string;
  providerReference: string | null;
  status: PaymentAdapterStatus | null;
  amount?: number;
  data?: Record<string, unknown>;
}

export interface PaymentAdapter {
  createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult>;
  confirm(input: PaymentOperationInput): Promise<PaymentOperationResult>;
  refund(input: PaymentOperationInput): Promise<PaymentOperationResult>;
  parseWebhook(input: PaymentWebhookInput): Promise<PaymentWebhookResult>;
}
