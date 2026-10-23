import type { ComponentType } from 'react';
import { ArrowUpRight, Boxes, Building2, ChartNoAxesCombined, ContactRound, Gift, Megaphone, PlugZap, Sparkles } from 'lucide-react';
import {
  Chip, EmptyState, ErrorState, MetricStrip, Notice, PageHeader, PillLink, PlatformPage, TitleStatus, Track,
  fieldLabelClass, pillClass, statusTone, trackClass, usd,
} from '@/features/platform/components/medspa-ui';
import { workspaceMetricUnit, workspaceStatus, workspaceTitles } from '../presentation';
import { adjustInventoryFromWorkspace, getMedSpaWorkspace, transitionWaitlistFromWorkspace, WorkspaceRecord, WorkspaceSection } from '../actions/workspaces';

const icons: Record<WorkspaceSection, ComponentType<{ className?: string }>> = {
  clients: ContactRound, catalog: Sparkles, benefits: Gift, inventory: Boxes,
  engagement: Megaphone, administration: Building2, reports: ChartNoAxesCombined, integrations: PlugZap,
};

const emptyTitles: Record<WorkspaceSection, string> = {
  clients: 'No clients yet', catalog: 'No treatments in the catalog', benefits: 'No memberships or packages',
  inventory: 'No inventory records', engagement: 'Waitlist is clear', administration: 'No staff or locations',
  reports: 'No settled activity', integrations: 'No integration exceptions',
};

const smallInput = 'h-9 w-full min-w-0 rounded-lg border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function MedSpaWorkspacePage({ section }: { section: WorkspaceSection }) {
  const result = await getMedSpaWorkspace(section);
  const title = workspaceTitles[section];
  const Icon = icons[section];
  const breadcrumbs = [{ label: title }];

  if (result.status === 'unavailable') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title={title} icon={Icon} />
        <ErrorState id={`${section}-unavailable`} title={`${title} unavailable`} message={result.message} action={<Track><PillLink href={`/dashboard/platform/${section}`}>Retry</PillLink></Track>} />
      </PlatformPage>
    );
  }

  const data = result.data;
  const locations = section === 'inventory' ? data.records.filter((record) => record.id.startsWith('location:')) : [];
  const records = section === 'inventory' ? data.records.filter((record) => !record.id.startsWith('location:')) : data.records;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title={title}
        icon={Icon}
        status={data.attentionCount > 0 ? <TitleStatus tone="amber">{data.attentionCount.toLocaleString()} need review</TitleStatus> : <TitleStatus tone="emerald">Clear</TitleStatus>}
        actions={section === 'administration' ? (
          <Track label="Staff and location administration shortcuts">
            <PillLink href="/dashboard/platform/schedules">Schedules</PillLink>
            <PillLink href="/dashboard/platform/resources" variant="quiet">Rooms & devices</PillLink>
          </Track>
        ) : null}
      />

      {data.metrics.length > 0 && (
        <section aria-label="Operational report">
          <MetricStrip items={data.metrics.map((metric) => ({ label: metric.label, value: metric.format === 'money' ? usd(metric.value) : metric.value.toLocaleString() }))} />
        </section>
      )}

      {section === 'inventory' && locations.length === 0 && <Notice title="No active stock location">Activate a location before recording inventory movement.</Notice>}

      {records.length === 0 ? <EmptyState icon={Icon} title={emptyTitles[section]} /> : (
        <section aria-label={`${data.title} queue`} className="min-w-0">
          <ul className="divide-y overflow-hidden rounded-2xl border bg-background">
            {records.map((record) => <WorkspaceRow key={record.id} section={section} record={record} locations={locations} />)}
          </ul>
        </section>
      )}
    </PlatformPage>
  );
}

function WorkspaceRow({ section, record, locations }: { section: WorkspaceSection; record: WorkspaceRecord; locations: WorkspaceRecord[] }) {
  const amount = record.amount === null || record.amount === undefined ? null : usd(record.amount);
  const occurredAt = formatDate(record.occurredAt);
  const hasForm = (record.action === 'adjust_inventory' && locations.length > 0) || record.action === 'notify_waitlist' || record.action === 'remove_waitlist';
  return (
    <li className={`grid min-w-0 gap-3 p-4 md:px-5 ${hasForm ? 'lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start' : 'md:grid-cols-[minmax(0,1fr)_auto] md:items-center'}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 className="min-w-0 max-w-full truncate text-base font-semibold">{record.title}</h2>
          {record.status && <TitleStatus tone={statusTone(record.status)}>{workspaceStatus(record.status)}</TitleStatus>}
        </div>
        {record.subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{record.subtitle}</p>}
        {(record.detail || amount || (record.metric !== null && record.metric !== undefined) || occurredAt) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {record.detail && <Chip>{record.detail}</Chip>}
            {amount && <Chip>{amount}</Chip>}
            {record.metric !== null && record.metric !== undefined && <Chip>{record.metric.toLocaleString()} {workspaceMetricUnit(section, record.id)}</Chip>}
            {occurredAt && <Chip><time dateTime={record.occurredAt || undefined}>{occurredAt}</time></Chip>}
          </div>
        )}
      </div>
      <div className="grid min-w-0 gap-2">
        {record.action === 'adjust_inventory' ? <InventoryForm record={record} locations={locations} /> : null}
        {record.action === 'notify_waitlist' || record.action === 'remove_waitlist' ? <WaitlistForm record={record} /> : null}
        {record.href ? <Track className="w-fit"><PillLink href={record.href} size="sm">Open <ArrowUpRight /></PillLink></Track> : null}
      </div>
    </li>
  );
}

function InventoryForm({ record, locations }: { record: WorkspaceRecord; locations: WorkspaceRecord[] }) {
  if (!locations.length) return null;
  return <form action={adjustInventoryFromWorkspace} className="grid min-w-0 grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-3">
    <input type="hidden" name="productId" value={record.id.replace('product:', '')} />
    <input type="hidden" name="idempotencyKey" value={`platform:inventory:${record.id}:${crypto.randomUUID()}`} />
    <label className={`${fieldLabelClass} col-span-2`}>Stock location<select name="locationId" required className={smallInput}>{locations.map((location) => <option key={location.id} value={location.id.replace('location:', '')}>{location.title}</option>)}</select></label>
    <label className={fieldLabelClass}>Quantity change<input name="delta" type="number" step="1" required placeholder="12 or -2" className={smallInput} /></label>
    <label className={fieldLabelClass}>Reason<input name="reason" required maxLength={500} placeholder="Delivery, count…" className={smallInput} /></label>
    <span className={`${trackClass} col-span-2 w-fit`}><button type="submit" className={pillClass('primary', 'sm')}>Record movement</button></span>
  </form>;
}

function WaitlistForm({ record }: { record: WorkspaceRecord }) {
  const action = record.action === 'notify_waitlist' ? 'notify' : 'remove';
  return <form action={transitionWaitlistFromWorkspace} className="grid min-w-0 gap-2 rounded-xl border bg-muted/30 p-3">
    <input type="hidden" name="waitlistEntryId" value={record.id} /><input type="hidden" name="action" value={action} />
    <label className={fieldLabelClass}>Note<input name="reason" maxLength={500} placeholder={action === 'notify' ? 'Slot offered by phone' : 'Removal reason'} className={smallInput} /></label>
    <span className={`${trackClass} w-fit`}><button type="submit" className={pillClass(action === 'notify' ? 'primary' : 'danger', 'sm')}>{action === 'notify' ? 'Mark client notified' : 'Remove from waitlist'}</button></span>
  </form>;
}
