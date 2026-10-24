import Link from 'next/link';
import { ArrowUpRight, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClass, pillClass, trackClass } from '@/features/platform/components/pill';
import { EmptyState, ErrorState, MetricStrip, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot, Track, usd, type Tone } from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getPayments } from '../actions/payments';
import { PAYMENT_STATUSES, paymentMethodLabel, paymentStatusLabel, type PaymentFilters } from '../types';

const BASE = '/dashboard/platform/payments';

export const paymentTone: Record<string, Tone> = { completed: 'emerald', partially_refunded: 'amber', refunded: 'zinc', pending: 'amber', processing: 'blue', failed: 'rose' };

function stamp(value?: string | null) {
  return value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

function query(filters: PaymentFilters, status: string) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const text = params.toString();
  return text ? `${BASE}?${text}` : BASE;
}

export async function PaymentsPage({ searchParams }: { searchParams?: Promise<{ status?: string; from?: string; to?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const filters: PaymentFilters = {
    status: (PAYMENT_STATUSES as readonly string[]).includes(params.status || '') ? params.status as PaymentFilters['status'] : 'all',
    from: params.from || '',
    to: params.to || '',
  };
  const result = await getPayments(filters);
  const breadcrumbs = [{ label: 'Payments' }];

  if (result.status === 'unavailable') {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Payments" icon={Banknote} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="payments-unavailable" title="Payments unavailable" message="Payments could not be loaded." action={<Track><PillLink href={BASE}>Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const tabs = [{ value: 'all', label: 'All', count: result.total }, ...PAYMENT_STATUSES.map((status) => ({ value: status, label: paymentStatusLabel[status], count: result.counts[status] }))]
    .filter((tab) => tab.value === 'all' || tab.value === filters.status || tab.count)
    .map((tab) => ({ ...tab, href: query(filters, tab.value) }));

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Payments" icon={Banknote} />
      <MetricStrip items={[
        { label: 'Settled', value: usd(result.settled, { whole: true }), tone: 'emerald' },
        { label: 'Refunded', value: usd(result.refunded, { whole: true }) },
        { label: 'Net', value: usd(result.settled - result.refunded, { whole: true }) },
        { label: 'Tips', value: usd(result.tips, { whole: true }) },
      ]} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentTabs label="Payment status" active={filters.status} tabs={tabs} />
        <form action={BASE} className="flex flex-wrap items-end gap-2">
          {filters.status !== 'all' ? <input type="hidden" name="status" value={filters.status} /> : null}
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">From<input type="date" name="from" defaultValue={filters.from} className={cn(inputClass, 'h-9 w-[9.5rem]')} /></label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">To<input type="date" name="to" defaultValue={filters.to} className={cn(inputClass, 'h-9 w-[9.5rem]')} /></label>
          <div className={trackClass}>
            <button type="submit" className={pillClass('raised', 'sm')}>Apply</button>
            {filters.from || filters.to ? <Link href={query({ ...filters, from: '', to: '' }, filters.status)} className={pillClass('quiet', 'sm')}>Clear</Link> : null}
          </div>
        </form>
      </div>

      {!result.payments.length ? <EmptyState icon={Banknote} title="No payments in this view" /> : (
        <section className="overflow-hidden rounded-2xl border bg-background">
          <ul className="divide-y">
            {result.payments.map((payment) => {
              const refunded = Number(payment.refundedAmount || 0);
              return (
                <li key={payment.id}>
                  <Link href={`${BASE}/${payment.id}`} className="grid gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="truncate font-medium">{payment.appointment?.client?.user?.name || payment.notes || 'Payment'}</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={paymentTone[payment.status || ''] || 'zinc'} />{paymentStatusLabel[payment.status || ''] || payment.status}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>{stamp(payment.processedAt || payment.createdAt)}</span>
                        <span>{paymentMethodLabel[payment.paymentMethod || ''] || payment.paymentMethod || '—'}</span>
                        {payment.appointment ? <span>Appointment</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end">
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums">{usd(payment.totalAmount)}</span>
                        {refunded ? <span className="block text-xs tabular-nums text-muted-foreground">−{usd(refunded)} refunded</span> : null}
                      </span>
                      <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </PlatformPage>
  );
}
