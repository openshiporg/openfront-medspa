import { list } from '@keystone-6/core'
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const Refund = list({
  access: { operation: { query: permissions.canManageFinance, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), payment: relationship({ ref: 'Payment.refunds' }), amountMinor: integer({ validation: { isRequired: true, min: 1 } }),
    currencyCode: text({ validation: { isRequired: true } }), reason: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    providerReference: text(), status: select({ type: 'enum', options: [
      { label: 'Pending', value: 'pending' }, { label: 'Completed', value: 'completed' }, { label: 'Failed', value: 'failed' },
    ], defaultValue: 'pending', validation: { isRequired: true } }),
    processedAt: timestamp(), data: json(), ...trackingFields,
  },
})
