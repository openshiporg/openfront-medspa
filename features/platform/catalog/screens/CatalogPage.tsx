import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusFilter } from '@/features/platform/lib/queryParams';
import { inputClass, pillClass, trackClass } from '@/features/platform/components/pill';
import {
  Chip, EmptyState, ErrorState, MetricStrip, PageHeader, PillLink, PlatformPage, SegmentTabs, StatusDot, Track, usd,
} from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getCatalog } from '../actions/catalog';
import { CLINICAL_FLAGS, type CatalogOptions, type CatalogTreatment } from '../types';
import { TreatmentFormSheet } from '../components/TreatmentFormSheet';
import { CategoryManagerSheet } from '../components/CategoryManagerSheet';
import { TreatmentStatusToggle } from '../components/TreatmentStatusToggle';

interface PageProps { searchParams?: Promise<{ status?: string; category?: string; q?: string }> }

const tabs = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'online', label: 'Online' },
] as const;

function href(params: { status?: string; category?: string; q?: string }) {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.category) query.set('category', params.category);
  if (params.q) query.set('q', params.q);
  const text = query.toString();
  return `/dashboard/platform/catalog${text ? `?${text}` : ''}`;
}

export async function CatalogPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const status = statusFilter(params.status, ['all', 'active', 'inactive', 'online'] as const, 'all');
  const category = (params.category || '').slice(0, 64);
  const q = (params.q || '').trim().slice(0, 80);
  const data = await getCatalog({ status, category, search: q });
  const breadcrumbs = [{ label: 'Treatments' }];

  if (data.availability === 'unavailable') {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Treatments" icon={Sparkles} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="catalog-unavailable" title="Treatments unavailable" message="The menu could not be loaded." action={<Track><PillLink href="/dashboard/platform/catalog">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const tabItems = tabs.map((tab) => ({ value: tab.value, label: tab.label, href: href({ status: tab.value, category, q }), count: data.counts[tab.value] }));
  const filtered = Boolean(category || q);

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Treatments" icon={Sparkles}
        actions={<Track><CategoryManagerSheet categories={data.options.categories} /><TreatmentFormSheet options={data.options} /></Track>} />

      <MetricStrip items={[
        { label: 'Treatments', value: data.counts.all },
        { label: 'Active', value: data.counts.active, tone: 'emerald' },
        { label: 'Online', value: data.counts.online, tone: 'violet' },
        { label: 'Categories', value: data.options.categories.length },
      ]} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentTabs label="Treatment status" tabs={tabItems} active={status} />
        <form className="flex min-w-0 flex-wrap items-center gap-2" action="/dashboard/platform/catalog">
          {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
          <label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <span className="sr-only">Search treatments</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className={cn(inputClass, 'pl-9')} name="q" defaultValue={q} placeholder="Search" maxLength={80} />
          </label>
          <label className="min-w-0 flex-1 sm:w-48 sm:flex-none">
            <span className="sr-only">Category</span>
            <select className={inputClass} name="category" defaultValue={category}>
              <option value="">All categories</option>
              <option value="none">No category</option>
              {data.options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className={trackClass}>
            <button type="submit" className={pillClass('raised', 'sm')}>Apply</button>
            {filtered ? <Link href={href({ status })} className={pillClass('quiet', 'sm')}>Clear</Link> : null}
          </div>
        </form>
      </div>

      {data.treatments.length === 0 ? (
        <EmptyState icon={Sparkles} title={filtered || status !== 'all' ? 'No treatments match' : 'No treatments yet'} action={!filtered && status === 'all' ? <Track><TreatmentFormSheet options={data.options} /></Track> : undefined} />
      ) : (
        <section aria-label="Treatments" className="overflow-hidden rounded-[6px] border bg-background">
          <ul className="divide-y">
            {data.treatments.map((treatment) => <TreatmentRow key={treatment.id} treatment={treatment} options={data.options} />)}
          </ul>
        </section>
      )}
    </PlatformPage>
  );
}

function TreatmentRow({ treatment, options }: { treatment: CatalogTreatment; options: CatalogOptions }) {
  const online = treatment.status === 'active' && treatment.isPublic === true;
  const flags = CLINICAL_FLAGS.filter((flag) => (treatment as any)[flag.key] === true);
  return (
    <li className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link href={`/dashboard/platform/catalog/${treatment.id}`} className="min-w-0 truncate text-base font-semibold hover:underline">{treatment.name}</Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <StatusDot tone={treatment.status === 'inactive' ? 'zinc' : online ? 'violet' : 'emerald'} />
            {treatment.status === 'inactive' ? 'Inactive' : online ? 'Online' : 'Staff booking only'}
          </span>
        </div>
        <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
          {treatment.category?.name || 'No category'} · {treatment.baseDuration || 0} min · {usd(treatment.price)}
          {treatment.depositRequired ? ` · ${usd(treatment.depositAmount)} deposit` : ''}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {flags.map((flag) => <Chip key={flag.key} tone="amber">{flag.label}</Chip>)}
          {treatment.requiredResources.length
            ? treatment.requiredResources.map((resource) => <Chip key={resource.id}>{resource.name}</Chip>)
            : <Chip tone="amber">No room</Chip>}
          <Chip tone={treatment.specialists.length ? undefined : 'amber'}>{treatment.specialists.length} {treatment.specialists.length === 1 ? 'provider' : 'providers'}</Chip>
          {treatment.variants.length ? <Chip>{treatment.variants.length} variants</Chip> : null}
        </div>
      </div>
      <div className={cn(trackClass, 'justify-self-start md:justify-self-end')}>
        <TreatmentStatusToggle id={treatment.id} status={treatment.status} />
        <TreatmentFormSheet treatment={treatment} options={options} size="sm" />
        <PillLink href={`/dashboard/platform/catalog/${treatment.id}`} size="sm">Open</PillLink>
      </div>
    </li>
  );
}

export default CatalogPage;
