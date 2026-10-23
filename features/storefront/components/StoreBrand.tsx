import Link from 'next/link'
import { publicLogoSvg, validLogoHue } from '@/features/lib/store-logo'

/** One sanitized lockup for the public header, mobile menu and footer. */
export function StoreBrand({ name, logoSvg, logoHue, size = 'md' }: { name: string; logoSvg: string; logoHue: number; size?: 'md' | 'lg' }) {
  return <Link href="/" className="flex min-h-11 min-w-0 max-w-full items-center gap-2.5 py-1 text-[var(--sf-ink)] no-underline" aria-label={name}>
    <span data-store-logo className={`block shrink-0 overflow-hidden [&>svg]:block [&>svg]:size-full ${size === 'lg' ? 'size-10' : 'size-8'}`} style={{ filter: `hue-rotate(${validLogoHue(logoHue) ? logoHue : 0}deg)` }} dangerouslySetInnerHTML={{ __html: publicLogoSvg(logoSvg) }} aria-hidden="true" />
    <span className={`sf-display truncate leading-tight ${size === 'lg' ? 'text-[length:var(--sf-text-2xl)]' : 'text-[1.375rem] sm:text-[1.5rem]'}`}>{name}</span>
  </Link>
}
