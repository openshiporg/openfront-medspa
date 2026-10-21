import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const PatientRightsRequest = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), client: relationship({ ref: 'Client' }), requestedBy: relationship({ ref: 'User' }), assignedTo: relationship({ ref: 'User' }), type: select({ type: 'enum', options: ['access','export','amendment','restriction','disclosure_accounting','representative_update','deletion_review'].map(value => ({ label: value, value })), validation: { isRequired: true } }), status: select({ type: 'enum', options: ['received','identity_review','in_progress','fulfilled','partially_fulfilled','denied_with_basis','closed'].map(value => ({ label: value, value })), defaultValue: 'received', validation: { isRequired: true } }), scope: json(), requestedAt: timestamp({ validation: { isRequired: true } }), dueAt: timestamp({ validation: { isRequired: true } }), completedAt: timestamp(), legalBasis: text(), responseEvidenceHash: text(), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), actionEntries: relationship({ ref: 'PatientRightsAction.request', many: true }), ...trackingFields },
})
