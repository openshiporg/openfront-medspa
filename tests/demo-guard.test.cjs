// Demo-account guard: features/keystone/lib/demo-guard.ts. Offline, no DB.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relative) {
  const filename = path.resolve(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require, process, Symbol }, { filename });
  return module.exports;
}

const guard = load('features/keystone/lib/demo-guard.ts');
const { DEMO_GUARD_MESSAGE, withDemoGuard, DEMO_GUARD_POLICY, rewriteDemoErrors } = guard;
const env = { DEMO_USER_EMAILS: ' Other@example.com , MEDSPA@openship.org ' };

const DEMO = { itemId: 'demo', listKey: 'User', data: { email: 'medspa@openship.org' } };
const ADMIN = { itemId: 'admin', listKey: 'User', data: { email: 'owner@openship.org' } };

const NAMES = ['User','Role','StaffInvitation','PracticeMembership','PaymentProvider','Practice','Appointment','Client','Payment','Refund','MedSpaTransaction','ProductSale','Product','Service','ServicePackage','ClientPackage','Membership','ClientMembership','GiftCard','StorefrontSetting'];
let productHookRan = 0;
const raw = Object.fromEntries(NAMES.map((n) => [n, { fields: {} }]));
raw.Product = { fields: {}, hooks: { beforeOperation: { update: () => { productHookRan++; } } } };
const lists = withDemoGuard(raw, DEMO_GUARD_POLICY, env);

function run(listKey, operation, session, { item, inputData } = {}) {
  const context = { session, sudo: () => context };
  const hook = lists[listKey].hooks?.beforeOperation;
  const fn = typeof hook === 'function' ? hook : hook?.[operation];
  if (!fn) return Promise.resolve();
  return fn({ listKey, operation, context, item, inputData, resolvedData: inputData });
}
async function refused(promise) {
  await assert.rejects(promise, (error) => error.message === DEMO_GUARD_MESSAGE);
}

test('the exact copy', () => assert.equal(DEMO_GUARD_MESSAGE, "Demo accounts can't change this."));

test('demo: identity changes refused, own and others', async () => {
  for (const inputData of [{ password: 'x' }, { email: 'a@b.c' }, { name: 'N' }, { status: 'disabled' }, { role: { connect: { id: 'r' } } }]) {
    await refused(run('User', 'update', DEMO, { item: { id: 'demo' }, inputData }));
    await refused(run('User', 'update', DEMO, { item: { id: 'admin' }, inputData }));
  }
  await refused(run('User', 'create', DEMO, { inputData: { name: 'New' } }));
  await refused(run('User', 'delete', DEMO, { item: { id: 'admin' } }));
  await run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { onboardingStatus: 'dismissed', phone: '1' } });
});

test('demo: locked lists (roles, invitations, memberships, payment provider keys)', async () => {
  for (const list of ['Role', 'StaffInvitation', 'PracticeMembership', 'PaymentProvider']) {
    await refused(run(list, 'create', DEMO, { inputData: {} }));
    await refused(run(list, 'update', DEMO, { item: { id: 'x' }, inputData: { config: {} } }));
    await refused(run(list, 'delete', DEMO, { item: { id: 'x' } }));
  }
});

test('demo: changed practice slug refused, unchanged allowed, name/currency/tax allowed', async () => {
  const item = { id: 'p', name: 'Altair', slug: 'altair', isActive: true, currencyCode: 'USD', taxRate: 0.08 };
  await refused(run('Practice', 'update', DEMO, { item, inputData: { slug: 'evil' } }));
  await refused(run('Practice', 'update', DEMO, { item, inputData: { isActive: false } }));
  await run('Practice', 'update', DEMO, { item, inputData: { name: 'Altair', slug: 'altair', isActive: true } });
  await run('Practice', 'update', DEMO, { item, inputData: { name: 'Altair QA', currencyCode: 'USD', taxRate: 0.1 } });
});

