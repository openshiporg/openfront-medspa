import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import { getProviderById } from "../lib/data/providers"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { getStorefrontImageSrc } from "../lib/images"
import { Capsule, PillLink, Track } from "../components/ui/primitives"
import { pad2 } from "../lib/format"
import { getStorefrontReviews } from "../lib/data/storefrontReviews"
import { ReviewList } from "../components/ReviewList"

interface ProviderDetailPageProps { params: Promise<{ id: string }> }

export async function ProviderDetailPage({ params }: ProviderDetailPageProps) {
  const { id } = await params
  const result = await getProviderById(id)
  if (result.status === "unavailable") {
    return (
      <div className="sf-container sf-page-pad">
        <ProviderProfilesUnavailable retryHref={`/team/${encodeURIComponent(id)}`} />
      </div>
    )
  }
  if (!result.data) notFound()
  const provider = result.data
  const name = provider.user?.name || "Provider"
  const photoUrl = getStorefrontImageSrc(provider.photo)
  const reviews = await getStorefrontReviews({ providerId: provider.id, take: 6 })

  return (
    <div className="sf-container sf-page-pad">
      <Track><Link href="/team" className="sf-pill sf-pill-sm"><ArrowLeft />Providers</Link></Track>

      <div className="mt-[var(--sf-space-lg)] grid gap-[var(--sf-space-xl)] md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-[var(--sf-space-2xl)]">
        <Capsule src={photoUrl} alt={provider.photo?.altText || name} name={name} className="w-[min(100%,16rem)] md:w-full" />

        <div className="grid min-w-0 content-start gap-[var(--sf-space-lg)]">
          <header className="grid gap-4">
            <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{name}</h1>
          </header>

          {provider.specializations.length ? (
            <section aria-labelledby="treatments-heading">
              <h2 id="treatments-heading" className="sf-eyebrow mb-3">Treatments</h2>
              <div className="sf-ledger">
                {provider.specializations.map((service, index) => (
                  <Link key={service.id} href={`/services/${service.id}`} className="sf-ledger-row">
                    <span className="sf-ledger-index">{pad2(index + 1)}</span>
                    <span className="sf-ledger-name">{service.name}</span>
                    <span className="sf-ledger-figures"><ArrowUpRight className="size-4 text-[var(--sf-ink-3)]" aria-hidden="true" /></span>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <p role="status" className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">No treatments listed</p>
          )}

          {reviews.length ? (
            <section aria-labelledby="provider-reviews" className="grid gap-3">
              <h2 id="provider-reviews" className="sf-eyebrow">Reviews</h2>
              <ReviewList reviews={reviews} />
            </section>
          ) : null}

          {provider.specializations.length ? (
            <Track><PillLink href={`/book?provider=${provider.id}`} variant="primary">Book with {name.split(" ")[0]}</PillLink></Track>
          ) : null}
        </div>
      </div>
    </div>
  )
}
