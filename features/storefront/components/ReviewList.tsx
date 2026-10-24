import { Star } from "lucide-react"
import type { StorefrontReview } from "../lib/data/storefrontReviews"

export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "size-5" : "size-4"
  return (
    <span className="inline-flex items-center gap-0.5 text-[var(--sf-accent)]" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => <Star key={value} className={cls} fill={value <= Math.round(rating) ? "currentColor" : "none"} aria-hidden="true" />)}
    </span>
  )
}

export function averageRating(reviews: StorefrontReview[]) {
  return reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
}

/** Approved reviews as quiet cards: stars, words, first name and initial, what they had done. */
export function ReviewList({ reviews, showTreatment = true }: { reviews: StorefrontReview[]; showTreatment?: boolean }) {
  return (
    <ul className="grid gap-[var(--sf-space-sm)] md:grid-cols-2">
      {reviews.map((review) => (
        <li key={review.id} className="sf-card grid content-start gap-3 p-[var(--sf-space-md)]">
          <Stars rating={review.rating} />
          {review.comment ? <p className="sf-display text-[length:var(--sf-text-lg)] leading-snug">&ldquo;{review.comment}&rdquo;</p> : null}
          <p className="text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">
            {review.author}
            {showTreatment && review.serviceName ? ` · ${review.serviceName}` : ""}
            {review.providerName ? ` · with ${review.providerName}` : ""}
          </p>
        </li>
      ))}
    </ul>
  )
}
