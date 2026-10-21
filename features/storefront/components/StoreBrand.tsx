import Link from 'next/link'
import { publicLogoSvg, validLogoHue } from '@/features/lib/store-logo'

/** One sanitized lockup for the public header, mobile menu and footer. */
export function StoreBrand({ name, logoSvg, logoHue }: { name: string; logoSvg: string; logoHue: number }) {
  return <Link href="/" className="flex min-h-11 min-w-0 max-w-full items-center gap-2 py-1" aria-label={name}>
    <span data-store-logo className="block size-8 shrink-0 overflow-hidden [&>svg]:block [&>svg]:size-full" style={{ filter: `hue-rotate(${validLogoHue(logoHue) ? logoHue : 0}deg)` }} dangerouslySetInnerHTML={{ __html: publicLogoSvg(logoSvg) }} aria-hidden="true" />
    <span className="sf-display truncate text-xl leading-tight sm:text-2xl">{name}</span>
  </Link>
}
