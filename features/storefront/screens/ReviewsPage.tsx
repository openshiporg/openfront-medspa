import type { Metadata } from "next"
import { storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Reviews")
}

export async function ReviewsPage() {
  return <div className="sf-page-pad"><div className="sf-container-narrow"><PageIntro title="Reviews not published" description="This storefront does not use review language as evidence of candidacy, credentials, authorization, expected results, or appointment availability." size="large" /></div></div>
}
