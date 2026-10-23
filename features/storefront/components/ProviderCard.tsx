import Link from "next/link"
import type { Provider } from "../lib/data/providers"
import { getStorefrontImageSrc } from "../lib/images"
import { Capsule, Lens } from "./ui/primitives"

interface ProviderCardProps {
  provider: Provider
  variant?: "default" | "compact"
  showSpecializations?: boolean
  linked?: boolean
}

export function ProviderCard({ provider, variant = "default", showSpecializations = true, linked = true }: ProviderCardProps) {
  const name = provider.user?.name || "Provider"
  const photoUrl = getStorefrontImageSrc(provider.photo)
  const treatments = provider.specializations.slice(0, 3).map((service) => service.name)
  const more = provider.specializations.length - treatments.length

  if (variant === "compact") {
    const body = (
      <>
        <Lens src={photoUrl} alt={provider.photo?.altText || name} name={name} className="w-14" />
        <span className="min-w-0">
          <span className="sf-display block truncate text-[length:var(--sf-text-lg)]">{name}</span>
          {showSpecializations && treatments.length ? <span className="mt-0.5 block truncate text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">{treatments.join(" · ")}</span> : null}
        </span>
      </>
    )
    const className = "sf-card flex items-center gap-4 p-3 pr-5"
    return linked ? <Link href={`/team/${provider.id}`} className={`${className} sf-card-link`}>{body}</Link> : <div className={className}>{body}</div>
  }

  const body = (
    <>
      <Capsule src={photoUrl} alt={provider.photo?.altText || name} name={name} className="w-full" />
      <div className="mt-5 grid gap-2 text-center">
        <h3 className="sf-display text-[length:var(--sf-text-2xl)] leading-tight">{name}</h3>
        {showSpecializations && treatments.length ? (
          <p className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">
            {treatments.join(" · ")}{more > 0 ? ` +${more}` : ""}
          </p>
        ) : null}
      </div>
    </>
  )
  return linked
    ? <Link href={`/team/${provider.id}`} className="sf-card-link block">{body}</Link>
    : <div>{body}</div>
}
