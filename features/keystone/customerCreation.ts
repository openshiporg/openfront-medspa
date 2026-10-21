import type { Context } from '.keystone/types'

// Adapted from E-commerce's allowlisted public identity creation, without
// opening raw User CRUD or accepting roles/tenant/old-record claims. The
// capability lives only on this command's native transaction client.
type Scope = { practiceId: string; email: string; name: string }
const scopes = new WeakMap<object, Scope>()

export async function withinCustomerCreation<T>(context: Context, scope: Scope, work: () => Promise<T>): Promise<T> {
  if (context.session?.itemId || scopes.has(context.prisma)) throw new Error('Invalid customer creation context')
  scopes.set(context.prisma, scope)
  try { return await work() } finally { scopes.delete(context.prisma) }
}

export function isCustomerCreation(context: { prisma: object; session?: { itemId?: string } }, data: Record<string, unknown>): boolean {
  const scope = scopes.get(context.prisma)
  const practice = data.practice as { connect?: { id?: string } } | undefined
  return Boolean(scope && !context.session?.itemId && data.email === scope.email && data.name === scope.name
    && practice?.connect?.id === scope.practiceId && !data.role && !data.locations
    && data.status === 'active' && data.onboardingStatus === 'dismissed')
}
