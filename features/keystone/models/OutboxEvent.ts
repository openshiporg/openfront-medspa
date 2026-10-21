import { list } from '@keystone-6/core'
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const OutboxEvent = list({
  access: { operation: { query: permissions.canManageIntegrations, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), eventKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), topic: text({ validation: { isRequired: true } }), version: integer({ defaultValue: 1, validation: { min: 1 } }),
    aggregateType: text({ validation: { isRequired: true } }), aggregateId: text({ validation: { isRequired: true } }), payload: json(),
    status: select({ type: 'enum', options: [
      { label: 'Pending', value: 'pending' }, { label: 'Processing', value: 'processing' }, { label: 'Delivered', value: 'delivered' }, { label: 'Dead Letter', value: 'dead_letter' },
    ], defaultValue: 'pending', validation: { isRequired: true } }), attempts: integer({ defaultValue: 0, validation: { min: 0 } }), availableAt: timestamp({ defaultValue: { kind: 'now' } }), deliveredAt: timestamp(), lastError: text(), ...trackingFields,
  },
})
