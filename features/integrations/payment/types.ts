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
  currency?: string;
  idempotencyKey: string;
  /** Echoed onto the provider record so it can be found again by us, not by the provider id. */
  metadata?: Record<string, string>;
}

export interface PaymentOperationResult {
  status: PaymentAdapterStatus;
  providerReference: string;
  amount?: number;
  currency?: string;
  data?: Record<string, unknown>;
}

export type ProviderRefundStatus = "pending" | "succeeded" | "failed" | "canceled" | "requires_action";

export interface ProviderRefund {
  providerRefundId: string;
  status: ProviderRefundStatus;
  amount: number;
  currency: string;
  failureReason?: string | null;
}

export interface RefundLookupInput {
  provider: PaymentProviderConfig;
  /** The captured payment (Stripe pi_…) the refund belongs to. */
  providerReference: string;
  /** Known after the first successful submit; otherwise the refund is found by its attempt metadata. */
  providerRefundId?: string | null;
  attemptId: string;
}

/**
 * Raised by an adapter when the provider definitively refused the request (no refund exists).
 * Any other thrown error is ambiguous (timeout, connection, 5xx) and the outcome stays unknown.
 */
export class ProviderRejectedError extends Error {
  readonly definitive = true;
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "ProviderRejectedError";
  }
}

export interface CreateCheckoutInput {
  provider: PaymentProviderConfig;
  amount: number;
  currency: string;
  idempotencyKey: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  metadata: Record<string, string>;
}

export interface CheckoutSessionResult {
  providerReference: string;
  url: string;
  expiresAt: string | null;
}

export interface CheckoutStatusResult {
  providerReference: string;
  /** paid = money captured; open = still awaiting the payer; expired = cannot be paid any more. */
  state: "paid" | "open" | "expired" | "unpaid";
  amount: number;
  currency: string;
  paymentIntentId: string | null;
  metadata: Record<string, string>;
}

export interface PaymentWebhookInput {
  provider: PaymentProviderConfig;
  payload: string;
  headers: Record<string, string | undefined>;
}

export interface PaymentWebhookRefund {
  providerRefundId: string;
  /** The captured payment the refund belongs to. */
  providerReference: string | null;
  status: ProviderRefundStatus;
  amount: number;
  currency: string;
  /** Our RefundAttempt id, echoed from the metadata we set at submit time. */
  attemptId: string | null;
}

export interface PaymentWebhookCheckout {
  providerReference: string;
  state: CheckoutStatusResult["state"];
  amount: number;
  currency: string;
  paymentIntentId: string | null;
}

export interface PaymentWebhookResult {
  isValid: boolean;
  eventId: string;
  type: string;
  providerReference: string | null;
  status: PaymentAdapterStatus | null;
  amount?: number;
  data?: Record<string, unknown>;
  refund?: PaymentWebhookRefund;
  /** charge.refunded carries no refund object; it only asks us to re-check open refund attempts. */
  refundSignal?: boolean;
  checkout?: PaymentWebhookCheckout;
}

export interface PaymentAdapter {
  createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult>;
  confirm(input: PaymentOperationInput): Promise<PaymentOperationResult>;
  refund(input: PaymentOperationInput): Promise<PaymentOperationResult>;
  /** Reads a refund back from the provider; null when no refund exists for the attempt. */
  getRefundStatus?(input: RefundLookupInput): Promise<ProviderRefund | null>;
  createCheckout?(input: CreateCheckoutInput): Promise<CheckoutSessionResult>;
  getCheckoutStatus?(input: { provider: PaymentProviderConfig; providerReference: string }): Promise<CheckoutStatusResult>;
  parseWebhook(input: PaymentWebhookInput): Promise<PaymentWebhookResult>;
}
