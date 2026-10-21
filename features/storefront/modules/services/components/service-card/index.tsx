import Link from "next/link"
import { Service } from "@/features/storefront/lib/data"

interface ServiceCardProps {
  service: Service
  showBookButton?: boolean
}

export default function ServiceCard({ service, showBookButton = true }: ServiceCardProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins ? `${hours} hr ${mins} min` : `${hours} hr`
  }

  const formatPrice = (price: number) => price === 0 ? "No payment collected" : `$${price.toFixed(0)}`

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
      <div className="flex-1">
        <h3 className="font-semibold">{service.name}</h3>
        {service.description && (
          <p className="text-sm text-muted-foreground">{service.description}</p>
        )}
        {service.requiresConsultation && (
          <span className="text-xs text-amber-600 mt-1 inline-block">
            Requires consultation
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 mt-2 md:mt-0">
        <span className="text-sm text-muted-foreground">
          {formatDuration(service.baseDuration)}
        </span>
        <span className="font-semibold">{formatPrice(service.basePrice)}</span>
        {showBookButton && (
          <Link
            href={`/book?service=${service.id}`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Request
          </Link>
        )}
      </div>
    </div>
  )
}
