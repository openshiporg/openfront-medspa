import Link from "next/link"
import { getClientPortalAction } from "../account/actions"
import { signOutCustomer } from '../account/auth'
import { AppointmentSchedulingPanel } from '@/features/platform/appointments/screens/AppointmentSchedulingPanel'
import { PillLink, StateCard, Status, Track } from "../components/ui/primitives"
import { appointmentStatus } from "../lib/format"
import type { ClientPortalProjection } from "../account/clientPortalResult"

function SignOut({ quiet = false }: { quiet?: boolean }) {
  return <form action={signOutCustomer}><button className={`sf-pill ${quiet ? "sf-pill-quiet" : ""}`}>Sign out</button></form>
}

function AppointmentItem({ appointment }: { appointment: ClientPortalProjection["appointments"][number] }) {
  const when = new Date(appointment.startTime)
  const status = appointmentStatus[appointment.status] || { label: appointment.status, tone: "off" as const }
  const title = appointment.lineItems?.map((line) => line.serviceTitle).filter(Boolean).join(", ") || "Appointment"
  const changeable = ['pending', 'confirmed', 'cancelled', 'no_show'].includes(appointment.status)
  return (
    <li className="sf-card grid gap-4 p-[var(--sf-space-md)]">
      <div className="grid gap-2">
        <div className="sf-title-line">
          <h3 className="sf-display text-[length:var(--sf-text-xl)] leading-tight">{title}</h3>
          <Status tone={status.tone}>{status.label}</Status>
        </div>
        <p className="sf-num text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]">
          {when.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · {when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
      {changeable ? <AppointmentSchedulingPanel appointmentId={appointment.id} customerOnly /> : null}
    </li>
  )
}

export async function AccountPage() {
  const result = await getClientPortalAction()
  if (result.status === "unavailable") return (
    <div className="sf-container-narrow sf-page-pad">
      <StateCard alert title="Account couldn't load" action={<Track><a href="/account" className="sf-pill sf-pill-primary">Try again</a><Link href="/contact" className="sf-pill">Contact</Link><SignOut quiet /></Track>} />
    </div>
  )
  if (result.status !== "loaded") return (
    <div className="sf-container-narrow sf-page-pad">
      <header className="mb-[var(--sf-space-lg)] grid gap-4">
        <p className="sf-eyebrow">Account</p>
        <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{result.status === "unauthenticated" ? "Your appointments" : "No client profile"}</h1>
      </header>
      {result.status === "unauthenticated" ? (
        <Track><PillLink href="/account/sign-in" variant="primary">Sign in</PillLink><PillLink href="/account/sign-up">Create account</PillLink></Track>
      ) : (
        <StateCard title="This sign-in isn't linked to a client" action={<Track><Link href="/contact" className="sf-pill">Contact the practice</Link><SignOut quiet /></Track>} />
      )}
    </div>
  )

  const portal = result.portal
  if (!portal.client) return (
    <div className="sf-container-narrow sf-page-pad">
      <StateCard alert title="Client profile unavailable" action={<Track><a href="/account" className="sf-pill">Try again</a></Track>} />
    </div>
  )

  const now = Date.now()
  const upcoming = portal.appointments.filter((item) => new Date(item.startTime).getTime() >= now && !['cancelled', 'no_show', 'completed'].includes(item.status))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  const past = portal.appointments.filter((item) => !upcoming.includes(item))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  const firstName = portal.client.user?.name?.split(" ")[0]

  return (
    <div className="sf-container sf-page-pad">
      <header className="mb-[var(--sf-space-lg)] flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-4">
          <p className="sf-eyebrow">Account{portal.client.totalVisits ? ` · ${portal.client.totalVisits} ${portal.client.totalVisits === 1 ? "visit" : "visits"}` : ""}</p>
          <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{firstName ? `Hello, ${firstName}` : "Your account"}</h1>
        </div>
        <Track><PillLink href="/book" variant="primary">Book</PillLink><SignOut /></Track>
      </header>

      <div className="grid gap-[var(--sf-space-xl)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-[var(--sf-space-xl)]">
          <section aria-labelledby="upcoming-heading" className="grid gap-4">
            <h2 id="upcoming-heading" className="sf-eyebrow">Upcoming</h2>
            {upcoming.length ? <ul className="grid gap-3">{upcoming.map((appointment) => <AppointmentItem key={appointment.id} appointment={appointment} />)}</ul>
              : <StateCard title="Nothing booked" action={<Track><PillLink href="/book" size="sm">Book an appointment</PillLink></Track>} />}
          </section>

          {past.length ? (
            <section aria-labelledby="past-heading" className="grid gap-4">
              <h2 id="past-heading" className="sf-eyebrow">History</h2>
              <ul className="grid gap-3">{past.map((appointment) => <AppointmentItem key={appointment.id} appointment={appointment} />)}</ul>
            </section>
          ) : null}
        </div>

        <aside className="grid content-start gap-4" aria-labelledby="followup-heading">
          <h2 id="followup-heading" className="sf-eyebrow">Aftercare</h2>
          {portal.followUps.length ? (
            <ul className="grid gap-3">
              {portal.followUps.map((task) => (
                <li key={task.id} className="sf-well grid gap-2 p-[var(--sf-space-sm)]">
                  <div className="sf-title-line">
                    <h3 className="font-medium">{task.title}</h3>
                    <Status tone={task.status === "completed" ? "ok" : "wait"}>{task.status.replaceAll("_", " ")}</Status>
                  </div>
                  {task.instructions ? <p className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]">{task.instructions}</p> : null}
                  <p className="sf-num text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">Due {new Date(task.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">No aftercare tasks</p>}
        </aside>
      </div>
    </div>
  )
}
