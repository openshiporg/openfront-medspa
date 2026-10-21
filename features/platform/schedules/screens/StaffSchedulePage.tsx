import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { PlatformBreadcrumbs } from '@/features/platform/components/PlatformBreadcrumbs';
import { CalendarClock, Clock, Scissors, ShieldAlert, UserRound, UsersRound } from 'lucide-react';
import { getScheduleOperations, PlatformSchedule, PlatformProviderSchedule, setScheduleAvailability } from '../actions/schedules';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatSchedule(schedule: PlatformSchedule) {
  if (!schedule.startTime || !schedule.endTime) return 'No hours';
  return `${schedule.startTime}–${schedule.endTime}`;
}

function formatAppointmentTime(value?: string | null, timeZone = 'UTC') {
  if (!value) return 'Unscheduled';
  return new Date(value).toLocaleString('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function providerUtilization(provider: PlatformProviderSchedule) {
  const availableBlocks = provider.schedules.filter((schedule) => schedule.isAvailable !== false).length;
  if (!availableBlocks) return 'No active schedule';
  return `${availableBlocks} available block${availableBlocks === 1 ? '' : 's'}`;
}

export async function StaffSchedulePage() {
  const { providers, availability } = await getScheduleOperations();
  if (availability === 'unavailable') return <><PlatformBreadcrumbs items={[{ label: 'Staff schedules' }]} /><main role="alert" className="p-6"><h1>Staff schedules unavailable</h1><Link href="/dashboard/platform/schedules">Retry</Link></main></>;
  const providersWithoutSchedules = providers.filter((provider) => provider.schedules.length === 0).length;

  return (
    <><PlatformBreadcrumbs items={[{ label: 'Staff schedules' }]} /><main className="min-h-screen bg-muted/20 px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Staff availability
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Staff schedules</h1>

            </div>

          </div>
        </header>

        {providersWithoutSchedules > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold">{providersWithoutSchedules} active provider{providersWithoutSchedules === 1 ? '' : 's'} missing recurring schedules</div>
                <p className="mt-1 text-amber-800/80">
                  These providers will not show reliable booking slots until weekly availability is created.
                </p>
              </div>
            </div>
          </section>
        )}

        {providers.length === 0 ? (
          <section className="rounded-2xl border bg-background p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <UsersRound className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No active providers yet</h2>

          </section>
        ) : (
          <section className="grid gap-4">
            {providers.map((provider) => (
              <ProviderScheduleCard key={provider.id} provider={provider} />
            ))}
          </section>
        )}
      </div>
    </main></>
  );
}

function ProviderScheduleCard({ provider }: { provider: PlatformProviderSchedule }) {
  const name = provider.user?.name || 'Unnamed provider';
  const coverageByDay = new Map<number, PlatformSchedule[]>();

  provider.schedules.forEach((schedule) => {
    const day = schedule.dayOfWeek ?? -1;
    if (!coverageByDay.has(day)) coverageByDay.set(day, []);
    coverageByDay.get(day)?.push(schedule);
  });

  return (
    <article className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
            {provider.role && <Badge>{provider.role.replaceAll('_', ' ')}</Badge>}
            {provider.tier && <Badge>{provider.tier} tier</Badge>}
            <Badge>{providerUtilization(provider)}</Badge>
          </div>

          <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <Info icon={UserRound} label="Contact" value={provider.user?.email || 'No email'} subvalue={provider.user?.phone || undefined} />
            <Info icon={Scissors} label="Specialties" value={provider.specializations.map((service) => service.name).filter(Boolean).join(', ') || 'No services connected'} />
            <Info icon={Clock} label="Upcoming" value={`${provider.appointments.length} active appointment${provider.appointments.length === 1 ? '' : 's'}`} />
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-7">
            {days.map((day, index) => {
              const blocks = coverageByDay.get(index) || [];
              return (
                <div key={day} className="rounded-xl border bg-muted/20 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
                  {blocks.length ? (
                    <div className="grid gap-2">
                      {blocks.map((schedule) => (
                        <ScheduleBlock key={schedule.id} schedule={schedule} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Off</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="xl:w-80">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="mb-3 text-sm font-semibold">Next appointments</div>
            {provider.appointments.length ? (
              <div className="grid gap-3">
                {provider.appointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="rounded-xl border bg-background p-3 text-sm">
                    <div className="font-medium">{formatAppointmentTime(appointment.startTime, appointment.location?.timezone || 'UTC')}</div>
                    <div className="mt-1 text-muted-foreground">
                      {appointment.client?.user?.name || 'Unnamed client'} · {appointment.services.map((service) => service.name).filter(Boolean).join(', ') || 'Service'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active appointments in queue.</p>
            )}
            <Link
              href={`/dashboard/providers/${provider.id}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Open provider record
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}

function ScheduleBlock({ schedule }: { schedule: PlatformSchedule }) {
  const blocked = schedule.isAvailable === false;

  return (
    <div className={`rounded-lg border p-2 text-xs ${blocked ? 'border-rose-200 bg-rose-50 text-rose-800' : 'bg-background'}`}>
      <div className="font-medium">{formatSchedule(schedule)}</div>
      {schedule.breakStart && schedule.breakEnd && (
        <div className="mt-1 text-muted-foreground">Break {schedule.breakStart}–{schedule.breakEnd}</div>
      )}
      {schedule.reason && <div className="mt-1 text-muted-foreground">{schedule.reason}</div>}
      <form action={setScheduleAvailability} className="mt-2 grid gap-1">
        <input type="hidden" name="id" value={schedule.id} />
        <input type="hidden" name="revision" value={schedule.revision} />
        <input type="hidden" name="isAvailable" value={blocked ? 'true' : 'false'} />
        {!blocked && (
          <input
            id={`schedule-reason-${schedule.id}`}
            aria-label={`Reason for blocking schedule ${formatSchedule(schedule)} (${schedule.id})`}
            name="reason"
            placeholder="Reason"
            className="h-7 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        )}
        <button type="submit" aria-label={`${blocked ? 'Restore' : 'Block'} schedule ${formatSchedule(schedule)} (${schedule.id})`} className="rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted">
          {blocked ? 'Restore' : 'Block'}
        </button>
      </form>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">{children}</span>;
}

function Info({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80">{label}</div>
        <div className="truncate font-medium text-foreground">{value}</div>
        {subvalue && <div className="truncate text-xs text-muted-foreground">{subvalue}</div>}
      </div>
    </div>
  );
}

export default StaffSchedulePage;
