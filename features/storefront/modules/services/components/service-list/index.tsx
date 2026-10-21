import { ServiceCategory } from "@/features/storefront/lib/data"
import ServiceCard from "../service-card"

interface ServiceListProps {
  categories: ServiceCategory[]
}

export default function ServiceList({ categories }: ServiceListProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No active public services are listed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-16">
      {categories.map((category) => (
        <section key={category.id} id={category.name.toLowerCase().replace(/\s+/g, "-")}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold">{category.name}</h2>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </div>

          <div className="grid gap-4">
            {category.services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
