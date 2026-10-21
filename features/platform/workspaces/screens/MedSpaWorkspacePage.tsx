import type { ComponentType, ReactNode } from 'react';
import { PlatformBreadcrumbs } from '@/features/platform/components/PlatformBreadcrumbs';
import { workspaceMetricUnit, workspaceStatus, workspaceTitles } from '../presentation';
import Link from 'next/link';
import { ArrowUpRight, Boxes, Building2, CircleDollarSign, ContactRound, Gift, Link2, Megaphone, Scissors, ShieldCheck } from 'lucide-react';
import { adjustInventoryFromWorkspace, getMedSpaWorkspace, transitionWaitlistFromWorkspace, WorkspaceRecord, WorkspaceSection } from '../actions/workspaces';

const icons: Record<WorkspaceSection, ComponentType<{ className?: string }>> = {
  clients: ContactRound, catalog: Scissors, benefits: Gift, inventory: Boxes,
  engagement: Megaphone, administration: Building2, reports: CircleDollarSign, integrations: Link2,
};

const labels: Record<WorkspaceSection, string> = {
  clients: 'Relationships', catalog: 'Bookability', benefits: 'Client value', inventory: 'Stock control',
  engagement: 'Demand & delivery', administration: 'Configuration', reports: 'Settled evidence', integrations: 'System health',
};

function formatAmount(value?: number | null) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
}
function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function MedSpaWorkspacePage({ section }: { section: WorkspaceSection }) {
  const result = await getMedSpaWorkspace(section);
  if (result.status === 'unavailable') return <><PlatformBreadcrumbs items={[{ label: workspaceTitles[section] }]} /><main className="p-4 md:p-6"><h1 className="text-2xl font-semibold">{workspaceTitles[section]}</h1><section role="alert" className="mt-4 rounded-lg border p-4"><p>{result.message}</p><a className="mt-3 inline-flex min-h-11 items-center underline" href={`/dashboard/platform/${section}`}>Retry loading records</a></section></main></>;
  const data = result.data;
  const Icon = icons[section];
  const locations = section === 'inventory' ? data.records.filter((record) => record.id.startsWith('location:')) : [];
  const records = section === 'inventory' ? data.records.filter((record) => !record.id.startsWith('location:')) : data.records;

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PlatformBreadcrumbs items={[{ label: workspaceTitles[section] }]} />
        <header className="border bg-background p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 border bg-muted/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {labels[section]}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{workspaceTitles[section]}</h1>

            </div>

          </div>
        </header>



        {data.metrics.length > 0 && <section aria-label="Operational report" className="overflow-x-auto rounded-lg border bg-background p-4"><h2 className="font-semibold">Current records and exceptions</h2><p className="my-2 text-sm">{data.attentionCount.toLocaleString()} records or exceptions need review in this scope. Sample limits are shown with each measure.</p><table className="w-full text-sm"><tbody>{data.metrics.map((metric, index) => <tr key={`${metric.label}-${index}`} className="border-b"><th scope="row" className="py-2 pr-4 text-left font-normal">{metric.label}</th><td className="py-2 text-right tabular-nums">{metric.format === 'money' ? formatAmount(metric.value) : metric.value.toLocaleString()}</td></tr>)}</tbody></table></section>}
        {section === 'administration' && <QuickLinks />}
        {section === 'inventory' && locations.length === 0 && <Notice>No active stock location is configured. Add or activate a location before recording inventory movement.</Notice>}
        {records.length === 0 ? <EmptyState section={section} /> : (
          <section aria-label={`${data.title} queue`} className="grid min-w-0 max-w-full gap-3">
            {records.map((record) => <WorkspaceRow key={record.id} section={section} record={record} locations={locations} />)}
          </section>
        )}
      </div>
    </main>
  );
}

