import { Metadata } from "next"
import { getServicesGroupedByCategory } from "../lib/data/services"
import { ServiceCard } from "../components/ServiceCard"
import { ServiceCatalogUnavailable } from "../components/ServiceCatalogUnavailable"
import { PageIntro } from "../components/ui/PageIntro"
import { PillLink, StateCard, Track } from "../components/ui/primitives"
import { storefrontMetadata } from "../lib/data/brand"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Treatments")
}

export async function ServicesPage() {
  const catalog = await getServicesGroupedByCategory()
  if (catalog.status === "unavailable") {
    return (
      <div className="sf-container sf-page-pad">
        <PageIntro eyebrow="Menu" title="Treatments" />
        <ServiceCatalogUnavailable retryHref="/services" />
      </div>
    )
  }
  const categories = catalog.data.filter((category) => category.services.length)
  const total = categories.reduce((sum, category) => sum + category.services.length, 0)

  return (
    <div className="sf-container sf-page-pad">
      <PageIntro eyebrow={total ? `Menu · ${total} ${total === 1 ? "treatment" : "treatments"}` : "Menu"} title="Treatments" />

      {categories.length === 0 ? (
        <StateCard title="No treatments listed yet" action={<Track><PillLink href="/contact">Contact the practice</PillLink></Track>} />
      ) : (
        <div className="grid gap-[var(--sf-space-xl)] lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-[var(--sf-space-2xl)]">
          <nav aria-label="Treatment categories" className="lg:sticky lg:top-28 lg:self-start">
            <p className="sf-eyebrow mb-3 hidden lg:block">Jump to</p>
            <ul className="sf-chip-row sf-jump-list">
              {categories.map((category) => (
                <li key={category.id}>
                  <a href={`#${category.id}`} className="sf-chip">
                    {category.name}<span className="sf-num text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">{category.services.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid min-w-0 gap-[var(--sf-space-xl)]">
            {categories.map((category) => (
              <section key={category.id} id={category.id} className="scroll-mt-24" aria-labelledby={`${category.id}-heading`}>
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 id={`${category.id}-heading`} className="sf-display text-[length:var(--sf-text-3xl)]">{category.name}</h2>
                  <span className="sf-eyebrow hidden sm:inline">Duration · Price</span>
                </div>
                <div className="sf-ledger">
                  {category.services.map((service, index) => <ServiceCard key={service.id} service={service} index={index} />)}
                </div>
              </section>
            ))}
            <Track><PillLink href="/book" variant="primary">Book an appointment</PillLink></Track>
          </div>
        </div>
      )}
    </div>
  )
}
