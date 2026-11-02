import { graphql } from '@keystone-6/core'
import { storefrontPracticeSlug } from '../lib/storefrontPractice'

/** Only photographed, explicitly published rooms at the published location.
 * This is presentation, never an availability or readiness guarantee. */
export const storefrontRooms = graphql.field({
  type: graphql.JSON,
  async resolve(_source, _args, context) {
    const slug = await storefrontPracticeSlug(context)
    if (!slug) return []
    const practices = await context.sudo().query.Practice.findMany({
      where: { slug: { equals: slug }, isActive: { equals: true } }, take: 2,
      query: 'id storefrontSetting { isPublished primaryLocation { id isActive practice { id } } }',
    })
    const practice = practices.length === 1 ? practices[0] : null
    const location = practice?.storefrontSetting?.primaryLocation
    if (!practice?.storefrontSetting?.isPublished || !location?.isActive || location.practice?.id !== practice.id) return []
    const rooms = await context.sudo().query.Resource.findMany({
      where: { practice: { id: { equals: practice.id } }, location: { id: { equals: location.id } }, type: { equals: 'room' }, isActive: { equals: true }, isPublic: { equals: true } },
      take: 12, orderBy: { name: 'asc' }, query: 'id name photoUrl',
    })
    return rooms.filter(room => room.photoUrl).map(room => ({ id: room.id, name: room.name, photoUrl: room.photoUrl }))
  },
})
