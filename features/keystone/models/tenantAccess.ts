import type { KeystoneContext } from '@keystone-6/core/types'
import { activeListPermissions, permissions, practiceId, type AccessArgs, type Session } from '../access'

type TenantHook = {
  context: KeystoneContext
  session?: Session
  listKey: string
  resolvedData: Record<string, unknown>
  inputData: Record<string, unknown>
  item?: Record<string, unknown>
  operation: 'create' | 'update'
  addValidationError: (message: string) => void
}

/** Missing create scope is derived from the freshly authenticated actor, never
 * from browser defaults. Explicit scope remains subject to native validation. */
export async function resolveTenantPractice({ context, session, operation, resolvedData, inputData }: Pick<TenantHook, 'context' | 'session' | 'operation' | 'resolvedData' | 'inputData'>) {
  if (operation !== 'create' || Object.prototype.hasOwnProperty.call(inputData, 'practice')) return resolvedData
  const args = { context, session: session || context.session }
  if (!(await activeListPermissions.signedIn(args))) return resolvedData
  const id = practiceId(args.session)
  return id ? { ...resolvedData, practice: { connect: { id } } } : resolvedData
}

/** Native hooks close both direct and inverse relationship writers. Checking
 * only the parent practice leaves Category.services and similar inverse
 * connect/set operations able to move a foreign child behind its own hooks. */
export async function validateTenantInput({ context, session, listKey, resolvedData, inputData, item, operation, addValidationError }: TenantHook) {
  const args = { context, session: session || context.session }
  if (!(await activeListPermissions.signedIn(args))) return addValidationError('Authenticated practice access is unavailable')
  const actorPracticeId = practiceId(args.session)
  if (!actorPracticeId) return addValidationError('Authenticated practice access is unavailable')
  const relation = resolvedData.practice as { connect?: { id?: string }; disconnect?: boolean } | undefined
  const connectedPracticeId = relation?.connect?.id
  const existingPracticeId = item?.practiceId
  if (operation === 'create' && connectedPracticeId !== actorPracticeId) addValidationError('Practice must match the authenticated practice')
  if (operation === 'update' && (existingPracticeId !== actorPracticeId || (Object.prototype.hasOwnProperty.call(inputData, 'practice') && (connectedPracticeId !== actorPracticeId || relation?.disconnect)))) addValidationError('Record practice cannot be removed or changed')

  const list = context.__internal.lists[listKey]
  if (!list) return addValidationError('Native relationship metadata is unavailable')
  for (const [key, value] of Object.entries(resolvedData)) {
    const field = list.fields[key]
    if (key === 'practice' || field?.dbField.kind !== 'relation' || !value || typeof value !== 'object') continue
    const input = value as Record<string, unknown>
    if (input.create || input.update) { addValidationError('Create and edit related records through their own scoped workflow'); continue }
    const relatedList = field.dbField.list
    const related = context.__internal.lists[relatedList]
    const connected = [input.connect, input.set].flatMap(entry => Array.isArray(entry) ? entry : entry ? [entry] : [])
    if (!connected.length) continue
    const ids = connected.map(entry => entry && typeof entry === 'object' ? (entry as { id?: unknown }).id : undefined)
    if (ids.length > 100 || ids.some(id => typeof id !== 'string' || !id)) { addValidationError('Related record identities are invalid'); continue }
    const uniqueIds = [...new Set(ids as string[])]
    if (relatedList === 'Practice') {
      if (uniqueIds.some(id => id !== actorPracticeId)) addValidationError('Related record is outside the authenticated practice')
    } else if (related?.fields.practice) {
      // Explicit count-only same-practice projection after current actor and
      // parent ownership checks. No foreign record content is returned.
      const count = await context.sudo().query[relatedList].count({ where: { id: { in: uniqueIds }, practice: { id: { equals: actorPracticeId } } } })
      if (count !== uniqueIds.length) addValidationError('Related record is outside the authenticated practice')
    }
  }
}

export const tenantFilter = async (args: AccessArgs) => {
  if (!(await activeListPermissions.signedIn(args))) return false
  const id = practiceId(args.session)
  return id ? { practice: { id: { equals: id } } } : false
}

export const clinicalRead = ({ session }: AccessArgs) => permissions.canManageClinical({ session }) || permissions.canManageSensitiveRecords({ session })
export const clinicalWrite = ({ session }: AccessArgs) => permissions.canManageClinical({ session })
export const sensitiveRead = ({ session }: AccessArgs) => permissions.canManageSensitiveRecords({ session })
export const inventoryRead = ({ session }: AccessArgs) => permissions.canManageInventory({ session })
export const financeRead = ({ session }: AccessArgs) => permissions.canManageFinance({ session })
