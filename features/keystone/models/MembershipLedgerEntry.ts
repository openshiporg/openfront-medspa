import { list } from '@keystone-6/core'
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const MembershipLedgerEntry = list({
  access: { operation: { query: permissions.canManageFinance, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), clientMembership: relationship({ ref: 'ClientMembership.ledgerEntries' }), agreement: relationship({ ref: 'MembershipAgreement' }), actor: relationship({ ref: 'User' }), type: select({ type: 'enum', options: ['activate','renewal_due','charge_authorized','charge_settled','charge_failed','benefit_issue','benefit_use','benefit_reverse','freeze','resume','nonrenew','cancel','expire'].map(value => ({ label: value, value })), validation: { isRequired: true } }), amountMinor: integer({ defaultValue: 0 }), benefitDelta: integer({ defaultValue: 0 }), reason: text({ validation: { isRequired: true } }), evidence: json(), occurredAt: timestamp({ validation: { isRequired: true } }), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
