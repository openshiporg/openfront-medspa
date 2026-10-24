import Link from 'next/link';
import { BadgeCheck, CalendarClock, CalendarDays, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import {
  Avatar, Chip, ErrorState, Fact, PageHeader, Panel, PillLink, PlatformPage, StatusDot, TitleStatus, Track, appointmentLabel, appointmentTone,
} from '@/features/platform/components/medspa-ui';
import { getStaffDetail } from '../actions/staff';
import { AuthorityTransitionSheet, AuthorizationSheet, CredentialSheet, ProviderProfileSheet } from '../components/StaffForms';
import { WEEKDAYS, credentialState, providerState, roleLabel, shortDate, statusTone, tierLabel } from '../lib/format';
import type { StaffSchedule } from '../types';

const weekOrder = [1, 2, 3, 4, 5, 6, 0];

function weeklyHours(schedules: StaffSchedule[]) {
  return weekOrder.map((day) => ({
    day,
    blocks: schedules.filter((item) => item.type === 'recurring' && item.dayOfWeek === day),
  }));
}

export async function StaffDetailPage({ providerId }: { providerId: string }) {
  const detail = await getStaffDetail(providerId);
  const base = [{ label: 'Staff', href: '/dashboard/platform/staff' }];

  if (detail.status !== 'loaded') {
    return (
      <PlatformPage breadcrumbs={[...base, { label: 'Provider' }]} width="narrow">
        <ErrorState
          id="provider-unavailable"
          title={detail.status === 'missing' ? 'Provider not found' : 'Provider unavailable'}
          action={<Track><PillLink href="/dashboard/platform/staff">Staff</PillLink>{detail.status === 'unavailable' ? <PillLink href={`/dashboard/platform/staff/${providerId}`}>Retry</PillLink> : null}</Track>}
        />
      </PlatformPage>
    );
  }

  const { provider, locations, services, supervisors } = detail;
  const name = provider.user?.name || 'Unnamed provider';
  const state = providerState(provider);
  const credential = credentialState(provider.credentials);
  const restricted = new Set(services.filter((service) => service.restricted).map((service) => service.id));
  const authorized = new Set(provider.authorizations.filter((item) => item.status === 'active').map((item) => item.service?.id));
  const providerLocations = locations.filter((location) => provider.locations.some((item) => item.id === location.id));
  const oneOff = provider.schedules.filter((item) => item.type !== 'recurring');

  return (
    <PlatformPage breadcrumbs={[...base, { label: name }]}>
      <PageHeader
        title={<span className="flex items-center gap-3"><Avatar name={name} />{name}</span>}
        status={<TitleStatus tone={state.tone}>{state.label}</TitleStatus>}
        meta={<>
          <span>{provider.title || roleLabel(provider.role)}</span>
          {tierLabel(provider.tier) ? <span>{tierLabel(provider.tier)}</span> : null}
          {provider.isPublic ? <span className="inline-flex items-center gap-1.5"><StatusDot tone="violet" />Bookable online</span> : null}
        </>}
        actions={<Track><ProviderProfileSheet provider={provider} locations={locations} services={services} /><PillLink href={`/dashboard/platform/schedules?provider=${provider.id}`}><CalendarClock />Hours</PillLink></Track>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <Panel title="Treatments" icon={Sparkles} padded={false}>
            {provider.specializations.length ? (
              <ul className="divide-y">
                {provider.specializations.map((service) => {
                  const needsAuthority = restricted.has(service.id);
                  return (
                    <li key={service.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-5">
                      <span className="min-w-0 truncate text-sm font-medium">{service.name}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {service.status !== 'active' ? <Chip tone="zinc">Inactive</Chip> : null}
                        {needsAuthority ? <Chip tone={authorized.has(service.id) ? 'emerald' : 'amber'}>{authorized.has(service.id) ? 'Authorized' : 'Needs authorization'}</Chip> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="px-4 py-6 text-sm text-muted-foreground md:px-5">No treatments assigned</p>}
          </Panel>

          <Panel title="Credentials" icon={BadgeCheck} actions={<Track><CredentialSheet providerId={provider.id} locations={providerLocations.length ? providerLocations : locations} supervisors={supervisors} /></Track>} padded={false}>
            {provider.credentials.length ? (
              <ul className="divide-y">
                {provider.credentials.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 md:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <p className="text-sm font-medium">{item.licenseType} · {item.jurisdiction}</p>
                        <TitleStatus tone={statusTone(item.status)}>{item.status ? item.status[0].toUpperCase() + item.status.slice(1) : 'Unknown'}</TitleStatus>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">#{item.licenseNumber} · {shortDate(item.effectiveFrom)} – {shortDate(item.expiresAt)}{item.location ? ` · ${item.location.name}` : ''}{item.supervisionRequired ? ' · Supervised' : ''}</p>
                    </div>
                    {item.status === 'verified' ? (
                      <Track>
                        <AuthorityTransitionSheet providerId={provider.id} targetType="credential" targetId={item.id} action="suspend" label="Suspend" />
                        <AuthorityTransitionSheet providerId={provider.id} targetType="credential" targetId={item.id} action="revoke" label="Revoke" />
                      </Track>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : <p className="px-4 py-6 text-sm text-muted-foreground md:px-5">No credentials</p>}
          </Panel>

          <Panel title="Treatment authority" icon={ShieldCheck} actions={<Track><AuthorizationSheet providerId={provider.id} credentials={provider.credentials} locations={providerLocations.length ? providerLocations : locations} services={services.filter((service) => service.restricted)} supervisors={supervisors} /></Track>} padded={false}>
            {provider.authorizations.length ? (
              <ul className="divide-y">
                {provider.authorizations.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 md:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <p className="text-sm font-medium">{item.service?.name || 'Treatment'}</p>
                        <TitleStatus tone={statusTone(item.status)}>{item.status ? item.status[0].toUpperCase() + item.status.slice(1) : 'Unknown'}</TitleStatus>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[item.location?.name, `${shortDate(item.effectiveFrom)} – ${item.effectiveTo ? shortDate(item.effectiveTo) : 'open'}`, item.supervisionRequired ? `Supervisor ${item.requiredSupervisor?.user?.name || '—'}` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {item.status === 'active' ? <Track><AuthorityTransitionSheet providerId={provider.id} targetType="authorization" targetId={item.id} action="suspend" label="Suspend" /></Track> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="px-4 py-6 text-sm text-muted-foreground md:px-5">No treatment authority</p>}
          </Panel>
        </div>

        <aside className="grid min-w-0 content-start gap-4">
          <Panel title="Profile" icon={UserRound}>
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Email">{provider.user?.email || '—'}</Fact>
              <Fact label="Phone">{provider.user?.phone || '—'}</Fact>
              <Fact label="Role">{roleLabel(provider.role)}</Fact>
              <Fact label="Credential"><span className="inline-flex items-center gap-1.5"><StatusDot tone={credential.tone} />{credential.label}</span></Fact>
              <div className="col-span-2"><Fact label="Locations" wrap>{provider.locations.map((item) => item.name).join(', ') || '—'}</Fact></div>
              {provider.bio ? <div className="col-span-2"><Fact label="Bio" wrap>{provider.bio}</Fact></div> : null}
            </dl>
          </Panel>

          <Panel title="Weekly hours" icon={CalendarClock} actions={<Track><PillLink size="sm" href={`/dashboard/platform/schedules?provider=${provider.id}`}>Edit</PillLink></Track>}>
            <dl className="grid gap-2 text-sm">
              {weeklyHours(provider.schedules).map(({ day, blocks }) => (
                <div key={day} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{WEEKDAYS[day]}</dt>
                  <dd className="text-right tabular-nums">{blocks.length ? blocks.map((item) => <span key={item.id} className={item.isAvailable === false ? 'text-rose-700 line-through dark:text-rose-300' : undefined}>{item.startTime}–{item.endTime} </span>) : <span className="text-muted-foreground">Off</span>}</dd>
                </div>
              ))}
            </dl>
            {oneOff.length ? <p className="mt-3 text-xs text-muted-foreground">{oneOff.length} one-time or time-off {oneOff.length === 1 ? 'entry' : 'entries'}</p> : null}
          </Panel>

          <Panel title="Upcoming" icon={CalendarDays} padded={false}>
            {provider.appointments.length ? (
              <ul className="divide-y">
                {provider.appointments.map((appointment) => (
                  <li key={appointment.id}>
                    <Link href={`/dashboard/platform/appointments/${appointment.id}`} className="block px-4 py-3 transition-colors hover:bg-muted/40 md:px-5">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <p className="text-sm font-medium tabular-nums">{appointment.startTime ? new Date(appointment.startTime).toLocaleString('en-US', { timeZone: appointment.location?.timezone || 'UTC', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</p>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot tone={appointmentTone[appointment.status || ''] || 'zinc'} />{appointmentLabel[appointment.status || ''] || appointment.status}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{appointment.client?.user?.name || 'Client'} · {appointment.lineItems.map((item) => item.serviceTitle).filter(Boolean).join(', ') || 'Treatment'}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="px-4 py-6 text-sm text-muted-foreground md:px-5">No upcoming appointments</p>}
          </Panel>
        </aside>
      </div>
    </PlatformPage>
  );
}
