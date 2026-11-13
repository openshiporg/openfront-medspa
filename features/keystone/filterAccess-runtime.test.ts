import assert from 'node:assert/strict'
import test from 'node:test'
import { keystoneContext } from './context'

/**
 * Count-filter attack: a value that exists and one that does not must give the same count (or an access
 * error) for every caller who may not read that value. Admin keeps its real filters.
 * Runs against a scratch database only (DATABASE_URL), never live.
 */
const flags = (on: string[]) => Object.fromEntries(['canManagePeople','canManageRoles','canAccessDashboard','canManageOnboarding','canManagePractice','canSchedule','canReadClients','canManageClinical','canManageSensitiveRecords','canManageInventory','canManageFinance','canManageCommunications','canViewReports','canManageIntegrations'].map(k => [k, on.includes(k)]))
const ROLES: Record<string, string[]> = {
  Admin: ['canManagePeople','canAccessDashboard','canManagePractice','canSchedule','canReadClients','canManageClinical','canManageSensitiveRecords','canManageInventory','canManageFinance','canManageCommunications','canViewReports','canManageIntegrations'],
  'Front Desk': ['canAccessDashboard','canSchedule','canReadClients','canManageCommunications'],
  'Clinical Provider': ['canAccessDashboard','canSchedule','canReadClients','canManageClinical'],
  'Billing Specialist': ['canAccessDashboard','canReadClients','canManageFinance','canViewReports'],
  Customer: [],
}

// [list, where template with {v}]: personal value reached through a relation or on a gated scalar.
const PROBES: Array<[string, string]> = [
  ['services', 'specialists: { some: { user: { email: { startsWith: "{v}" } } } }'],
  ['providers', 'user: { email: { startsWith: "{v}" } }'],
  ['providers', 'user: { name: { startsWith: "{v}" } }'],
  ['providers', 'baseCommissionRate: { gt: {n} }'],
  ['providers', 'appointments: { some: { notes: { startsWith: "{v}" } } }'],
  ['services', 'practice: { users: { some: { email: { startsWith: "{v}" } } } }'],
  ['reviews', 'client: { user: { email: { startsWith: "{v}" } } }'],
  ['reviews', 'appointment: { notes: { startsWith: "{v}" } }'],
  ['serviceCategories', 'services: { some: { requiredResources: { some: { name: { startsWith: "{v}" } } } } }'],
  ['appointments', 'client: { user: { email: { startsWith: "{v}" } } }'],
  ['appointments', 'payment: { receiptEmail: { startsWith: "{v}" } }'],
  ['appointments', 'notes: { startsWith: "{v}" }'],
  ['clients', 'user: { email: { startsWith: "{v}" } }'],
  ['clients', 'operationalNotes: { startsWith: "{v}" }'],
  ['payments', 'receiptEmail: { startsWith: "{v}" }'],
  ['payments', 'appointment: { client: { user: { email: { startsWith: "{v}" } } } }'],
  ['users', 'email: { startsWith: "{v}" }'],
  ['users', 'clientProfile: { operationalNotes: { startsWith: "{v}" } }'],
  ['locations', 'staff: { some: { email: { startsWith: "{v}" } } }'],
  ['practices', 'users: { some: { email: { startsWith: "{v}" } } }'],
  ['roles', 'assignedTo: { some: { email: { startsWith: "{v}" } } }'],
]

