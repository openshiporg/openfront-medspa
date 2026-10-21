import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar, Clock } from "lucide-react"
import { getServiceById } from "../lib/data/services"
import { getProvidersForService } from "../lib/data/providers"
import { ProviderCard } from "../components/ProviderCard"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { ServiceCatalogUnavailable } from "../components/ServiceCatalogUnavailable"
import { getStorefrontImageSrc } from "../lib/images"

interface ServiceDetailPageProps { params: Promise<{ id: string }> }

export async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params
  const catalog = await getServiceById(id)
  if (catalog.status === "unavailable") {
    return (
      <div className="sf-container sf-page-pad">
        <ServiceCatalogUnavailable retryHref={`/services/${encodeURIComponent(id)}`} />
      </div>
    )
  }
  if (!catalog.data) notFound()
  const service = catalog.data
  const providerResult = await getProvidersForService(id)
  const providers = providerResult.status === "loaded" ? providerResult.data : []
  const imageSrc = getStorefrontImageSrc(service.image)

  return (
    <div>
      <div className="border-b border-[var(--sf-rule)]"><div className="sf-container py-3"><Link href="/services" className="sf-link inline-flex items-center gap-2 text-[var(--sf-text-sm)]"><ArrowLeft className="h-4 w-4" />Published services</Link></div></div>
      <div className="sf-container sf-page-pad">
        <div className="grid gap-[var(--sf-space-xl)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.75fr)]">
          <div className="min-w-0 space-y-[var(--sf-space-lg)]">
            {imageSrc ? <div className="aspect-[16/10] overflow-hidden border border-[var(--sf-rule)]"><img src={imageSrc} alt={service.image?.altText || service.name} className="h-full w-full object-cover" /></div> : null}
            <header>
              {service.category ? <p className="mb-2 text-[var(--sf-text-xs)] text-[var(--sf-ink-3)]">{service.category.name}</p> : null}
              <h1 className="sf-display mb-4 text-[var(--sf-text-display-s)]">{service.name}</h1>
              <div className="flex flex-wrap gap-6 text-[var(--sf-text-sm)]"><span className="inline-flex items-center gap-2 text-[var(--sf-ink-2)]"><Clock className="h-4 w-4" />{service.baseDuration} minutes</span><span className="font-medium">{service.basePrice === 0 ? "No payment collected" : `$${service.basePrice}`}</span></div>
              <p className="sf-lead mt-6">These details come from the active public catalog. They do not establish candidacy, authorization, expected results, or appointment availability.</p>
            </header>
            {providerResult.status === "unavailable" ? (
              <ProviderProfilesUnavailable retryHref={`/services/${encodeURIComponent(id)}`} />
            ) : providers.length ? (
              <section><h2 className="sf-display mb-4 text-[var(--sf-text-xl)]">Associated public provider profiles</h2><div className="grid gap-3 sm:grid-cols-2">{providers.map(provider => <ProviderCard key={provider.id} provider={provider} variant="compact" showSpecializations={false} />)}</div></section>
            ) : (
              <p role="status" className="border border-dashed border-[var(--sf-rule)] p-4 text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">No public provider profiles are listed for this service. This does not determine credentials, authorization, or appointment availability.</p>
            )}
          </div>
          <aside className="lg:sticky lg:top-28 lg:self-start"><div className="sf-card p-[var(--sf-space-md)]"><h2 className="sf-display mb-6 text-[var(--sf-text-xl)]">Appointment request</h2><dl className="mb-6 space-y-3 text-[var(--sf-text-sm)]"><div className="flex justify-between border-b border-[var(--sf-rule)] pb-3"><dt className="text-[var(--sf-ink-3)]">Published duration</dt><dd>{service.baseDuration} min</dd></div><div className="flex justify-between"><dt className="text-[var(--sf-ink-3)]">Payment</dt><dd>{service.basePrice === 0 ? "Not required" : `$${service.basePrice}`}</dd></div></dl>{providerResult.status === "loaded" && providers.length > 0 ? <Link href={`/book?service=${encodeURIComponent(id)}`} className="sf-btn sf-btn-primary w-full"><Calendar className="h-4 w-4" />Request appointment</Link> : <p role="status" className="text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">{providerResult.status === "unavailable" ? "Appointment requests are not offered from this detail until profile data can be confirmed." : "No public profile is listed for this service, so no provider preference can be selected here."}</p>}</div></aside>
        </div>
      </div>
    </div>
  )
}
