import localFont from "next/font/local"
import type { CSSProperties } from "react"
import { Metadata } from "next"
import Nav from "@/features/storefront/modules/layout/templates/nav"
import Footer from "@/features/storefront/modules/layout/templates/footer"
import { getStorefrontBrand } from "@/features/storefront/lib/data/brand"
import { PillLink, Track } from "@/features/storefront/components/ui/primitives"
import { brandHueColor } from "@/features/lib/store-logo"
import "../styles/storefront.css"

// One face for the whole storefront: EB Garamond (OFL, vendored with its licence), roman and italic.
const display = localFont({
  src: [
    { path: "../../../public/fonts/eb-garamond.woff2", style: "normal", weight: "400 800" },
    { path: "../../../public/fonts/eb-garamond-italic.woff2", style: "italic", weight: "400 800" },
  ],
  variable: "--font-sf-display",
  display: "swap",
})

type StorefrontStyle = CSSProperties & Record<`--sf-${string}`, string>

/** The practice's brand hue drives the logo tint and the single storefront accent. */
function theme(hue: number): StorefrontStyle {
  return {
    "--sf-accent": brandHueColor(hue, "76%", "0.09"),
    "--sf-accent-ink": brandHueColor(hue, "17%", "0.03"),
    "--sf-accent-soft": brandHueColor(hue, "28%", "0.05"),
    "--sf-accent-glow": brandHueColor(hue, "36%", "0.07"),
    "--sf-focus": brandHueColor(hue, "80%", "0.1"),
  }
}

const fonts = display.variable

export async function MainLayout({ children }: { children: React.ReactNode }) {
  const brand = await getStorefrontBrand()

  if (!brand.configured) {
    return (
      <main className={`storefront ${fonts} min-h-dvh`} style={theme(221)}>
        <div className="sf-container-narrow flex min-h-dvh items-center justify-center py-16">
          <section className="grid w-full justify-items-center gap-5 text-center" aria-labelledby="storefront-status">
            <span className="sf-lens sf-dew block w-28" aria-hidden="true" />
            <h1 id="storefront-status" className="sf-display text-[length:var(--sf-text-display-s)]">Coming soon</h1>
          </section>
        </div>
      </main>
    )
  }

  return (
    <div className={`storefront ${fonts} flex min-h-dvh flex-col`} style={theme(brand.logoHue)}>
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
      <h1 className="sf-display text-[length:var(--sf-text-display-s)]">Page not found</h1>
      <Track>
        <PillLink href="/">Home</PillLink>
        <PillLink href="/services" variant="primary">Treatments</PillLink>
      </Track>
    </div>
  )
}
