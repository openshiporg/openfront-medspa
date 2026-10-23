import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getAppointmentById } from "../lib/data/appointments"
import { getStorefrontBrand, storefrontMetadata } from "../lib/data/brand"
import { PillLink, Status, Track } from "../components/ui/primitives"
import { appointmentStatus, formatDuration, formatPrice } from "../lib/format"

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Appointment")
}

export async function BookingConfirmationPage({ params }: Props) {
  const { id } = await params
  const [appointment, brand] = await Promise.all([getAppointmentById(id), getStorefrontBrand()])
  if (!appointment) notFound()
  const service = appointment.service || appointment.services[0] || null
  const status = appointmentStatus[appointment.status] || { label: appointment.status, tone: "off" as const }
  const when = new Date(appointment.startTime)
  const zone = brand.timezone || undefined
  const date = when.toLocaleDateString("en-US", { timeZone: zone, weekday: "long", month: "long", day: "numeric", year: "numeric" })
  const time = when.toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" })

  return (
    <div className="sf-container-narrow sf-page-pad">
      <header className="mb-[var(--sf-space-lg)] grid gap-4">
        <p className="sf-eyebrow">Appointment</p>
        <div className="sf-title-line">
          <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{service?.name || "Your visit"}</h1>
          <Status tone={status.tone}>{status.label}</Status>
        </div>
      </header>

      <div className="sf-card p-[var(--sf-space-md)]">
        <dl>
          <div className="sf-ticket-row"><dt>Date</dt><dd>{date}</dd></div>
          <div className="sf-ticket-row"><dt>Time</dt><dd className="sf-num">{time}</dd></div>
          <div className="sf-ticket-row"><dt>Provider</dt><dd>{appointment.provider?.user?.name || "—"}</dd></div>
          <div className="sf-ticket-row"><dt>Duration</dt><dd className="sf-num">{formatDuration(appointment.duration)}</dd></div>
          {service ? <div className="sf-ticket-row"><dt>Price</dt><dd className="sf-num">{formatPrice(service.basePrice)}</dd></div> : null}
          {brand.addressLine ? <div className="sf-ticket-row"><dt>Location</dt><dd>{brand.addressLine}</dd></div> : null}
        </dl>
      </div>

      <div className="mt-[var(--sf-space-lg)]">
        <Track>
          <PillLink href="/account" variant="primary">My appointments</PillLink>
          <PillLink href="/contact">Directions</PillLink>
        </Track>
      </div>
    </div>
  )
}
