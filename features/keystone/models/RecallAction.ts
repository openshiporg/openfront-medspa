import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const RecallAction = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), recall: relationship({ ref: 'RecallCase.actions' }), exposure: relationship({ ref: 'RecallExposure' }), actor: relationship({ ref: 'User' }), action: select({ type: 'enum', options: ['open','assess','quarantine','identify_exposure','notify','clinical_assessment','dispose','close'].map(value => ({ label: value, value })), validation: { isRequired: true } }), reason: text({ validation: { isRequired: true } }), evidence: json(), evidenceHash: text({ validation: { isRequired: true } }), occurredAt: timestamp({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
