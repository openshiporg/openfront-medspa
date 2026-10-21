import Link from "next/link"
import { Calendar, LockKeyhole, Phone, ReceiptText } from "lucide-react"
import { getClientPortalAction } from "../account/actions"
import { signOutCustomer } from '../account/auth'
import { AppointmentSchedulingPanel } from '@/features/platform/appointments/screens/AppointmentSchedulingPanel'

export async function AccountPage() {
  const result = await getClientPortalAction()
  if (result.status === "unavailable") return (
    <div className="sf-page-pad"><div className="sf-container-narrow"><section role="alert" className="sf-card p-[var(--sf-space-lg)] text-center">
      <h1 className="sf-display mb-3 text-[var(--sf-text-2xl)]">Client portal unavailable</h1>
      <p className="sf-lead mx-auto mb-7">Your account could not be loaded. Try again or sign out to switch accounts.</p>
      <form action={signOutCustomer}><button className="sf-btn sf-btn-secondary mb-4 min-h-11">Sign out</button></form>
      <div className="flex flex-col justify-center gap-3 sm:flex-row"><a href="/account" className="sf-btn sf-btn-primary">Retry portal</a><Link href="/contact" className="sf-btn sf-btn-secondary"><Phone className="h-4 w-4" />Contact the practice</Link></div>
    </section></div></div>
  )
  if (result.status !== "loaded") return (
    <div className="sf-page-pad"><div className="sf-container-narrow"><div className="sf-card p-[var(--sf-space-lg)] text-center">
      <LockKeyhole className="mx-auto mb-5 h-12 w-12 text-[var(--sf-accent)]" />
      <h1 className="sf-display mb-3 text-[var(--sf-text-2xl)]">Account</h1>
      <p className="sf-lead mx-auto mb-7">{result.status === "unauthenticated" ? "Sign in to view your appointments." : "No client profile is linked to this account."}</p>
      {result.status === 'unlinked' ? <form action={signOutCustomer}><button className="sf-btn sf-btn-secondary mb-4 min-h-11">Sign out</button></form> : null}
      <div className="flex flex-col justify-center gap-3 sm:flex-row"><Link href="/account/sign-in" className="sf-btn sf-btn-primary">Sign in</Link><Link href="/account/sign-up" className="sf-btn sf-btn-secondary">Create account</Link></div>
    </div></div></div>
  )
  const portal = result.portal
  if (!portal.client) return <div role="alert" className="sf-page-pad">Client identity unavailable. No private records or new command are shown; retry verified portal access.</div>
  return (
    <div className="sf-page-pad"><div className="sf-container-narrow space-y-6">
      <header><p className="sf-kicker">Account</p><h1 className="sf-display text-[var(--sf-text-2xl)]">Welcome, {portal.client.user?.name || "client"}</h1></header>

      {portal.followUps.length > 0 && <section className="sf-card p-5"><h2 className="sf-display mb-4 text-xl">Follow-up</h2><ul className="space-y-3">{portal.followUps.map(task=><li key={task.id} className="border-b border-[var(--sf-rule)] pb-3"><div className="flex justify-between"><strong>{task.title}</strong><span>{task.status}</span></div><p>{task.instructions}</p><small>Due {new Date(task.dueAt).toLocaleDateString()}</small></li>)}</ul></section>}
      <section className="sf-card p-5"><h2 className="sf-display mb-4 text-xl">Visits and receipts</h2>{portal.appointments.length ? <ul className="space-y-3">{portal.appointments.map(appointment=><li key={appointment.id} className="grid gap-3 border-b border-[var(--sf-rule)] pb-3"><div><strong>{new Date(appointment.startTime).toLocaleDateString()}</strong><p>{appointment.lineItems?.map(line=>line.serviceTitle).join(", ") || "Scheduled visit"}</p></div><span>{appointment.status}</span>{['pending', 'confirmed', 'cancelled', 'no_show'].includes(appointment.status) && <AppointmentSchedulingPanel appointmentId={appointment.id} customerOnly />}</li>)}</ul>:<p>No appointment records are shown.</p>}</section>
      <form action={signOutCustomer}><button className="sf-btn sf-btn-secondary min-h-11">Sign out</button></form>
      <div className="flex gap-3"><Link href="/book" className="sf-btn sf-btn-primary"><Calendar className="h-4 w-4" />Book</Link><Link href="/contact" className="sf-btn sf-btn-secondary"><ReceiptText className="h-4 w-4" />Records help</Link></div>
    </div></div>
  )
}
