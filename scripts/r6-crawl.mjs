// Load every staff and storefront page as the demo owner and print PASS/FAIL per page.
// Usage: CRAWL_BASE=http://localhost:3957 CRAWL_EMAIL=... CRAWL_PASSWORD=... node scripts/r6-crawl.mjs
import { chromium } from '/Users/junaid/Code/vibeghost/vibeghost/node_modules/playwright/index.mjs'

const BASE = process.env.CRAWL_BASE
const EMAIL = process.env.CRAWL_EMAIL
const PASSWORD = process.env.CRAWL_PASSWORD
async function gql(query, cookie, variables) {
  const r = await fetch(BASE + '/api/graphql', { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ query, variables }) })
  return r.json()
}
const auth = await gql('mutation($e:String!,$p:String!){authenticateUserWithPassword(email:$e,password:$p){... on UserAuthenticationWithPasswordSuccess{sessionToken}}}', null, { e: EMAIL, p: PASSWORD })
const token = auth.data?.authenticateUserWithPassword?.sessionToken
if (!token) { console.log('CHECK login: FAIL'); process.exit(1) }
const cookie = 'keystonejs-session=' + token
const first = async (field) => (await gql(`{${field}(take:1){id}}`, cookie)).data?.[field]?.[0]?.id
const ids = {}
for (const k of ['clients', 'payments', 'appointments', 'services', 'purchaseOrders', 'incidents', 'recallCases', 'patientRightsRequests', 'consultations', 'medSpaTransactions', 'staff', 'providers']) ids[k] = await first(k)
const platform = ['commissions', 'clients', 'payments', 'storefront', 'forms', 'privacy', 'appointments', 'appointments/plans', 'appointments/new', 'catalog', 'resources', 'schedules', 'checkout', 'safety', 'engagement', 'integrations', 'locations', 'inventory', 'follow-ups', 'benefits', 'administration', 'staff', 'reports', 'reviews']
const detail = (p, id) => id ? [p + '/' + id] : []
const staffPaths = [
  ...platform.map((p) => '/dashboard/platform' + (p ? '/' + p : '')), '/dashboard/waitlist',
  ...detail('/dashboard/platform/clients', ids.clients), ...detail('/dashboard/platform/payments', ids.payments),
  ...detail('/dashboard/platform/appointments', ids.appointments), ...(ids.appointments ? ['/dashboard/platform/appointments/' + ids.appointments + '/treatment'] : []),
  ...detail('/dashboard/platform/catalog', ids.services), ...detail('/dashboard/platform/checkout', ids.appointments),
  ...detail('/dashboard/platform/inventory/purchase-orders', ids.purchaseOrders), ...detail('/dashboard/platform/safety/incidents', ids.incidents),
  ...detail('/dashboard/platform/safety/recalls', ids.recallCases), ...detail('/dashboard/platform/privacy/requests', ids.patientRightsRequests),
  ...detail('/dashboard/platform/appointments/plans', ids.consultations), ...detail('/dashboard/platform/staff', ids.staff),
]
const nope = ['clients', 'payments', 'appointments', 'catalog', 'checkout', 'inventory/purchase-orders', 'safety/incidents', 'safety/recalls', 'privacy/requests', 'appointments/plans', 'staff'].map((p) => '/dashboard/platform/' + p + '/nope123')
const platformLists = ['clients', 'payments', 'appointments', 'services', 'products', 'commissions', 'locations', 'resources']
const lists = platformLists.map((p) => '/dashboard/platform/' + p + '/nope123')
const store = ['/', '/gift-cards', '/contact', '/appointments', '/gallery', '/providers', '/team', '/book', '/account/sign-in', '/account/sign-up', '/services', '/reviews', ...detail('/services', ids.services), ...detail('/team', ids.providers)]
const store404 = ['/services/nope123', '/team/nope123', '/booking/nope123']

const b = await chromium.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
let bad = 0, n = 0
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })
const p = await ctx.newPage()
await p.goto(BASE + '/dashboard/signin')
await p.fill('input[name=email]', EMAIL); await p.fill('input[name=password]', PASSWORD)
await Promise.all([p.waitForURL((u) => !u.pathname.includes('signin'), { timeout: 30000 }), p.click('button[type=submit]')])
async function check(path, expect, authed) {
  const page = authed ? p : await (await b.newContext({ ignoreHTTPSErrors: true })).newPage()
  const r = await page.goto(BASE + path, { waitUntil: 'load', timeout: 180000 }).catch(() => null)
  await page.waitForTimeout(1500); const txt = await page.evaluate(() => document.body.innerText).catch(() => '')
  const http = r?.status() ?? 0
  const broken = /this page could not be loaded|something went wrong|application error|QUERY_TOO_BROAD|too broad/i.test(txt)
  const ok = expect === 404 ? http === 404 : http === 200 && !broken
  if (!authed) await page.context().close()
  n++; if (!ok) bad++
  console.log(`CHECK ${path}: ${ok ? 'PASS' : 'FAIL'} (${http}${expect === 404 ? ' expected 404' : ''})`)
}
const only = process.env.CRAWL_ONLY ? process.env.CRAWL_ONLY.split(',') : null
for (const path of (only || staffPaths)) await check(path, 200, true)
for (const path of [...nope, ...lists]) await check(path, 404, true)
for (const path of store) await check(path, 200, false)
for (const path of store404) await check(path, 404, false)
await b.close()
console.log(`CHECK all pages: ${bad ? 'FAIL' : 'PASS'} (${n - bad}/${n})`)
