"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { StoreBrand } from "@/features/storefront/components/StoreBrand"

interface NavProps {
  brandName: string
  logoSvg: string
  logoHue: number
}

const navigation = [
  { name: "Treatments", href: "/services" },
  { name: "Providers", href: "/team" },
  { name: "Visit", href: "/contact" },
  { name: "Account", href: "/account" },
]

export default function Nav({ brandName, logoSvg, logoHue }: NavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname?.startsWith(href + "/"))
  const onBooking = pathname === "/book" || pathname?.startsWith("/booking/")

  return (
    <>
      <header className="sf-header">
        <div className="sf-container sf-header-row">
          <StoreBrand name={brandName} logoSvg={logoSvg} logoHue={logoHue} />

          <nav className="hidden lg:block" aria-label="Main">
            <div className="sf-track">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className="sf-pill sf-pill-quiet">
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <div className="sf-track hidden sm:inline-flex">
              <Link href="/book" className="sf-pill sf-pill-primary">Book</Link>
            </div>
            <div className="sf-track lg:hidden">
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="sf-pill sf-pill-icon"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="sf-mobile-menu"
              >
                {open ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {open ? (
          <div id="sf-mobile-menu" className="sf-sheet lg:hidden">
            <nav className="sf-container pb-6 pt-2" aria-label="Mobile">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={isActive(item.href) ? "page" : undefined} className="sf-sheet-link">
                  {item.name}
                  <ArrowRight className="size-4 text-[var(--sf-ink-3)]" aria-hidden="true" />
                </Link>
              ))}
              <div className="sf-track sf-track-block mt-6">
                <Link href="/book" onClick={() => setOpen(false)} className="sf-pill sf-pill-primary">Book an appointment</Link>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      {!onBooking ? (
        <div className="sf-mobile-bar" aria-label="Quick booking">
          <div className="sf-track sf-track-block">
            <Link href="/services" className="sf-pill">Treatments</Link>
            <Link href="/book" className="sf-pill sf-pill-primary">Book</Link>
          </div>
        </div>
      ) : null}
    </>
  )
}
