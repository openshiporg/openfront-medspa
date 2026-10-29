import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { confirmVisitDeposit, getStorefrontVisit } from "../lib/data/visit"
import { getStorefrontBrand, storefrontMetadata } from "../lib/data/brand"
import { PillLink, Status, Track } from "../components/ui/primitives"
import { appointmentStatus, formatDuration, formatPrice } from "../lib/format"
import { GuestCancelForm } from "../components/GuestCancelForm"
import { DepositPay } from "../components/DepositPay"

interface Props { params: Promise<{ id: string }>; searchParams?: Promise<{ token?: string; deposit?: string }> }

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await storefrontMetadata("Appointment")), robots: { index: false, follow: false } }
}

export async function BookingConfirmationPage({ params, searchParams }: Props) {
  const { id } = await params
  const query = searchParams ? await searchParams : {}
  const token = query.token || null
  // Back from Stripe: read the Checkout back so the deposit shows as paid even before the webhook arrives.
  const reconcile = query.deposit === "return" ? await confirmVisitDeposit(id, token) : null
  const [visit, brand] = await Promise.all([getStorefrontVisit(id, token), getStorefrontBrand()])
  if (!visit) notFound()
  const depositLabel = visit.depositAmount ? formatPrice(visit.depositAmount / 100) : ""
  const status = appointmentStatus[visit.status] || { label: visit.status, tone: "off" as const }
  const when = new Date(visit.startTime)
  const zone = visit.timezone || brand.timezone || undefined
  const date = when.toLocaleDateString("en-US", { timeZone: zone, weekday: "long", month: "long", day: "numeric", year: "numeric" })
  const time = when.toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" })

  return (
    <div className="sf-container-narrow sf-page-pad">
      <header className="mb-[var(--sf-space-lg)] grid gap-4">
        <div className="sf-title-line">
          <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{visit.serviceNames.join(", ") || "Your visit"}</h1>
          <Status tone={status.tone}>{status.label}</Status>
        </div>
        <p className="sf-eyebrow">Appointment <span className="sf-num">{visit.id.slice(-6).toUpperCase()}</span></p>
      </header>

      <div className="sf-card p-[var(--sf-space-md)]">
        <dl>
          <div className="sf-ticket-row"><dt>Date</dt><dd>{date}</dd></div>
          <div className="sf-ticket-row"><dt>Time</dt><dd className="sf-num">{time}</dd></div>
          <div className="sf-ticket-row"><dt>Provider</dt><dd>{visit.providerName || "—"}</dd></div>
          <div className="sf-ticket-row"><dt>Duration</dt><dd className="sf-num">{formatDuration(visit.duration)}</dd></div>
          {visit.price !== null ? <div className="sf-ticket-row"><dt>Price</dt><dd className="sf-num">{formatPrice(visit.price / 100)}</dd></div> : null}
          {brand.addressLine ? <div className="sf-ticket-row"><dt>Location</dt><dd>{brand.addressLine}</dd></div> : null}
        </dl>
      </div>

      {visit.depositAmount ? (
        <div className="sf-card mt-[var(--sf-space-md)] grid gap-3 p-[var(--sf-space-md)]" aria-labelledby="deposit-heading">
          <div className="sf-title-line">
            <h2 id="deposit-heading" className="sf-display text-[length:var(--sf-text-xl)]">Deposit</h2>
            <Status tone={visit.depositPaid ? "ok" : "wait"}>{visit.depositPaid ? "Paid" : "Due"}</Status>
          </div>
          <p className="text-[length:var(--sf-text-md)] text-[var(--sf-ink-2)]">
            {visit.depositPaid
              ? `${depositLabel} received. It is taken off your total at your visit.`
              : visit.depositOnline
                ? `A ${depositLabel} deposit holds this time. It is taken off your total at your visit, and returned if you cancel.`
                : `A ${depositLabel} deposit is due. The practice will collect it before your visit.`}
          </p>
          {reconcile?.error ? <p role="alert" className="sf-alert">{reconcile.error}</p> : null}
          {query.deposit === "return" && !visit.depositPaid && !reconcile?.error ? <p role="status" className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">Your payment is still being confirmed. Refresh in a moment.</p> : null}
          {!visit.depositPaid && visit.depositOnline ? <DepositPay appointmentId={visit.id} token={token} label={`Pay ${depositLabel} deposit`} /> : null}
        </div>
      ) : null}

      {token && visit.cancellable ? <div className="mt-[var(--sf-space-md)]"><GuestCancelForm appointmentId={visit.id} token={token} /></div> : null}

      <div className="mt-[var(--sf-space-lg)]">
        <Track>
          {token ? <PillLink href="/book" variant="primary">Book another</PillLink> : <PillLink href="/account" variant="primary">My appointments</PillLink>}
          <PillLink href="/contact">Directions</PillLink>
        </Track>
      </div>
    </div>
  )
}
