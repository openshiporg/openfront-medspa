import Link from "next/link"
import { getClientPortalAction } from "../account/actions"
import { signOutCustomer } from '../account/auth'
import { AppointmentSchedulingPanel } from '@/features/platform/appointments/screens/AppointmentSchedulingPanel'
import { PillLink, StateCard, Status, Track } from "../components/ui/primitives"
import { appointmentStatus } from "../lib/format"
import type { ClientPortalProjection } from "../account/clientPortalResult"
import { getIntakeForms } from "../lib/data/intake"
import { AftercareReplyForm, VisitReviewForm } from "../components/AccountActions"

function SignOut({ quiet = false }: { quiet?: boolean }) {
  return <form action={signOutCustomer}><button className={`sf-pill ${quiet ? "sf-pill-quiet" : ""}`}>Sign out</button></form>
}

type PortalAppointment = ClientPortalProjection["appointments"][number]

const money = (cents?: number | null) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100)

function AppointmentItem({ appointment, intakeDue = false }: { appointment: PortalAppointment; intakeDue?: boolean }) {
  const when = new Date(appointment.startTime)
  const zone = appointment.location?.timezone || undefined
  const status = appointmentStatus[appointment.status] || { label: appointment.status, tone: "off" as const }
  const title = appointment.lineItems?.map((line) => line.serviceTitle).filter(Boolean).join(", ") || "Appointment"
  const changeable = ['pending', 'confirmed'].includes(appointment.status) && new Date(appointment.startTime).getTime() > Date.now()
  const payment = appointment.payment
  return (
    <li className="sf-card grid gap-4 p-[var(--sf-space-md)]">
      <div className="grid gap-2">
        <div className="sf-title-line">
          <h3 className="sf-display text-[length:var(--sf-text-xl)] leading-tight"><Link href={`/booking/${appointment.id}`} className="no-underline hover:underline">{title}</Link></h3>
          <Status tone={status.tone}>{status.label}</Status>
          {intakeDue ? <Status tone="wait">Intake to do</Status> : null}
        </div>
        <p className="sf-num text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]">
          {when.toLocaleDateString("en-US", { timeZone: zone, weekday: "short", month: "short", day: "numeric", year: "numeric" })} · {when.toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" })}
          {appointment.provider?.user?.name ? ` · ${appointment.provider.user.name}` : ""}
        </p>
      </div>
      {intakeDue ? <div className="sf-track self-start"><Link href={`/account/intake/${appointment.id}`} className="sf-pill sf-pill-primary sf-pill-sm">Complete intake</Link></div> : null}
      {payment && payment.status && ["completed", "partially_refunded", "refunded"].includes(payment.status) ? (
        <details className="sf-well p-[var(--sf-space-sm)]">
          <summary className="cursor-pointer text-[length:var(--sf-text-sm)] font-medium">Receipt · <span className="sf-num">{money(payment.totalAmount)}</span></summary>
          <dl className="mt-2">
            {(appointment.transaction?.lineItems || []).map((line) => <div key={line.id} className="sf-ticket-row"><dt>{line.title || (line.itemType === "product" ? "Product" : "Treatment")}{line.quantity > 1 ? ` × ${line.quantity}` : ""}</dt><dd className="sf-num">{money(line.unitPrice * line.quantity - (line.discount || 0))}</dd></div>)}
            {payment.tax ? <div className="sf-ticket-row"><dt>Tax</dt><dd className="sf-num">{money(payment.tax)}</dd></div> : null}
            {payment.tip ? <div className="sf-ticket-row"><dt>Tip</dt><dd className="sf-num">{money(payment.tip)}</dd></div> : null}
            {payment.refundedAmount ? <div className="sf-ticket-row"><dt>Refunded</dt><dd className="sf-num">−{money(payment.refundedAmount)}</dd></div> : null}
            <div className="sf-ticket-row"><dt>Paid{payment.paymentMethod ? ` · ${payment.paymentMethod}` : ""}</dt><dd className="sf-num">{money(payment.totalAmount)}</dd></div>
          </dl>
        </details>
      ) : null}
      {appointment.status === "completed" && !appointment.reviewed ? <VisitReviewForm appointmentId={appointment.id} /> : null}
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
        <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{result.status === "unauthenticated" ? "Your appointments" : "No client profile"}</h1>
        {result.status === "unauthenticated" ? <p className="max-w-[46ch] text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]">Sign in to see your upcoming visits and any intake forms to complete. No account yet? You can book as a guest.</p> : null}
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
  // Intake is due per upcoming visit when a required form is not yet submitted.
  const intake = await Promise.all(upcoming.slice(0, 10).map(async (item) => [item.id, (await getIntakeForms(item.id)) || []] as const))
  const intakeDue = new Set(intake.filter(([, forms]) => forms.some((form) => !form.submitted)).map(([id]) => id))
  const { packages, memberships } = portal.benefits

  return (
    <div className="sf-container sf-page-pad">
      <header className="mb-[var(--sf-space-lg)] flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-4">
          <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{firstName ? `Hello, ${firstName}` : "Your account"}</h1>
          {portal.client.totalVisits ? <p className="sf-eyebrow">{portal.client.totalVisits} {portal.client.totalVisits === 1 ? "visit" : "visits"}</p> : null}
        </div>
        <Track><PillLink href="/book" variant="primary">Book</PillLink><SignOut /></Track>
      </header>

      <div className="grid gap-[var(--sf-space-xl)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-[var(--sf-space-xl)]">
          <section aria-labelledby="upcoming-heading" className="grid gap-4">
            <h2 id="upcoming-heading" className="sf-eyebrow">Upcoming</h2>
            {upcoming.length ? <ul className="grid gap-3">{upcoming.map((appointment) => <AppointmentItem key={appointment.id} appointment={appointment} intakeDue={intakeDue.has(appointment.id)} />)}</ul>
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
                  {['open', 'in_progress'].includes(task.status) ? <AftercareReplyForm taskId={task.id} /> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">No aftercare tasks</p>}

          {memberships.length || packages.length ? (
            <section aria-labelledby="benefits-heading" className="mt-[var(--sf-space-md)] grid gap-3">
              <h2 id="benefits-heading" className="sf-eyebrow">Memberships & packages</h2>
              <ul className="grid gap-3">
                {memberships.map((item) => (
                  <li key={item.id} className="sf-well grid gap-1 p-[var(--sf-space-sm)]">
                    <div className="sf-title-line"><h3 className="font-medium">{item.membership?.name || "Membership"}</h3><Status tone={item.status === "active" ? "ok" : item.status === "paused" ? "wait" : "off"}>{item.status}</Status></div>
                    <p className="sf-num text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">{item.membership?.monthlyPrice ? `${money(item.membership.monthlyPrice)}/mo` : ""}{item.nextBillingDate ? ` · next ${new Date(item.nextBillingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</p>
                  </li>
                ))}
                {packages.map((item) => (
                  <li key={item.id} className="sf-well grid gap-1 p-[var(--sf-space-sm)]">
                    <div className="sf-title-line"><h3 className="font-medium">{item.package?.name || "Package"}</h3><Status tone={item.status === "active" ? "ok" : "off"}>{item.status.replace("-", " ")}</Status></div>
                    <p className="sf-num text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">{money(item.remainingValue ?? item.totalValue - item.usedValue)} left{item.expiresAt ? ` · expires ${new Date(item.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {portal.treatmentPlans.length ? (
            <section aria-labelledby="plans-heading" className="mt-[var(--sf-space-md)] grid gap-3">
              <h2 id="plans-heading" className="sf-eyebrow">Treatment plans</h2>
              <ul className="grid gap-3">
                {portal.treatmentPlans.map((plan) => (
                  <li key={plan.id} className="sf-well grid gap-2 p-[var(--sf-space-sm)]">
                    <div className="sf-title-line"><h3 className="font-medium">{plan.title}</h3><Status tone={plan.status === "active" ? "ok" : "off"}>{plan.status}</Status></div>
                    {plan.items.map((item, index) => <p key={index} className="sf-num text-[length:var(--sf-text-xs)] text-[var(--sf-ink-2)]">{item.serviceTitle} · {item.completedSessions}/{item.plannedSessions}</p>)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
