import { list } from '@keystone-6/core'
import { json, relationship, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ConsentTemplateVersion = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), service: relationship({ ref: 'Service' }), jurisdiction: text({ validation: { isRequired: true } }), language: text({ validation: { isRequired: true } }), version: text({ validation: { isRequired: true } }),
    contentSnapshot: json(), contentHash: text({ validation: { isRequired: true } }), effectiveFrom: timestamp({ validation: { isRequired: true } }), effectiveUntil: timestamp(),
    supersedes: relationship({ ref: 'ConsentTemplateVersion.supersededBy' }), supersededBy: relationship({ ref: 'ConsentTemplateVersion.supersedes' }), records: relationship({ ref: 'ConsentRecord.templateVersion', many: true }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    ...trackingFields,
  },
})
