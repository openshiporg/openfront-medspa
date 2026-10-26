import { Banknote, CheckCircle2 } from 'lucide-react';
import { statusFilter } from '@/features/platform/lib/queryParams';
import {
  Avatar, Chip, EmptyState, ErrorState, MetricStrip, PageHeader, PillLink, PlatformPage, SegmentTabs, TitleStatus, Track,
  pillClass, trackClass, usd,
} from '@/features/platform/components/medspa-ui';
import { getCommissionOperations, markCommissionPaid, markProviderCommissionsPaid, PlatformCommission } from '../actions/commissions';

interface PageProps {
  searchParams?: Promise<{ status?: string }>;
}

const tabs = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'all', label: 'All' },
] as const;

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function CommissionOperationsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeStatus = statusFilter(resolvedSearchParams.status, ["unpaid","paid","all"] as const, 'unpaid');
  const { commissions, summaries, counts, totals, availability } = await getCommissionOperations(activeStatus);
  const breadcrumbs = [{ label: 'Commissions' }];

  if (availability === 'unavailable') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Commissions" icon={Banknote} />
        <ErrorState id="commissions-unavailable" title="Commissions unavailable" action={<Track><PillLink href="/dashboard/platform/commissions">Retry</PillLink></Track>} />
      </PlatformPage>
    );
  }

  const tabItems = tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    href: tab.value === 'unpaid' ? '/dashboard/platform/commissions' : `/dashboard/platform/commissions?status=${tab.value}`,
    count: tab.value === 'unpaid' ? counts.unpaid : tab.value === 'paid' ? counts.paid : counts.total,
  }));

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Commissions" icon={Banknote} />

      <MetricStrip items={[
        { label: 'Owed', value: usd(totals?.unpaidAmount), tone: 'amber' },
        { label: 'Paid out', value: usd(totals?.paidAmount), tone: 'emerald' },
        { label: 'Treatment sales', value: usd(totals?.grossSales) },
        { label: 'Unpaid lines', value: counts.unpaid },
      ]} />

      {summaries.length > 0 && (
        <section aria-label="Payouts by provider" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summaries.map((summary) => (
            <article key={summary.providerId} className="flex min-w-0 flex-col gap-4 rounded-[6px] border bg-background p-4">
              <div className="flex items-start gap-3">
                <Avatar name={summary.providerName} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="truncate text-sm font-semibold">{summary.providerName}</h2>
                    <TitleStatus tone={summary.unpaidCount ? 'amber' : 'emerald'}>{summary.unpaidCount ? `${summary.unpaidCount} unpaid` : 'Settled'}</TitleStatus>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Sales {usd(summary.grossSales)} · paid {usd(summary.paidAmount)}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold tabular-nums">{usd(summary.unpaidAmount)}</div>
                  <div className="text-xs text-muted-foreground">owed</div>
                </div>
              </div>
              {summary.unpaidCount > 0 && summary.providerId !== 'unassigned' && (
                <form action={markProviderCommissionsPaid} className={`${trackClass} w-fit`}>
                  <input type="hidden" name="providerId" value={summary.providerId} />
                  <button type="submit" className={pillClass('primary', 'sm')}>Mark provider paid</button>
                </form>
              )}
            </article>
          ))}
        </section>
      )}

      <SegmentTabs label="Commission status filters" tabs={tabItems} active={activeStatus} />

      {commissions.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No commissions in this view" />
      ) : (
        <ul className="divide-y overflow-hidden rounded-[6px] border bg-background">
          {commissions.map((commission) => <CommissionRow key={commission.id} commission={commission} />)}
        </ul>
      )}
    </PlatformPage>
  );
}

function CommissionRow({ commission }: { commission: PlatformCommission }) {
  const clientName = commission.payment?.appointment?.client?.user?.name || 'No client';
  const providerName = commission.provider?.user?.name || 'Unassigned';

  return (
    <li className="grid min-w-0 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 className="text-base font-semibold tabular-nums">{usd(commission.commissionAmount)}</h2>
          <TitleStatus tone={commission.isPaid ? 'emerald' : 'amber'}>{commission.isPaid ? `Paid ${formatDate(commission.paidAt)}` : 'Unpaid'}</TitleStatus>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{providerName} · {commission.service?.name || 'Treatment'} · {clientName}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>{Math.round((commission.commissionRate || 0) * 1000) / 10}% of {usd(commission.saleAmount)}</Chip>
          <Chip>{formatDate(commission.payment?.appointment?.startTime)}</Chip>
          {commission.payment?.paymentMethod ? <Chip>{commission.payment.paymentMethod}</Chip> : null}
        </div>
      </div>
      {(!commission.isPaid || commission.payment?.appointment?.id) && <div className={`${trackClass} w-fit`}>
        {!commission.isPaid && (
          <form action={markCommissionPaid}>
            <input type="hidden" name="id" value={commission.id} />
            <button type="submit" className={pillClass('raised', 'sm')}>Mark paid</button>
          </form>
        )}
        {commission.payment?.appointment?.id && (
          <PillLink href={`/dashboard/platform/appointments/${commission.payment.appointment.id}`} size="sm" variant="quiet">Appointment</PillLink>
        )}
      </div>}
    </li>
  );
}

export default CommissionOperationsPage;
