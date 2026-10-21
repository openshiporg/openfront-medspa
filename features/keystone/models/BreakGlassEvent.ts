import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const BreakGlassEvent = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), client: relationship({ ref: 'Client' }), actor: relationship({ ref: 'User' }), status: select({ type: 'enum', options: ['opened','reviewed','approved','inappropriate','closed'].map(value => ({ label: value, value })), defaultValue: 'opened', validation: { isRequired: true } }), emergencyReason: text({ validation: { isRequired: true } }), requestedScope: json(), openedAt: timestamp({ validation: { isRequired: true } }), expiresAt: timestamp({ validation: { isRequired: true } }), reviewer: relationship({ ref: 'User' }), reviewedAt: timestamp(), reviewReason: text(), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
