import { list } from '@keystone-6/core'
import { json, relationship, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const AuditEvent = list({
  access: { operation: { query: permissions.canManagePractice, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), actor: relationship({ ref: 'User' }),
    action: text({ validation: { isRequired: true } }), resourceType: text({ validation: { isRequired: true } }), resourceId: text({ validation: { isRequired: true } }),
    correlationId: text({ validation: { isRequired: true } }), evidence: json(), evidenceHash: text({ validation: { isRequired: true } }), occurredAt: timestamp({ validation: { isRequired: true } }),
    ...trackingFields,
  },
})
