import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const DeviceReadinessEvent = list({
  access: { operation: { query: permissions.canSchedule, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), resource: relationship({ ref: 'Resource.readinessEvents' }), actor: relationship({ ref: 'User' }), qualifiedReleaseBy: relationship({ ref: 'Provider' }), action: select({ type: 'enum', options: ['acceptance_test','clean','maintenance_due','lockout','service','recall_quarantine','release','retire'].map(value => ({ label: value, value })), validation: { isRequired: true } }), fromStatus: text(), toStatus: text({ validation: { isRequired: true } }), reason: text({ validation: { isRequired: true } }), evidence: json(), evidenceHash: text({ validation: { isRequired: true } }), occurredAt: timestamp({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
