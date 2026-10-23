import type { Metadata } from "next"
import { ProviderCard } from "../components/ProviderCard"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { getAllProviders } from "../lib/data/providers"
import { storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"
import { PillLink, StateCard, Track } from "../components/ui/primitives"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Providers")
}

export async function ProvidersPage() {
  const result = await getAllProviders()
  if (result.status === "unavailable") {
    return (
      <div className="sf-container sf-page-pad">
        <PageIntro eyebrow="Practice" title="Providers" />
        <ProviderProfilesUnavailable retryHref="/team" />
      </div>
    )
  }
  const providers = result.data

  return (
    <div className="sf-container sf-page-pad">
      <PageIntro eyebrow={providers.length ? `Practice · ${providers.length}` : "Practice"} title="Providers" />
      {providers.length === 0 ? (
        <StateCard title="No providers listed yet" action={<Track><PillLink href="/services">View treatments</PillLink></Track>} />
      ) : (
        <div className="grid grid-cols-2 gap-x-[var(--sf-space-sm)] gap-y-[var(--sf-space-xl)] md:grid-cols-3 md:gap-x-[var(--sf-space-lg)] lg:grid-cols-4">
          {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
        </div>
      )}
    </div>
  )
}
