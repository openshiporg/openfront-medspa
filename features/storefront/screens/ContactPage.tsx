import type { Metadata } from "next"
import { Clock, Mail, MapPin, Phone } from "lucide-react"
import { getStorefrontBrand, storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

function time(value?: string | null) {
  if (!value) return null
  const [hour, minute] = value.split(":").map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export async function generateContactMetadata(): Promise<Metadata> {
  return storefrontMetadata("Contact")
}

export async function ContactPage() {
  const brand = await getStorefrontBrand()
  const hours = DAYS.flatMap(day => {
    const entry = brand.hours?.[day]
    if (!entry) return []
    return [{ day, closed: entry.closed === true, open: time(entry.open), close: time(entry.close) }]
  })
  const mapsHref = brand.addressLine ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand.addressLine)}` : null

  return (
    <div className="sf-page-pad"><div className="sf-container">
      <PageIntro title="Published contact details" description="Only the authorized primary location and its published contact fields are shown." size="large" />
      <div className="grid gap-[var(--sf-space-lg)] lg:grid-cols-2">
        <section className="space-y-[var(--sf-space-md)]">
          {brand.addressLine ? <div className="sf-card p-[var(--sf-space-md)]"><div className="flex gap-4"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sf-accent)]" /><div><h2 className="sf-display mb-2 text-[var(--sf-text-xl)]">Primary location</h2><p className="text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">{brand.addressLine}</p>{mapsHref ? <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="sf-link mt-3 inline-block text-[var(--sf-text-sm)]">Open address in maps</a> : null}</div></div></div> : null}
          {brand.phone && brand.phoneHref ? <div className="sf-card p-[var(--sf-space-md)]"><div className="flex gap-4"><Phone className="mt-0.5 h-5 w-5 text-[var(--sf-accent)]" /><div><h2 className="sf-display mb-2 text-[var(--sf-text-xl)]">Phone</h2><a href={brand.phoneHref} className="sf-link">{brand.phone}</a></div></div></div> : null}
          {brand.email ? <div className="sf-card p-[var(--sf-space-md)]"><div className="flex gap-4"><Mail className="mt-0.5 h-5 w-5 text-[var(--sf-accent)]" /><div><h2 className="sf-display mb-2 text-[var(--sf-text-xl)]">Email</h2><a href={`mailto:${brand.email}`} className="sf-link">{brand.email}</a></div></div></div> : null}
          {!brand.addressLine && !brand.phone && !brand.email ? <div className="sf-card p-[var(--sf-space-md)] text-[var(--sf-ink-2)]">No public contact channel has been published.</div> : null}
        </section>
        <section className="sf-card p-[var(--sf-space-md)]">
          <div className="mb-6 flex items-center gap-3"><Clock className="h-5 w-5 text-[var(--sf-accent)]" /><h2 className="sf-display text-[var(--sf-text-xl)]">Published hours</h2></div>
          {hours.length ? <ul className="divide-y divide-[var(--sf-rule)]">{hours.map(entry => <li key={entry.day} className="flex justify-between gap-4 py-3 text-[var(--sf-text-sm)]"><span className="capitalize">{entry.day}</span><span className="text-[var(--sf-ink-2)]">{entry.closed ? "Closed" : entry.open && entry.close ? `${entry.open}–${entry.close}` : "Not published"}</span></li>)}</ul> : <p className="text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">No public hours have been published.</p>}
        </section>
      </div>
      <p className="mt-[var(--sf-space-lg)] max-w-3xl text-[var(--sf-text-xs)] leading-relaxed text-[var(--sf-ink-3)]">Published contact details and hours do not represent appointment availability, clinical candidacy, provider credentials, service authorization, or expected results.</p>
    </div></div>
  )
}