test('relation and scalar filters reveal nothing a role cannot read', async () => {
  const db = keystoneContext.prisma as any
  const tag = `flt${Date.now().toString(36)}`
  const secret = `qq${tag}`
  const practice = await db.practice.create({ data: { name: `P ${tag}`, slug: `p-${tag}` } })
  const location = await db.location.create({ data: { name: 'L', address: 'a', city: 'c', state: 's', zipCode: '1', practice: { connect: { id: practice.id } } } })
  await db.storefrontSetting.create({ data: { practice: { connect: { id: practice.id } }, primaryLocation: { connect: { id: location.id } }, isPublished: true, displayName: 'x' } })
  const sessions: Record<string, any> = { anon: undefined }
  for (const [name, on] of Object.entries(ROLES)) {
    const role = on.length ? await db.role.create({ data: { name: `${name} ${tag}`, practice: { connect: { id: practice.id } }, ...flags(on) } }) : null
    const user = await db.user.create({ data: { name: name === 'Customer' ? `${secret} customer` : `${name} ${tag}`, email: `${name.replace(/\W/g, '').toLowerCase()}-${tag}@example.com`, password: 'x', status: 'active', practice: { connect: { id: practice.id } }, ...(role ? { role: { connect: { id: role.id } } } : {}) } })
    sessions[name] = { itemId: user.id, listKey: 'User', data: { name, status: 'active', practice: { id: practice.id }, locations: [], role: role ? { id: role.id, practice: { id: practice.id }, ...flags(on) } : null } }
  }
  const secretUser = await db.user.create({ data: { name: `${secret} person`, email: `${secret}@example.com`, password: 'x', status: 'active', phone: '555', practice: { connect: { id: practice.id } } } })
  const client = await db.client.create({ data: { practice: { connect: { id: practice.id } }, user: { connect: { id: secretUser.id } }, operationalNotes: secret } })
  const provider = await db.provider.create({ data: { practice: { connect: { id: practice.id } }, user: { connect: { id: secretUser.id } }, isActive: true, isPublic: true, status: 'active', baseCommissionRate: 0.42 } })
  await db.appointment.create({ data: { practice: { connect: { id: practice.id } }, location: { connect: { id: location.id } }, client: { connect: { id: client.id } }, provider: { connect: { id: provider.id } }, startTime: new Date(Date.now() + 86_400_000), endTime: new Date(Date.now() + 90_000_000), duration: 60, status: 'pending', idempotencyKey: `k-${tag}`, notes: secret } })

  const count = async (who: string, list: string, where: string) => {
    const context = sessions[who] ? keystoneContext.withSession(sessions[who]) : keystoneContext
    try {
      const r = await context.graphql.raw({ query: `{ c: ${list}Count(where: { ${where} }) }` })
      if (r.errors?.length) return `ERR`
      return String((r.data as any)?.c)
    } catch { return 'ERR' }
  }
  const real = (w: string) => w.replace('{v}', secret).replace('{n}', '0')
  const none = (w: string) => w.replace('{v}', 'zzzz-not-there').replace('{n}', '9999')
  // Values a role is allowed to read may be filtered on by that role.
  const mayRead = (who: string, list: string, w: string) =>
    (list === 'clients' && w.startsWith('operationalNotes') && ['Front Desk', 'Clinical Provider', 'Billing Specialist'].includes(who)) ||
    (list === 'providers' && w.startsWith('baseCommissionRate') && who === 'Billing Specialist')
  const hits: string[] = []
  for (const who of Object.keys(sessions)) {
    if (who === 'Admin') continue
    for (const [list, w] of PROBES) {
      if (mayRead(who, list, w)) continue
      const a = await count(who, list, real(w)), b = await count(who, list, none(w))
      if (a !== b) hits.push(`${who}: ${list} { ${w} } -> ${a} vs ${b}`)
    }
  }
  assert.deepEqual(hits, [], `filter leaks:\n${hits.join('\n')}`)
  // Admin keeps real filters.
  assert.equal(await count('Admin', 'users', `email: { startsWith: "${secret}" }`), '1')
  assert.equal(await count('Admin', 'appointments', `client: { user: { email: { startsWith: "${secret}" } } }`), '1')
  assert.equal(await count('Admin', 'providers', 'baseCommissionRate: { gt: 0 }'), '1')
  // The public storefront reads still filter through the published-practice edge.
  assert.equal(await count('anon', 'services', `practice: { slug: { equals: "p-${tag}" } }`), '0')
  assert.equal(await count('anon', 'serviceCategories', `practice: { slug: { equals: "p-${tag}" } }`), '0')
  assert.equal(await count('anon', 'providers', `practice: { slug: { equals: "p-${tag}" }, isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } }`), '1')
})
