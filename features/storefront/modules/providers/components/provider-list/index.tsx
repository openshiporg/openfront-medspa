import { Provider } from "@/features/storefront/lib/data"
import ProviderCard from "../provider-card"

interface ProviderListProps {
  providers: Provider[]
  compact?: boolean
}

export default function ProviderList({ providers, compact = false }: ProviderListProps) {
  if (providers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No providers available at this time.</p>
      </div>
    )
  }

  return (
    <div
      className={`grid gap-8 ${
        compact
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      }`}
    >
      {providers.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} compact={compact} />
      ))}
    </div>
  )
}
