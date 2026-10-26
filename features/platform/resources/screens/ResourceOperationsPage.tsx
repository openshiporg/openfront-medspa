import { DoorOpen } from 'lucide-react';
import { statusFilter } from '@/features/platform/lib/queryParams';
import {
  Chip, EmptyState, ErrorState, Fact, MetricStrip, Notice, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot,
  TitleStatus, Track, pillClass, trackClass,
} from '@/features/platform/components/medspa-ui';
import { getResourceOperations, setResourceActive } from '../actions/resources';
import { READINESS_LABELS, RESOURCE_TYPE_LABELS, type PlatformResource, type ResourceFormOptions } from '../types';
import { ResourceFormSheet } from '../components/ResourceFormSheet';
import { ReadinessActions } from '../components/ReadinessActions';

interface PageProps {
  searchParams?: Promise<{ status?: string }>;
}

const tabs = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
] as const;

function formatDateTime(value?: string | null, timeZone = 'UTC') {
  if (!value) return 'Unscheduled';
  return new Date(value).toLocaleString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function ResourceOperationsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeStatus = statusFilter(resolvedSearchParams.status, ["active","inactive","all"] as const, 'active');
  const { resources, counts, availability, options } = await getResourceOperations(activeStatus);
  const breadcrumbs = [{ label: 'Resources' }];

  if (availability === 'unavailable') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Rooms & devices" icon={DoorOpen} />
        <ErrorState id="resources-unavailable" title="Resources unavailable" action={<Track><PillLink href="/dashboard/platform/resources">Retry</PillLink></Track>} />
      </PlatformPage>
    );
  }

  const tabItems = tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    href: tab.value === 'active' ? '/dashboard/platform/resources' : `/dashboard/platform/resources?status=${tab.value}`,
    count: counts[tab.value as keyof typeof counts] ?? 0,
  }));

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Rooms & devices" icon={DoorOpen} actions={<Track><ResourceFormSheet options={options} /></Track>} />

      <MetricStrip items={[
        { label: 'Active', value: counts.active, tone: 'emerald' },
        { label: 'Inactive', value: counts.inactive, tone: 'zinc' },
        { label: 'Treatments without a room', value: counts.uncoveredServices, tone: counts.uncoveredServices ? 'amber' : undefined },
      ]} />

      {counts.uncoveredServices > 0 && (
        <Notice title={`${counts.uncoveredServices} active treatment${counts.uncoveredServices === 1 ? '' : 's'} without resource requirements`}>Bookings for these can double-book rooms and devices.</Notice>
      )}

      <SegmentTabs label="Resource filters" tabs={tabItems} active={activeStatus} />

      {resources.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No resources in this view" action={<Track><ResourceFormSheet options={options} /></Track>} />
      ) : (
        <section aria-label="Resources" className="grid gap-4 lg:grid-cols-2">
          {resources.map((resource) => <ResourceCard key={resource.id} resource={resource} options={options} />)}
        </section>
      )}
    </PlatformPage>
  );
}

function readinessTone(status?: string | null) {
  if (status === 'available') return 'emerald' as const;
  if (status === 'cleaning' || status === 'in_use') return 'blue' as const;
  if (status === 'acceptance_testing' || status === 'maintenance_due') return 'amber' as const;
  if (status === 'retired') return 'zinc' as const;
  return 'rose' as const;
}

function formatDay(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function ResourceCard({ resource, options }: { resource: PlatformResource; options: ResourceFormOptions }) {
  const isDevice = resource.type === 'device' || resource.type === 'equipment';
  const services = resource.services.map((service) => service.name).filter((name): name is string => Boolean(name));
  const timeZone = resource.location?.timezone || 'UTC';

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[6px] border bg-background">
      <div className="grid gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="min-w-0 truncate text-base font-semibold">{resource.name || 'Unnamed resource'}</h2>
              {isDevice
                ? <TitleStatus tone={readinessTone(resource.readinessStatus)}>{READINESS_LABELS[resource.readinessStatus || ''] || 'Readiness unknown'}</TitleStatus>
                : <TitleStatus tone={resource.isActive ? 'emerald' : 'zinc'}>{resource.isActive ? 'Active' : 'Inactive'}</TitleStatus>}
              {resource.isPublic ? <Chip>Online</Chip> : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{RESOURCE_TYPE_LABELS[resource.type || ''] || resource.type || 'Resource'} · capacity {resource.capacity || 1}</p>
          </div>
          <div className={trackClass}>
            <ResourceFormSheet resource={resource} options={options} />
            {!isDevice ? <form action={setResourceActive}>
              <input type="hidden" name="id" value={resource.id} />
              <input type="hidden" name="revision" value={resource.revision} />
              <input type="hidden" name="isActive" value={resource.isActive ? 'false' : 'true'} />
              <button type="submit" className={pillClass(resource.isActive ? 'quiet' : 'raised', 'sm')}>{resource.isActive ? 'Deactivate' : 'Reactivate'}</button>
            </form> : null}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <Fact label="Location">{[resource.location?.name, resource.location?.city].filter(Boolean).join(', ') || 'No location'}</Fact>
          <Fact label="Holds">{resource.appointments.length}</Fact>
          {isDevice ? <>
            <Fact label="Model">{[resource.manufacturer, resource.model].filter(Boolean).join(' ') || '—'}</Fact>
            <Fact label="Serial">{resource.serialNumber || '—'}</Fact>
            <Fact label="Maintenance due">{formatDay(resource.maintenanceDueAt)}</Fact>
            <Fact label="Calibration due">{formatDay(resource.calibrationDueAt)}</Fact>
          </> : null}
        </dl>

        {isDevice ? <ReadinessActions resourceId={resource.id} status={resource.readinessStatus || ''} releaseProviderId={options.releaseProviderId} /> : null}

        <div className="flex flex-wrap gap-1.5">
          {services.length ? services.map((name) => <Chip key={name}>{name}</Chip>) : <Chip tone="amber">No treatments assigned</Chip>}
        </div>

        {resource.notes && <p className="rounded-[6px] bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{resource.notes}</p>}
      </div>

      <div className="mt-auto border-t bg-muted/20">
        <h3 className="px-4 pt-3 text-xs font-medium text-muted-foreground md:px-5">Upcoming holds</h3>
        {resource.appointments.length ? (
          <ul className="divide-y">
            {resource.appointments.slice(0, 5).map((appointment) => (
              <li key={appointment.id} className="flex min-w-0 items-start gap-3 px-4 py-2.5 text-sm md:px-5">
                <StatusDot tone="violet" className="mt-1.5" />
                <div className="min-w-0">
                  <div className="font-medium tabular-nums">{formatDateTime(appointment.startTime, timeZone)}</div>
                  <div className="truncate text-muted-foreground">{appointment.client?.user?.name || 'Unnamed client'} · {appointment.services.map((service) => service.name).filter(Boolean).join(', ') || 'Treatment'} · {appointment.provider?.user?.name || 'Unassigned'}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="px-4 pb-3 pt-1 text-sm text-muted-foreground md:px-5">No upcoming holds</p>}
      </div>
    </article>
  );
}

export default ResourceOperationsPage;
