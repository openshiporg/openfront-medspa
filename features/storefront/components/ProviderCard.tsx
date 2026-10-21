import Link from "next/link"
import { User } from "lucide-react"
import type { Provider } from "../lib/data/providers"
import { getStorefrontImageSrc } from "../lib/images"

interface ProviderCardProps {
  provider: Provider
  variant?: "default" | "compact"
  showSpecializations?: boolean
  linked?: boolean
}

export function ProviderCard({
  provider,
  variant = "default",
  showSpecializations = true,
  linked = true,
}: ProviderCardProps) {
  const name = provider.user?.name || "Provider"
  const photoUrl = getStorefrontImageSrc(provider.photo)
  const details = provider.specializations.slice(0, 3).map(service => service.name).join(" · ")
  const content = variant === "compact" ? (
    <div className="flex items-center gap-4 p-[var(--sf-space-md)]">
      {photoUrl ? (
        <img src={photoUrl} alt={provider.photo?.altText || name} className="h-14 w-14 shrink-0 object-cover bg-[var(--sf-paper-3)]" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-[var(--sf-rule)] bg-[var(--sf-paper-3)]"><User className="h-6 w-6 text-[var(--sf-ink-3)]" /></div>
      )}
      <div className="min-w-0">
        <h3 className="sf-display truncate text-[var(--sf-text-lg)] text-[var(--sf-ink)]">{name}</h3>
        {showSpecializations && details ? <p className="mt-1 text-[var(--sf-text-xs)] text-[var(--sf-ink-3)]">{details}</p> : null}
      </div>
    </div>
  ) : (
    <>
      <div className="aspect-[4/5] overflow-hidden bg-[var(--sf-paper-3)]">
        {photoUrl ? <img src={photoUrl} alt={provider.photo?.altText || name} className="h-full w-full object-cover transition-transform duration-[var(--sf-dur-medium)] group-hover:scale-[1.02]" /> : <div className="flex h-full w-full items-center justify-center"><User className="h-16 w-16 text-[var(--sf-ink-3)]" /></div>}
      </div>
      <div className="p-[var(--sf-space-md)]">
        <h3 className="sf-display text-[var(--sf-text-xl)] text-[var(--sf-ink)]">{name}</h3>
        {showSpecializations && details ? <p className="mt-3 text-[var(--sf-text-xs)] text-[var(--sf-ink-3)]">{details}</p> : null}
      </div>
    </>
  )
  const className = variant === "compact" ? "sf-card group block" : "sf-card group block overflow-hidden"
  return linked ? <Link href={`/team/${provider.id}`} className={className}>{content}</Link> : <div className={className}>{content}</div>
}
