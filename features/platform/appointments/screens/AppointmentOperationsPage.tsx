import { CalendarHeart, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { statusFilter } from '@/features/platform/lib/queryParams';
import {
  appointmentLabel, appointmentTone, Chip, EmptyState, ErrorState, Notice, PageHeader, PillLink,
  PlatformPage, SegmentTabs, TitleStatus, Track, usd, pillClass, inputClass,
} from '@/features/platform/components/medspa-ui';
import { getAppointmentOperations, PlatformAppointment } from '../actions/appointments';
import { getAuthenticatedUser } from '@/features/dashboard/actions/auth';
import { canOpenPlatformRoute } from '@/features/dashboard/lib/sidebarAccess';

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
  searchParams?: Promise<{ status?: string; date?: string }>;
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
  const requestedDate = typeof resolvedSearchParams.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(resolvedSearchParams.date) && !Number.isNaN(Date.parse(`${resolvedSearchParams.date}T12:00:00Z`)) ? resolvedSearchParams.date : null;
  const [{ appointments, counts, availability, todayDate }, auth] = await Promise.all([getAppointmentOperations(activeStatus, requestedDate), getAuthenticatedUser()]);
  // The day shown in the picker: the chosen day, or today on the Today tab.
  const shownDate = requestedDate || todayDate || '';
  const shiftDay = (delta: number) => new Date(Date.parse(`${shownDate}T12:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);
  const dayHref = (value: string) => value === todayDate ? '/dashboard/platform/appointments' : `/dashboard/platform/appointments?date=${value}`;
  const shownLabel = shownDate ? new Date(`${shownDate}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }) : '';
  const canOpenPlans = canOpenPlatformRoute('appointments/plans', auth.success ? auth.data?.authenticatedItem : null);
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
            {canOpenPlans ? <PillLink href="/dashboard/platform/appointments/plans" variant="quiet">Consultations & plans</PillLink> : null}
            <PillLink href="/dashboard/platform/appointments/new" variant="primary">Book appointment</PillLink>
          </Track>
        }
      />

      {activeStatus !== 'pending' && (counts.pending ?? 0) > 0 ? (
        <Notice tone="amber" title={`${counts.pending} ${counts.pending === 1 ? 'request needs' : 'requests need'} confirmation`}>
          <Track><PillLink href="/dashboard/platform/appointments?status=pending" size="sm">Review requests</PillLink></Track>
        </Notice>
      ) : null}

      <SegmentTabs label="Appointment status filters" tabs={tabs} active={requestedDate && requestedDate !== todayDate ? '' : activeStatus} />

      {shownDate && (requestedDate || activeStatus === 'today') ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link href={dayHref(shiftDay(-1))} aria-label="Previous day" className={`${pillClass('raised')} w-8 !px-0 max-sm:w-10`}><ChevronLeft aria-hidden="true" /></Link>
            <Link href={dayHref(shiftDay(1))} aria-label="Next day" className={`${pillClass('raised')} w-8 !px-0 max-sm:w-10`}><ChevronRight aria-hidden="true" /></Link>
            <p className="min-w-0 truncate text-[13px] font-semibold">{shownLabel}{shownDate === todayDate ? <span className="font-normal text-muted-foreground"> · today</span> : null}</p>
          </div>
          <form method="get" action="/dashboard/platform/appointments" className="flex items-center gap-2">
            <input type="date" name="date" aria-label="Go to date" defaultValue={shownDate} required className={`${inputClass} w-auto`} />
            <button type="submit" className={pillClass('raised')}>Go</button>
          </form>
        </div>
      ) : null}

      {appointments.length === 0 ? (
        <EmptyState icon={CalendarHeart} title={requestedDate ? `No appointments on ${shownLabel}` : 'No appointments in this view'} />
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label} className="min-w-0">
              <h2 className="mb-2 flex items-baseline justify-between gap-3 px-1 text-[13px] font-semibold">
                {group.label}
                <span className="text-xs font-normal tabular-nums text-muted-foreground">{group.items.length}</span>
              </h2>
              <ol className="divide-y overflow-hidden rounded-[6px] border bg-card">
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
  const clientName = appointment.client?.user?.name || (appointment.client ? 'Client unavailable' : 'Guest request');
  const providerName = appointment.provider?.user?.name || 'Unassigned';
  const tone = appointmentTone[appointment.status] || 'zinc';
  const total = serviceTotal(appointment);
  // A deposit can only still be owed on a visit that is going ahead; checkout only opens once it is confirmed.
  const depositOpen = ['pending', 'confirmed', 'in_progress'].includes(appointment.status);
  const checkoutLabel = ['confirmed', 'in_progress'].includes(appointment.status) ? 'Checkout' : appointment.payment?.status ? 'Payment' : null;

  return (
    <li className="grid gap-2 px-3 py-3 sm:grid-cols-[5rem_8rem_minmax(0,1fr)] sm:gap-4 lg:grid-cols-[5rem_8rem_minmax(0,1fr)_auto] lg:items-baseline">
      <div className="flex items-baseline gap-2 sm:block">
        <div className="text-[13px] font-semibold tabular-nums">{formatTime(appointment.startTime, timeZone)}</div>
        <div className="text-xs text-muted-foreground">{appointment.duration ? `${appointment.duration} min` : timeZone}</div>
      </div>
      <div><TitleStatus tone={tone}>{appointmentLabel[appointment.status] || appointment.status}</TitleStatus></div>

      <div className="min-w-0">
        <h3 className="min-w-0 truncate text-[13px] font-semibold">{clientName}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{treatmentTitle(appointment)} · {providerName}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {needsClinicalReview(appointment) ? <Chip tone="violet"><ShieldAlert className="inline size-3" /> Clinical review</Chip> : null}
          {appointment.depositAmount && appointment.depositPaid ? <Chip tone="emerald">Deposit paid</Chip> : appointment.depositAmount && depositOpen ? <Chip tone="amber">Deposit due {usd(appointment.depositAmount)}</Chip> : null}
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

      <Track className="justify-self-start sm:col-start-3 lg:col-start-auto lg:justify-self-end">
        <PillLink href={`/dashboard/platform/appointments/${appointment.id}`} size="sm">Open</PillLink>
        {checkoutLabel ? <PillLink href={`/dashboard/platform/checkout/${appointment.id}`} size="sm" variant="quiet">{checkoutLabel}</PillLink> : null}
      </Track>
    </li>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return <div className="min-w-0 rounded-[6px] bg-muted/50 px-3 py-2"><dt className="text-xs font-medium text-muted-foreground">{title}</dt><dd className="mt-0.5 break-words">{body}</dd></div>;
}

export default AppointmentOperationsPage;
