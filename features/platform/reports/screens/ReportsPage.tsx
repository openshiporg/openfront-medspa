import { ChartNoAxesCombined } from 'lucide-react';
import { ErrorState, MetricStrip, PageHeader, Panel, PillLink, PlatformPage, SegmentTabs, Track, usd } from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getReport } from '../actions/reports';
import { REPORT_PERIODS, type ReportPeriod } from '../types';

function dayLabel(day: string, style: 'short' | 'long' = 'short') {
  const date = new Date(`${day}T12:00:00Z`);
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', ...(style === 'long' ? { weekday: 'short' } : {}) });
}

/** One series, so one hue: magnitude bars with rounded data ends and a per-bar tooltip. */
function RevenueBars({ daily }: { daily: Array<{ day: string; net: number }> }) {
  const max = Math.max(...daily.map((entry) => entry.net), 0);
  return (
    <figure className="grid gap-2">
      <div className="flex h-40 items-end gap-[2px]" aria-hidden="true">
        {daily.map((entry) => (
          <div key={entry.day} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${dayLabel(entry.day, 'long')} · ${usd(entry.net)}`}>
            <div className="w-full rounded-t-[4px] bg-violet-500 transition-opacity group-hover:opacity-80 dark:bg-violet-400" style={{ height: max > 0 ? `${Math.max((entry.net / max) * 100, entry.net > 0 ? 2 : 0)}%` : '0%' }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-background px-2 py-1 text-xs shadow-sm group-hover:block">{dayLabel(entry.day, 'long')} · {usd(entry.net)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t pt-1 text-xs tabular-nums text-muted-foreground">
        <span>{daily.length ? dayLabel(daily[0].day) : ''}</span>
        <span>{daily.length ? dayLabel(daily[daily.length - 1].day) : ''}</span>
      </div>
      <table className="sr-only">
        <caption>Net revenue by day</caption>
        <thead><tr><th>Day</th><th>Net revenue</th></tr></thead>
        <tbody>{daily.map((entry) => <tr key={entry.day}><td>{entry.day}</td><td>{usd(entry.net)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

function RankList({ rows, empty }: { rows: Array<{ name: string; detail: string; value: number }>; empty: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="grid gap-3">
      {rows.map((row) => (
        <li key={row.name} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{row.name}</span>
            <span className="shrink-0 tabular-nums">{usd(row.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-violet-500 dark:bg-violet-400" style={{ width: `${(row.value / max) * 100}%` }} /></div>
          <span className="text-xs text-muted-foreground">{row.detail}</span>
        </li>
      ))}
    </ol>
  );
}

export async function ReportsPage({ searchParams }: { searchParams?: Promise<{ days?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const period = (REPORT_PERIODS.find((value) => String(value) === params.days) || 30) as ReportPeriod;
  const result = await getReport(period);
  const breadcrumbs = [{ label: 'Reports' }];

  if (result.status === 'unavailable') {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Reports" icon={ChartNoAxesCombined} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="reports-unavailable" title="Reports unavailable" message="Report data could not be loaded for your role." action={<Track><PillLink href="/dashboard/platform/reports">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const report = result.data;
  const visits = report.appointments.completed + report.appointments.noShow;
  const noShowRate = visits ? Math.round((report.appointments.noShow / visits) * 100) : 0;
  const tabs = REPORT_PERIODS.map((value) => ({ value: String(value), label: `${value} days`, href: value === 30 ? '/dashboard/platform/reports' : `/dashboard/platform/reports?days=${value}` }));

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Reports" icon={ChartNoAxesCombined} meta={<span>{report.timezone.replaceAll('_', ' ')}</span>} />
      <SegmentTabs label="Report period" tabs={tabs} active={String(period)} />

      <MetricStrip items={[
        { label: 'Net revenue', value: usd(report.revenue.net, { whole: true }), tone: 'violet', href: '/dashboard/platform/payments' },
        { label: 'Refunded', value: usd(report.revenue.refunded, { whole: true }), tone: report.revenue.refunded ? 'rose' : 'zinc' },
        { label: 'Completed visits', value: report.appointments.completed, tone: 'emerald', href: '/dashboard/platform/appointments?status=completed' },
        { label: 'No-show rate', value: `${noShowRate}%`, tone: noShowRate > 10 ? 'orange' : 'zinc' },
        { label: 'New clients', value: report.newClients, tone: 'sky', href: '/dashboard/platform/clients' },
      ]} />

      <Panel title={`Net revenue by day · last ${period} days`}>
        {report.revenue.payments ? <RevenueBars daily={report.daily} /> : <p className="text-sm text-muted-foreground">No settled payments in this period</p>}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top treatments">
          <RankList empty="No treatments sold in this period" rows={report.topTreatments.map((row) => ({ name: row.name, value: row.revenue, detail: `${row.count} sold` }))} />
        </Panel>
        <Panel title="Revenue by provider">
          <RankList empty="No provider sales in this period" rows={report.providers.map((row) => ({ name: row.name, value: row.revenue, detail: `${row.visits} ${row.visits === 1 ? 'visit' : 'visits'}` }))} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Settlement">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">Gross</dt><dd className="font-semibold tabular-nums">{usd(report.revenue.gross)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Payments</dt><dd className="font-semibold tabular-nums">{report.revenue.payments}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Tax collected</dt><dd className="font-semibold tabular-nums">{usd(report.revenue.tax)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Tips</dt><dd className="font-semibold tabular-nums">{usd(report.revenue.tips)}</dd></div>
          </dl>
        </Panel>
        <Panel title="Open liabilities">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">Gift card balances</dt><dd className="font-semibold tabular-nums">{report.liabilities.giftCards === null ? 'Finance access' : usd(report.liabilities.giftCards)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Unpaid commissions</dt><dd className="font-semibold tabular-nums">{report.liabilities.unpaidCommissions === null ? 'Finance access' : usd(report.liabilities.unpaidCommissions)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Upcoming visits</dt><dd className="font-semibold tabular-nums">{report.appointments.upcoming}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Cancelled</dt><dd className="font-semibold tabular-nums">{report.appointments.cancelled}</dd></div>
          </dl>
        </Panel>
      </div>
    </PlatformPage>
  );
}
