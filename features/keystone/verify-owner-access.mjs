import fs from "node:fs"

const endpoint = process.env.MEDSPA_GRAPHQL_ENDPOINT || "https://medspa.local/api/graphql"
const fixturePath = new URL("../../.runtime/owner-access-fixtures.json", import.meta.url)
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"))

async function request(query, variables = {}, token) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { cookie: `keystonejs-session=${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })
  const payload = await response.json()
  if (!response.ok || payload.errors) {
    throw new Error(JSON.stringify(payload.errors || payload))
  }
  return payload.data
}

async function authenticate(identity) {
  const data = await request(
    `mutation AuthenticateOwner($email: String!, $password: String!) {
      authenticateUserWithPassword(email: $email, password: $password) {
        ... on UserAuthenticationWithPasswordSuccess { sessionToken item { id email } }
        ... on UserAuthenticationWithPasswordFailure { message }
      }
    }`,
    identity,
  )
  const result = data.authenticateUserWithPassword
  if (!result.sessionToken) throw new Error(`Authentication failed for ${identity.email}: ${result.message}`)
  return result
}

const ownerQuery = `query OwnerRows {
  formSubmissions { id data }
  clientPackages { id metadata }
  clientPackageUsages { id valueUsed }
  clientMemberships { id status }
  giftCards { id code }
  giftCardTransactions { id notes }
  clientPointsRecords { id tier }
  referrals { id status }
  messageLogs { id errorMessage }
}`

function returnedIds(data) {
  return Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.map((row) => row.id)]))
}

const identities = await Promise.all(fixtures.identities.map(authenticate))
const results = []
for (const identity of identities) {
  const data = await request(ownerQuery, {}, identity.sessionToken)
  const ids = returnedIds(data)
  const own = fixtures.rows[identity.item.email]
  const otherEmail = fixtures.identities.find((candidate) => candidate.email !== identity.item.email).email
  const other = fixtures.rows[otherEmail]

  for (const [listKey, ownId] of Object.entries(own)) {
    if (!ids[listKey].includes(ownId)) throw new Error(`${identity.item.email} cannot read own ${listKey} row ${ownId}`)
    if (ids[listKey].includes(other[listKey])) throw new Error(`${identity.item.email} can read cross-account ${listKey} row ${other[listKey]}`)
  }
  results.push({
    email: identity.item.email,
    ownerPositive: Object.keys(own),
    crossAccountNegative: Object.keys(other),
    visibleCounts: Object.fromEntries(Object.entries(ids).map(([key, value]) => [key, value.length])),
  })
}

console.log(`ownerAccessRuntime=PASS ${JSON.stringify(results)}`)
