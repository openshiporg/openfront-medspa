import { list } from '@keystone-6/core'
import { relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const LegalHold = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), client: relationship({ ref: 'Client' }), asset: relationship({ ref: 'ClientAsset' }), incident: relationship({ ref: 'Incident' }), status: select({ type: 'enum', options: ['active','released'].map(value => ({ label: value, value })), defaultValue: 'active', validation: { isRequired: true } }), reason: text({ validation: { isRequired: true } }), authorityReference: text({ validation: { isRequired: true } }), placedBy: relationship({ ref: 'User' }), placedAt: timestamp({ validation: { isRequired: true } }), releasedBy: relationship({ ref: 'User' }), releasedAt: timestamp(), releaseReason: text(), releaseAuthorityReference: text(), releaseEvidenceHash: text(), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
