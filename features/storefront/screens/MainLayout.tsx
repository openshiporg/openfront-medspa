import localFont from "next/font/local"
import type { CSSProperties } from "react"
import { Metadata } from "next"
import Nav from "@/features/storefront/modules/layout/templates/nav"
import Footer from "@/features/storefront/modules/layout/templates/footer"
import { getStorefrontBrand } from "@/features/storefront/lib/data/brand"
import { PillLink, Track } from "@/features/storefront/components/ui/primitives"
import "../styles/storefront.css"

const display = localFont({ src: "../../../public/fonts/cormorant-garamond.woff2", variable: "--font-sf-display", display: "swap" })
const body = localFont({ src: "../../../public/fonts/geist.woff2", variable: "--font-sf-body", display: "swap" })
const mono = localFont({ src: "../../../public/fonts/geist-mono.woff2", variable: "--font-sf-mono", display: "swap" })

type StorefrontStyle = CSSProperties & Record<`--sf-${string}`, string>

/** The practice's logo hue drives the single storefront accent. */
function theme(hue: number): StorefrontStyle {
  return {
    "--sf-accent": `oklch(47% 0.085 ${hue})`,
    "--sf-accent-ink": `oklch(98.5% 0.006 ${hue})`,
    "--sf-accent-soft": `oklch(95% 0.024 ${hue})`,
    "--sf-accent-glow": `oklch(87% 0.06 ${hue})`,
    "--sf-focus": `oklch(42% 0.09 ${hue})`,
  }
}

const fonts = `${display.variable} ${body.variable} ${mono.variable}`

export async function MainLayout({ children }: { children: React.ReactNode }) {
  const brand = await getStorefrontBrand()

  if (!brand.configured) {
    return (
      <main className={`storefront ${fonts} min-h-screen`} style={theme(300)}>
        <div className="sf-container-narrow flex min-h-screen items-center justify-center py-16">
          <section className="grid w-full justify-items-center gap-5 text-center" aria-labelledby="storefront-status">
            <span className="sf-lens sf-dew block w-28" aria-hidden="true" />
            <span className="sf-status"><span className="sf-dot" aria-hidden="true" />Storefront</span>
            <h1 id="storefront-status" className="sf-display text-[length:var(--sf-text-display-s)]">Not published yet</h1>
            <Track><PillLink href="/dashboard">Open dashboard</PillLink></Track>
          </section>
        </div>
      </main>
    )
  }

  return (
    <div className={`storefront ${fonts} flex min-h-screen flex-col`} style={theme(brand.logoHue)}>
      <Nav brandName={brand.name} logoSvg={brand.logoSvg} logoHue={brand.logoHue} />
      <main className="min-w-0 flex-1">{children}</main>
      <Footer brand={brand} />
    </div>
  )
}

export const MainNotFoundMetadata: Metadata = {
  title: "404",
  description: "Page not found",
}

export function MainNotFound() {
  return (
    <div className="sf-container sf-page-pad flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <span className="sf-lens sf-dew block w-24" aria-hidden="true" />
      <p className="sf-eyebrow">404</p>
      <h1 className="sf-display text-[length:var(--sf-text-display-s)]">Page not found</h1>
      <Track>
        <PillLink href="/">Home</PillLink>
        <PillLink href="/services" variant="primary">Treatments</PillLink>
      </Track>
    </div>
  )
}
