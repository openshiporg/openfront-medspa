import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, User } from "lucide-react"
import { getProviderById } from "../lib/data/providers"
import { ProviderProfilesUnavailable } from "../components/ProviderProfilesUnavailable"
import { getStorefrontImageSrc } from "../lib/images"

interface ProviderDetailPageProps { params: Promise<{ id: string }> }

export async function ProviderDetailPage({ params }: ProviderDetailPageProps) {
  const { id } = await params
  const result = await getProviderById(id)
  if (result.status === "unavailable") {
    return (
      <div className="sf-container sf-page-pad">
        <ProviderProfilesUnavailable retryHref={`/team/${encodeURIComponent(id)}`} />
      </div>
    )
  }
  if (!result.data) notFound()
  const provider = result.data
  const name = provider.user?.name || "Provider"
  const photoUrl = getStorefrontImageSrc(provider.photo)

  return (
    <div className="sf-container sf-page-pad">
      <Link href="/team" className="sf-link mb-8 inline-flex items-center gap-2 text-[var(--sf-text-sm)]"><ArrowLeft className="h-4 w-4" />All providers</Link>
      <div className="grid gap-[var(--sf-space-xl)] lg:grid-cols-[220px_1fr]">
        {photoUrl ? <img src={photoUrl} alt={provider.photo?.altText || name} className="aspect-[4/5] w-full max-w-[220px] border border-[var(--sf-rule)] object-cover" /> : <div className="flex aspect-[4/5] w-full max-w-[220px] items-center justify-center border border-[var(--sf-rule)] bg-[var(--sf-paper-2)]"><User className="h-16 w-16 text-[var(--sf-ink-3)]" /></div>}
        <div>
          <p className="sf-eyebrow">Public provider profile</p>
          <h1 className="sf-display my-4 text-[var(--sf-text-display-s)]">{name}</h1>
          <p className="sf-lead">This profile is an identity and booking-preference reference only. It does not establish credentials, authorization, candidacy, expected results, or appointment availability.</p>
          {provider.specializations.length ? (
            <section className="mt-[var(--sf-space-lg)]">
              <h2 className="sf-display mb-4 text-[var(--sf-text-xl)]">Associated published services</h2>
              <ul className="divide-y divide-[var(--sf-rule)] border-y border-[var(--sf-rule)]">
                {provider.specializations.map(service => <li key={service.id}><Link href={`/services/${service.id}`} className="flex items-center justify-between py-3 text-[var(--sf-text-sm)]"><span>{service.name}</span><span className="text-[var(--sf-ink-3)]">View</span></Link></li>)}
              </ul>
              <Link href={`/book?provider=${provider.id}`} className="sf-btn sf-btn-primary mt-6">Request this provider</Link>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
