import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { getStorefrontBrand, storefrontMetadata } from "../lib/data/brand"
import { getServicesGroupedByCategory, getFeaturedServices } from "../lib/data/services"
import { getFeaturedProviders } from "../lib/data/providers"
import { ServiceCard } from "../components/ServiceCard"
import { ProviderCard } from "../components/ProviderCard"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { ServiceCatalogUnavailable } from "../components/ServiceCatalogUnavailable"
import { Capsule, PillLink, Status, Track } from "../components/ui/primitives"
import { getStorefrontImageSrc } from "../lib/images"
import { openStatus, publishedHours } from "../lib/hours"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata()
}

export async function HomePage() {
  const [brand, categoryResult, featuredResult, providerResult] = await Promise.all([
    getStorefrontBrand(),
    getServicesGroupedByCategory(),
    getFeaturedServices(4),
    getFeaturedProviders(3),
  ])
  const catalogLoaded = categoryResult.status === "loaded" && featuredResult.status === "loaded"
  const categories = categoryResult.status === "loaded" ? categoryResult.data.filter((category) => category.services.length) : []
  const services = featuredResult.status === "loaded" ? featuredResult.data : []
  const providers = providerResult.status === "loaded" ? providerResult.data : []
  const canBook = catalogLoaded && providerResult.status === "loaded" && services.length > 0

  const status = openStatus(brand.hours, brand.timezone)
  const today = publishedHours(brand.hours, "short").find((day) => day.key === status?.todayKey)
  const heroPortrait = providers.map((provider) => getStorefrontImageSrc(provider.photo)).find(Boolean) || null
  const locality = [brand.city, brand.state].filter(Boolean).join(", ")

  return (
    <div>
      <section className="sf-hero" aria-labelledby="sf-home-title">
        <div className="sf-container sf-hero-grid">
          <div className="sf-hero-notes order-2 lg:order-1">
            <div className="sf-title-line">
              {locality ? <p className="sf-eyebrow">{locality}</p> : null}
              {status ? <Status tone={status.open ? "ok" : "off"}>{status.label}</Status> : null}
            </div>
            <dl className="sf-facts">
              {catalogLoaded ? <div><dt className="sf-eyebrow">Treatments</dt><dd className="sf-num">{brand.serviceCount}</dd></div> : null}
              {today ? <div><dt className="sf-eyebrow">Today</dt><dd className="sf-num">{today.hours}</dd></div> : null}
              {brand.phone && brand.phoneHref ? <div><dt className="sf-eyebrow">Call</dt><dd><a className="sf-link sf-num" href={brand.phoneHref}>{brand.phone}</a></dd></div> : null}
            </dl>
            {heroPortrait ? <div className="sf-hero-media hidden sm:block" aria-hidden="true">
              <Capsule src={heroPortrait} />
            </div> : null}
          </div>
          <div className="order-1 grid min-w-0 content-end gap-7 lg:order-2">
            <h1 id="sf-home-title" className="sf-display text-[length:var(--sf-text-display)]">{brand.name}</h1>
            {categories.length ? (
              <ul className="sf-chip-row" aria-label="Treatment categories">
                {categories.slice(0, 6).map((category) => (
                  <li key={category.id}><Link className="sf-chip" href={`/services#${category.id}`}>{category.name}</Link></li>
                ))}
              </ul>
            ) : null}
            <Track>
              {canBook ? <PillLink href="/book" variant="primary">Book an appointment</PillLink> : null}
              <PillLink href="/services">View treatments</PillLink>
            </Track>
          </div>
        </div>
      </section>

      {!catalogLoaded ? (
        <section className="sf-container sf-section">
          <ServiceCatalogUnavailable retryHref="/" />
        </section>
      ) : null}

      {catalogLoaded && services.length ? (
        <section className="sf-container sf-section" aria-labelledby="featured-heading">
          <div className="mb-[var(--sf-space-lg)] flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-3">
              <h2 id="featured-heading" className="sf-display text-[length:var(--sf-text-3xl)]">Treatments</h2>
            </div>
            <Track><PillLink href="/services" size="sm">Full menu <ArrowUpRight /></PillLink></Track>
          </div>
          <div className="sf-ledger sf-ledger-menu">
            {services.map((service) => <ServiceCard key={service.id} service={service} showCategory />)}
          </div>
        </section>
      ) : null}

      {catalogLoaded && services.length === 0 ? (
        <section className="sf-container sf-section">
          <div role="status" className="sf-state"><h2 className="sf-display text-[length:var(--sf-text-xl)]">No treatments listed yet</h2></div>
        </section>
      ) : null}

      {categories.length ? (
        <section className="sf-band" aria-labelledby="menu-heading">
          <div className="sf-container sf-section grid gap-[var(--sf-space-lg)] lg:grid-cols-[0.8fr_1.2fr]">
            <div className="grid content-start gap-3">
              <h2 id="menu-heading" className="sf-display text-[length:var(--sf-text-3xl)]">By concern</h2>
            </div>
            <nav aria-label="Treatment categories" className="sf-ledger">
              {categories.map((category) => (
                <Link key={category.id} href={`/services#${category.id}`} className="sf-ledger-row">
                  <span className="sf-ledger-name">{category.name}</span>
                  <span className="sf-ledger-figures">
                    <span className="sf-muted">{category.services.length} {category.services.length === 1 ? "treatment" : "treatments"}</span>
                    <ArrowUpRight className="size-4 self-center text-[var(--sf-ink-3)]" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </section>
      ) : null}

      {providerResult.status === "unavailable" ? (
        <section className="sf-container sf-section">
          <ProviderProfilesUnavailable retryHref="/" />
        </section>
      ) : providers.length ? (
        <section className="sf-container sf-section" aria-labelledby="providers-heading">
          <div className="mb-[var(--sf-space-lg)] flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-3">
              <h2 id="providers-heading" className="sf-display text-[length:var(--sf-text-3xl)]">Choose who treats you</h2>
            </div>
            <Track><PillLink href="/team" size="sm">All providers <ArrowUpRight /></PillLink></Track>
          </div>
          <div className="grid grid-cols-2 gap-x-[var(--sf-space-sm)] gap-y-[var(--sf-space-lg)] md:grid-cols-3 md:gap-x-[var(--sf-space-lg)]">
            {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
          </div>
        </section>
      ) : null}

      <section className="sf-band" aria-labelledby="visit-heading">
        <div className="sf-container sf-section grid items-end gap-[var(--sf-space-lg)] md:grid-cols-[1fr_auto]">
          <div className="grid gap-3">
            <h2 id="visit-heading" className="sf-display text-[length:var(--sf-text-3xl)]">{brand.addressLine || brand.name}</h2>
          </div>
          <Track>
            <PillLink href="/contact">Hours & directions</PillLink>
            {canBook ? <PillLink href="/book" variant="primary">Book</PillLink> : null}
          </Track>
        </div>
      </section>
    </div>
  )
}
