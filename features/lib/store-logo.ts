import { LOGO_ICONS } from '../platform/storefront-settings/lib/icon-registry'
import { sanitizeStoreLogoSvg } from './sanitize-store-logo'

export const DEFAULT_LOGO_SVG = LOGO_ICONS[0].lightSvg
export function publicLogoSvg(value: unknown): string {
  return (typeof value === 'string' && sanitizeStoreLogoSvg(value)) || DEFAULT_LOGO_SVG
}
export function validLogoHue(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 360
}

/*
 * One brand hue (0-360, HSL hue) drives both the logo and the storefront accent.
 * Registry marks are drawn in Untitled UI blue (HSL hue ~221), so the logo is
 * rotated by the difference; the accent takes the same hue in OKLCH space.
 */
export const LOGO_BASE_HUE = 221
export function logoHueFilter(hue: number): string {
  const target = validLogoHue(hue) ? hue : LOGO_BASE_HUE
  return `hue-rotate(${(((target - LOGO_BASE_HUE) % 360) + 360) % 360}deg)`
}
/** OKLCH hue of hsl(hue 80% 50%), so the accent matches the tinted logo. */
export function brandOklchHue(hue: number): number {
  const h = validLogoHue(hue) ? hue : LOGO_BASE_HUE
  const s = 0.8, l = 0.5
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = [channel(0), channel(8), channel(4)].map(linear)
  const lc = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const mc = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const sc = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const A = 1.9779984951 * lc - 2.428592205 * mc + 0.4505937099 * sc
  const B = 0.0259040371 * lc + 0.7827717662 * mc - 0.808675766 * sc
  return Math.round(((Math.atan2(B, A) * 180) / Math.PI + 360) % 360)
}
export function brandHueColor(hue: number, lightness = '47%', chroma = '0.085'): string {
  return `oklch(${lightness} ${chroma} ${brandOklchHue(hue)})`
}
