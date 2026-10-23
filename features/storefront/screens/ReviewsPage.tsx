import type { Metadata } from "next"
import { storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"
import { PillLink, StateCard, Track } from "../components/ui/primitives"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Reviews")
}

export async function ReviewsPage() {
  return (
    <div className="sf-container sf-page-pad">
      <PageIntro eyebrow="Reviews" title="Reviews" />
      <StateCard title="No reviews published" action={<Track><PillLink href="/team">Meet the providers</PillLink></Track>} />
    </div>
  )
}
