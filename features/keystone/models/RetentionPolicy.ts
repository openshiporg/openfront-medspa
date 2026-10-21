import { list } from '@keystone-6/core'
import { integer, relationship, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const RetentionPolicy = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), jurisdiction: text({ validation: { isRequired: true } }), recordClass: text({ validation: { isRequired: true } }), version: text({ validation: { isRequired: true } }), retainMonths: integer({ validation: { isRequired: true, min: 1 } }), minorsRule: text(), dispositionRule: text({ validation: { isRequired: true } }), sourceCitations: text({ validation: { isRequired: true } }), approvedBy: relationship({ ref: 'User' }), effectiveFrom: timestamp({ validation: { isRequired: true } }), effectiveUntil: timestamp(), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
