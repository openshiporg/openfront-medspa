import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

interface CategoryCardProps {
  category: {
    id: string
    name: string
    description: string | null
    services?: { id: string }[]
  }
  href?: string
}

export function CategoryCard({ category, href }: CategoryCardProps) {
  const serviceCount = category.services?.length || 0
  const linkHref = href || `/services#${category.id}`

  return (
    <Link href={linkHref} className="sf-card group block p-[var(--sf-space-md)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="sf-display text-[var(--sf-text-xl)] text-[var(--sf-ink)]">{category.name}</h3>
          {category.description ? (
            <p className="mt-2 text-[var(--sf-text-sm)] text-[var(--sf-ink-2)] line-clamp-2">
              {category.description}
            </p>
          ) : null}
          <p className="mt-3 text-[var(--sf-text-xs)] text-[var(--sf-ink-3)]">
            {serviceCount} {serviceCount === 1 ? "service" : "services"}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--sf-accent)] opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}
