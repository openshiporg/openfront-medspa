import type { Metadata } from "next"
import { storefrontMetadata } from "../lib/data/brand"
import { getStorefrontReviews } from "../lib/data/storefrontReviews"
import { PageIntro } from "../components/ui/PageIntro"
import { PillLink, StateCard, Track } from "../components/ui/primitives"
import { averageRating, ReviewList, Stars } from "../components/ReviewList"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Reviews")
}

export async function ReviewsPage() {
  const reviews = await getStorefrontReviews({ take: 60 })
  const average = averageRating(reviews)
  return (
    <div className="sf-container sf-page-pad">
      <PageIntro eyebrow={reviews.length ? `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}` : undefined} title="Reviews" status={reviews.length ? <span className="flex items-center gap-2"><Stars rating={average} size="md" /><span className="sf-num text-[length:var(--sf-text-sm)]">{average.toFixed(1)}</span></span> : undefined} />
      {reviews.length ? (
        <div className="grid gap-[var(--sf-space-lg)]">
          <ReviewList reviews={reviews} />
          <Track><PillLink href="/book" variant="primary">Book an appointment</PillLink></Track>
        </div>
      ) : <StateCard title="No reviews yet" action={<Track><PillLink href="/team">Meet the providers</PillLink></Track>} />}
    </div>
  )
}
