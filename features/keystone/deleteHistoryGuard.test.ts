import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Prisma } from '@prisma/client';
import { DELETE_HISTORY, deleteHistoryProblem } from './deleteHistoryGuard';

const lower = (name: string) => name[0].toLowerCase() + name.slice(1);

test('every delete-history reference is a real relation to that parent', () => {
  for (const [parent, rule] of Object.entries(DELETE_HISTORY)) {
    for (const ref of rule.references) {
      const model = Prisma.dmmf.datamodel.models.find(m => lower(m.name) === ref.model);
      const field = model?.fields.find(f => f.name === ref.relation);
      assert.equal(field?.type, parent, `${ref.model}.${ref.relation} -> ${parent}`);
      assert.equal(Boolean(field?.isList), Boolean(ref.list), `${ref.model}.${ref.relation} list shape`);
    }
  }
});

test('every guarded list is still deletable and wires the guard', () => {
  for (const list of Object.keys(DELETE_HISTORY)) {
    const source = readFileSync(new URL(`./models/${list}.ts`, import.meta.url), 'utf8');
    assert.match(source, new RegExp(`validateDelete: historyDeleteGuard\\('${list}'\\)`), list);
    assert.doesNotMatch(source, /\bvalidate: \{/, `${list} must not mix validate with validateDelete (Keystone 6.5 throws)`);
  }
});

test('history is named with the retire option; unused records can go', async () => {
  const seen: any[] = [];
  const prisma = new Proxy({}, { get: (_t, model: string) => ({ count: async (args: any) => { seen.push([model, args.where]); return model === 'appointment' ? 3 : model === 'commission' ? 1 : 0; } }) });
  assert.equal(await deleteHistoryProblem(prisma, 'Service', 's1'), 'This is used by 3 appointments, 1 commission. Set the service to Inactive instead of deleting it.');
  assert.deepEqual(seen.find(([m]) => m === 'appointment')[1], { services: { some: { id: 's1' } } });
  assert.deepEqual(seen.find(([m]) => m === 'commission')[1], { service: { id: 's1' } });
  const none = new Proxy({}, { get: () => ({ count: async () => 0 }) });
  assert.equal(await deleteHistoryProblem(none, 'Vendor', 'v'), null);
});

test('the money/time migration fails closed and enforces the processor reference', () => {
  const sql = readFileSync(new URL('../../migrations/20261107170000_medspa_money_time_and_payment_reference/migration.sql', import.meta.url), 'utf8');
  assert.match(sql, /RAISE EXCEPTION/);
  for (const name of ['Payment_amounts_and_refund_check', 'PaymentSession_provider_reference_key', 'GiftCard_balance_range_check', 'ClientPackage_value_range_check', 'ClientPoints_practice_client_key', 'Appointment_time_and_deposit_check', 'StockMovement_balance_check']) assert.ok(sql.includes(name), name);
});
