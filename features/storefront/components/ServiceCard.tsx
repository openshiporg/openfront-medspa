import Link from "next/link"
import { Clock, ArrowUpRight } from "lucide-react"
import { Service } from "../lib/data/services"
import { getStorefrontImageSrc } from "../lib/images"

interface ServiceCardProps {
  service: Service
  showCategory?: boolean
  variant?: "default" | "compact" | "list"
  linked?: boolean
}

export function ServiceCard({
  service,
  showCategory = false,
  variant = "default",
  linked = true,
}: ServiceCardProps) {
  const price = service.basePrice
  const priceLabel = price === 0 ? "No payment collected" : `$${price}`
  const duration = service.baseDuration
  const imageSrc = getStorefrontImageSrc(service.image)

  if (variant === "list") {
    const content = (
      <div className="flex items-start justify-between gap-4 py-[var(--sf-space-sm)]">
        <div className="min-w-0 flex-1">
          {showCategory && service.category ? (
            <p className="text-[var(--sf-text-xs)] text-[var(--sf-ink-3)] mb-1">{service.category.name}</p>
          ) : null}
          <h3 className="sf-display text-[var(--sf-text-lg)] text-[var(--sf-ink)]">{service.name}</h3>
        </div>
        <div className="shrink-0 text-right text-[var(--sf-text-sm)]">
          <p className="font-medium text-[var(--sf-ink)]">{priceLabel}</p>
          <p className="text-[var(--sf-ink-3)]">{duration} min</p>
        </div>
      </div>
    )

    return linked ? (
      <Link href={`/services/${service.id}`} className="block group border-b border-[var(--sf-rule)] last:border-0 hover:bg-[var(--sf-paper-2)] -mx-2 px-2 transition-colors">
        {content}
      </Link>
    ) : (
      <div className="border-b border-[var(--sf-rule)] last:border-0">{content}</div>
    )
  }

  if (variant === "compact") {
    const content = (
      <div className="flex items-start justify-between gap-4 p-[var(--sf-space-md)]">
        <div className="min-w-0 flex-1">
          {showCategory && service.category ? (
            <p className="text-[var(--sf-text-xs)] text-[var(--sf-ink-3)] mb-1">{service.category.name}</p>
          ) : null}
          <h3 className="sf-display text-[var(--sf-text-xl)] text-[var(--sf-ink)]">{service.name}</h3>
          <div className="mt-4 flex items-center gap-4 text-[var(--sf-text-sm)] text-[var(--sf-ink-2)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {duration} min
            </span>
            <span className="font-medium text-[var(--sf-ink)]">{priceLabel}</span>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--sf-accent)] mt-1 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
    )

    return linked ? (
      <Link href={`/services/${service.id}`} className="sf-card group block">
        {content}
      </Link>
    ) : (
      <div className="sf-card group block w-full text-left">{content}</div>
    )
  }

  const content = (
    <>
      {imageSrc ? (
        <div className="aspect-[4/3] overflow-hidden bg-[var(--sf-paper-3)]">
          <img
            src={imageSrc}
            alt={service.image?.altText || service.name}
            className="h-full w-full object-cover transition-transform duration-[var(--sf-dur-medium)] group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div
          className="aspect-[4/3]"
          style={{
            background:
              "linear-gradient(160deg, var(--sf-paper-3), color-mix(in oklch, var(--sf-accent-soft) 60%, var(--sf-paper)))",
          }}
        />
      )}
      <div className="p-[var(--sf-space-md)]">
        {showCategory && service.category ? (
          <p className="text-[var(--sf-text-xs)] text-[var(--sf-ink-3)] mb-2">{service.category.name}</p>
        ) : null}
        <h3 className="sf-display text-[var(--sf-text-xl)] text-[var(--sf-ink)]">{service.name}</h3>
        <div className="mt-4 pt-4 border-t border-[var(--sf-rule)] flex items-center justify-between text-[var(--sf-text-sm)]">
          <span className="text-[var(--sf-ink-2)]">{duration} min</span>
          <span className="font-medium text-[var(--sf-ink)]">{priceLabel}</span>
        </div>
      </div>
    </>
  )

  return linked ? (
    <Link href={`/services/${service.id}`} className="sf-card group block overflow-hidden">
      {content}
    </Link>
  ) : (
    <div className="sf-card group block overflow-hidden">{content}</div>
  )
}
