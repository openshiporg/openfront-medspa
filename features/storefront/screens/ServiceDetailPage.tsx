import Link from "next/link"
import { notFound } from "next/navigation"
import { getAllServices, getServiceById } from "../lib/data/services"
import { getProvidersForService } from "../lib/data/providers"
import { ServiceTimePicker } from "../components/ServiceTimePicker"
import { ProviderCard } from "../components/ProviderCard"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { ServiceCatalogUnavailable } from "../components/ServiceCatalogUnavailable"
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

  const allServices = await getAllServices()
  const pairs = allServices.status === "loaded" ? allServices.data.filter(other => other.id !== id && other.image).slice(0, 2) : []

  return (
    <div className="altair-detail">
      <div className="altair-detail-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc ?? undefined} alt={service.image?.altText || service.name} />
      </div>
      <div className="altair-detail-body">
        <div className="altair-detail-main">
          <p className="altair-eyebrow"><Link href="/services">Treatments</Link></p>
          <h1>{service.name}</h1>
          <p className="altair-detail-meta">{formatDuration(service.baseDuration)} &middot; {service.basePrice === 0 ? "complimentary" : formatPrice(service.basePrice)}</p>
          {service.description ? <p className="altair-detail-desc">{service.description}</p> : null}
          {reviews.length ? <a href="#reviews" className="altair-detail-rating"><Stars rating={averageRating(reviews)} /><span>{averageRating(reviews).toFixed(1)} &middot; {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span></a> : null}

          {pairs.length ? (
            <section aria-labelledby="pairs-heading" className="altair-pairs">
              <h2 id="pairs-heading">Pairs well with</h2>
              <div>{pairs.map(other => (
                <Link key={other.id} href={`/services/${encodeURIComponent(other.id)}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getStorefrontImageSrc(other.image) ?? undefined} alt={other.image?.altText || other.name} />
                  <span><strong>{other.name}</strong><em>{other.basePrice === 0 ? "complimentary" : formatPrice(other.basePrice)}</em></span>
                </Link>
              ))}</div>
            </section>
          ) : null}

          <section aria-labelledby="providers-heading" className="altair-detail-section">
            <h2 id="providers-heading">Performed by</h2>
            {providerResult.status === "unavailable" ? (
              <ProviderProfilesUnavailable retryHref={`/services/${encodeURIComponent(id)}`} />
            ) : providers.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} variant="compact" showSpecializations={false} />)}
              </div>
            ) : (
              <p role="status">No providers listed for this treatment</p>
            )}
          </section>

          {reviews.length ? (
            <section id="reviews" aria-labelledby="reviews-heading" className="altair-detail-section">
              <h2 id="reviews-heading">Reviews</h2>
              <ReviewList reviews={reviews} showTreatment={false} />
            </section>
          ) : null}
        </div>

        <aside className="altair-book-card">
          <h2>Choose a time</h2>
          {bookable ? (
            <ServiceTimePicker
              serviceId={id}
              serviceName={service.name}
              duration={service.baseDuration}
              total={service.basePrice === 0 ? "complimentary" : formatPrice(service.basePrice)}
              deposit={service.depositAmount ? formatPrice(service.depositAmount) : null}
              providers={providers.map(provider => ({ id: provider.id, name: provider.user?.name || "Provider", title: provider.title, workingDays: provider.workingDays }))}
            />
          ) : (
            <Link href="/contact" className="altair-book-button">Contact the practice</Link>
          )}
        </aside>
      </div>
    </div>
  )
}
