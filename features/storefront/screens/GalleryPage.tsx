import type { Metadata } from "next"
import { storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Gallery")
}

export async function GalleryPage() {
  return <div className="sf-page-pad"><div className="sf-container-narrow"><PageIntro title="Gallery not published" description="This storefront does not publish portfolio or clinical imagery as service, candidacy, authorization, or outcome evidence." size="large" /></div></div>
}
