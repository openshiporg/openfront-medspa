import { permissions } from '../access'

/**
 * Where-filters and orderBy are a read channel: a count through a relation or on a hidden
 * scalar reveals the value even when the value itself is never returned. Every field gets
 * isFilterable/isOrderable from the same permission that gates reading it:
 *  - a relationship is filterable only by a caller who may read the whole target list
 *    (or across the few public storefront edges listed below);
 *  - a scalar with its own read rule uses that rule;
 *  - hashes, idempotency keys, storage keys and tokens are never filterable or orderable.
 */
type Args = { session?: any; context?: any; listKey?: string; fieldKey?: string }
type Check = (args: Args) => boolean | Promise<boolean>

const p = permissions
const anyOf = (...checks: Check[]): Check => async args => { for (const check of checks) if (await check(args)) return true; return false }
const open: Check = () => true
const signedIn: Check = ({ session }) => Boolean(session?.itemId) && session?.data?.status !== 'disabled'

/** Who may filter through a relation INTO this list (it holds rows they cannot all read). */
const reachableBy: Record<string, Check> = {
  // Private people tables: the hop is open, the personal scalars below are gated, further hops are gated per field.
  User: open, Client: open,
  Appointment: anyOf(p.canManageFinance, p.canManageClinical, a => p.canSchedule(a) && p.canManagePractice(a)),
  AppointmentLineItem: anyOf(p.canManageFinance, p.canManageClinical, a => p.canSchedule(a) && p.canManagePractice(a)),
  ClientMembership: anyOf(p.canManageFinance, p.canSchedule), ClientPackage: anyOf(p.canManageFinance, p.canSchedule), ClientPackageUsage: anyOf(p.canManageFinance, p.canSchedule),
  ClientPoints: p.canReadClients, Referral: p.canReadClients,
  Commission: p.canManageFinance, GiftCard: p.canManageFinance, GiftCardTransaction: p.canManageFinance, Payment: p.canManageFinance,
  ProductSale: p.canManageFinance, MedSpaTransaction: p.canManageFinance, MedSpaTransactionLineItem: p.canManageFinance,
  Membership: p.canManageFinance, LoyaltyProgram: p.canManageFinance,
  FormSubmission: p.canManageClinical, MessageLog: p.canManageCommunications,
  Product: anyOf(p.canAccessDashboard, p.canManageInventory, p.canManageFinance, p.canManagePractice, p.canManageClinical, p.canSchedule),
  ServiceVariant: anyOf(p.canAccessDashboard, p.canSchedule, p.canManageClinical, p.canManagePractice),
  Role: p.canAccessDashboard,
  // Public storefront catalog: rows are public, their private fields are gated one by one.
  Service: open, ServiceCategory: open, Provider: open, Review: open, MedSpaImage: open, ProviderSchedule: open,
  Practice: signedIn, Location: signedIn, StorefrontSetting: signedIn, PracticeMembership: signedIn,
}

/** Edges the public storefront filters through signed out (published practice and location checks). */
const publicEdges = new Set([
  'Service.practice', 'ServiceCategory.practice', 'Review.practice', 'MedSpaImage.practice', 'Provider.practice',
  'Service.category', 'Service.image', 'Practice.storefrontSetting', 'StorefrontSetting.primaryLocation', 'StorefrontSetting.practice', 'Location.practice',
])

const neverFilterable = /(Hash|idempotencyKey|storageKey|encryptionKeyReference|checksum|sessionKey|secret|token)$/i

/** Personal scalars: filterable only by whoever may read that table in full. */
const wideClient = anyOf(p.canReadClients, p.canSchedule, p.canManageClinical)
const personal: Record<string, Check> = {
  'User.name': p.canManagePeople, 'User.email': p.canManagePeople, 'User.phone': p.canManagePeople,
  'Client.dateOfBirth': wideClient, 'Client.contactPreferences': wideClient, 'Client.operationalNotes': wideClient,
  'Client.firstVisit': wideClient, 'Client.lastVisit': wideClient, 'Client.totalVisits': wideClient, 'Client.lifetimeValue': wideClient,
  'Client.marketingConsent': wideClient, 'Client.photoMarketingConsent': wideClient,
}

/** Item-based read rules cannot be evaluated for a filter; the relation hop is decided by the target list instead. */
const skipOwnRead = new Set(['ServiceCategory.services', 'Service.category', 'Service.image'])

async function safe(check: Check, args: Args) {
  try { return (await check(args)) === true } catch { return false }
}

export function applyFilterAccess(models: Record<string, any>) {
  const reach = (target: string): Check => {
    if (reachableBy[target]) return reachableBy[target]
    const operation = models[target]?.access?.operation
    const query = typeof operation === 'function' ? operation : operation?.query
    if (typeof query === 'function') return query
    return () => query === true
  }
  for (const [listKey, model] of Object.entries(models)) {
    for (const [fieldKey, make] of Object.entries<any>(model.fields)) {
      if (fieldKey.startsWith('__group') || typeof make !== 'function') continue
      model.fields[fieldKey] = (data: any) => {
        const field = make(data)
        const key = `${listKey}.${fieldKey}`
        const out = { ...field }
        const kind = field.dbField?.kind
        if (fieldKey !== 'id' && (neverFilterable.test(fieldKey) || field.dbField?.scalar === 'Json' || (kind === 'scalar' && /^password/i.test(fieldKey)))) {
          out.isFilterable = false; out.isOrderable = false
          return out
        }
        const read = field.access && typeof field.access === 'object' ? field.access.read : typeof field.access === 'function' ? field.access : undefined
        if (kind === 'relation') {
          if (field.isFilterable === undefined) {
            const target = reach(field.dbField.list)
            out.isFilterable = async (args: Args) => {
              if (read && !skipOwnRead.has(key) && !(await safe(read, args))) return false
              if (publicEdges.has(key)) return true
              return safe(target, args)
            }
          }
        } else {
          if (field.isFilterable === undefined) {
            const gate = personal[key]
            if (gate) out.isFilterable = (args: Args) => safe(gate, args)
            else if (typeof read === 'function') out.isFilterable = (args: Args) => safe(read, args)
          }
          if (field.isOrderable === undefined && typeof read === 'function') out.isOrderable = (args: Args) => safe(read, args)
        }
        return out
      }
    }
  }
}