test('demo: store name, tagline and logo ALLOWED (StorefrontSetting unguarded)', async () => {
  await run('StorefrontSetting', 'update', DEMO, { item: { id: 's' }, inputData: { displayName: 'Altair QA', logoSvg: '<svg/>', logoHue: 10 } });
  await run('Practice', 'update', DEMO, { item: { id: 'p', name: 'Altair' }, inputData: { name: 'Altair QA' } });
});

test('demo: delete of a business record refused, create and update allowed', async () => {
  for (const list of ['Practice','Appointment','Client','Payment','Refund','MedSpaTransaction','ProductSale','Product','Service','ServicePackage','ClientPackage','Membership','ClientMembership','GiftCard']) {
    await refused(run(list, 'delete', DEMO, { item: { id: 'x' } }));
    await run(list, 'create', DEMO, { inputData: { name: 'New' } });
    if (list !== 'Practice') await run(list, 'update', DEMO, { item: { id: 'x' }, inputData: { price: 5, name: 'Edited' } });
  }
  assert.equal(productHookRan, 1, 'the existing Product hook still runs');
});

test('non-demo user: everything allowed', async () => {
  await run('User', 'update', ADMIN, { item: { id: 'demo' }, inputData: { password: 'x', email: 'a@b.c', role: {} } });
  await run('User', 'delete', ADMIN, { item: { id: 'x' } });
  await run('Role', 'update', ADMIN, { item: { id: 'r' }, inputData: { name: 'Y' } });
  await run('PaymentProvider', 'update', ADMIN, { item: { id: 'x' }, inputData: { config: {} } });
  await run('Practice', 'update', ADMIN, { item: { id: 'p', slug: 'a' }, inputData: { slug: 'b' } });
  await run('Client', 'delete', ADMIN, { item: { id: 'c' } });
  await run('Client', 'delete', null, { item: { id: 'c' } });
});

test('a session without data.email is resolved from the user record', async () => {
  const session = { itemId: 'demo', listKey: 'User' };
  const context = { session, sudo: () => ({ db: { User: { findOne: async () => ({ email: 'Medspa@Openship.org' }) } } }) };
  await refused(lists.Client.hooks.beforeOperation({ listKey: 'Client', operation: 'delete', context, item: { id: 'c' } }));
});

test('empty DEMO_USER_EMAILS is inert', async () => {
  const open = withDemoGuard({ Role: { fields: {} }, Client: { fields: {} } }, DEMO_GUARD_POLICY, {});
  await open.Role.hooks.beforeOperation({ listKey: 'Role', operation: 'delete', context: { session: DEMO }, item: { id: 'r' } });
  await open.Client.hooks.beforeOperation({ listKey: 'Client', operation: 'delete', context: { session: DEMO }, item: { id: 'c' } });
});

test('every guarded list exists in the Keystone models', () => {
  const src = fs.readFileSync(path.join(root, 'features/keystone/models/index.ts'), 'utf8');
  for (const name of Object.keys(DEMO_GUARD_POLICY)) assert.match(src, new RegExp(`\\b${name}\\b`), name);
});

test("Keystone's hook wrapper is rewritten to the exact copy", () => {
  const wrapped = { message: `An error occurred while running "beforeOperation".\n  - Client.hooks.beforeOperation: ${DEMO_GUARD_MESSAGE}`, path: ['deleteClient'] };
  const other = { message: 'Something else' };
  const result = rewriteDemoErrors({ data: { deleteClient: null }, errors: [wrapped, other] });
  assert.equal(result.errors[0].message, DEMO_GUARD_MESSAGE);
  assert.equal(result.errors[1], other);
});

test('the guard is wired into the Keystone config and the GraphQL route', () => {
  const config = fs.readFileSync(path.join(root, 'features/keystone/index.ts'), 'utf8');
  assert.match(config, /lists: withDemoGuard\(models\)/);
  const route = fs.readFileSync(path.join(root, 'pages/api/graphql.ts'), 'utf8');
  assert.match(route, /useDemoGuardErrors\(\)/);
});
