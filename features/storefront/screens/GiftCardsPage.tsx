import type { Metadata } from "next"
import { storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Gift cards")
}

export async function GiftCardsPage() {
  return <div className="sf-page-pad"><div className="sf-container-narrow"><PageIntro title="Gift cards not configured" description="No public gift-card offer, denomination, redemption term, expiry term, or purchase channel is configured for this storefront." size="large" /></div></div>
}
