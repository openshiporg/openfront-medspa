import fs from "node:fs"

const endpoint = process.env.MEDSPA_GRAPHQL_ENDPOINT || "https://medspa.local/api/graphql"
const token = process.env.MEDSPA_SEED_SESSION_TOKEN || JSON.parse(fs.readFileSync(".runtime/local-admin.json", "utf8")).sessionToken

async function request(query, variables = {}) {
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", cookie: `keystonejs-session=${token}` }, body: JSON.stringify({ query, variables }) })
  const payload = await response.json()
  if (!response.ok || payload.errors) throw new Error(JSON.stringify(payload.errors || payload))
  return payload.data
}

const proof = await request(`query FullOnboardingProof {
  authenticatedItem { ... on User { id email onboardingStatus role { canAccessDashboard canManageOnboarding } } }
  locations { id name address city state zipCode phone email timezone hours isActive resourcesCount }
  serviceCategories { id name slug servicesCount }
  services { id name image { id imagePath } category { id name } }
  providers { id user { id email } photo { id imagePath } schedulesCount }
  clients { id user { id email } }
  intakeForms { id name }
  formTemplates { id name type }
  memberships { id name }
  servicePackages { id name }
  products { id name sku }
  messageTemplates { id name type }
  appointments(take: 500) { id metadata lineItemsCount }
  medSpaImages { id imagePath metadata }
  paymentProviders { id code adapter isInstalled isDefault config }
  paymentSessions { id idempotencyKey status provider { id code } payment { id status } }
}`)

const normalize = (rows, key = "id") => Object.fromEntries(rows.map((row) => [row[key] || row.id, row.id]))
const snapshot = {
  authenticatedItem: proof.authenticatedItem,
  counts: Object.fromEntries(Object.entries(proof).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])),
  ids: {
    locations: normalize(proof.locations, "name"), categories: normalize(proof.serviceCategories, "slug"), services: normalize(proof.services, "name"),
    providers: normalize(proof.providers.map((row) => ({ ...row, email: row.user?.email })), "email"), clients: normalize(proof.clients.map((row) => ({ ...row, email: row.user?.email })), "email"),
    intakeForms: normalize(proof.intakeForms, "name"), formTemplates: normalize(proof.formTemplates, "name"), memberships: normalize(proof.memberships, "name"),
    servicePackages: normalize(proof.servicePackages, "name"), products: normalize(proof.products, "sku"), messageTemplates: normalize(proof.messageTemplates, "name"),
    paymentProviders: normalize(proof.paymentProviders, "code"), paymentSessions: normalize(proof.paymentSessions, "idempotencyKey"),
  },
  settings: proof.locations,
  media: { services: proof.services.map((row) => [row.name, row.image?.imagePath]), providers: proof.providers.map((row) => [row.user?.email, row.photo?.imagePath]), imageCount: proof.medSpaImages.length },
  providers: proof.paymentProviders,
  sessions: proof.paymentSessions,
}

const output = process.argv[2]
if (output) fs.writeFileSync(output, JSON.stringify(snapshot, null, 2))
console.log(JSON.stringify(snapshot))
