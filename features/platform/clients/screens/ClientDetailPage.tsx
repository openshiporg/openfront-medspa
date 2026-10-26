import Link from 'next/link';
import type { ReactNode } from 'react';
import { CalendarDays, ClipboardList, ContactRound, FileText, Gift, Hourglass } from 'lucide-react';
import {
  appointmentLabel, appointmentTone, Avatar, Chip, EmptyState, ErrorState, Fact, humanize, PageHeader, Panel, PillLink,
  PlatformPage, StatusDot, statusTone, TitleStatus, Track, usd,
} from '@/features/platform/components/medspa-ui';
import { getClientFormOptions, getClientRecord } from '../actions/clients';
import { ClientProfileDrawer } from '../components/ClientProfileDrawer';
import type { ClientRecord } from '../types';

function day(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function when(value: string, timeZone?: string | null) {
  try {
    return new Date(value).toLocaleString('en-US', { timeZone: timeZone || undefined, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return new Date(value).toLocaleString('en-US');
  }
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Restricted() {
  return <p className="flex items-center gap-2 text-sm text-muted-foreground"><StatusDot tone="zinc" />Not available for your role</p>;
}

function AppointmentRows({ items }: { items: ClientRecord['appointments'] }) {
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/dashboard/platform/appointments/${item.id}`} className="flex flex-col gap-1 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{item.treatments.join(', ') || 'Appointment'}</span>
                <TitleStatus tone={appointmentTone[item.status] || 'zinc'}>{appointmentLabel[item.status] || humanize(item.status)}</TitleStatus>
              </div>
              <div className="truncate text-xs text-muted-foreground">{[item.provider, item.location].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-right">
              <div>{when(item.startTime, item.timezone)}</div>
              <div>{usd(item.total)}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function ClientDetailPage({ clientId }: { clientId: string }) {
  const [record, options] = await Promise.all([getClientRecord(clientId), getClientFormOptions()]);
  const breadcrumbs = [{ label: 'Clients', href: '/dashboard/platform/clients' }, { label: record?.client.name || 'Client' }];

  if (record === undefined) {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader title="Client" icon={ContactRound} />
        <ErrorState id="client-unavailable" title="Client unavailable" message="This client could not be loaded." action={<Track><PillLink href={`/dashboard/platform/clients/${clientId}`}>Retry</PillLink><PillLink href="/dashboard/platform/clients">Clients</PillLink></Track>} />
      </PlatformPage>
    );
  }
  if (!record) {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <EmptyState icon={ContactRound} title="Client not found" action={<Track><PillLink href="/dashboard/platform/clients">Clients</PillLink></Track>} />
      </PlatformPage>
    );
  }

  const { client } = record;
  const now = Date.now();
  const upcoming = record.appointments
    .filter((item) => new Date(item.startTime).getTime() >= now && ['pending', 'confirmed', 'in_progress'].includes(item.status))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const history = record.appointments.filter((item) => !upcoming.includes(item));
  const dueFollowUps = record.followUps.filter((item) => ['open', 'in_progress'].includes(item.status) && new Date(item.dueAt).getTime() <= now);

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader
        title={<span className="flex min-w-0 items-center gap-3"><Avatar name={client.name} className="size-10" /><span className="truncate">{client.name || 'Unnamed client'}</span></span>}
        status={dueFollowUps.length ? <TitleStatus tone="amber">Follow-up due</TitleStatus> : upcoming.length ? <TitleStatus tone="emerald">Booked</TitleStatus> : null}
        meta={<>{client.email ? <span className="break-all">{client.email}</span> : null}{client.phone ? <span className="tabular-nums">{client.phone}</span> : null}</>}
        actions={<><Track><PillLink href="/dashboard/platform/appointments/new" variant="primary">Book</PillLink></Track><ClientProfileDrawer client={client} options={options} /></>}
      />

      <Panel>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Visits">{client.totalVisits}</Fact>
          <Fact label="Lifetime value">{usd(client.lifetimeValue)}</Fact>
          <Fact label="Last visit">{day(client.lastVisit)}</Fact>
          <Fact label="Client since">{day(client.firstVisit || client.createdAt)}</Fact>
          <Fact label="Preferred provider">{client.preferredProvider?.name || '—'}</Fact>
          <Fact label="Home location">{client.homeLocation?.name || '—'}</Fact>
          <Fact label="Date of birth">{day(client.dateOfBirth)}</Fact>
          <Fact label="Marketing">{client.marketingConsent ? 'Opted in' : 'Not opted in'}</Fact>
          <Fact label="Contact preferences" wrap>{client.contactPreferences || '—'}</Fact>
        </dl>
        {client.operationalNotes ? <p className="mt-4 whitespace-pre-wrap rounded-[6px] bg-muted/50 px-3 py-2 text-sm">{client.operationalNotes}</p> : null}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <Panel title={`Upcoming · ${upcoming.length}`} icon={CalendarDays}>
            {upcoming.length ? <AppointmentRows items={upcoming} /> : <Empty>Nothing booked</Empty>}
          </Panel>
          <Panel title={`History · ${history.length}`} icon={CalendarDays}>
            {history.length ? <AppointmentRows items={history} /> : <Empty>No past appointments</Empty>}
          </Panel>
          <Panel title="Signed notes" icon={FileText}>
            {record.notes === null ? <Restricted /> : record.notes.length ? (
              <ul className="grid gap-3">
                {record.notes.map((note) => (
                  <li key={note.id} className="rounded-[6px] border p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{humanize(note.type || 'note')}</span>
                      <span>{note.author || 'Unknown author'}</span>
                      <span className="tabular-nums">{day(note.signedAt || note.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm">{note.content}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty>No signed notes</Empty>}
          </Panel>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <Panel title="Follow-ups" icon={ClipboardList}>
            {record.followUps.length ? (
              <ul className="grid gap-2.5">
                {record.followUps.map((task) => (
                  <li key={task.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="truncate font-medium">{task.title}</span><TitleStatus tone={statusTone(task.status)}>{humanize(task.status)}</TitleStatus></div>
                      {task.assignedTo ? <div className="text-xs text-muted-foreground">{task.assignedTo}</div> : null}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">Due {day(task.dueAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>No follow-ups</Empty>}
          </Panel>

          <Panel title="Packages & memberships" icon={Gift}>
            {record.packages === null && record.memberships === null ? <Restricted /> : (
              <div className="grid gap-3">
                {(record.memberships || []).map((membership) => (
                  <div key={membership.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="truncate font-medium">{membership.name || 'Membership'}</span><TitleStatus tone={statusTone(membership.status)}>{humanize(membership.status)}</TitleStatus></div>
                      <div className="text-xs text-muted-foreground">{membership.nextBillingDate ? `Bills ${day(membership.nextBillingDate)}` : 'No billing date'}</div>
                    </div>
                    {membership.monthlyPrice !== null ? <span className="shrink-0 text-xs tabular-nums">{usd(membership.monthlyPrice)}/mo</span> : null}
                  </div>
                ))}
                {(record.packages || []).map((pkg) => (
                  <div key={pkg.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="truncate font-medium">{pkg.name || 'Package'}</span><TitleStatus tone={statusTone(pkg.status)}>{humanize(pkg.status)}</TitleStatus></div>
                      <div className="text-xs text-muted-foreground">{pkg.expiresAt ? `Expires ${day(pkg.expiresAt)}` : 'No expiry'}</div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums">{usd(pkg.remaining)} left</span>
                  </div>
                ))}
                {!(record.memberships || []).length && !(record.packages || []).length ? <Empty>None</Empty> : null}
              </div>
            )}
          </Panel>

          <Panel title="Gift cards" icon={Gift}>
            {record.giftCards === null ? <Restricted /> : record.giftCards.length ? (
              <ul className="grid gap-2.5">
                {record.giftCards.map((card) => (
                  <li key={card.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2"><StatusDot tone={card.isActive ? 'emerald' : 'zinc'} /><span className="truncate tabular-nums">{card.code || 'Gift card'}</span>{card.recipientName ? <span className="truncate text-xs text-muted-foreground">for {card.recipientName}</span> : null}</span>
                    <span className="shrink-0 tabular-nums">{usd(card.balance)}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>None</Empty>}
          </Panel>

          <Panel title="Waitlist" icon={Hourglass}>
            {record.waitlist.length ? (
              <ul className="grid gap-2">
                {record.waitlist.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2"><span className="truncate">{entry.service || 'Treatment'}</span><TitleStatus tone={statusTone(entry.status)}>{humanize(entry.status)}</TitleStatus></span>
                    {entry.preferredTimeRange ? <Chip>{entry.preferredTimeRange}</Chip> : null}
                  </li>
                ))}
              </ul>
            ) : <Empty>Not on the waitlist</Empty>}
          </Panel>
        </div>
      </div>
    </PlatformPage>
  );
}
