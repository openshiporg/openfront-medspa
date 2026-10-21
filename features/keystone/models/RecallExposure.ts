import { list } from '@keystone-6/core'
import { relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const RecallExposure = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), recall: relationship({ ref: 'RecallCase.exposures' }), client: relationship({ ref: 'Client' }), administration: relationship({ ref: 'TreatmentAdministration' }), administrationLot: relationship({ ref: 'AdministrationLot' }), status: select({ type: 'enum', options: ['identified','reviewed','notified','assessed','closed'].map(value => ({ label: value, value })), defaultValue: 'identified', validation: { isRequired: true } }), identifiedAt: timestamp({ validation: { isRequired: true } }), notificationDueAt: timestamp(), evidenceHash: text({ validation: { isRequired: true } }), ...trackingFields },
})
