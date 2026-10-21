import Link from "next/link"
import { StoreBrand } from "@/features/storefront/components/StoreBrand"
import type { StorefrontBrand } from "@/features/storefront/lib/data/brand"

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

function formatTime(value?: string | null): string | null {
  if (!value) return null
  const [hours, minutes] = value.split(":").map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  const period = hours >= 12 ? "pm" : "am"
  const hour = hours % 12 || 12
  return minutes ? `${hour}:${String(minutes).padStart(2, "0")}${period}` : `${hour}${period}`
}

function formatHours(hours: StorefrontBrand["hours"]): string[] {
  if (!hours) return []
  return DAY_ORDER.flatMap((day) => {
    const schedule = hours[day]
    if (!schedule) return []
    const label = day.slice(0, 3).replace(/^./, letter => letter.toUpperCase())
    if (schedule.closed) return [`${label} closed`]
    const open = formatTime(schedule.open)
    const close = formatTime(schedule.close)
    return open && close ? [`${label} ${open}–${close}`] : []
  })
}

export default function Footer({ brand }: { brand: StorefrontBrand }) {
  const hours = formatHours(brand.hours)
  return (
    <footer className="border-t border-[var(--sf-rule)] bg-[var(--sf-paper-2)]">
      <div className="sf-container py-[var(--sf-space-xl)]">
        <div className="grid gap-[var(--sf-space-lg)] lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <StoreBrand name={brand.name} logoSvg={brand.logoSvg} logoHue={brand.logoHue} />
          </div>
          <div className="space-y-[var(--sf-space-sm)] text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">
            {brand.addressLine ? <p><span className="font-medium text-[var(--sf-ink)]">Primary location</span><br />{brand.addressLine}</p> : null}
            {hours.length ? <div><p className="font-medium text-[var(--sf-ink)]">Published hours</p><p className="mt-1 max-w-[34ch] leading-relaxed">{hours.join(" · ")}</p></div> : null}
            {brand.phone || brand.email ? (
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                {brand.phone && brand.phoneHref ? <a href={brand.phoneHref} className="sf-link">{brand.phone}</a> : null}
                {brand.email ? <a href={`mailto:${brand.email}`} className="sf-link">{brand.email}</a> : null}
              </p>
            ) : <p>No public contact channel has been published.</p>}
          </div>
        </div>
        <hr className="sf-rule my-[var(--sf-space-lg)]" />
        <div className="flex flex-col gap-4 text-[var(--sf-text-xs)] text-[var(--sf-ink-3)] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {brand.name}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/services" className="sf-link !text-[var(--sf-ink-3)]">Services</Link>
            <Link href="/team" className="sf-link !text-[var(--sf-ink-3)]">Providers</Link>
            <Link href="/contact" className="sf-link !text-[var(--sf-ink-3)]">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
