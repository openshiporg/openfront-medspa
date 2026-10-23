import { LockKeyhole } from 'lucide-react';
import { EmptyState, PillLink, PlatformPage, Track } from './medspa-ui';

export function WorkflowUnavailable({ flow }: { flow: 'appointment' | 'checkout' }) {
  const label = flow === 'checkout' ? 'Checkout' : 'Appointment';
  return (
    <PlatformPage width="narrow" breadcrumbs={[{ label: 'Appointments', href: '/dashboard/platform/appointments' }, { label }]}>
      <EmptyState icon={LockKeyhole} title={`${label} unavailable`} action={<Track><PillLink href="/dashboard/platform/appointments">Appointments</PillLink></Track>} />
    </PlatformPage>
  );
}
