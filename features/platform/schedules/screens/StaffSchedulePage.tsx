import { CalendarClock, UsersRound } from 'lucide-react';
import {
  Avatar, Chip, EmptyState, ErrorState, MetricStrip, Notice, PageHeader, PillLink, PlatformPage, StatusDot, TitleStatus,
  Track, humanize, pillClass, trackClass,
} from '@/features/platform/components/medspa-ui';
import { getScheduleOperations, PlatformSchedule, PlatformProviderSchedule, setScheduleAvailability } from '../actions/schedules';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Practice weeks read Monday first.
const weekOrder = [1, 2, 3, 4, 5, 6, 0];

function formatSchedule(schedule: PlatformSchedule) {
  if (!schedule.startTime || !schedule.endTime) return 'No hours';
  return `${schedule.startTime}–${schedule.endTime}`;
}

function formatAppointmentTime(value?: string | null, timeZone = 'UTC') {
  if (!value) return 'Unscheduled';
  return new Date(value).toLocaleString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function StaffSchedulePage() {
  const { providers, availability, scheduleCount, inactiveScheduleCount, activeProviderCount } = await getScheduleOperations();
  const breadcrumbs = [{ label: 'Staff schedules' }];
  if (availability === 'unavailable') {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Staff schedules" icon={CalendarClock} />
        <ErrorState id="schedules-unavailable" title="Staff schedules unavailable" action={<Track><PillLink href="/dashboard/platform/schedules">Retry</PillLink></Track>} />
      </PlatformPage>
    );
  }
  const providersWithoutSchedules = providers.filter((provider) => provider.schedules.length === 0).length;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader title="Staff schedules" icon={CalendarClock} />

      <MetricStrip items={[
        { label: 'Active providers', value: activeProviderCount ?? providers.length },
        { label: 'Schedule blocks', value: scheduleCount ?? 0, tone: 'emerald' },
        { label: 'Blocked', value: inactiveScheduleCount ?? 0, tone: 'rose' },
        { label: 'Without a schedule', value: providersWithoutSchedules, tone: providersWithoutSchedules ? 'amber' : undefined },
      ]} />

      {providersWithoutSchedules > 0 && (
        <Notice title={`${providersWithoutSchedules} active provider${providersWithoutSchedules === 1 ? '' : 's'} without a weekly schedule`}>They have no bookable times.</Notice>
      )}

      {providers.length === 0 ? (
        <EmptyState icon={UsersRound} title="No active providers" />
      ) : (
        <section aria-label="Weekly roster" className="grid gap-4">
          {providers.map((provider) => <ProviderRoster key={provider.id} provider={provider} />)}
        </section>
      )}
    </PlatformPage>
  );
}

