import type { Provider } from "@/features/storefront/lib/data/providers"
import { ProviderCard as PublicProviderCard } from "@/features/storefront/components/ProviderCard"

export default function ProviderCard({ provider, compact = false }: { provider: Provider; showBookButton?: boolean; compact?: boolean }) {
  return <PublicProviderCard provider={provider} variant={compact ? "compact" : "default"} />
}
