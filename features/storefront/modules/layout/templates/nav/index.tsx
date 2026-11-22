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
  { name: "Team", href: "/team" },
  { name: "Gift cards", href: "/gift-cards" },
  { name: "Visit", href: "/contact" },
  { name: "Account", href: "/account" },
]

export default function Nav({ brandName, logoSvg, logoHue }: NavProps) {
  const pathname = usePathname()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === pathname
  const setOpen = (value: boolean) => setOpenPath(value ? pathname : null)

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname?.startsWith(href + "/"))
  const onBooking = pathname === "/book" || pathname?.startsWith("/booking/")
  // The account pages already carry their own Book action; a fixed bar there would be a third.
  const onAccount = pathname === "/appointments" || pathname === "/account" || pathname?.startsWith("/account/")

  // The open menu is the whole screen: the page behind must not scroll, and Escape closes it.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenPath(null) }
    window.addEventListener("keydown", onKey)
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey) }
  }, [open])

  return (
    <>
      <header data-menu-open={open ? "" : undefined} className={`sf-header ${!open && (pathname === "/" || pathname?.startsWith("/services/")) ? "altair-header-overlay" : ""}`}>
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
              <Link href="/book" className="sf-pill sf-pill-primary altair-header-book">Book an appointment</Link>
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
              {[{ name: "Home", href: "/" }, ...navigation].map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={pathname === item.href || isActive(item.href) ? "page" : undefined} className="sf-sheet-link">
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

      {!onBooking && !onAccount && !pathname?.startsWith("/services/") && pathname !== "/" ? (
        <div className="sf-mobile-bar" aria-label="Quick booking">
          <Link href="/book" className="altair-mobile-book">Book an appointment <ArrowRight aria-hidden="true" /></Link>
        </div>
      ) : null}
    </>
  )
}