function ProviderRoster({ provider }: { provider: PlatformProviderSchedule }) {
  const name = provider.user?.name || 'Unnamed provider';
  const coverageByDay = new Map<number, PlatformSchedule[]>();
  provider.schedules.forEach((schedule) => {
    const day = schedule.dayOfWeek ?? -1;
    if (!coverageByDay.has(day)) coverageByDay.set(day, []);
    coverageByDay.get(day)?.push(schedule);
  });
  const availableBlocks = provider.schedules.filter((schedule) => schedule.isAvailable !== false).length;
  const specialties = provider.specializations.map((service) => service.name).filter((value): value is string => Boolean(value));
  const zone = provider.appointments[0]?.location?.timezone || 'UTC';

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border bg-background">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 md:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="min-w-0 truncate text-base font-semibold">{name}</h2>
              <TitleStatus tone={availableBlocks ? 'emerald' : 'amber'}>{availableBlocks ? `${availableBlocks} block${availableBlocks === 1 ? '' : 's'}` : 'No schedule'}</TitleStatus>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {[provider.role ? humanize(provider.role) : null, provider.tier ? `${provider.tier} tier` : null, provider.user?.email].filter(Boolean).join(' · ') || 'Provider'}
            </p>
          </div>
        </div>
        <Track><PillLink href={`/dashboard/providers/${provider.id}`} size="sm">Open provider</PillLink></Track>
      </div>

      {specialties.length > 0 && <div className="flex flex-wrap gap-1.5 px-4 pb-4 md:px-5">{specialties.map((specialty) => <Chip key={specialty}>{specialty}</Chip>)}</div>}

      <ol className="grid border-t lg:grid-cols-7 lg:divide-x">
        {weekOrder.map((index) => {
          const blocks = coverageByDay.get(index) || [];
          return (
            <li key={days[index]} className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-2 border-b p-3 last:border-b-0 lg:block lg:border-b-0">
              <div className="text-xs font-semibold text-muted-foreground lg:mb-2">{days[index]}</div>
              {blocks.length ? (
                <div className="grid min-w-0 gap-2">{blocks.map((schedule) => <ScheduleBlock key={schedule.id} schedule={schedule} />)}</div>
              ) : <div className="text-xs text-muted-foreground">Off</div>}
            </li>
          );
        })}
      </ol>

      <div className="border-t bg-muted/20">
        <h3 className="px-4 pt-3 text-xs font-medium text-muted-foreground md:px-5">Next appointments</h3>
        {provider.appointments.length ? (
          <ul className="divide-y">
            {provider.appointments.slice(0, 5).map((appointment) => (
              <li key={appointment.id} className="flex min-w-0 items-start gap-3 px-4 py-2.5 text-sm md:px-5">
                <StatusDot tone="violet" className="mt-1.5" />
                <div className="min-w-0">
                  <div className="font-medium tabular-nums">{formatAppointmentTime(appointment.startTime, appointment.location?.timezone || zone)}</div>
                  <div className="truncate text-muted-foreground">{appointment.client?.user?.name || 'Unnamed client'} · {appointment.services.map((service) => service.name).filter(Boolean).join(', ') || 'Treatment'}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="px-4 pb-3 pt-1 text-sm text-muted-foreground md:px-5">No upcoming appointments</p>}
      </div>
    </article>
  );
}

function ScheduleBlock({ schedule }: { schedule: PlatformSchedule }) {
  const blocked = schedule.isAvailable === false;
  return (
    <div className={`min-w-0 rounded-xl border p-2 text-xs ${blocked ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100' : 'bg-background'}`}>
      <div className="flex items-center gap-1.5 font-medium tabular-nums"><StatusDot tone={blocked ? 'rose' : 'emerald'} />{formatSchedule(schedule)}</div>
      {schedule.breakStart && schedule.breakEnd && <div className="mt-1 text-muted-foreground">Break {schedule.breakStart}–{schedule.breakEnd}</div>}
      {schedule.reason && <div className="mt-1 break-words text-muted-foreground">{schedule.reason}</div>}
      <form action={setScheduleAvailability} className="mt-2 grid gap-1.5">
        <input type="hidden" name="id" value={schedule.id} />
        <input type="hidden" name="revision" value={schedule.revision} />
        <input type="hidden" name="isAvailable" value={blocked ? 'true' : 'false'} />
        {!blocked && (
          <input
            id={`schedule-reason-${schedule.id}`}
            aria-label={`Reason for blocking schedule ${formatSchedule(schedule)} (${schedule.id})`}
            name="reason"
            placeholder="Reason"
            className="h-7 w-full min-w-0 rounded-lg border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
        <span className={`${trackClass} w-fit`}>
          <button type="submit" aria-label={`${blocked ? 'Restore' : 'Block'} schedule ${formatSchedule(schedule)} (${schedule.id})`} className={pillClass(blocked ? 'raised' : 'danger', 'sm')}>
            {blocked ? 'Restore' : 'Block'}
          </button>
        </span>
      </form>
    </div>
  );
}

export default StaffSchedulePage;
