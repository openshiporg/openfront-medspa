import type { Service } from "@/features/storefront/lib/data/services"
import { ServiceCard } from "@/features/storefront/components/ServiceCard"

export default function FeaturedServices({ services }: { services: Service[] }) {
  if (!services.length) return null
  return <section><h2 className="sf-display mb-6 text-[var(--sf-text-2xl)]">Published services</h2><div className="grid gap-6 md:grid-cols-2">{services.map(service => <ServiceCard key={service.id} service={service} />)}</div></section>
}
