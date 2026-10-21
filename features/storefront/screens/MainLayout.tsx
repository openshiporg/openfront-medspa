import localFont from "next/font/local"
import type { CSSProperties } from "react"
import { Metadata } from "next"
import Link from "next/link"
import Nav from "@/features/storefront/modules/layout/templates/nav"
import Footer from "@/features/storefront/modules/layout/templates/footer"
import { getStorefrontBrand } from "@/features/storefront/lib/data/brand"
import "../styles/storefront.css"

const display = localFont({ src: "../../../public/fonts/cormorant-garamond.woff2", variable: "--font-sf-display", display: "swap" })
const body = localFont({ src: "../../../public/fonts/dm-sans.woff2", variable: "--font-sf-body", display: "swap" })

type StorefrontStyle = CSSProperties & Record<`--sf-${string}`, string>

function theme(hue: number): StorefrontStyle {
  return {
    "--sf-accent": `oklch(41% 0.095 ${hue})`,
    "--sf-accent-soft": `oklch(94% 0.028 ${hue})`,
    "--sf-focus": `oklch(35% 0.09 ${hue})`,
  }
}

export async function MainLayout({ children }: { children: React.ReactNode }) {
  const brand = await getStorefrontBrand()

  if (!brand.configured) {
    return (
      <main className={`storefront ${display.variable} ${body.variable} min-h-screen`} style={theme(220)}>
        <div className="sf-container-narrow flex min-h-screen items-center justify-center py-16">
          <section className="sf-card w-full p-[var(--sf-space-lg)] text-center" aria-labelledby="storefront-status">
            <p className="sf-eyebrow mb-3">Storefront</p>
            <h1 id="storefront-status" className="sf-display text-[var(--sf-text-2xl)]">Not configured</h1>
            <p className="sf-lead mx-auto mt-4">Public identity, location, catalog, and theme are hidden until an authorized practice manager publishes complete settings.</p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <div
      className={`storefront ${display.variable} ${body.variable} min-h-screen flex flex-col`}
      style={theme(brand.logoHue)}
    >
      <Nav brandName={brand.name} logoSvg={brand.logoSvg} logoHue={brand.logoHue} />
      <main className="flex-1 min-w-0">{children}</main>
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
    <div className="sf-container sf-page-pad-lg flex flex-col items-center justify-center text-center min-h-[60vh]">
      <p className="sf-eyebrow mb-4">404</p>
      <h1 className="sf-display text-[var(--sf-text-display-s)] mb-4">This page isn&apos;t here.</h1>
      <p className="sf-lead mx-auto mb-8">The route may have moved, or the link is out of date.</p>
      <Link href="/" className="sf-btn sf-btn-primary">Return home</Link>
    </div>
  )
}
