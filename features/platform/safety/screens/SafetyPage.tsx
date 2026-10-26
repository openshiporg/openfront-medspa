import Link from 'next/link';
import { ArrowUpRight, ShieldAlert, Siren, Wrench } from 'lucide-react';
import { statusFilter } from '@/features/platform/lib/queryParams';
import { Chip, EmptyState, ErrorState, MetricStrip, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot, Track, humanize, type Tone } from '@/features/platform/components/medspa-ui';
import { getSafetyOverview } from '../actions/safety';
import { OpenRecallSheet, ReportIncidentSheet } from '../components/SafetyActions';

const tabs = ['incidents', 'recalls', 'devices'] as const;
export const severityTone: Record<string, Tone> = { low: 'zinc', moderate: 'amber', high: 'orange', critical: 'rose' };
export const incidentStatusLabel: Record<string, string> = { open: 'Open', under_review: 'Under review', closed: 'Closed' };
export const recallTone = (status: string): Tone => status === 'closed' ? 'zinc' : status === 'disposition_complete' ? 'emerald' : 'rose';

export function when(value?: string | null) {
  return value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

export async function SafetyPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const tab = statusFilter(params.tab, tabs, 'incidents');
  const overview = await getSafetyOverview();
  const breadcrumbs = [{ label: 'Safety' }];
  if (overview.status !== 'loaded') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Safety" icon={ShieldAlert} />
        <ErrorState id="safety-unavailable" title="Safety records unavailable" message="Incidents and recalls could not be loaded." action={<Track><PillLink href="/dashboard/platform/safety">Retry</PillLink></Track>} />
      </PlatformPage>
    );
  }

  const records = overview.records === 'restricted' ? null : overview.records;
  const openIncidents = records?.incidents.filter((row) => row.status !== 'closed') || [];
  const urgent = openIncidents.filter((row) => row.severity === 'high' || row.severity === 'critical');
  const openRecalls = records?.recalls.filter((row) => row.status !== 'closed') || [];
  const href = (value: string) => value === 'incidents' ? '/dashboard/platform/safety' : `/dashboard/platform/safety?tab=${value}`;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title="Safety"
        icon={ShieldAlert}
        status={urgent.length ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone="rose" />{urgent.length} high or critical open</span> : null}
        actions={records ? <Track>{tab === 'recalls' ? <OpenRecallSheet options={records.options} /> : null}<ReportIncidentSheet options={records.options} /></Track> : null}
      />
      {records ? (
        <MetricStrip items={[
          { label: 'Open incidents', value: openIncidents.length, tone: openIncidents.length ? 'amber' : undefined, href: href('incidents') },
          { label: 'High or critical', value: urgent.length, tone: urgent.length ? 'rose' : undefined, href: href('incidents') },
          { label: 'Open recalls', value: openRecalls.length, tone: openRecalls.length ? 'rose' : undefined, href: href('recalls') },
          { label: 'Clients exposed', value: openRecalls.reduce((sum, row) => sum + (row.exposuresCount || 0), 0), href: href('recalls') },
        ]} />
      ) : null}
      <SegmentTabs label="Safety sections" active={tab} tabs={[
        { value: 'incidents', label: 'Incidents', href: href('incidents'), count: records ? openIncidents.length : null },
        { value: 'recalls', label: 'Recalls', href: href('recalls'), count: records ? openRecalls.length : null },
        { value: 'devices', label: 'Device readiness', href: href('devices') },
      ]} />

      {tab === 'incidents' ? (
        !records ? <EmptyState icon={ShieldAlert} title="Sensitive records access required" />
          : records.incidents.length ? (
            <ul className="grid gap-3">
              {records.incidents.map((row) => (
                <li key={row.id}>
                  <Link href={`/dashboard/platform/safety/incidents/${row.id}`} className="flex flex-col gap-2 rounded-[6px] border bg-background p-4 transition-colors hover:bg-muted/30 md:flex-row md:items-center md:justify-between md:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="min-w-0 break-words text-base font-semibold">{row.summary}</h2>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={severityTone[row.severity] || 'zinc'} />{humanize(row.severity)}</span>
                        <Chip>{incidentStatusLabel[row.status] || humanize(row.status)}</Chip>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{row.client?.user?.name || 'Client'} · {row.location?.name || 'Location'} · {when(row.occurredAt)} · {row.actionsCount} steps</p>
                      {row.suspectLot?.lotNumber || row.suspectDevice?.name ? <p className="mt-1 text-xs text-muted-foreground">Suspect {[row.suspectLot?.lotNumber ? `lot ${row.suspectLot.lotNumber}` : null, row.suspectDevice?.name].filter(Boolean).join(' · ')}</p> : null}
                    </div>
                    <ArrowUpRight className="hidden size-4 shrink-0 text-muted-foreground md:block" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={ShieldAlert} title="No incidents" />
      ) : null}

      {tab === 'recalls' ? (
        !records ? <EmptyState icon={Siren} title="Sensitive records access required" />
          : records.recalls.length ? (
            <ul className="grid gap-3">
              {records.recalls.map((row) => (
                <li key={row.id}>
                  <Link href={`/dashboard/platform/safety/recalls/${row.id}`} className="flex flex-col gap-2 rounded-[6px] border bg-background p-4 transition-colors hover:bg-muted/30 md:flex-row md:items-center md:justify-between md:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="min-w-0 break-words text-base font-semibold">{row.lot ? `${row.lot.product?.name || 'Product'} · lot ${row.lot.lotNumber}` : row.device?.name || 'Recall'}</h2>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={recallTone(row.status)} />{humanize(row.status)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{row.sourceReference} · opened {when(row.openedAt)} · {row.exposuresCount} clients exposed</p>
                    </div>
                    <ArrowUpRight className="hidden size-4 shrink-0 text-muted-foreground md:block" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={Siren} title="No recalls" />
      ) : null}

      {tab === 'devices' ? (
        overview.deviceEvents === 'restricted' ? <EmptyState icon={Wrench} title="Scheduling access required" />
          : overview.deviceEvents.length ? (
            <ul className="divide-y overflow-hidden rounded-[6px] border bg-background">
              {overview.deviceEvents.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="text-sm font-semibold">{row.resource?.name || 'Device'}</h2>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot tone={row.toStatus === 'available' ? 'emerald' : row.toStatus === 'retired' ? 'zinc' : 'amber'} />{humanize(row.fromStatus)} → {humanize(row.toStatus)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{humanize(row.action)} · {row.reason}{row.qualifiedReleaseBy?.user?.name ? ` · released by ${row.qualifiedReleaseBy.user.name}` : ''}</p>
                  </div>
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">{when(row.occurredAt)} · {row.actor?.name || 'Staff'}</p>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={Wrench} title="No readiness events" />
      ) : null}
    </PlatformPage>
  );
}
