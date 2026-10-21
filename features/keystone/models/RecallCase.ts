import { list } from '@keystone-6/core'
import { relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const RecallCase = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), lot: relationship({ ref: 'InventoryLot.recallCases' }), device: relationship({ ref: 'Resource.recallCases' }), openedBy: relationship({ ref: 'User' }), sourceReference: text({ validation: { isRequired: true } }), scopeReason: text({ validation: { isRequired: true } }), status: select({ type: 'enum', options: ['open','applicability_review','quarantined','patients_identified','notifications_in_progress','disposition_complete','closed'].map(value => ({ label: value, value })), defaultValue: 'open', validation: { isRequired: true } }), openedAt: timestamp({ validation: { isRequired: true } }), closedAt: timestamp(), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), exposures: relationship({ ref: 'RecallExposure.recall', many: true }), actions: relationship({ ref: 'RecallAction.recall', many: true }), ...trackingFields },
})
