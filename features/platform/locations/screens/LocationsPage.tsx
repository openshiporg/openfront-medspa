import { MapPin } from 'lucide-react';
import { Chip, EmptyState, ErrorState, PageHeader, PillLink, PlatformPage, TitleStatus, Track } from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getPracticeLocations } from '../actions/locations';
import { LocationSheet } from '../components/LocationSheet';
import { WEEK_DAYS, type PracticeLocation } from '../types';

function hoursSummary(location: PracticeLocation) {
  return WEEK_DAYS.map(([day, label]) => {
    const entry = location.hours?.[day];
    return { day, label, value: entry && entry.closed === false && entry.open && entry.close ? `${entry.open}–${entry.close}` : null };
  });
}

export async function LocationsPage() {
  const result = await getPracticeLocations();
  const breadcrumbs = [{ label: 'Locations' }];
  if (result.status === 'unavailable') {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Locations" icon={MapPin} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="locations-unavailable" title="Locations unavailable" action={<Track><PillLink href="/dashboard/platform/locations">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Locations" icon={MapPin} actions={<Track><LocationSheet /></Track>} />
      {result.locations.length === 0 ? (
        <EmptyState icon={MapPin} title="No locations" action={<Track><LocationSheet /></Track>} />
      ) : (
        <section aria-label="Locations" className="grid gap-4 md:grid-cols-2">
          {result.locations.map((location) => (
            <article key={location.id} className="min-w-0 rounded-2xl border bg-background p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <h2 className="truncate text-base font-semibold">{location.name}</h2>
                    <TitleStatus tone={location.isActive ? 'emerald' : 'zinc'}>{location.isActive ? 'Active' : 'Inactive'}</TitleStatus>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{[location.address, [location.city, location.state].filter(Boolean).join(', '), location.zipCode].filter(Boolean).join(' · ') || 'No address'}</p>
                </div>
                <Track><LocationSheet location={location} /></Track>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {location.isPrimary ? <Chip tone="violet">Storefront</Chip> : null}
                <Chip>{location.providersCount} {location.providersCount === 1 ? 'provider' : 'providers'}</Chip>
                <Chip>{location.resourcesCount} {location.resourcesCount === 1 ? 'room' : 'rooms'}</Chip>
                {location.timezone ? <Chip>{location.timezone.replaceAll('_', ' ')}</Chip> : <Chip tone="amber">No timezone</Chip>}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
                {hoursSummary(location).map((entry) => (
                  <div key={entry.day} className="flex justify-between gap-2 sm:block">
                    <dt className="text-xs text-muted-foreground">{entry.label}</dt>
                    <dd className={entry.value ? 'tabular-nums' : 'text-muted-foreground'}>{entry.value || 'Closed'}</dd>
                  </div>
                ))}
              </dl>
              {location.phone || location.email ? <p className="mt-3 truncate text-xs text-muted-foreground">{[location.phone, location.email].filter(Boolean).join(' · ')}</p> : null}
            </article>
          ))}
        </section>
      )}
    </PlatformPage>
  );
}
