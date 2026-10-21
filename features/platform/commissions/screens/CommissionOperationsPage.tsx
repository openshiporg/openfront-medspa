import type { ComponentType } from 'react';
import Link from 'next/link';
import { PlatformBreadcrumbs } from '@/features/platform/components/PlatformBreadcrumbs';
import { statusFilter } from '@/features/platform/lib/queryParams';
import { Banknote, CalendarCheck, CheckCircle2, Scissors, UserRound } from 'lucide-react';
import { getCommissionOperations, markCommissionPaid, markProviderCommissionsPaid, PlatformCommission } from '../actions/commissions';

interface PageProps {
  searchParams?: Promise<{ status?: string }>;
}

const tabs = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'all', label: 'All' },
] as const;

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((value || 0) / 100);
}

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function CommissionOperationsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeStatus = statusFilter(resolvedSearchParams.status, ["unpaid","paid","all"] as const, 'unpaid');
  const { commissions, summaries, counts, availability } = await getCommissionOperations(activeStatus);

  if (availability === 'unavailable') return <><PlatformBreadcrumbs items={[{ label: 'Commissions' }]} /><main role="alert" className="p-6"><h1>Commissions unavailable</h1><Link href="/dashboard/platform/commissions">Retry</Link></main></>;

  return (
    <><PlatformBreadcrumbs items={[{ label: 'Commissions' }]} /><main className="min-h-screen bg-muted/20 px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <Banknote className="h-3.5 w-3.5" />
                Owner workflow
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Commission payout review</h1>

            </div>

          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border bg-muted p-2 shadow-inner" aria-label="Commission status filters">
          {tabs.map((tab) => {
            const isActive = activeStatus === tab.value;
            const href = tab.value === 'unpaid' ? '/dashboard/platform/commissions' : `/dashboard/platform/commissions?status=${tab.value}`;
            const count = tab.value === 'unpaid' ? counts.unpaid : tab.value === 'paid' ? counts.paid : counts.total;
            return (
              <Link
                key={tab.value}
                href={href}
                className={`inline-flex shrink-0 min-h-14 min-w-14 sm:min-h-11 sm:min-w-0 items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label} <span className="ml-1 opacity-70">{count}</span>
              </Link>
            );
          })}
        </nav>

        {summaries.length > 0 && (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summaries.map((summary) => (
              <div key={summary.providerId} className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{summary.providerName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{summary.unpaidCount} unpaid commission{summary.unpaidCount === 1 ? '' : 's'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">{formatCurrency(summary.unpaidAmount)}</div>
                    <div className="text-xs text-muted-foreground">due</div>
                  </div>
                </div>
                {summary.unpaidCount > 0 && summary.providerId !== 'unassigned' && (
                  <form action={markProviderCommissionsPaid} className="mt-4">
                    <input type="hidden" name="providerId" value={summary.providerId} />
                    <button type="submit" className="inline-flex w-full items-center justify-center rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                      Mark provider paid
                    </button>
                  </form>
                )}
              </div>
            ))}
          </section>
        )}

        {commissions.length === 0 ? (
          <section className="rounded-2xl border bg-background p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No commissions in this view</h2>

          </section>
        ) : (
          <section className="grid gap-4">
            {commissions.map((commission) => (
              <CommissionCard key={commission.id} commission={commission} />
            ))}
          </section>
        )}
      </div>
    </main></>
  );
}

function CommissionCard({ commission }: { commission: PlatformCommission }) {
  const clientName = commission.payment?.appointment?.client?.user?.name || 'No client';
  const providerName = commission.provider?.user?.name || 'Unassigned';

  return (
    <article className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${commission.isPaid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {commission.isPaid ? 'Paid' : 'Unpaid'}
            </span>
            <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {(commission.commissionRate || 0) * 100}% rate
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{formatCurrency(commission.commissionAmount)} commission</h2>
          <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
            <Info icon={UserRound} label="Provider" value={providerName} subvalue={commission.provider?.user?.email || undefined} />
            <Info icon={Scissors} label="Service" value={commission.service?.name || 'Service'} subvalue={`Sale ${formatCurrency(commission.saleAmount)}`} />
            <Info icon={CalendarCheck} label="Appointment" value={formatDate(commission.payment?.appointment?.startTime)} subvalue={clientName} />
            <Info icon={Banknote} label="Payment" value={commission.payment?.paymentMethod || 'Unknown'} subvalue={commission.paidAt ? `Paid ${formatDate(commission.paidAt)}` : 'Not paid out'} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 lg:w-48">
          {!commission.isPaid && (
            <form action={markCommissionPaid}>
              <input type="hidden" name="id" value={commission.id} />
              <button type="submit" className="inline-flex w-full items-center justify-center rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90">
                Mark paid
              </button>
            </form>
          )}
          {commission.payment?.appointment?.id && (
            <Link href={`/dashboard/platform/appointments/${commission.payment.appointment.id}`} className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
              Open appointment
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function Info({ icon: Icon, label, value, subvalue }: { icon: ComponentType<{ className?: string }>; label: string; value: string; subvalue?: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80">{label}</div>
        <div className="truncate font-medium text-foreground">{value}</div>
        {subvalue && <div className="truncate text-xs text-muted-foreground">{subvalue}</div>}
      </div>
    </div>
  );
}

export default CommissionOperationsPage;
