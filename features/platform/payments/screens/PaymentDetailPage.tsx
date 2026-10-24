import Link from 'next/link';
import { Banknote, ReceiptText } from 'lucide-react';
import { EmptyState, ErrorState, Fact, PageHeader, Panel, PillLink, PlatformPage, StatusDot, TitleStatus, Track, usd } from '@/features/platform/components/medspa-ui';
import { getPayment } from '../actions/payments';
import { paymentMethodLabel, paymentStatusLabel } from '../types';
import { RefundSheet } from '../components/RefundSheet';
import { paymentTone } from './PaymentsPage';

function stamp(value?: string | null) {
  return value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

export async function PaymentDetailPage({ paymentId }: { paymentId: string }) {
  const result = await getPayment(paymentId);
  const breadcrumbs = [{ label: 'Payments', href: '/dashboard/platform/payments' }, { label: 'Payment' }];
  if (result.status !== 'loaded') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
        {result.status === 'missing'
          ? <EmptyState icon={Banknote} title="Payment not found" action={<Track><PillLink href="/dashboard/platform/payments">Payments</PillLink></Track>} />
          : <ErrorState id="payment-unavailable" title="Payment unavailable" message="This payment could not be loaded." action={<Track><PillLink href={`/dashboard/platform/payments/${paymentId}`}>Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }
  const { payment, refundRoute } = result;
  const total = Number(payment.totalAmount || 0);
  const refunded = Number(payment.refundedAmount || 0);
  const refundable = Math.max(0, total - refunded);
  const client = payment.appointment?.client;
  const canRefund = refundRoute && payment.session && refundable > 0 && ['completed', 'partially_refunded'].includes(payment.status || '');

  return (
    <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
      <PageHeader
        title={<span className="tabular-nums">{usd(total)}</span>}
        icon={Banknote}
        status={<TitleStatus tone={paymentTone[payment.status || ''] || 'zinc'}>{paymentStatusLabel[payment.status || ''] || payment.status}</TitleStatus>}
        meta={<><span>{stamp(payment.processedAt || payment.createdAt)}</span><span>{paymentMethodLabel[payment.paymentMethod || ''] || payment.paymentMethod || '—'}</span>{payment.session?.provider?.name ? <span>{payment.session.provider.name}</span> : null}</>}
        actions={canRefund && payment.session ? <Track><RefundSheet paymentId={payment.id} paymentSessionId={payment.session.id} route={refundRoute} refundable={refundable} /></Track> : null}
      />

      {!canRefund && refundable > 0 && ['completed', 'partially_refunded'].includes(payment.status || '') ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><StatusDot tone="zinc" />Refunds for this payment are recorded outside the dashboard</p>
      ) : null}

      <Panel title="Summary" icon={ReceiptText}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Fact label="Subtotal">{usd(payment.subtotal)}</Fact>
          <Fact label="Discount">{payment.discount ? `−${usd(payment.discount)}` : '—'}</Fact>
          <Fact label="Tax">{usd(payment.tax)}</Fact>
          <Fact label="Tip">{usd(payment.tip)}</Fact>
          <Fact label="Refunded">{refunded ? `−${usd(refunded)}` : '—'}</Fact>
          <Fact label="Net">{usd(total - refunded)}</Fact>
          <Fact label="Client">{client ? <Link className="underline underline-offset-4" href={`/dashboard/platform/clients`}>{client.user?.name || 'Client'}</Link> : '—'}</Fact>
          <Fact label="Appointment">{payment.appointment ? <Link className="underline underline-offset-4" href={`/dashboard/platform/appointments/${payment.appointment.id}`}>{stamp(payment.appointment.startTime)}</Link> : '—'}</Fact>
          <Fact label="Receipt" wrap>{payment.receiptEmail || '—'}</Fact>
        </dl>
        {payment.notes ? <p className="mt-4 text-sm text-muted-foreground">{payment.notes}</p> : null}
      </Panel>

      <Panel title="Lines" padded={false}>
        {payment.lines.length ? (
          <ul className="divide-y">
            {payment.lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm md:px-5">
                <span className="min-w-0 truncate">{line.title}{line.quantity > 1 ? <span className="text-muted-foreground"> × {line.quantity}</span> : null}<span className="ml-2 text-xs capitalize text-muted-foreground">{line.kind}</span></span>
                <span className="shrink-0 tabular-nums">{usd(line.amount)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">No line items</p>}
      </Panel>

      <Panel title="Refunds" padded={false}>
        {payment.refunds.length ? (
          <ul className="divide-y">
            {payment.refunds.map((refund) => (
              <li key={refund.id} className="grid gap-0.5 px-4 py-3 text-sm md:px-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 font-medium"><StatusDot tone={refund.status === 'completed' ? 'emerald' : refund.status === 'failed' ? 'rose' : 'amber'} /><span className="capitalize">{refund.status}</span></span>
                  <span className="tabular-nums">−{usd(refund.amountMinor)}</span>
                </div>
                <span className="text-xs text-muted-foreground">{stamp(refund.processedAt)}{refund.reason ? ` · ${refund.reason}` : ''}</span>
              </li>
            ))}
          </ul>
        ) : <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">{payment.refundReason ? `Refunded · ${payment.refundReason}` : 'No refunds'}</p>}
      </Panel>
    </PlatformPage>
  );
}
