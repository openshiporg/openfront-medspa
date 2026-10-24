import Link from "next/link"
import { StoreBrand } from "@/features/storefront/components/StoreBrand"
import type { StorefrontBrand } from "@/features/storefront/lib/data/brand"
import { publishedHours } from "@/features/storefront/lib/hours"

const links = [
  { name: "Treatments", href: "/services" },
  { name: "Providers", href: "/team" },
  { name: "Book", href: "/book" },
  { name: "Reviews", href: "/reviews" },
  { name: "Visit", href: "/contact" },
  { name: "Account", href: "/account" },
]

export default function Footer({ brand }: { brand: StorefrontBrand }) {
  const hours = publishedHours(brand.hours, "short")
  return (
    <footer className="border-t border-[var(--sf-rule)] bg-[var(--sf-paper-2)]">
      <div className="sf-container py-[var(--sf-space-xl)]">
        <div className="grid gap-[var(--sf-space-lg)] md:grid-cols-[1.3fr_1fr_1fr]">
          <div className="grid content-start gap-4">
            <StoreBrand name={brand.name} logoSvg={brand.logoSvg} logoHue={brand.logoHue} size="lg" />
            {brand.addressLine ? <p className="max-w-[30ch] text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]">{brand.addressLine}</p> : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--sf-text-sm)]">
              {brand.phone && brand.phoneHref ? <a href={brand.phoneHref} className="sf-link sf-num">{brand.phone}</a> : null}
              {brand.email ? <a href={`mailto:${brand.email}`} className="sf-link">{brand.email}</a> : null}
            </div>
          </div>

          <div>
            <p className="sf-eyebrow mb-3">Hours</p>
            {hours.length ? (
              <dl className="grid gap-1.5 text-[length:var(--sf-text-sm)]">
                {hours.map((entry) => (
                  <div key={entry.key} className="flex justify-between gap-4">
                    <dt className="text-[var(--sf-ink-3)]">{entry.short}</dt>
                    <dd className="sf-num text-[var(--sf-ink-2)]">{entry.hours}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">Not published</p>}
          </div>

          <nav aria-label="Footer">
            <p className="sf-eyebrow mb-3">Practice</p>
            <ul className="grid gap-2 text-[length:var(--sf-text-sm)]">
              {links.map((link) => <li key={link.href}><Link href={link.href} className="sf-link">{link.name}</Link></li>)}
            </ul>
          </nav>
        </div>

        <hr className="sf-rule my-[var(--sf-space-lg)]" />
        <p className="sf-num text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">&copy; {new Date().getFullYear()} {brand.name}</p>
      </div>
      <div className="sf-mobile-bar-space" aria-hidden="true" />
    </footer>
  )
}
