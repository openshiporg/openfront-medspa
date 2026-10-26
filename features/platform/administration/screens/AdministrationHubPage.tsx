import Link from 'next/link';
import { BadgeCheck, Building2, CalendarClock, ChevronRight, DoorOpen, MapPin, UsersRound } from 'lucide-react';
import type { ComponentType } from 'react';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { ErrorState, PageHeader, Panel, PillLink, PlatformPage, StatusDot, Track, type Tone } from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getMedSpaWorkspace } from '@/features/platform/workspaces/actions/workspaces';
import { workspaceStatus } from '@/features/platform/workspaces/presentation';

const DAY = 86_400_000;

async function getCounts() {
  const response = await keystoneClient<{ providers: number; providersTotal: number; locations: number; resources: number; schedules: number }>(`
    query AdministrationCounts {
      providers: providersCount(where: { status: { equals: active }, isActive: { equals: true } })
      providersTotal: providersCount
      locations: locationsCount(where: { isActive: { equals: true } })
      resources: resourcesCount(where: { isActive: { equals: true } })
      schedules: providerSchedulesCount(where: { type: { equals: recurring }, isAvailable: { equals: true } })
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  return response?.success ? response.data : null;
}

function attentionTone(status?: string | null, occurredAt?: string | null): Tone {
  if (status && ['revoked', 'suspended', 'expired', 'out_of_service', 'incident_lockout', 'recall_quarantine'].includes(status)) return 'rose';
  if (occurredAt && new Date(occurredAt).getTime() < Date.now() + 30 * DAY) return 'amber';
  if (status && status !== 'verified' && status !== 'available') return 'amber';
  return 'emerald';
}

export async function AdministrationHubPage() {
  const [counts, workspace] = await Promise.all([getCounts(), getMedSpaWorkspace('administration')]);
  const breadcrumbs = [{ label: 'Practice' }];

  if (!counts) {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Practice" icon={Building2} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="administration-unavailable" title="Practice unavailable" action={<Track><PillLink href="/dashboard/platform/administration">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const records = workspace.status === 'loaded' ? workspace.data.records : [];
  const attention = records
    .map((record) => ({ ...record, tone: attentionTone(record.status, record.occurredAt) }))
    .filter((record) => record.tone !== 'emerald')
    .sort((a, b) => (a.tone === 'rose' ? -1 : 0) - (b.tone === 'rose' ? -1 : 0) || (a.occurredAt || '').localeCompare(b.occurredAt || ''));

  const tiles: Array<{ href: string; title: string; value: string; icon: ComponentType<{ className?: string }>; tone?: Tone }> = [
    { href: '/dashboard/platform/staff', title: 'Staff', value: `${counts.providers} active of ${counts.providersTotal}`, icon: UsersRound, tone: counts.providers ? 'emerald' : 'amber' },
    { href: '/dashboard/platform/locations', title: 'Locations', value: `${counts.locations} active`, icon: MapPin, tone: counts.locations ? 'emerald' : 'amber' },
    { href: '/dashboard/platform/resources', title: 'Rooms & devices', value: `${counts.resources} active`, icon: DoorOpen, tone: counts.resources ? 'emerald' : 'amber' },
    { href: '/dashboard/platform/schedules', title: 'Hours', value: `${counts.schedules} weekly blocks`, icon: CalendarClock, tone: counts.schedules ? 'emerald' : 'amber' },
  ];

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Practice" icon={Building2} />

      <nav aria-label="Practice administration" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="flex items-center gap-3 rounded-[6px] border bg-background p-4 transition-colors hover:bg-muted/40">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] bg-muted text-muted-foreground"><tile.icon className="size-[18px]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{tile.title}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">{tile.tone ? <StatusDot tone={tile.tone} /> : null}{tile.value}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <Panel title="Needs attention" icon={BadgeCheck} padded={false}>
        {workspace.status === 'unavailable' ? (
          <p role="alert" className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground md:px-5"><StatusDot tone="amber" />Credentials and device readiness couldn&apos;t load</p>
        ) : attention.length ? (
          <ul className="divide-y">
            {attention.map((record) => (
              <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <p className="truncate text-sm font-medium">{record.title}</p>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot tone={record.tone} />{record.status ? workspaceStatus(record.status) : 'Review'}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{[record.id.startsWith('credential:') ? 'Credential' : 'Room or device', record.subtitle, record.detail].filter(Boolean).join(' · ')}</p>
                </div>
                <Track><PillLink size="sm" href={record.id.startsWith('credential:') ? '/dashboard/platform/staff' : '/dashboard/platform/resources'}>Open</PillLink></Track>
              </li>
            ))}
          </ul>
        ) : <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground md:px-5"><StatusDot tone="emerald" />Credentials and devices are current</p>}
      </Panel>
    </PlatformPage>
  );
}
