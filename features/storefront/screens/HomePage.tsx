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
  const categories = categoryResult.status === "loaded" ? categoryResult.data : []
  const services = featuredResult.status === "loaded" ? featuredResult.data : []
  const providers = providerResult.status === "loaded" ? providerResult.data : []

  return (
    <div>
      <section className="border-b border-[var(--sf-rule)] bg-[var(--sf-paper-2)]">
        <div className="sf-container sf-page-pad-lg grid gap-[var(--sf-space-xl)] lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="sf-eyebrow">Public service catalog</p>
            <h1 className="sf-display mt-4 max-w-[12ch] text-[var(--sf-text-display)]">{brand.name}</h1>
            <p className="sf-lead mt-6">{catalogLoaded ? brand.description : "Public service details could not be confirmed."}</p>
          </div>
          <div className="space-y-4 border-l border-[var(--sf-rule)] pl-[var(--sf-space-md)]">
            <p className="text-[var(--sf-text-sm)] leading-relaxed text-[var(--sf-ink-2)]">
              Review published service names, duration, and price. An appointment request does not establish candidacy, provider qualifications, clinical authorization, expected results, or appointment availability.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/services" className="sf-btn sf-btn-primary">View published services</Link>
              {catalogLoaded && providerResult.status === "loaded" && services.length ? <Link href="/book" className="sf-btn sf-btn-secondary">Request an appointment</Link> : null}
            </div>
          </div>
        </div>
      </section>

      {!catalogLoaded ? (
        <section className="sf-container sf-page-pad-lg">
          <ServiceCatalogUnavailable retryHref="/" />
        </section>
      ) : null}

      {catalogLoaded ? (
        <section className="sf-container sf-page-pad-lg">
          <div className="mb-[var(--sf-space-lg)] flex items-end justify-between gap-4">
            <div><p className="sf-eyebrow">Published now</p><h2 className="sf-display mt-3 text-[var(--sf-text-3xl)]">Services</h2></div>
            <p className="text-[var(--sf-text-sm)] text-[var(--sf-ink-3)]">{brand.serviceCount} listed</p>
          </div>
          {services.length ? (
            <div className="grid gap-[var(--sf-space-md)] md:grid-cols-2">{services.map(service => <ServiceCard key={service.id} service={service} />)}</div>
          ) : (
            <p className="border border-dashed border-[var(--sf-rule)] p-[var(--sf-space-lg)] text-[var(--sf-ink-2)]">No public services are currently listed.</p>
          )}
        </section>
      ) : null}

      {catalogLoaded && categories.length ? (
        <section className="border-y border-[var(--sf-rule)] bg-[var(--sf-paper-2)]">
          <div className="sf-container sf-page-pad">
            <p className="sf-eyebrow mb-4">Catalog categories</p>
            <div className="divide-y divide-[var(--sf-rule)] border-y border-[var(--sf-rule)]">
              {categories.map(category => (
                <Link key={category.id} href={`/services#${category.id}`} className="flex items-center justify-between gap-4 py-4 text-[var(--sf-ink)]">
                  <span className="sf-display text-[var(--sf-text-xl)]">{category.name}</span>
                  <span className="flex items-center gap-2 text-[var(--sf-text-sm)] text-[var(--sf-ink-3)]">{category.services.length} listed <ArrowUpRight className="h-4 w-4" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {providerResult.status === "unavailable" ? (
        <section className="sf-container sf-page-pad-lg">
          <ProviderProfilesUnavailable retryHref="/" />
        </section>
      ) : providers.length ? (
        <section className="sf-container sf-page-pad-lg">
          <div className="mb-[var(--sf-space-lg)] max-w-2xl">
            <p className="sf-eyebrow">Public provider profiles</p>
            <h2 className="sf-display mt-3 text-[var(--sf-text-3xl)]">Provider preference</h2>
            <p className="sf-lead mt-4">Profiles show names and associated published services only. They do not represent credential, authorization, candidacy, outcome, or availability determinations.</p>
          </div>
          <div className="grid gap-[var(--sf-space-lg)] md:grid-cols-2 lg:grid-cols-3">{providers.map(provider => <ProviderCard key={provider.id} provider={provider} />)}</div>
        </section>
      ) : null}
    </div>
  )
}
