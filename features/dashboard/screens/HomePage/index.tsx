/**
 * Dashboard home: what the practice has to do today.
 * Staff open this first, so it shows today's visits, the requests waiting for an answer
 * and the pages they are allowed to open. The raw table list is not shown here.
 */

import React from 'react'
import Link from 'next/link'
import { CalendarHeart, ChevronRight } from 'lucide-react'
import {
  appointmentLabel, appointmentTone, EmptyState, MetricStrip, Notice, PageHeader, Panel, PillLink,
  PlatformPage, TitleStatus, Track,
} from '@/features/platform/components/medspa-ui'
import { getAppointmentOperations, type PlatformAppointment } from '@/features/platform/appointments/actions/appointments'
import { getAuthenticatedUser } from '../../actions/auth'
import { canOpenPlatformRoute } from '../../lib/sidebarAccess'

const shortcuts = [
  { slug: 'appointments', label: 'Appointments', detail: 'Requests, check-in and visit status' },
  { slug: 'checkout', label: 'Checkout', detail: 'Take payment for a finished visit' },
  { slug: 'clients', label: 'Clients', detail: 'Profiles, notes and history' },
  { slug: 'catalog', label: 'Treatments', detail: 'Prices, durations and categories' },
  { slug: 'schedules', label: 'Schedules', detail: 'Provider hours and time off' },
  { slug: 'payments', label: 'Payments', detail: 'Payments and refunds' },
  { slug: 'reports', label: 'Reports', detail: 'Sales and visits' },
  { slug: 'storefront', label: 'Website', detail: 'What customers see online' },
]

function timeOf(appointment: PlatformAppointment) {
  if (!appointment.startTime) return 'Unscheduled'
  return new Date(appointment.startTime).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: appointment.location?.timezone || 'UTC',
  })
}

function treatmentOf(appointment: PlatformAppointment) {
  return appointment.lineItems?.map((item) => item.serviceTitle).filter(Boolean).join(', ')
    || appointment.services.map((service) => service.name).filter(Boolean).join(', ')
    || 'Treatment'
}

export async function HomePage() {
  const [operations, auth] = await Promise.all([getAppointmentOperations('today'), getAuthenticatedUser()])
  const user = auth.success ? auth.data?.authenticatedItem : null
  const firstName = typeof user?.name === 'string' ? user.name.trim().split(/\s+/)[0] : ''
  const loaded = operations.availability === 'loaded'
  const { appointments, counts } = operations
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: appointments[0]?.location?.timezone || 'America/New_York',
  })
  const links = shortcuts.filter((item) => canOpenPlatformRoute(item.slug, user))

  return (
    <PlatformPage breadcrumbs={[{ label: 'Home' }]} width="narrow">
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : 'Home'}
        meta={<span>{today}</span>}
        actions={
          <Track label="Home actions">
            <PillLink href="/dashboard/platform/appointments/new" variant="primary">Book appointment</PillLink>
          </Track>
        }
      />

      {loaded && (counts.pending ?? 0) > 0 ? (
        <Notice tone="amber" title={`${counts.pending} ${counts.pending === 1 ? 'request needs' : 'requests need'} confirmation`}>
          <Track><PillLink href="/dashboard/platform/appointments?status=pending" size="sm">Review requests</PillLink></Track>
        </Notice>
      ) : null}

      {loaded ? (
        <MetricStrip items={[
          { label: 'Today', value: counts.today ?? 0, href: '/dashboard/platform/appointments' },
          { label: 'Waiting for confirmation', value: counts.pending ?? 0, tone: 'amber', href: '/dashboard/platform/appointments?status=pending' },
          { label: 'Confirmed', value: counts.confirmed ?? 0, tone: 'emerald', href: '/dashboard/platform/appointments?status=confirmed' },
          { label: 'Checked in', value: counts.in_progress ?? 0, tone: 'blue', href: '/dashboard/platform/appointments?status=in_progress' },
        ]} />
      ) : null}

      <section aria-label="Today's appointments" className="min-w-0">
        <h2 className="mb-2 px-1 text-[13px] font-semibold">Today</h2>
        {!loaded ? (
          <EmptyState icon={CalendarHeart} title="Appointments could not be loaded" action={<Track><PillLink href="/dashboard">Retry</PillLink></Track>} />
        ) : appointments.length === 0 ? (
          <EmptyState icon={CalendarHeart} title="No appointments today" action={<Track><PillLink href="/dashboard/platform/appointments?status=confirmed">See upcoming</PillLink></Track>} />
        ) : (
          <ol className="divide-y overflow-hidden rounded-[6px] border bg-card">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <Link href={`/dashboard/platform/appointments/${appointment.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40">
                  <span className="w-[4.5rem] shrink-0 text-[13px] font-medium tabular-nums">{timeOf(appointment)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{appointment.client?.user?.name || 'Client'}</span>
                    <span className="block truncate text-xs text-muted-foreground">{treatmentOf(appointment)}{appointment.provider?.user?.name ? ` · ${appointment.provider.user.name}` : ''}</span>
                  </span>
                  <TitleStatus tone={appointmentTone[appointment.status] || 'zinc'}>{appointmentLabel[appointment.status] || appointment.status}</TitleStatus>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {links.length ? (
        <Panel title="Go to" padded={false}>
          <ul className="grid divide-y sm:grid-cols-2 sm:divide-y-0">
            {links.map((item) => (
              <li key={item.slug} className="sm:border-b sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0">
                <Link href={`/dashboard/platform/${item.slug}`} className="flex min-h-14 items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </PlatformPage>
  )
}

export default HomePage
