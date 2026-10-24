'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { PAYMENT_STATUSES, type PaymentDetailRead, type PaymentFilters, type PaymentList, type RefundRoute } from '../types';

const ROW_FIELDS = `
  id totalAmount refundedAmount tip status paymentMethod processedAt createdAt notes
  appointment { id startTime client { id user { name } } }
`;

function dateWhere(from: string, to: string) {
  const createdAt: Record<string, string> = {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) createdAt.gte = new Date(`${from}T00:00:00`).toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) createdAt.lte = new Date(`${to}T23:59:59.999`).toISOString();
  return Object.keys(createdAt).length ? { createdAt } : {};
}

export async function getPayments(filters: PaymentFilters): Promise<PaymentList> {
  const range = dateWhere(filters.from, filters.to);
  const where = filters.status === 'all' ? range : { ...range, status: { equals: filters.status } };
  const countFields = PAYMENT_STATUSES.map((status) => `${status}: paymentsCount(where: { AND: [$range, { status: { equals: "${status}" } }] })`).join('\n');
  const response = await keystoneClient<any>(`
    query PlatformPayments($where: PaymentWhereInput!, $range: PaymentWhereInput!) {
      payments(where: $where, orderBy: { createdAt: desc }, take: 200) { ${ROW_FIELDS} }
      totals: payments(where: $range, take: 2000) { totalAmount refundedAmount tip status }
      ${countFields}
    }
  `, { where, range }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const data = response.data;
  const counts = Object.fromEntries(PAYMENT_STATUSES.map((status) => [status, Number(data[status] || 0)]));
  const settledRows = (data.totals || []).filter((row: any) => ['completed', 'partially_refunded', 'refunded'].includes(row.status));
  return {
    status: 'loaded',
    payments: data.payments || [],
    counts,
    total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    settled: settledRows.reduce((sum: number, row: any) => sum + Number(row.totalAmount || 0), 0),
    refunded: settledRows.reduce((sum: number, row: any) => sum + Number(row.refundedAmount || 0), 0),
    tips: settledRows.reduce((sum: number, row: any) => sum + Number(row.tip || 0), 0),
  };
}

/** Which existing workflow can refund this payment: manual deposits refund; manual checkouts reverse the settlement. */
function refundRouteFor(session: any): RefundRoute {
  const purpose = session?.data && typeof session.data === 'object' ? session.data.purpose : null;
  if (!session || session.provider?.adapter !== 'manual') return null;
  if (purpose === 'appointment_deposit') return 'deposit';
  if (purpose === 'controlled_checkout') return 'settlement';
  return null;
}

export async function getPayment(id: string): Promise<PaymentDetailRead> {
  const response = await keystoneClient<any>(`
    query PlatformPayment($id: ID!) {
      payment(where: { id: $id }) {
        ${ROW_FIELDS}
        subtotal tax discount receiptEmail refundReason refundedAt currencyCode
        refunds(orderBy: { processedAt: desc }) { id amountMinor reason status processedAt }
        session { id status amount data provider { name adapter } }
        appointment {
          lineItems { id serviceTitle price quantity }
          transaction { lineItems { id itemType quantity unitPrice discount service { name } product { name } } }
        }
      }
    }
  `, { id }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const payment = response.data.payment;
  if (!payment) return { status: 'missing' };
  const saleLines = payment.appointment?.transaction?.lineItems || [];
  const lines = saleLines.length
    ? saleLines.map((line: any) => ({ id: line.id, kind: line.itemType || 'service', title: line.service?.name || line.product?.name || 'Item', quantity: Number(line.quantity || 1), amount: Number(line.quantity || 1) * Number(line.unitPrice || 0) - Number(line.discount || 0) }))
    : (payment.appointment?.lineItems || []).map((line: any) => ({ id: line.id, kind: 'service', title: line.serviceTitle || 'Treatment', quantity: Number(line.quantity || 1), amount: Number(line.quantity || 1) * Number(line.price || 0) }));
  return { status: 'loaded', payment: { ...payment, lines }, refundRoute: refundRouteFor(payment.session) };
}

export async function refundPaymentAction(input: { paymentId: string; paymentSessionId: string; route: 'deposit' | 'settlement'; amount: number; reason: string; idempotencyKey: string }) {
  const response = input.route === 'deposit'
    ? await keystoneClient<{ result: { success: boolean; error: string | null } }>(`mutation RefundDeposit($paymentSessionId: ID!, $amount: Int, $reason: String) {
        result: refundPayment(paymentSessionId: $paymentSessionId, amount: $amount, reason: $reason) { success error }
      }`, { paymentSessionId: input.paymentSessionId, amount: input.amount, reason: input.reason }).catch(() => null)
    : await keystoneClient<{ result: { success: boolean; error: string | null } }>(`mutation ReverseSettlement($paymentSessionId: ID!, $amount: Int!, $reason: String!, $idempotencyKey: String!) {
        result: reverseAppointmentSettlement(paymentSessionId: $paymentSessionId, amount: $amount, reason: $reason, idempotencyKey: $idempotencyKey) { success error }
      }`, { paymentSessionId: input.paymentSessionId, amount: input.amount, reason: input.reason, idempotencyKey: input.idempotencyKey }).catch(() => null);
  if (!response?.success) return { success: false, error: 'Refund not confirmed. Reload the payment before retrying.' };
  const result = response.data.result;
  if (result.success) {
    revalidatePath('/dashboard/platform/payments');
    revalidatePath(`/dashboard/platform/payments/${input.paymentId}`);
  }
  return { success: result.success, recordId: input.paymentId, error: result.error };
}
