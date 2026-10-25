import type { Metadata } from "next"
import { storefrontMetadata } from "../lib/data/brand"
import { PageIntro } from "../components/ui/PageIntro"
import { PillLink, StateCard, Track } from "../components/ui/primitives"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("Gallery")
}

/** Clinical before/after imagery is never published on the storefront. */
export async function GalleryPage() {
  return (
    <div className="sf-container sf-page-pad">
      <PageIntro title="Gallery" />
      <StateCard title="No gallery published" action={<Track><PillLink href="/services">View treatments</PillLink></Track>} />
    </div>
  )
}
