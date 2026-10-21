import { graphql } from '@keystone-6/core'
import type { Context } from '.keystone/types'
import { publicLogoSvg, validLogoHue } from '../../lib/store-logo'
import { assertOwnedLocalDatabase } from '../localRuntime'

const PRACTICE_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const UNPUBLISHED_TEXT = /\b(?:configure|placeholder)\b/i

type PublicLocation = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  phone: string | null
  email: string | null
  hours: Record<string, { open?: string | null; close?: string | null; closed?: boolean | null }> | null
  timezone: string | null
}

type PublicSettings = {
  configured: boolean
  displayName: string | null
  accentHue: number | null
  logoSvg: string | null
  logoHue: number | null
  catalogNames: string[]
  serviceCount: number
  primaryLocation: PublicLocation | null
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text || text.length > max || /[\u0000-\u001f\u007f]/.test(text) || UNPUBLISHED_TEXT.test(text)) return null
  return text
}

function publicPhone(value: unknown, fictionalDemo: boolean) {
  const phone = boundedText(value, 40)
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  const reservedFictionalNumber = /^1?[2-9]\d{2}55501\d{2}$/.test(digits)
  if (reservedFictionalNumber) return fictionalDemo ? phone : null
  return /555/.test(digits) ? null : phone
}

function publicEmail(value: unknown, fictionalDemo: boolean) {
  const email = boundedText(value, 254)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  if (/\.example$/i.test(email)) return fictionalDemo ? email : null
  return /\.(?:invalid|test)$/i.test(email) ? null : email
}

function publicZipCode(value: unknown) {
  const zipCode = boundedText(value, 24)
  if (!zipCode || /^0+(?:-0+)?$/.test(zipCode)) return null
  return zipCode
}

function publicHours(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const source = value as Record<string, any>
  const hours: Record<string, { open: string | null; close: string | null; closed: boolean }> = {}
  for (const day of DAYS) {
    const entry = source[day]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const closed = entry.closed === true
    const open = typeof entry.open === 'string' && TIME.test(entry.open) ? entry.open : null
    const close = typeof entry.close === 'string' && TIME.test(entry.close) ? entry.close : null
    if (closed || (open && close)) hours[day] = { open, close, closed }
  }
  return Object.keys(hours).length ? hours : null
}

const StorefrontPublicLocation = graphql.object<PublicLocation>()({
  name: 'StorefrontPublicLocation',
  fields: {
    id: graphql.field({ type: graphql.nonNull(graphql.ID) }),
    name: graphql.field({ type: graphql.String }),
    address: graphql.field({ type: graphql.String }),
    city: graphql.field({ type: graphql.String }),
    state: graphql.field({ type: graphql.String }),
    zipCode: graphql.field({ type: graphql.String }),
    phone: graphql.field({ type: graphql.String }),
    email: graphql.field({ type: graphql.String }),
    hours: graphql.field({ type: graphql.JSON }),
    timezone: graphql.field({ type: graphql.String }),
  },
})

const StorefrontPublicSettings = graphql.object<PublicSettings>()({
  name: 'StorefrontPublicSettings',
  fields: {
    configured: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    displayName: graphql.field({ type: graphql.String }),
    accentHue: graphql.field({ type: graphql.Int }),
    logoSvg: graphql.field({ type: graphql.String }),
    logoHue: graphql.field({ type: graphql.Int }),
    catalogNames: graphql.field({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.String))) }),
    serviceCount: graphql.field({ type: graphql.nonNull(graphql.Int) }),
    primaryLocation: graphql.field({ type: StorefrontPublicLocation }),
  },
})

const unconfigured = (): PublicSettings => ({
  configured: false,
  displayName: null,
  accentHue: null,
  logoSvg: null,
  logoHue: null,
  catalogNames: [],
  serviceCount: 0,
  primaryLocation: null,
})

/** A fixed, bounded anonymous projection. No generic settings or Location fields are exposed. */
export const publicStorefrontSettings = graphql.field({
  type: graphql.nonNull(StorefrontPublicSettings),
  args: { practiceSlug: graphql.arg({ type: graphql.nonNull(graphql.String) }) },
  async resolve(_source, args, context: Context): Promise<PublicSettings> {
    if (!PRACTICE_SLUG.test(args.practiceSlug)) return unconfigured()
    const sudo = context.sudo()
    const practice = (await sudo.query.Practice.findMany({
      where: { slug: { equals: args.practiceSlug }, isActive: { equals: true } },
      take: 1,
      query: 'id isDemo',
    }))[0]
    if (!practice) return unconfigured()
    const fictionalDemo = practice.isDemo === true
    if (fictionalDemo && !await assertOwnedLocalDatabase(context.prisma)) return unconfigured()

    const setting = (await sudo.query.StorefrontSetting.findMany({
      where: { practice: { id: { equals: practice.id } }, isPublished: { equals: true } },
      take: 1,
      query: `id displayName accentHue logoSvg logoHue primaryLocation {
        id name address city state zipCode phone email hours timezone isActive practice { id }
      }`,
    }))[0]
    const displayName = boundedText(setting?.displayName, 80)
    const hue = setting?.accentHue
    const location = setting?.primaryLocation
    if (
      !setting ||
      !displayName ||
      !Number.isInteger(hue) ||
      hue < 0 ||
      hue > 360 ||
      !location ||
      location.isActive !== true ||
      location.practice?.id !== practice.id
    ) return unconfigured()

    const [catalog, serviceCount] = await Promise.all([
      sudo.query.Service.findMany({
        where: { practice: { id: { equals: practice.id } }, status: { equals: 'active' }, isPublic: { equals: true } },
        take: 6,
        orderBy: { name: 'asc' },
        query: 'id name',
      }),
      sudo.query.Service.count({
        where: { practice: { id: { equals: practice.id } }, status: { equals: 'active' }, isPublic: { equals: true } },
      }),
    ])

    return {
      configured: true,
      displayName,
      accentHue: hue,
      logoSvg: publicLogoSvg(setting.logoSvg),
      logoHue: validLogoHue(setting.logoHue) ? setting.logoHue : 0,
      catalogNames: catalog.map(item => boundedText(item.name, 120)).filter((name): name is string => Boolean(name)),
      serviceCount,
      primaryLocation: {
        id: location.id,
        name: boundedText(location.name, 120),
        address: boundedText(location.address, 200),
        city: boundedText(location.city, 100),
        state: boundedText(location.state, 100),
        zipCode: publicZipCode(location.zipCode),
        phone: publicPhone(location.phone, fictionalDemo),
        email: publicEmail(location.email, fictionalDemo),
        hours: publicHours(location.hours),
        timezone: boundedText(location.timezone, 100),
      },
    }
  },
})
