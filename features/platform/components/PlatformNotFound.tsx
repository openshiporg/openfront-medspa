import type { Metadata } from 'next';
import { SearchX } from 'lucide-react';
import { EmptyState, PillLink, PlatformPage, Track } from './medspa-ui';

export const platformNotFoundMetadata: Metadata = { title: 'Page not found' };

/** Rendered in place for unknown /dashboard/platform/* paths, inside the dashboard shell. */
export function PlatformNotFound() {
  return (
    <PlatformPage breadcrumbs={[{ label: 'Page not found' }]}>
      <EmptyState icon={SearchX} title="Page not found" action={<Track><PillLink href="/dashboard/platform/appointments" variant="primary">Appointments</PillLink><PillLink href="/dashboard">Dashboard</PillLink></Track>} />
    </PlatformPage>
  );
}
