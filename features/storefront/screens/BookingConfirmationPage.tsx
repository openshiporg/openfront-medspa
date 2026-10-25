import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getStorefrontVisit } from "../lib/data/visit"
import { getStorefrontBrand, storefrontMetadata } from "../lib/data/brand"
import { PillLink, Status, Track } from "../components/ui/primitives"
import { appointmentStatus, formatDuration, formatPrice } from "../lib/format"
import { GuestCancelForm } from "../components/GuestCancelForm"

interface Props { params: Promise<{ id: string }>; searchParams?: Promise<{ token?: string }> }

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await storefrontMetadata("Appointment")), robots: { index: false, follow: false } }
}

export async function BookingConfirmationPage({ params, searchParams }: Props) {
  const { id } = await params
  const token = (searchParams ? (await searchParams).token : undefined) || null
  const [visit, brand] = await Promise.all([getStorefrontVisit(id, token), getStorefrontBrand()])
  if (!visit) notFound()
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
