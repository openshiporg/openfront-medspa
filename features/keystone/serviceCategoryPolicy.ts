import type { KeystoneContext } from '@keystone-6/core/types'

/** Field access runs only after the native parent List filter. A public
 * reverse edge must fail closed if legacy data contains a foreign child,
 * even when that child happens to be independently public elsewhere. */
export async function categoryChildrenRemainInPractice(context: KeystoneContext, item: { id: { toString(): string }; practiceId?: unknown }): Promise<boolean> {
  if (typeof item.practiceId !== 'string' || !item.practiceId) return false
  const foreignChildren = await context.sudo().query.Service.count({ where: { category: { id: { equals: item.id.toString() } }, NOT: { practice: { id: { equals: item.practiceId } } } } })
  return foreignChildren === 0
}
