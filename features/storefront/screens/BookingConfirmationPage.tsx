import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Clock, User } from "lucide-react"
import { getAppointmentById } from "../lib/data/appointments"
import { getStorefrontBrand, storefrontMetadata } from "../lib/data/brand"

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Appointment request")
}

export async function BookingConfirmationPage({ params }: Props) {
  const { id } = await params
  const [appointment, brand] = await Promise.all([getAppointmentById(id), getStorefrontBrand()])
  if (!appointment) notFound()
  const requestedAt = new Date(appointment.startTime)
  const service = appointment.service

  return (
    <div className="sf-page-pad"><div className="sf-container-narrow">
      <div className="sf-card mb-[var(--sf-space-md)] p-8 text-center">
        <h1 className="sf-display mb-3 text-[var(--sf-text-display-s)]">Appointment request</h1>
        <p className="text-[var(--sf-text-md)] text-[var(--sf-ink-2)]">Current recorded status: <strong>{appointment.status}</strong>.</p>
        <p className="mt-3 text-[var(--sf-text-sm)] text-[var(--sf-ink-3)]">This record does not establish candidacy, provider credentials, authorization, expected results, or appointment availability beyond its explicit status.</p>
      </div>
      <div className="sf-card mb-[var(--sf-space-md)] p-[var(--sf-space-md)]">
        <h2 className="sf-display mb-6 text-[var(--sf-text-xl)]">Recorded request details</h2>
        <dl className="space-y-5 text-[var(--sf-text-sm)]">
          <div className="flex gap-4 border-b border-[var(--sf-rule)] pb-5"><Clock className="h-5 w-5 text-[var(--sf-accent)]" /><div><dt className="sr-only">Service</dt><dd className="font-medium">{service?.name || "Service"}</dd><p className="mt-1 text-[var(--sf-ink-3)]">{appointment.duration} min{service ? service.basePrice === 0 ? " · No payment collected" : ` · $${service.basePrice}` : ""}</p></div></div>
          <div className="flex gap-4 border-b border-[var(--sf-rule)] pb-5"><User className="h-5 w-5 text-[var(--sf-accent)]" /><div><dt className="text-[var(--sf-ink-3)]">Provider preference</dt><dd className="font-medium">{appointment.provider?.user?.name || "Not recorded"}</dd></div></div>
          <div className="flex gap-4"><Calendar className="h-5 w-5 text-[var(--sf-accent)]" /><div><dt className="text-[var(--sf-ink-3)]">Requested time</dt><dd className="font-medium">{requestedAt.toLocaleString()}</dd></div></div>
        </dl>
      </div>
      {brand.addressLine ? <div className="sf-card mb-[var(--sf-space-md)] p-[var(--sf-space-md)]"><h2 className="sf-display mb-2 text-[var(--sf-text-lg)]">Published primary location</h2><p className="text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">{brand.addressLine}</p></div> : null}
      <div className="flex flex-col justify-center gap-3 sm:flex-row"><Link href="/" className="sf-btn sf-btn-primary">Home</Link><Link href="/account" className="sf-btn sf-btn-secondary">My account</Link></div>
    </div></div>
  )
}
