import { CalendarClock, CreditCard, FileCheck2, ShieldAlert, Stethoscope, UserRound } from 'lucide-react';
import { WorkflowUnavailable } from '@/features/platform/components/WorkflowUnavailable';
import {
  appointmentLabel, appointmentTone, Avatar, Chip, Fact, Notice, PageHeader, Panel, PillLink, PlatformPage,
  StatusDot, TitleStatus, Track, usd, type Tone,
} from '@/features/platform/components/medspa-ui';
import { getAppointmentWorkflowDetail, type AppointmentWorkflowDetail } from '../actions/appointmentWorkflow';
import { AppointmentSchedulingPanel } from './AppointmentSchedulingPanel';

function formatDateTime(value?: string | null, timeZone = 'UTC') {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleString('en-US', { timeZone, timeZoneName: 'short', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function needsClinicalReview(appointment: AppointmentWorkflowDetail) {
  return appointment.services.some((service) => service.requiresConsultation || service.requiresIntakeReview || service.staffAuthorizationRequired || service.requiresLotTraceability);
}

export async function AppointmentWorkflowPage({ appointmentId }: { appointmentId: string }) {
  const { appointment, capabilities, clinical } = await getAppointmentWorkflowDetail(appointmentId);
  if (!appointment) return <WorkflowUnavailable flow="appointment" />;

  if (capabilities.canSchedule && !capabilities.canManageClinical) {
    return (
      <PlatformPage width="narrow" breadcrumbs={[{ label: 'Appointments', href: '/dashboard/platform/appointments' }, { label: 'Scheduling' }]}>
        <PageHeader title="Scheduling" icon={CalendarClock} actions={capabilities.canManageFinance ? <Track><PillLink href={`/dashboard/platform/checkout/${appointment.id}`}>Checkout</PillLink></Track> : null} />
        <AppointmentSchedulingPanel appointmentId={appointment.id} />
      </PlatformPage>
    );
  }

  const timeZone = appointment.location?.timezone || 'UTC';
  const status = appointment.status || '';
  const clientName = appointment.client?.user?.name || 'Client restricted';
  const serviceNames = appointment.lineItems.map((item) => item.serviceTitle).filter(Boolean).join(', ') || appointment.services.map((service) => service.name).filter(Boolean).join(', ') || 'No treatment lines';
  const clinicalRequired = needsClinicalReview(appointment);
  const checkoutOpen = !appointment.transaction && !appointment.payment && ['confirmed', 'in_progress'].includes(status);
  const checkoutEligible = ['confirmed', 'in_progress'].includes(status);
  const settlement = capabilities.canManageFinance ? appointment.payment?.status || appointment.transaction?.paymentStatus || null : null;

  const timeline: Array<{ label: string; value: string; tone: Tone; done: boolean }> = [
    { label: 'Booked', value: appointment.bookedAt ? formatDateTime(appointment.bookedAt, timeZone) : 'Not recorded', tone: 'violet', done: Boolean(appointment.bookedAt) },
    { label: 'Confirmed', value: appointment.confirmedAt ? formatDateTime(appointment.confirmedAt, timeZone) : 'Not confirmed', tone: 'emerald', done: Boolean(appointment.confirmedAt) },
    appointment.cancelledAt
      ? { label: 'Cancelled', value: `${formatDateTime(appointment.cancelledAt, timeZone)}${appointment.cancellationReason ? ` · ${appointment.cancellationReason}` : ''}`, tone: 'rose', done: true }
      : { label: 'Now', value: appointmentLabel[status] || status || 'Not recorded', tone: appointmentTone[status] || 'zinc', done: true },
  ];

  return (
    <PlatformPage breadcrumbs={[{ label: 'Appointments', href: '/dashboard/platform/appointments' }, { label: serviceNames }]}>
      <PageHeader
        eyebrow={clientName}
        title={serviceNames}
        status={<TitleStatus tone={appointmentTone[status] || 'zinc'}>{appointmentLabel[status] || status || 'Status unavailable'}</TitleStatus>}
        meta={<>
          <span>{formatDateTime(appointment.startTime, timeZone)}</span>
          <span>{appointment.duration || 0} min</span>
          <span>{appointment.location?.name || 'No location'}</span>
        </>}
        actions={capabilities.canManageFinance ? (
          <Track>
            <PillLink href={`/dashboard/platform/checkout/${appointment.id}`} variant={checkoutOpen ? 'primary' : 'raised'}>{checkoutOpen ? 'Start checkout' : 'Checkout status'}</PillLink>
          </Track>
        ) : null}
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <Panel title="Timeline" icon={CalendarClock}>
            <ol className="grid gap-4 sm:grid-cols-3">
              {timeline.map((step) => (
                <li key={step.label} className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <StatusDot tone={step.done ? step.tone : 'zinc'} />{step.label}
                  </div>
                  <div className="mt-1 break-words text-sm font-medium">{step.value}</div>
                </li>
              ))}
            </ol>
          </Panel>

          {capabilities.canSchedule && <AppointmentSchedulingPanel appointmentId={appointment.id} />}

          <Panel
            title="Treatment prerequisites"
            icon={ShieldAlert}
            actions={capabilities.canManageClinical ? <Track><PillLink href="/dashboard/platform/appointments/plans" size="sm">Consultations & plans</PillLink></Track> : null}
            padded={false}
          >
            <ul className="divide-y">
              {appointment.services.map((service) => {
                const requirements = [
                  service.requiresConsultation && 'Consultation',
                  service.requiresIntakeReview && 'Intake review',
                  service.staffAuthorizationRequired && 'Provider authorization',
                  service.requiresLotTraceability && 'Lot traceability',
                ].filter((value): value is string => Boolean(value));
                return (
                  <li key={service.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-5">
                    <span className="min-w-0 truncate text-sm font-medium">{service.name || 'Treatment'}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {requirements.length ? requirements.map((label) => <Chip key={label} tone="violet">{label}</Chip>) : <Chip>None</Chip>}
                    </span>
                  </li>
                );
              })}
            </ul>
            {clinicalRequired && (
              <div className="border-t p-4 md:p-5">
                {capabilities.canManageClinical && clinical ? (
                  <div className="flex items-start gap-3 text-sm">
                    <FileCheck2 className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" />
                    <dl className="grid flex-1 grid-cols-2 gap-3">
                      <Fact label="Consent records">{clinical.consents.length}</Fact>
                      <Fact label="Treatment sessions">{clinical.sessions.length}</Fact>
                    </dl>
                  </div>
                ) : <Notice title="Clinical evidence restricted" />}
              </div>
            )}
          </Panel>

          <Panel title="Checkout" icon={CreditCard}>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Fact label="Appointment">
                <span className="inline-flex items-center gap-1.5"><StatusDot tone={checkoutEligible ? 'emerald' : 'zinc'} />{checkoutEligible ? 'Eligible' : 'Not eligible'}</span>
              </Fact>
              <Fact label="Deposit">{appointment.depositAmount ? appointment.depositPaid ? `Paid ${usd(appointment.depositAmount)}` : `Due ${usd(appointment.depositAmount)}` : 'None'}</Fact>
              <Fact label="Payment">{capabilities.canManageFinance ? settlement ? settlement.replaceAll('_', ' ') : 'Not settled' : 'Restricted'}</Fact>
            </dl>
          </Panel>
        </div>

        <aside className="grid min-w-0 content-start gap-4">
          <Panel title="Client" icon={UserRound}>
            {capabilities.canReadClients || capabilities.canSchedule || capabilities.canManageClinical ? (
              <div className="flex items-start gap-3">
                <Avatar name={clientName} />
                <dl className="grid min-w-0 flex-1 gap-3">
                  <Fact label="Name">{clientName}</Fact>
                  {appointment.client?.user?.email && <Fact label="Email" wrap>{appointment.client.user.email}</Fact>}
                  {appointment.client?.user?.phone && <Fact label="Phone">{appointment.client.user.phone}</Fact>}
                  <div className="grid grid-cols-2 gap-3">
                    <Fact label="Visits">{appointment.client?.totalVisits || 0}</Fact>
                    <Fact label="Last visit">{appointment.client?.lastVisit ? new Date(appointment.client.lastVisit).toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' }) : 'None'}</Fact>
                  </div>
                </dl>
              </div>
            ) : <Notice title="Client details restricted" />}
          </Panel>

          <Panel title="Provider" icon={Stethoscope}>
            <div className="flex items-center gap-3">
              <Avatar name={appointment.provider?.user?.name} />
              <span className="min-w-0 truncate text-sm font-medium">{appointment.provider?.user?.name || 'No provider assigned'}</span>
            </div>
          </Panel>
        </aside>
      </div>
    </PlatformPage>
  );
}

export default AppointmentWorkflowPage;
