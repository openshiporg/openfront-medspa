import { list } from '@keystone-6/core'
import { integer, relationship, text } from '@keystone-6/core/fields'
import { activeListPermissions, permissions, practiceId } from '../access'
import { trackingFields } from './trackingFields'

export const PurchaseOrderLine = list({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: async args => (await activeListPermissions.signedIn(args)) && practiceId(args.session) ? { purchaseOrder: { practice: { id: { equals: practiceId(args.session)! } } } } : false } },
  fields: {
    purchaseOrder: relationship({ ref: 'PurchaseOrder.lines' }), product: relationship({ ref: 'Product' }), productTitle: text({ validation: { isRequired: true } }),
    orderedQuantity: integer({ validation: { isRequired: true, min: 1 } }), receivedQuantity: integer({ defaultValue: 0, validation: { min: 0 } }),
    unitCostMinor: integer({ validation: { isRequired: true, min: 0 } }), ...trackingFields,
  },
})
