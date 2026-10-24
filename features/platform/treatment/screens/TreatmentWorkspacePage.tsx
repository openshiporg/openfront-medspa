import { Stethoscope } from 'lucide-react';
import { appointmentLabel, appointmentTone, EmptyState, ErrorState, PageHeader, PillLink, PlatformPage, TitleStatus, Track } from '@/features/platform/components/medspa-ui';
import { getTreatmentWorkspace } from '../actions/treatment';
import { TreatmentWorkspaceClient } from './TreatmentWorkspaceClient';

export async function TreatmentWorkspacePage({ appointmentId }: { appointmentId: string }) {
  const result = await getTreatmentWorkspace(appointmentId);
  const detailHref = `/dashboard/platform/appointments/${appointmentId}`;
  const breadcrumbs = [{ label: 'Appointments', href: '/dashboard/platform/appointments' }, { label: 'Appointment', href: detailHref }, { label: 'Treatment' }];

  if (result.status !== 'loaded') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
        <PageHeader title="Treatment" icon={Stethoscope} />
        {result.status === 'restricted'
          ? <EmptyState icon={Stethoscope} title="Clinical access required" action={<Track><PillLink href={detailHref}>Appointment</PillLink></Track>} />
          : <ErrorState id="treatment-unavailable" title="Treatment unavailable" message="This appointment's clinical record could not be loaded." action={<Track><PillLink href={`${detailHref}/treatment`}>Retry</PillLink><PillLink href={detailHref}>Appointment</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const { appointment } = result.data;
  const when = appointment.startTime
    ? new Date(appointment.startTime).toLocaleString('en-US', { timeZone: appointment.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <PlatformPage breadcrumbs={breadcrumbs} width="narrow">
      <PageHeader
        title={appointment.clientName}
        icon={Stethoscope}
        status={<TitleStatus tone={appointmentTone[appointment.status] || 'zinc'}>{appointmentLabel[appointment.status] || appointment.status}</TitleStatus>}
        meta={<>{when ? <span>{when}</span> : null}{appointment.providerName ? <span>{appointment.providerName}</span> : null}{appointment.locationName ? <span>{appointment.locationName}</span> : null}</>}
        actions={<Track><PillLink href={detailHref}>Appointment</PillLink></Track>}
      />
      <TreatmentWorkspaceClient data={result.data} />
    </PlatformPage>
  );
}
