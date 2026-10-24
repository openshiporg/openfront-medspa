import Link from 'next/link';
import { CalendarClock, UsersRound } from 'lucide-react';
import {
  Avatar, Chip, EmptyState, ErrorState, MetricStrip, Notice, PageHeader, PillLink, PlatformPage, StatusDot, TitleStatus, Track, humanize, pillClass, trackClass,
} from '@/features/platform/components/medspa-ui';
import { PracticeSetupState } from '@/features/platform/components/PracticeSetupState';
import { hasPracticeSetup } from '@/features/platform/lib/practiceSetup';
import { getScheduleOperations, setScheduleAvailability } from '../actions/schedules';
import { ScheduleSheet } from '../components/ScheduleSheet';
import type { PlatformProviderSchedule, PlatformSchedule, ScheduleLocation } from '../types';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Practice weeks read Monday first.
const weekOrder = [1, 2, 3, 4, 5, 6, 0];

type ProviderOption = { id: string; name: string; locationIds: string[]; isPublic: boolean };

function hoursLabel(schedule: PlatformSchedule) {
  return schedule.startTime && schedule.endTime ? `${schedule.startTime}–${schedule.endTime}` : 'No hours';
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatAppointmentTime(value?: string | null, timeZone = 'UTC') {
  if (!value) return 'Unscheduled';
  return new Date(value).toLocaleString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function StaffSchedulePage({ searchParams }: { searchParams?: Promise<{ provider?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const providerFilter = typeof params.provider === 'string' && params.provider ? params.provider : null;
  const data = await getScheduleOperations(providerFilter);
  const breadcrumbs = [{ label: 'Staff schedules' }];

  if (data.availability === 'unavailable') {
    const practiceReady = await hasPracticeSetup();
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Staff schedules" icon={CalendarClock} />
        {practiceReady === false ? <PracticeSetupState /> : <ErrorState id="schedules-unavailable" title="Staff schedules unavailable" action={<Track><PillLink href="/dashboard/platform/schedules">Retry</PillLink></Track>} />}
      </PlatformPage>
    );
  }

  const { providers, locations, blockedCount } = data;
  const options: ProviderOption[] = providers.map((provider) => ({ id: provider.id, name: provider.user?.name || 'Provider', locationIds: provider.locations.map((item) => item.id), isPublic: provider.isPublic === true }));
  const withoutHours = providers.filter((provider) => !provider.schedules.some((item) => item.type === 'recurring' && item.isAvailable !== false)).length;
  const offline = providers.filter((provider) => provider.schedules.some((item) => item.type === 'recurring') && !provider.schedules.some((item) => item.isPublic && item.isAvailable !== false)).length;
  const today = new Date().toISOString().slice(0, 10);
  const dated = providers.flatMap((provider) => provider.schedules
    .filter((item) => item.type !== 'recurring' && item.localDate && item.localDate.slice(0, 10) >= today)
    .map((item) => ({ ...item, provider })))
    .sort((a, b) => (a.localDate || '').localeCompare(b.localDate || ''));
  const filtered = providerFilter ? providers.find((provider) => provider.id === providerFilter) : null;

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title={filtered ? `${filtered.user?.name || 'Provider'} · hours` : 'Staff schedules'}
        icon={CalendarClock}
        actions={<Track>
          {providerFilter ? <PillLink href="/dashboard/platform/schedules">All providers</PillLink> : null}
          <ScheduleSheet providers={options} locations={locations} providerId={providerFilter || undefined} variant="primary" />
        </Track>}
      />

      <MetricStrip items={[
        { label: 'Active providers', value: providers.length },
        { label: 'Without weekly hours', value: withoutHours, tone: withoutHours ? 'amber' : undefined },
        { label: 'Not bookable online', value: offline, tone: offline ? 'amber' : undefined },
        { label: 'Blocked entries', value: blockedCount, tone: blockedCount ? 'rose' : undefined },
      ]} />

      {withoutHours > 0 && <Notice title={`${withoutHours} active provider${withoutHours === 1 ? '' : 's'} without weekly hours`}>No bookable times.</Notice>}

      {providers.length === 0 ? (
        <EmptyState icon={UsersRound} title={providerFilter ? 'Provider not active' : 'No active providers'} action={<Track><PillLink href="/dashboard/platform/staff">Staff</PillLink></Track>} />
      ) : (
        <section aria-label="Weekly roster" className="grid gap-4">
          {providers.map((provider) => <ProviderRoster key={provider.id} provider={provider} options={options} locations={locations} />)}
        </section>
      )}

      {dated.length ? (
        <section aria-labelledby="dated-heading" className="overflow-hidden rounded-2xl border bg-background">
          <h2 id="dated-heading" className="border-b px-4 py-3 text-sm font-semibold md:px-5">Dates & time off</h2>
          <ul className="divide-y">
            {dated.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <p className="text-sm font-medium tabular-nums">{dateLabel(item.localDate)} · {hoursLabel(item)}</p>
                    <TitleStatus tone={item.type === 'time_off' ? 'rose' : item.isAvailable === false ? 'zinc' : 'emerald'}>{item.type === 'time_off' ? 'Time off' : item.isAvailable === false ? 'Blocked' : 'Extra hours'}</TitleStatus>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{[item.provider.user?.name, item.location?.name, item.reason].filter(Boolean).join(' · ')}</p>
                </div>
                <Track><ScheduleSheet providers={options} locations={locations} schedule={{ ...item, providerId: item.provider.id }} size="sm" /></Track>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PlatformPage>
  );
}

function ProviderRoster({ provider, options, locations }: { provider: PlatformProviderSchedule; options: ProviderOption[]; locations: ScheduleLocation[] }) {
  const name = provider.user?.name || 'Unnamed provider';
  const weekly = provider.schedules.filter((schedule) => schedule.type === 'recurring');
  const byDay = new Map<number, PlatformSchedule[]>();
  for (const schedule of weekly) {
    const day = schedule.dayOfWeek ?? -1;
    byDay.set(day, [...(byDay.get(day) || []), schedule]);
  }
  const open = weekly.filter((schedule) => schedule.isAvailable !== false).length;
  const zone = provider.appointments[0]?.location?.timezone || weekly[0]?.location?.timezone || 'UTC';

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border bg-background">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 md:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="min-w-0 truncate text-base font-semibold">{name}</h2>
              <TitleStatus tone={open ? 'emerald' : 'amber'}>{open ? `${open} weekly block${open === 1 ? '' : 's'}` : 'No weekly hours'}</TitleStatus>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{[provider.title || (provider.role ? humanize(provider.role) : null), provider.locations.map((item) => item.name).join(', ')].filter(Boolean).join(' · ') || 'Provider'}</p>
          </div>
        </div>
        <Track>
          <ScheduleSheet providers={options} locations={locations} providerId={provider.id} size="sm" />
          <PillLink href={`/dashboard/platform/staff/${provider.id}`} size="sm">Profile</PillLink>
        </Track>
      </div>
      {!provider.isPublic ? <div className="px-4 pb-3 md:px-5"><Chip tone="zinc">Not bookable online</Chip></div> : null}

      <ol className="grid border-t lg:grid-cols-7 lg:divide-x">
        {weekOrder.map((index) => {
          const blocks = byDay.get(index) || [];
          return (
            <li key={days[index]} className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-2 border-b p-3 last:border-b-0 lg:block lg:border-b-0">
              <div className="text-xs font-semibold text-muted-foreground lg:mb-2">{days[index]}</div>
              {blocks.length ? (
                <div className="grid min-w-0 gap-2">{blocks.map((schedule) => <ScheduleBlock key={schedule.id} schedule={schedule} providerId={provider.id} options={options} locations={locations} />)}</div>
              ) : <div className="text-xs text-muted-foreground">Off</div>}
            </li>
          );
        })}
      </ol>

      <div className="border-t bg-muted/20">
        <h3 className="px-4 pt-3 text-xs font-medium text-muted-foreground md:px-5">Next appointments</h3>
        {provider.appointments.length ? (
          <ul className="divide-y">
            {provider.appointments.map((appointment) => (
              <li key={appointment.id}>
                <Link href={`/dashboard/platform/appointments/${appointment.id}`} className="flex min-w-0 items-start gap-3 px-4 py-2.5 text-sm hover:bg-muted/40 md:px-5">
                  <StatusDot tone="violet" className="mt-1.5" />
                  <div className="min-w-0">
                    <div className="font-medium tabular-nums">{formatAppointmentTime(appointment.startTime, appointment.location?.timezone || zone)}</div>
                    <div className="truncate text-muted-foreground">{appointment.client?.user?.name || 'Client'} · {appointment.lineItems.map((item) => item.serviceTitle).filter(Boolean).join(', ') || 'Treatment'}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="px-4 pb-3 pt-1 text-sm text-muted-foreground md:px-5">No upcoming appointments</p>}
      </div>
    </article>
  );
}

function ScheduleBlock({ schedule, providerId, options, locations }: { schedule: PlatformSchedule; providerId: string; options: ProviderOption[]; locations: ScheduleLocation[] }) {
  const blocked = schedule.isAvailable === false;
  return (
    <div className={`min-w-0 rounded-xl border p-2 text-xs ${blocked ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100' : 'bg-background'}`}>
      <div className="flex items-center gap-1.5 font-medium tabular-nums"><StatusDot tone={blocked ? 'rose' : schedule.isPublic ? 'emerald' : 'zinc'} />{hoursLabel(schedule)}</div>
      {schedule.breakStart && schedule.breakEnd && <div className="mt-1 text-muted-foreground">Break {schedule.breakStart}–{schedule.breakEnd}</div>}
      {!schedule.isPublic && !blocked ? <div className="mt-1 text-muted-foreground">Staff only</div> : null}
      {schedule.reason && <div className="mt-1 break-words text-muted-foreground">{schedule.reason}</div>}
      <form action={setScheduleAvailability} className="mt-2 grid gap-1.5">
        <input type="hidden" name="id" value={schedule.id} />
        <input type="hidden" name="revision" value={schedule.revision} />
        <input type="hidden" name="isAvailable" value={blocked ? 'true' : 'false'} />
        {!blocked && (
          <input
            aria-label={`Reason for blocking ${days[schedule.dayOfWeek ?? 0]} ${hoursLabel(schedule)}`}
            name="reason"
            placeholder="Reason"
            className="h-7 w-full min-w-0 rounded-lg border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
        <span className={`${trackClass} w-fit`}>
          <button type="submit" aria-label={`${blocked ? 'Restore' : 'Block'} ${days[schedule.dayOfWeek ?? 0]} ${hoursLabel(schedule)}`} className={pillClass(blocked ? 'raised' : 'danger', 'sm')}>
            {blocked ? 'Restore' : 'Block'}
          </button>
        </span>
      </form>
      {/* Kept outside the block form so the drawer's own submit never reaches it. */}
      <div className={`${trackClass} mt-1.5 w-fit`}>
        <ScheduleSheet providers={options} locations={locations} schedule={{ ...schedule, providerId }} size="sm" />
      </div>
    </div>
  );
}

export default StaffSchedulePage;
