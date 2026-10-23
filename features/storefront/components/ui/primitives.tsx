import Link from "next/link"
import type { ReactNode } from "react"

/*
 * Storefront kit. Buttons are raised pills sitting in a recessed track,
 * status dots sit on the title line, and every read has a designed state.
 */

export type Tone = "ok" | "wait" | "stop" | "off" | "accent"

export function Dot({ tone = "off" }: { tone?: Tone }) {
  return <span aria-hidden="true" className="sf-dot" data-tone={tone} />
}

export function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className="sf-status"><Dot tone={tone} />{children}</span>
}

export function Track({ children, block = false, scroll = false, label, className = "" }: { children: ReactNode; block?: boolean; scroll?: boolean; label?: string; className?: string }) {
  return (
    <div role={label ? "group" : undefined} aria-label={label} className={`sf-track ${block ? "sf-track-block" : ""} ${scroll ? "sf-track-scroll" : ""} ${className}`}>
      {children}
    </div>
  )
}

type PillVariant = "raised" | "primary" | "quiet"

export function pill(variant: PillVariant = "raised", size: "md" | "sm" = "md") {
  return `sf-pill ${variant === "primary" ? "sf-pill-primary" : variant === "quiet" ? "sf-pill-quiet" : ""} ${size === "sm" ? "sf-pill-sm" : ""}`
}

export function PillLink({ href, children, variant = "raised", size }: { href: string; children: ReactNode; variant?: PillVariant; size?: "md" | "sm" }) {
  return <Link href={href} className={pill(variant, size)}>{children}</Link>
}

/** One or more actions in a single recessed track. */
export function Actions({ children, block = false }: { children: ReactNode; block?: boolean }) {
  return <Track block={block}>{children}</Track>
}

export function PageHead({ eyebrow, title, status, children }: { eyebrow?: ReactNode; title: ReactNode; status?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-[var(--sf-space-lg)] grid gap-4">
      {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
      <div className="sf-title-line">
        <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{title}</h1>
        {status}
      </div>
      {children}
    </header>
  )
}

export function StateCard({ title, children, action, alert = false, center = false }: { title: string; children?: ReactNode; action?: ReactNode; alert?: boolean; center?: boolean }) {
  return (
    <section role={alert ? "alert" : "status"} className={`sf-state ${center ? "sf-state-center" : ""}`}>
      <div className="sf-title-line">
        <Dot tone={alert ? "wait" : "off"} />
        <h2 className="sf-display text-[length:var(--sf-text-xl)]">{title}</h2>
      </div>
      {children ? <div className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]">{children}</div> : null}
      {action}
    </section>
  )
}

export function Monogram({ name }: { name: string }) {
  const letters = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "·"
  return <span aria-hidden="true" className="sf-monogram">{letters}</span>
}

/** Circular frame: a service or provider image, or the practice's dew gradient. */
export function Lens({ src, alt, name, className = "" }: { src?: string | null; alt?: string; name?: string; className?: string }) {
  return (
    <span className={`sf-lens sf-dew block ${className}`}>
      {src ? <img src={src} alt={alt || ""} loading="lazy" /> : name ? <Monogram name={name} /> : null}
    </span>
  )
}

/** Tall capsule frame used for provider portraits. */
export function Capsule({ src, alt, name, className = "" }: { src?: string | null; alt?: string; name?: string; className?: string }) {
  return (
    <span className={`sf-capsule sf-dew block ${className}`}>
      {src ? <img src={src} alt={alt || ""} loading="lazy" /> : name ? <Monogram name={name} /> : null}
    </span>
  )
}
