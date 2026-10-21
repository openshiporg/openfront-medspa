import { list } from '@keystone-6/core'
import { json, relationship, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const AdministrationLot = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), administration: relationship({ ref: 'TreatmentAdministration.lots' }), lot: relationship({ ref: 'InventoryLot.administrations' }), product: relationship({ ref: 'Product' }),
    quantity: text({ validation: { isRequired: true } }), unit: text({ validation: { isRequired: true } }), doseSnapshot: json(), anatomicSite: text({ validation: { isRequired: true } }), lotNumberSnapshot: text({ validation: { isRequired: true } }), expirationSnapshot: timestamp({ validation: { isRequired: true } }),
    concentration: text(), diluentLot: text(), reconstitutedAt: timestamp(), openedAt: timestamp(), discardAt: timestamp(), wasteQuantity: text(), wasteReason: text(), witness: relationship({ ref: 'User' }), evidenceHash: text({ validation: { isRequired: true } }),
    ...trackingFields,
  },
})
