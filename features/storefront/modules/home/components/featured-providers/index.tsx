import type { Provider } from "@/features/storefront/lib/data/providers"
import { ProviderCard } from "@/features/storefront/components/ProviderCard"

export default function FeaturedProviders({ providers }: { providers: Provider[] }) {
  if (!providers.length) return null
  return <section><h2 className="sf-display mb-6 text-[var(--sf-text-2xl)]">Public provider profiles</h2><p className="mb-6 text-sm text-[var(--sf-ink-2)]">Profiles do not establish credentials, authorization, results, or appointment availability.</p><div className="grid gap-6 md:grid-cols-3">{providers.map(provider => <ProviderCard key={provider.id} provider={provider} />)}</div></section>
}
