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

      {visit.depositAmount ? (() => {
        // The deposit block follows the real money state; a closed visit never shows "Due" or "still being confirmed".
        const state = visit.depositState
        const refunded = formatPrice((visit.depositRefundedAmount || visit.depositAmount) / 100)
        const refundedOn = visit.depositRefundedAt ? new Date(visit.depositRefundedAt).toLocaleDateString("en-US", { timeZone: zone, month: "long", day: "numeric", year: "numeric" }) : null
        const open = ["pending", "confirmed"].includes(visit.status)
        const badge = state === "refunded" ? { tone: "off" as const, label: "Refunded" }
          : state === "refund_pending" ? { tone: "wait" as const, label: "Refund on the way" }
          : state === "refund_failed" ? { tone: "wait" as const, label: "Refund delayed" }
          : state === "paid" ? { tone: "ok" as const, label: "Paid" }
          : state === "not_charged" ? { tone: "off" as const, label: "Not charged" }
          : { tone: "wait" as const, label: "Due" }
        const message = state === "refunded" ? `Deposit refunded: ${refunded} returned to your card${refundedOn ? ` on ${refundedOn}` : ""}.`
          : state === "refund_pending" ? `Refund on the way: your ${depositLabel} deposit is being returned to your card. It usually shows within 5–10 business days.`
          : state === "refund_failed" ? `Your ${depositLabel} deposit refund didn't go through yet. The practice will follow up.`
          : state === "paid" ? (open ? `${depositLabel} received. It is taken off your total at your visit.` : `${depositLabel} deposit received.`)
          : state === "not_charged" ? "No deposit was charged for this visit."
          : visit.depositOnline ? `A ${depositLabel} deposit holds this time. It is taken off your total at your visit, and returned if you cancel.`
          : `A ${depositLabel} deposit is due. The practice will collect it before your visit.`
        return (
          <div className="sf-card mt-[var(--sf-space-md)] grid gap-3 p-[var(--sf-space-md)]" aria-labelledby="deposit-heading">
            <div className="sf-title-line">
              <h2 id="deposit-heading" className="sf-display text-[length:var(--sf-text-xl)]">Deposit</h2>
              <Status tone={badge.tone}>{badge.label}</Status>
            </div>
            <p className="text-[length:var(--sf-text-md)] text-[var(--sf-ink-2)]">{message}</p>
            {open && reconcile?.error ? <p role="alert" className="sf-alert">{reconcile.error}</p> : null}
            {open && query.deposit === "return" && state === "due" && !reconcile?.error ? <p role="status" className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">Your payment is still being confirmed. Refresh in a moment.</p> : null}
            {open && state === "due" && visit.depositOnline ? <DepositPay appointmentId={visit.id} token={token} label={`Pay ${depositLabel} deposit`} /> : null}
          </div>
        )
      })() : null}

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
