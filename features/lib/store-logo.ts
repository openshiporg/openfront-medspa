import { LOGO_ICONS } from '../platform/storefront-settings/lib/icon-registry'
import { sanitizeStoreLogoSvg } from './sanitize-store-logo'

export const DEFAULT_LOGO_SVG = LOGO_ICONS[0].lightSvg
export function publicLogoSvg(value: unknown): string {
  return (typeof value === 'string' && sanitizeStoreLogoSvg(value)) || DEFAULT_LOGO_SVG
}
export function validLogoHue(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 360
}
