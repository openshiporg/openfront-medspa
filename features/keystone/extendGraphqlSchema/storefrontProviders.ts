import { graphql } from '@keystone-6/core'
import type { Context } from '.keystone/types'

/**
 * Fixed public provider projection. It intentionally omits biography, tier,
 * certifications, credentials, authorizations, schedules, and availability.
 * Public profiles are booking preferences, not authority or availability claims.
 */
const StorefrontProviderUser = graphql.object<{ id: string; name: string }>()({
  name: 'StorefrontProviderUser',
  fields: {
    id: graphql.field({ type: graphql.nonNull(graphql.ID) }),
    name: graphql.field({ type: graphql.nonNull(graphql.String) }),
  },
})

const StorefrontProviderImage = graphql.object<{ url: string }>()({
  name: 'StorefrontProviderImage',
  fields: { url: graphql.field({ type: graphql.nonNull(graphql.String) }) },
})

const StorefrontProviderPhoto = graphql.object<{
  image: { url: string } | null
  imagePath: string | null
  altText: string | null
}>()({
  name: 'StorefrontProviderPhoto',
  fields: {
    image: graphql.field({ type: StorefrontProviderImage }),
    imagePath: graphql.field({ type: graphql.String }),
    altText: graphql.field({ type: graphql.String }),
  },
})

const StorefrontSpecialization = graphql.object<{ id: string; name: string }>()({
  name: 'StorefrontSpecialization',
  fields: {
    id: graphql.field({ type: graphql.nonNull(graphql.ID) }),
    name: graphql.field({ type: graphql.nonNull(graphql.String) }),
  },
})

const StorefrontProvider = graphql.object<{
  id: string
  user: { id: string; name: string } | null
  isActive: boolean
  photo: { image: { url: string } | null; imagePath: string | null; altText: string | null } | null
  specializations: { id: string; name: string }[]
  schedules?: { dayOfWeek: number | null }[]
}>()({
  name: 'StorefrontProvider',
  fields: {
    id: graphql.field({ type: graphql.nonNull(graphql.ID) }),
    user: graphql.field({ type: StorefrontProviderUser }),
    isActive: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    photo: graphql.field({ type: StorefrontProviderPhoto }),
    specializations: graphql.field({
      type: graphql.nonNull(graphql.list(graphql.nonNull(StorefrontSpecialization))),
    }),
    // Weekdays (0 = Sunday) with published recurring hours; lets the booking calendar mark days off.
    workingDays: graphql.field({
      type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.Int))),
      resolve: (provider) => [...new Set((provider.schedules || []).map((schedule) => schedule.dayOfWeek).filter((day): day is number => Number.isInteger(day)))].sort(),
    }),
  },
})

const PUBLIC_PROVIDER_SELECTION = `
  id
  user { id name }
  isActive
  photo { image { url } imagePath altText }
  specializations(where: { status: { equals: active }, isPublic: { equals: true } }, take: 50, orderBy: { name: asc }) { id name }
  schedules(where: { type: { equals: recurring }, isAvailable: { equals: true }, isPublic: { equals: true } }, take: 50) { dayOfWeek }
`

async function activePractice(context: Context, practiceSlug: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/.test(practiceSlug)) return null
  const practice = (await context.sudo().query.Practice.findMany({
    where: { slug: { equals: practiceSlug }, isActive: { equals: true } },
    take: 1,
    query: 'id storefrontSetting { id isPublished primaryLocation { id isActive practice { id } } }',
  }))[0] || null
  if (
    !practice?.storefrontSetting?.isPublished ||
    practice.storefrontSetting.primaryLocation?.isActive !== true ||
    practice.storefrontSetting.primaryLocation?.practice?.id !== practice.id
  ) return null
  return practice
}

export const storefrontProviders = graphql.field({
  type: graphql.nonNull(graphql.list(graphql.nonNull(StorefrontProvider))),
  args: {
    practiceSlug: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    serviceId: graphql.arg({ type: graphql.ID }),
    take: graphql.arg({ type: graphql.Int }),
  },
  async resolve(_source, args, context: Context) {
    const practice = await activePractice(context, args.practiceSlug)
    if (!practice) return []
    const take = args.take && args.take > 0 ? Math.min(args.take, 50) : 50
    const where: Record<string, unknown> = {
      practice: { id: { equals: practice.id } },
      status: { equals: 'active' },
      isActive: { equals: true },
      isPublic: { equals: true },
    }
    if (args.serviceId) where.specializations = { some: { id: { equals: args.serviceId }, status: { equals: 'active' }, isPublic: { equals: true } } }
    return context.sudo().query.Provider.findMany({
      where,
      take,
      orderBy: { id: 'asc' },
      query: PUBLIC_PROVIDER_SELECTION,
    }) as any
  },
})

export const storefrontProvider = graphql.field({
  type: StorefrontProvider,
  args: {
    id: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    practiceSlug: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  async resolve(_source, args, context: Context) {
    const practice = await activePractice(context, args.practiceSlug)
    if (!practice) return null
    return ((await context.sudo().query.Provider.findMany({
      where: {
        id: { equals: args.id },
        practice: { id: { equals: practice.id } },
        status: { equals: 'active' },
        isActive: { equals: true },
        isPublic: { equals: true },
      },
      take: 1,
      query: PUBLIC_PROVIDER_SELECTION,
    }))[0] || null) as any
  },
})
