import type { Metadata } from "next"
import { storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"
import { PillLink, StateCard, Track } from "../components/ui/primitives"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Gift cards")
}

export async function GiftCardsPage() {
  return (
    <div className="sf-container sf-page-pad">
      <PageIntro title="Gift cards" />
      <StateCard title="Gift cards aren't sold online" action={<Track><PillLink href="/contact">Contact the practice</PillLink></Track>} />
    </div>
  )
}
