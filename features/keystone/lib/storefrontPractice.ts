import type { Context } from '.keystone/types'

/**
 * The practice the public storefront serves. MEDSPA_PRACTICE_SLUG pins one when
 * a database holds several; otherwise the single active practice with a
 * published storefront is used. Ambiguity or absence resolves to null.
 */
export async function storefrontPracticeSlug(context: Context): Promise<string | null> {
  const pinned = process.env.MEDSPA_PRACTICE_SLUG?.trim()
  if (pinned) return pinned
  const practices = await context.sudo().query.Practice.findMany({
    where: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true } } },
    take: 2,
    query: 'slug',
  })
  return practices.length === 1 && typeof practices[0].slug === 'string' ? practices[0].slug : null
}
