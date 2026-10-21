import Link from "next/link"

interface HeroProps { title: string; description: string; hasPublishedServices?: boolean }

export default function Hero({ title, description, hasPublishedServices = false }: HeroProps) {
  return <section className="sf-page-pad-lg"><div className="sf-container-narrow text-center"><h1 className="sf-display text-[var(--sf-text-display-s)]">{title}</h1><p className="sf-lead mx-auto mt-5">{description}</p><div className="mt-7 flex justify-center gap-3"><Link href="/services" className="sf-btn sf-btn-secondary">Published services</Link>{hasPublishedServices ? <Link href="/book" className="sf-btn sf-btn-primary">Request appointment</Link> : null}</div></div></section>
}
