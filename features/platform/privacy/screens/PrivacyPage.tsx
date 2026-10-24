import Link from 'next/link';
import { ArrowUpRight, Archive, Gavel, KeyRound, LockKeyhole, UserRoundSearch } from 'lucide-react';
import { statusFilter } from '@/features/platform/lib/queryParams';
import { Chip, EmptyState, ErrorState, MetricStrip, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot, Track, humanize, type Tone } from '@/features/platform/components/medspa-ui';
import { getPrivacyOverview } from '../actions/privacy';
import { PlaceHoldSheet, ReleaseHoldSheet, RetentionPolicySheet, RightsRequestSheet } from '../components/PrivacyActions';
import { REQUEST_TYPES } from '../lib/requestTypes';
import type { RightsRequestRow } from '../types';

const tabs = ['requests', 'holds', 'retention', 'access'] as const;
const CLOSED = new Set(['fulfilled', 'partially_fulfilled', 'denied_with_basis', 'closed']);
export const requestTypeLabel = Object.fromEntries(REQUEST_TYPES.map((option) => [option.value, option.label]));

export function day(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

/** Due-date dot: overdue rose, due within 3 days amber, finished zinc. */
export function dueTone(row: Pick<RightsRequestRow, 'status' | 'dueAt'>): { tone: Tone; label: string } {
  if (CLOSED.has(row.status)) return { tone: 'zinc', label: humanize(row.status) };
  if (!row.dueAt) return { tone: 'amber', label: 'No due date' };
  const days = Math.ceil((new Date(row.dueAt).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { tone: 'rose', label: `Overdue ${-days}d` };
  return { tone: days <= 3 ? 'amber' : 'emerald', label: days === 0 ? 'Due today' : `Due in ${days}d` };
}

export async function PrivacyPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const tab = statusFilter(params.tab, tabs, 'requests');
  const overview = await getPrivacyOverview();
  const breadcrumbs = [{ label: 'Privacy & records' }];
  if (overview.status !== 'loaded') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Privacy & records" icon={LockKeyhole} />
        {overview.status === 'restricted'
          ? <EmptyState icon={LockKeyhole} title="Sensitive records access required" />
          : <ErrorState id="privacy-unavailable" title="Privacy records unavailable" message="Requests and holds could not be loaded." action={<Track><PillLink href="/dashboard/platform/privacy">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const open = overview.requests.filter((row) => !CLOSED.has(row.status));
  const overdue = open.filter((row) => dueTone(row).tone === 'rose');
  const activeHolds = overview.holds.filter((row) => row.status === 'active');
  const href = (value: string) => value === 'requests' ? '/dashboard/platform/privacy' : `/dashboard/platform/privacy?tab=${value}`;
  const action = tab === 'requests' ? <RightsRequestSheet clients={overview.clients} />
    : tab === 'holds' && overview.canApprove ? <PlaceHoldSheet clients={overview.clients} incidents={overview.incidents} />
    : tab === 'retention' && overview.canApprove ? <RetentionPolicySheet /> : null;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title="Privacy & records"
        icon={LockKeyhole}
        status={overdue.length ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone="rose" />{overdue.length} overdue</span> : null}
        actions={action ? <Track>{action}</Track> : null}
      />
      <MetricStrip items={[
        { label: 'Open requests', value: open.length, tone: open.length ? 'amber' : undefined, href: href('requests') },
        { label: 'Overdue', value: overdue.length, tone: overdue.length ? 'rose' : undefined, href: href('requests') },
        { label: 'Active holds', value: activeHolds.length, href: href('holds') },
        { label: 'Retention policies', value: overview.policies.length, href: href('retention') },
      ]} />
      <SegmentTabs label="Privacy sections" active={tab} tabs={[
        { value: 'requests', label: 'Requests', href: href('requests'), count: open.length },
        { value: 'holds', label: 'Legal holds', href: href('holds'), count: activeHolds.length },
        { value: 'retention', label: 'Retention', href: href('retention'), count: overview.policies.length },
        { value: 'access', label: 'Emergency access', href: href('access'), count: overview.breakGlass.length },
      ]} />

      {tab === 'requests' ? (
        overview.requests.length ? (
          <ul className="grid gap-3">
            {overview.requests.map((row) => {
              const due = dueTone(row);
              return (
                <li key={row.id}>
                  <Link href={`/dashboard/platform/privacy/requests/${row.id}`} className="flex flex-col gap-2 rounded-2xl border bg-background p-4 transition-colors hover:bg-muted/30 md:flex-row md:items-center md:justify-between md:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="min-w-0 break-words text-base font-semibold">{row.client?.user?.name || 'Client'} · {requestTypeLabel[row.type] || humanize(row.type)}</h2>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={due.tone} />{due.label}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{humanize(row.status)} · received {day(row.requestedAt)} · due {day(row.dueAt)} · {row.actionEntriesCount} steps</p>
                    </div>
                    <ArrowUpRight className="hidden size-4 shrink-0 text-muted-foreground md:block" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon={UserRoundSearch} title="No patient-rights requests" />
      ) : null}

      {tab === 'holds' ? (
        overview.holds.length ? (
          <ul className="grid gap-3">
            {overview.holds.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 rounded-2xl border bg-background p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="min-w-0 break-words text-base font-semibold">{row.client?.user?.name || row.incident?.summary || row.asset?.originalFilename || 'Record'}</h2>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={row.status === 'active' ? 'violet' : 'zinc'} />{humanize(row.status)}</span>
                    {row.incident?.summary && row.client ? <Chip>{row.incident.summary}</Chip> : null}
                  </div>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{row.authorityReference} · {row.reason}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Placed {day(row.placedAt)} by {row.placedBy?.name || 'staff'}{row.releasedAt ? ` · released ${day(row.releasedAt)} by ${row.releasedBy?.name || 'staff'}` : ''}</p>
                </div>
                {row.status === 'active' && overview.canApprove ? <Track><ReleaseHoldSheet legalHoldId={row.id} /></Track> : null}
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={Gavel} title="No legal holds" />
      ) : null}

      {tab === 'retention' ? (
        overview.policies.length ? (
          <ul className="grid gap-3">
            {overview.policies.map((row) => {
              const ended = row.effectiveUntil && new Date(row.effectiveUntil).getTime() <= Date.now();
              return (
                <li key={row.id} className="rounded-2xl border bg-background p-4 md:p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="min-w-0 break-words text-base font-semibold">{row.recordClass} · {row.retainMonths} months</h2>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={ended ? 'zinc' : 'emerald'} />{ended ? 'Ended' : 'Effective'}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{row.jurisdiction} · v{row.version} · from {day(row.effectiveFrom)}{row.effectiveUntil ? ` to ${day(row.effectiveUntil)}` : ''} · approved by {row.approvedBy?.name || 'owner'}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{row.dispositionRule}{row.minorsRule ? ` · Minors: ${row.minorsRule}` : ''}</p>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon={Archive} title="No retention policies" action={overview.canApprove ? <Track><RetentionPolicySheet /></Track> : undefined} />
      ) : null}

      {tab === 'access' ? (
        overview.breakGlass.length ? (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-background">
            {overview.breakGlass.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="text-sm font-semibold">{row.client?.user?.name || 'Client'}</h2>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot tone={row.status === 'opened' ? 'rose' : row.status === 'inappropriate' ? 'orange' : 'zinc'} />{humanize(row.status)}</span>
                  </div>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">{row.emergencyReason}</p>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-muted-foreground">{day(row.openedAt)} · {row.actor?.name || 'Staff'}{row.reviewer?.name ? ` · reviewed by ${row.reviewer.name}` : ''}</p>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={KeyRound} title="No emergency access" />
      ) : null}
    </PlatformPage>
  );
}
