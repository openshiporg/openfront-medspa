import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Service } from "../lib/data/services"
import { getStorefrontImageSrc } from "../lib/images"
import { formatDuration, formatPrice, pad2 } from "../lib/format"
import { Lens } from "./ui/primitives"

interface ServiceCardProps {
  service: Service
  showCategory?: boolean
  /** "feature": lens card for the home page. "row": treatment-ledger row. */
  variant?: "feature" | "row"
  index?: number
  linked?: boolean
}

export function ServiceCard({ service, showCategory = false, variant = "row", index, linked = true }: ServiceCardProps) {
  const imageSrc = getStorefrontImageSrc(service.image)

  if (variant === "feature") {
    const body = (
      <>
        <Lens src={imageSrc} alt={service.image?.altText || service.name} name={service.name} className="w-[min(100%,11rem)]" />
        <div className="grid gap-2">
          {showCategory && service.category ? <p className="sf-eyebrow">{service.category.name}</p> : null}
          <h3 className="sf-display text-[length:var(--sf-text-xl)] leading-tight">{service.name}</h3>
          <p className="sf-num flex flex-wrap items-baseline gap-x-4 text-[length:var(--sf-text-sm)]">
            <span>{formatPrice(service.basePrice)}</span>
            <span className="text-[var(--sf-ink-3)]">{formatDuration(service.baseDuration)}</span>
          </p>
        </div>
      </>
    )
    const className = "sf-card grid content-start justify-items-start gap-5 p-[var(--sf-space-md)]"
    return linked ? <Link href={`/services/${service.id}`} className={`${className} sf-card-link`}>{body}</Link> : <div className={className}>{body}</div>
  }

  const row = (
    <>
      <span className="sf-ledger-index">{index !== undefined ? pad2(index + 1) : "·"}</span>
      <span className="min-w-0">
        <span className="sf-ledger-name block">{service.name}</span>
        {showCategory && service.category ? <span className="sf-eyebrow mt-1 block">{service.category.name}</span> : null}
      </span>
      <span className="sf-ledger-figures">
        <span className="sf-muted">{formatDuration(service.baseDuration)}</span>
        <span>{formatPrice(service.basePrice)}</span>
        {linked ? <ArrowUpRight className="size-4 self-center text-[var(--sf-ink-3)]" aria-hidden="true" /> : null}
      </span>
    </>
  )

  return linked
    ? <Link href={`/services/${service.id}`} className="sf-ledger-row">{row}</Link>
    : <div className="sf-ledger-row">{row}</div>
}
