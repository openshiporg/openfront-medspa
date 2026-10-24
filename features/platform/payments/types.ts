export const PAYMENT_STATUSES = ['completed', 'partially_refunded', 'refunded', 'pending', 'processing', 'failed'] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const paymentStatusLabel: Record<string, string> = {
  completed: 'Completed', partially_refunded: 'Partially refunded', refunded: 'Refunded', pending: 'Pending', processing: 'Processing', failed: 'Failed',
};

export const paymentMethodLabel: Record<string, string> = {
  cash: 'Cash', credit_card: 'Card', debit_card: 'Debit card', gift_card: 'Gift card', apple_pay: 'Apple Pay', google_pay: 'Google Pay',
};

export interface PaymentRow {
  id: string; totalAmount: number | null; refundedAmount: number | null; tip: number | null; status: string | null; paymentMethod: string | null;
  processedAt: string | null; createdAt: string | null; notes: string | null;
  appointment: { id: string; startTime: string | null; client: { id: string; user: { name: string | null } | null } | null } | null;
}

export interface PaymentFilters { status: PaymentStatus | 'all'; from: string; to: string }

export type PaymentList =
  | { status: 'loaded'; payments: PaymentRow[]; counts: Record<string, number>; total: number; settled: number; refunded: number; tips: number }
  | { status: 'unavailable' };

export interface PaymentDetail extends PaymentRow {
  subtotal: number | null; tax: number | null; discount: number | null; receiptEmail: string | null; refundReason: string | null; refundedAt: string | null; currencyCode: string | null;
  refunds: Array<{ id: string; amountMinor: number | null; reason: string | null; status: string | null; processedAt: string | null }>;
  session: { id: string; status: string | null; amount: number | null; data: Record<string, unknown> | null; provider: { name: string | null; adapter: string | null } | null } | null;
  lines: Array<{ id: string; title: string; quantity: number; amount: number; kind: string }>;
}

export type RefundRoute = 'deposit' | 'settlement' | null;

export type PaymentDetailRead = { status: 'loaded'; payment: PaymentDetail; refundRoute: RefundRoute } | { status: 'missing' } | { status: 'unavailable' };
