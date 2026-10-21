import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const WebhookInbox = list({
  access: { operation: { query: permissions.canManageIntegrations, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), providerCode: text({ validation: { isRequired: true } }), providerEventId: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    signatureVerifiedAt: timestamp({ validation: { isRequired: true } }), receivedAt: timestamp({ validation: { isRequired: true } }), payload: json(),
    status: select({ type: 'enum', options: [
      { label: 'Received', value: 'received' }, { label: 'Processed', value: 'processed' }, { label: 'Rejected', value: 'rejected' }, { label: 'Failed', value: 'failed' },
    ], defaultValue: 'received', validation: { isRequired: true } }), processedAt: timestamp(), error: text(), ...trackingFields,
  },
})
