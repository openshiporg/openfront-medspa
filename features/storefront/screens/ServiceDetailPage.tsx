import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getServiceById } from "../lib/data/services"
import { getProvidersForService } from "../lib/data/providers"
import { ProviderCard } from "../components/ProviderCard"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { ServiceCatalogUnavailable } from "../components/ServiceCatalogUnavailable"
import { Lens, PillLink, StateCard, Track } from "../components/ui/primitives"
import { getStorefrontImageSrc } from "../lib/images"
import { formatDuration, formatPrice } from "../lib/format"
import { getStorefrontReviews } from "../lib/data/storefrontReviews"
import { averageRating, ReviewList, Stars } from "../components/ReviewList"

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
  const [providerResult, reviews] = await Promise.all([getProvidersForService(id), getStorefrontReviews({ serviceId: id, take: 6 })])
  const providers = providerResult.status === "loaded" ? providerResult.data : []
  const imageSrc = getStorefrontImageSrc(service.image)
  const bookable = providerResult.status === "loaded" && providers.length > 0

  return (
    <div className="sf-container sf-page-pad">
      <Track><Link href="/services" className="sf-pill sf-pill-sm"><ArrowLeft />Treatments</Link></Track>

      <div className="mt-[var(--sf-space-lg)] grid gap-[var(--sf-space-xl)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <div className="grid min-w-0 content-start gap-[var(--sf-space-lg)]">
          <header className="grid gap-5">
            <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{service.name}</h1>
            {service.category ? <p className="sf-eyebrow">{service.category.name}</p> : null}
            {reviews.length ? <a href="#reviews" className="flex items-center gap-2 text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)] no-underline"><Stars rating={averageRating(reviews)} /><span className="sf-num">{averageRating(reviews).toFixed(1)} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span></a> : null}
          </header>

          <Lens src={imageSrc} alt={service.image?.altText || service.name} name={service.name} className="w-[min(100%,22rem)]" />

          <section aria-labelledby="providers-heading" className="grid gap-4">
            <h2 id="providers-heading" className="sf-eyebrow">Performed by</h2>
            {providerResult.status === "unavailable" ? (
              <ProviderProfilesUnavailable retryHref={`/services/${encodeURIComponent(id)}`} />
            ) : providers.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} variant="compact" showSpecializations={false} />)}
              </div>
            ) : (
              <p role="status" className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">No providers listed for this treatment</p>
            )}
          </section>

          {reviews.length ? (
            <section id="reviews" aria-labelledby="reviews-heading" className="grid scroll-mt-24 gap-4">
              <h2 id="reviews-heading" className="sf-eyebrow">Reviews</h2>
              <ReviewList reviews={reviews} showTreatment={false} />
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="sf-card grid gap-5 p-[var(--sf-space-md)]">
            <dl>
              <div className="sf-ticket-row"><dt>Price</dt><dd className="sf-num">{formatPrice(service.basePrice)}</dd></div>
              <div className="sf-ticket-row"><dt>Duration</dt><dd className="sf-num">{formatDuration(service.baseDuration)}</dd></div>
              {service.category ? <div className="sf-ticket-row"><dt>Category</dt><dd>{service.category.name}</dd></div> : null}
            </dl>
            {bookable ? (
              <Track block><PillLink href={`/book?service=${encodeURIComponent(id)}`} variant="primary">Book this treatment</PillLink></Track>
            ) : (
              <StateCard title={providerResult.status === "unavailable" ? "Booking unavailable" : "Not bookable online"} action={<Track><PillLink href="/contact" size="sm">Contact the practice</PillLink></Track>} />
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
