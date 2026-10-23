import { CalendarHeart, ShieldAlert } from 'lucide-react';
import { statusFilter } from '@/features/platform/lib/queryParams';
import {
  appointmentLabel, appointmentTone, Chip, EmptyState, ErrorState, MetricStrip, PageHeader, PillLink,
  PlatformPage, SegmentTabs, StatusDot, Track, usd,
} from '@/features/platform/components/medspa-ui';
import { getAppointmentOperations, PlatformAppointment } from '../actions/appointments';

const statusTabs = [
  { value: 'today', label: 'Today' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'Checked in' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-shows' },
  { value: 'all', label: 'All' },
] as const;

interface PageProps {
  searchParams?: Promise<{ status?: string }>;
}

function zoneOf(appointment: PlatformAppointment) {
  return appointment.location?.timezone || 'UTC';
}

function formatTime(value?: string | null, timeZone = 'UTC') {
  if (!value) return 'Unscheduled';
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone });
}

function formatDay(value?: string | null, timeZone = 'UTC') {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' });
}

function serviceTotal(appointment: PlatformAppointment) {
  if (appointment.lineItems.length) return appointment.lineItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity ?? 1), 0);
  return appointment.services.reduce((sum, service) => sum + (service.basePrice || 0), 0);
}

function needsClinicalReview(appointment: PlatformAppointment) {
  return appointment.services.some((service) => service.requiresConsultation || service.requiresIntakeReview || service.staffAuthorizationRequired);
}

function treatmentTitle(appointment: PlatformAppointment) {
  return appointment.lineItems?.map((item) => item.serviceTitle).filter(Boolean).join(', ')
    || appointment.services.map((service) => service.name).filter(Boolean).join(', ')
    || 'Treatment';
}

/** Group a sorted list into day sections in each record's own practice timezone. */
function groupByDay(appointments: PlatformAppointment[]) {
  const groups: Array<{ key: string; label: string; items: PlatformAppointment[] }> = [];
  for (const appointment of appointments) {
    const label = formatDay(appointment.startTime, zoneOf(appointment));
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(appointment);
    else groups.push({ key: `${label}-${groups.length}`, label, items: [appointment] });
  }
  return groups;
}

export async function AppointmentOperationsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeStatus = statusFilter(resolvedSearchParams.status, ["today","pending","confirmed","in_progress","completed","cancelled","no_show","all"] as const, 'today');
  const { appointments, counts, availability } = await getAppointmentOperations(activeStatus);
  const breadcrumbs = [{ label: 'Appointments' }];

  if (availability === 'unavailable') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Appointments" icon={CalendarHeart} />
        <ErrorState id="appointments-unavailable" title="Appointments unavailable" message="Appointments and counts could not be loaded." action={<Track><PillLink href="/dashboard/platform/appointments">Retry</PillLink></Track>} />
      </PlatformPage>
    );
  }

  const tabs = statusTabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    href: tab.value === 'today' ? '/dashboard/platform/appointments' : `/dashboard/platform/appointments?status=${tab.value}`,
    count: counts[tab.value as keyof typeof counts] ?? 0,
  }));
  const groups = groupByDay(appointments);

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title="Appointments"
        icon={CalendarHeart}
        actions={
          <Track label="Appointment actions">
            <PillLink href="/dashboard/platform/appointments/plans" variant="quiet">Consultations & plans</PillLink>
            <PillLink href="/dashboard/platform/appointments/new" variant="primary">Book appointment</PillLink>
          </Track>
        }
      />

      <MetricStrip items={[
        { label: 'Today', value: counts.today ?? 0, tone: 'violet', href: '/dashboard/platform/appointments' },
        { label: 'Pending', value: counts.pending ?? 0, tone: 'amber', href: '/dashboard/platform/appointments?status=pending' },
        { label: 'Confirmed', value: counts.confirmed ?? 0, tone: 'emerald', href: '/dashboard/platform/appointments?status=confirmed' },
        { label: 'Checked in', value: counts.in_progress ?? 0, tone: 'blue', href: '/dashboard/platform/appointments?status=in_progress' },
        { label: 'No-shows', value: counts.no_show ?? 0, tone: 'orange', href: '/dashboard/platform/appointments?status=no_show' },
      ]} />

      <SegmentTabs label="Appointment status filters" tabs={tabs} active={activeStatus} />

      {appointments.length === 0 ? (
        <EmptyState icon={CalendarHeart} title="No appointments in this view" />
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label} className="min-w-0">
              <h2 className="mb-2 flex items-baseline justify-between gap-3 px-1 text-sm font-semibold">
                {group.label}
                <span className="text-xs font-normal tabular-nums text-muted-foreground">{group.items.length}</span>
              </h2>
              <ol className="divide-y overflow-hidden rounded-2xl border bg-background">
                {group.items.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)}
              </ol>
            </section>
          ))}
        </div>
      )}
    </PlatformPage>
  );
}

function AppointmentRow({ appointment }: { appointment: PlatformAppointment }) {
  const timeZone = zoneOf(appointment);
  const clientName = appointment.client?.user?.name || 'Client unavailable';
  const providerName = appointment.provider?.user?.name || 'Unassigned';
  const tone = appointmentTone[appointment.status] || 'zinc';
  const total = serviceTotal(appointment);

  return (
    <li className="grid gap-3 p-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] md:p-5 lg:grid-cols-[5.5rem_minmax(0,1fr)_auto] lg:items-center">
      <div className="flex items-baseline gap-2 sm:block">
        <div className="text-sm font-semibold tabular-nums">{formatTime(appointment.startTime, timeZone)}</div>
        <div className="text-xs text-muted-foreground">{appointment.duration ? `${appointment.duration} min` : timeZone}</div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="min-w-0 truncate text-base font-semibold">{clientName}</h3>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <StatusDot tone={tone} />{appointmentLabel[appointment.status] || appointment.status}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{treatmentTitle(appointment)} · {providerName}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {needsClinicalReview(appointment) ? <Chip tone="violet"><ShieldAlert className="inline size-3" /> Clinical review</Chip> : null}
          {appointment.depositAmount ? <Chip tone={appointment.depositPaid ? 'emerald' : 'amber'}>{appointment.depositPaid ? 'Deposit paid' : `Deposit due ${usd(appointment.depositAmount)}`}</Chip> : null}
          {total ? <Chip>{usd(total)}</Chip> : null}
          {appointment.payment?.status ? <Chip tone="emerald">Payment {appointment.payment.status.replaceAll('_', ' ')}</Chip> : null}
        </div>
        {(appointment.clientNotes || appointment.internalNotes) && (
          <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            {appointment.clientNotes && <Note title="Client note" body={appointment.clientNotes} />}
            {appointment.internalNotes && <Note title="Internal note" body={appointment.internalNotes} />}
          </dl>
        )}
      </div>

      <Track className="justify-self-start sm:col-start-2 lg:col-start-auto lg:justify-self-end">
        <PillLink href={`/dashboard/platform/appointments/${appointment.id}`} size="sm">Open</PillLink>
        <PillLink href={`/dashboard/platform/checkout/${appointment.id}`} size="sm" variant="quiet">Checkout</PillLink>
      </Track>
    </li>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return <div className="min-w-0 rounded-xl bg-muted/50 px-3 py-2"><dt className="text-xs font-medium text-muted-foreground">{title}</dt><dd className="mt-0.5 break-words">{body}</dd></div>;
}

export default AppointmentOperationsPage;
