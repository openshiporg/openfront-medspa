import { list } from '@keystone-6/core'
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ClientPackageAdjustment = list({
  access: { operation: { query: permissions.canManageFinance, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), clientPackage: relationship({ ref: 'ClientPackage.adjustments' }), usage: relationship({ ref: 'ClientPackageUsage' }), actor: relationship({ ref: 'User' }), type: select({ type: 'enum', options: ['purchase','reservation','release','consume','reverse','refund','expire','transfer'].map(value => ({ label: value, value })), validation: { isRequired: true } }), valueDelta: integer({ validation: { isRequired: true } }), reason: text({ validation: { isRequired: true } }), evidence: json(), occurredAt: timestamp({ validation: { isRequired: true } }), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
