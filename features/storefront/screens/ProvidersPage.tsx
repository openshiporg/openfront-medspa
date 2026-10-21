import type { Metadata } from "next"
import Link from "next/link"
import { Search } from "lucide-react"
import { ProviderCard } from "../components/ProviderCard"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { getAllProviders } from "../lib/data/providers"
import { storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Providers")
}

export async function ProvidersPage() {
  const result = await getAllProviders()
  if (result.status === "unavailable") {
    return (
      <div className="sf-page-pad">
        <div className="sf-container">
          <PageIntro
            title="Public provider profiles"
            description="Profiles identify booking preferences and associated published services only. They do not establish credentials, authorization, candidacy, expected results, or appointment availability."
            size="large"
          />
          <ProviderProfilesUnavailable retryHref="/team" />
        </div>
      </div>
    )
  }
  const providers = result.data

  return (
    <div className="sf-page-pad">
      <div className="sf-container">
        <PageIntro
          title="Public provider profiles"
          description="Profiles identify booking preferences and associated published services only. They do not establish credentials, authorization, candidacy, expected results, or appointment availability."
          size="large"
        />
        {providers.length === 0 ? (
          <div className="border border-[var(--sf-rule)] py-[var(--sf-space-2xl)] text-center">
            <Search className="mx-auto mb-4 h-8 w-8 text-[var(--sf-ink-3)]" />
            <h2 className="sf-display mb-2 text-[var(--sf-text-2xl)]">No public profiles</h2>
            <p className="sf-lead mx-auto mb-6">No provider profile is currently published.</p>
            <Link href="/services" className="sf-btn sf-btn-primary">Browse services</Link>
          </div>
        ) : (
          <div className="grid gap-[var(--sf-space-lg)] md:grid-cols-2 lg:grid-cols-3">
            {providers.map(provider => <ProviderCard key={provider.id} provider={provider} />)}
          </div>
        )}
      </div>
    </div>
  )
}
