import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const AssetAccessEvent = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), asset: relationship({ ref: 'ClientAsset.accessEvents' }), actor: relationship({ ref: 'User' }), action: select({ type: 'enum', options: ['upload_intent','validate','view','download','release','restrict','tombstone','delete_request','delete_complete','retention_hold'].map(value => ({ label: value, value })), validation: { isRequired: true } }), purpose: text({ validation: { isRequired: true } }), outcome: text({ validation: { isRequired: true } }), reason: text(), sessionReferenceHash: text(), evidence: json(), evidenceHash: text({ validation: { isRequired: true } }), occurredAt: timestamp({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