function WorkspaceRow({ section, record, locations }: { section: WorkspaceSection; record: WorkspaceRecord; locations: WorkspaceRecord[] }) {
  const amount = formatAmount(record.amount);
  const occurredAt = formatDate(record.occurredAt);
  return (
    <article className="min-w-0 max-w-full border bg-background p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 max-w-full truncate text-base font-semibold">{record.title}</h2>
            {record.status && <span className="border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">{workspaceStatus(record.status)}</span>}
          </div>
          {record.subtitle && <p className="mt-1 text-sm text-muted-foreground">{record.subtitle}</p>}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {record.detail && <span>{record.detail}</span>}
            {amount && <strong className="font-medium text-foreground">{amount}</strong>}
            {record.metric !== null && record.metric !== undefined && <span>{record.metric.toLocaleString()} {workspaceMetricUnit(section, record.id)}</span>}
            {occurredAt && <time dateTime={record.occurredAt || undefined}>{occurredAt}</time>}
          </div>
        </div>
        <div className="shrink-0 lg:w-[25rem]">
          {record.action === 'adjust_inventory' ? <InventoryForm record={record} locations={locations} /> : null}
          {record.action === 'notify_waitlist' || record.action === 'remove_waitlist' ? <WaitlistForm record={record} /> : null}
          {record.href ? <Link href={record.href} className="inline-flex w-full items-center justify-center gap-2 border px-3 py-2 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">Open operational record <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link> : null}
        </div>
      </div>
    </article>
  );
}

function InventoryForm({ record, locations }: { record: WorkspaceRecord; locations: WorkspaceRecord[] }) {
  if (!locations.length) return null;
  return <form action={adjustInventoryFromWorkspace} className="mb-2 grid grid-cols-2 gap-2">
    <input type="hidden" name="productId" value={record.id.replace('product:', '')} />
    <input type="hidden" name="idempotencyKey" value={`platform:inventory:${record.id}:${crypto.randomUUID()}`} />
    <label className="col-span-2 text-xs font-medium">Stock location<select name="locationId" required className="mt-1 h-9 w-full border bg-background px-2 text-sm">{locations.map((location) => <option key={location.id} value={location.id.replace('location:', '')}>{location.title}</option>)}</select></label>
    <label className="text-xs font-medium">Quantity change<input name="delta" type="number" step="1" required placeholder="e.g. 12 or -2" className="mt-1 h-9 w-full border bg-background px-2 text-sm" /></label>
    <label className="text-xs font-medium">Reason<input name="reason" required maxLength={500} placeholder="Delivery, count…" className="mt-1 h-9 w-full border bg-background px-2 text-sm" /></label>
    <button type="submit" className="col-span-2 bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring">Record inventory movement</button>
  </form>;
}

function WaitlistForm({ record }: { record: WorkspaceRecord }) {
  const action = record.action === 'notify_waitlist' ? 'notify' : 'remove';
  return <form action={transitionWaitlistFromWorkspace} className="mb-2 grid gap-2 border bg-muted/30 p-2">
    <input type="hidden" name="waitlistEntryId" value={record.id} /><input type="hidden" name="action" value={action} />
    <label className="text-xs font-medium">Operator note<input name="reason" maxLength={500} placeholder={action === 'notify' ? 'Slot offered by phone' : 'Removal reason'} className="mt-1 h-8 w-full border bg-background px-2 text-sm" /></label>
    <button type="submit" className="bg-foreground px-3 py-2 text-sm font-medium text-background focus:outline-none focus:ring-2 focus:ring-ring">{action === 'notify' ? 'Mark client notified' : 'Remove from waitlist'}</button>
  </form>;
}

function QuickLinks() { return <nav aria-label="Staff and location administration shortcuts" className="grid gap-2 sm:grid-cols-2"><Link href="/dashboard/platform/schedules" className="flex items-center justify-between border bg-background p-4 text-sm font-medium hover:bg-muted">Manage schedule coverage <ArrowUpRight className="h-4 w-4" /></Link><Link href="/dashboard/platform/resources" className="flex items-center justify-between border bg-background p-4 text-sm font-medium hover:bg-muted">Manage location resources <ArrowUpRight className="h-4 w-4" /></Link></nav>; }
function Notice({ children }: { children: ReactNode }) { return <div role="status" className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{children}</div>; }
function EmptyState({ section }: { section: WorkspaceSection }) { return <section className="border bg-background p-12 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 text-lg font-semibold">No records in this queue</h2></section>; }
