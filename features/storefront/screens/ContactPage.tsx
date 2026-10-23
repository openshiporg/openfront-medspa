import type { Metadata } from "next"
import { ArrowUpRight } from "lucide-react"
import { getStorefrontBrand, storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"
import { PillLink, StateCard, Status, Track } from "../components/ui/primitives"
import { openStatus, publishedHours } from "../lib/hours"

export async function generateContactMetadata(): Promise<Metadata> {
  return storefrontMetadata("Visit")
}

export async function ContactPage() {
  const brand = await getStorefrontBrand()
  const hours = publishedHours(brand.hours)
  const status = openStatus(brand.hours, brand.timezone)
  const mapsHref = brand.addressLine ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand.addressLine)}` : null
  const hasContact = Boolean(brand.addressLine || brand.phone || brand.email)

  return (
    <div className="sf-container sf-page-pad">
      <PageIntro eyebrow="Visit" title={brand.name} status={status ? <Status tone={status.open ? "ok" : "off"}>{status.label}</Status> : undefined} />

      <div className="grid gap-[var(--sf-space-lg)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section aria-labelledby="find-heading" className="grid content-start gap-[var(--sf-space-md)]">
          <h2 id="find-heading" className="sr-only">Find us</h2>
          {hasContact ? (
            <dl className="sf-card p-[var(--sf-space-md)]">
              {brand.addressLine ? (
                <div className="grid gap-3 border-b border-[var(--sf-rule)] pb-5">
                  <dt className="sf-eyebrow">Address</dt>
                  <dd className="sf-display text-[length:var(--sf-text-2xl)] leading-tight">{brand.addressLine}</dd>
                  {mapsHref ? <dd><Track><a href={mapsHref} target="_blank" rel="noopener noreferrer" className="sf-pill sf-pill-sm">Open in Maps<ArrowUpRight /></a></Track></dd> : null}
                </div>
              ) : null}
              {brand.phone && brand.phoneHref ? (
                <div className="flex items-baseline justify-between gap-4 border-b border-[var(--sf-rule)] py-4">
                  <dt className="sf-eyebrow">Phone</dt>
                  <dd><a href={brand.phoneHref} className="sf-link sf-num">{brand.phone}</a></dd>
                </div>
              ) : null}
              {brand.email ? (
                <div className="flex items-baseline justify-between gap-4 pt-4">
                  <dt className="sf-eyebrow">Email</dt>
                  <dd className="min-w-0 break-all text-right"><a href={`mailto:${brand.email}`} className="sf-link">{brand.email}</a></dd>
                </div>
              ) : null}
            </dl>
          ) : <StateCard title="Contact details not published" />}
          <Track><PillLink href="/book" variant="primary">Book an appointment</PillLink></Track>
        </section>

        <section aria-labelledby="hours-heading" className="sf-card p-[var(--sf-space-md)]">
          <h2 id="hours-heading" className="sf-eyebrow mb-2">Hours{brand.timezone ? ` · ${brand.timezone.replaceAll("_", " ")}` : ""}</h2>
          {hours.length ? (
            <dl className="sf-hours">
              {hours.map((entry) => (
                <div key={entry.key} data-today={entry.key === status?.todayKey}>
                  <dt>{entry.day}</dt>
                  <dd className="sf-num text-[var(--sf-ink-2)]">{entry.hours}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">Not published</p>}
        </section>
      </div>
    </div>
  )
}
