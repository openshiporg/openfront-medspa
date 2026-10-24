import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import {
  Chip, EmptyState, ErrorState, Fact, MetricStrip, PageHeader, Panel, PillLink, PlatformPage, StatusDot, TitleStatus, Track, usd,
} from '@/features/platform/components/medspa-ui';
import { getTreatment } from '../actions/catalog';
import { CLINICAL_FLAGS } from '../types';
import { TreatmentFormSheet } from '../components/TreatmentFormSheet';
import { TreatmentStatusToggle } from '../components/TreatmentStatusToggle';
import { VariantsPanel } from '../components/VariantsPanel';

export async function TreatmentDetailPage({ id }: { id: string }) {
  const result = await getTreatment(id);
  const base = [{ label: 'Treatments', href: '/dashboard/platform/catalog' }];

  if (result.status !== 'loaded') {
    return (
      <PlatformPage breadcrumbs={[...base, { label: result.status === 'missing' ? 'Not found' : 'Unavailable' }]} width="narrow">
        {result.status === 'missing'
          ? <EmptyState icon={Sparkles} title="Treatment not found" action={<Track><PillLink href="/dashboard/platform/catalog">Treatments</PillLink></Track>} />
          : <ErrorState id="treatment-unavailable" title="Treatment unavailable" message="This treatment could not be loaded." action={<Track><PillLink href={`/dashboard/platform/catalog/${id}`}>Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const { treatment, options } = result;
  const online = treatment.status === 'active' && treatment.isPublic === true;
  const flags = CLINICAL_FLAGS.filter((flag) => (treatment as any)[flag.key] === true);

  return (
    <PlatformPage breadcrumbs={[...base, { label: treatment.name }]}>
      <PageHeader
        title={treatment.name}
        icon={Sparkles}
        status={<TitleStatus tone={treatment.status === 'inactive' ? 'zinc' : online ? 'violet' : 'emerald'}>{treatment.status === 'inactive' ? 'Inactive' : online ? 'Online' : 'Staff booking only'}</TitleStatus>}
        meta={<><span>{treatment.category?.name || 'No category'}</span><span className="tabular-nums">{treatment.baseDuration || 0} min</span><span className="tabular-nums">{usd(treatment.price)}</span></>}
        actions={<Track><TreatmentStatusToggle id={treatment.id} status={treatment.status} /><TreatmentFormSheet treatment={treatment} options={options} />{online ? <PillLink href={`/services/${treatment.id}`}>Storefront</PillLink> : null}</Track>}
      />

      <MetricStrip items={[
        { label: 'Upcoming bookings', value: result.upcoming, tone: result.upcoming ? 'blue' : undefined, href: '/dashboard/platform/appointments' },
        { label: 'Completed', value: result.completed },
        { label: 'Providers', value: treatment.specialists.length, tone: treatment.specialists.length ? undefined : 'amber' },
        { label: 'Rooms & devices', value: treatment.requiredResources.length, tone: treatment.requiredResources.length ? undefined : 'amber' },
      ]} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Fact label="Price">{usd(treatment.price)}</Fact>
              <Fact label="Duration">{treatment.baseDuration || 0} min</Fact>
              <Fact label="Cleanup">{treatment.cleanupBufferMinutes ?? 0} min</Fact>
              <Fact label="Deposit">{treatment.depositRequired ? usd(treatment.depositAmount) : 'None'}</Fact>
              <Fact label="Category">{treatment.category?.name || 'None'}</Fact>
              <Fact label="Online">{online ? 'Yes' : 'No'}</Fact>
            </dl>
            {treatment.description ? <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{treatment.description}</p> : null}
          </Panel>
          <VariantsPanel serviceId={treatment.id} variants={treatment.variants} />
        </div>

        <div className="grid content-start gap-4">
          <Panel title="Clinical requirements">
            {flags.length ? <div className="flex flex-wrap gap-1.5">{flags.map((flag) => <Chip key={flag.key} tone="amber">{flag.label}</Chip>)}</div> : <p className="text-sm text-muted-foreground">None</p>}
          </Panel>
          <Panel title="Rooms & devices" actions={<Track><PillLink href="/dashboard/platform/resources" size="sm">Manage</PillLink></Track>}>
            {treatment.requiredResources.length ? (
              <ul className="grid gap-2">
                {treatment.requiredResources.map((resource) => <li key={resource.id} className="flex items-center gap-2 text-sm"><StatusDot tone="emerald" />{resource.name}<span className="text-xs text-muted-foreground">{resource.type}</span></li>)}
              </ul>
            ) : <p className="flex items-center gap-2 text-sm text-muted-foreground"><StatusDot tone="amber" />No room assigned</p>}
          </Panel>
          <Panel title="Providers">
            {treatment.specialists.length ? (
              <ul className="grid gap-2">
                {treatment.specialists.map((provider) => <li key={provider.id} className="text-sm font-medium">{provider.user?.name || 'Provider'}</li>)}
              </ul>
            ) : <p className="flex items-center gap-2 text-sm text-muted-foreground"><StatusDot tone="amber" />No providers</p>}
            <p className="mt-3 text-xs text-muted-foreground"><Link href="/dashboard/platform/schedules" className="underline underline-offset-2">Provider hours</Link></p>
          </Panel>
        </div>
      </div>
    </PlatformPage>
  );
}

export default TreatmentDetailPage;
