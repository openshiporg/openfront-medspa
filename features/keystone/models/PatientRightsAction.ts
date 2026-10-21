import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const PatientRightsAction = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), request: relationship({ ref: 'PatientRightsRequest.actionEntries' }), actor: relationship({ ref: 'User' }), action: select({ type: 'enum', options: ['receive','verify_identity','assign','collect_records','approve','partial','deny_with_basis','deliver','close'].map(value => ({ label: value, value })), validation: { isRequired: true } }), reason: text({ validation: { isRequired: true } }), evidence: json(), evidenceHash: text({ validation: { isRequired: true } }), occurredAt: timestamp({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
