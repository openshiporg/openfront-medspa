import { list } from '@keystone-6/core'
import { integer, json, relationship, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const GoodsReceiptLine = list({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), receipt: relationship({ ref: 'GoodsReceipt.lines' }), purchaseOrderLine: relationship({ ref: 'PurchaseOrderLine' }), product: relationship({ ref: 'Product' }), lot: relationship({ ref: 'InventoryLot.receiptLine' }), quantity: integer({ validation: { isRequired: true, min: 1 } }), lotNumberSnapshot: text({ validation: { isRequired: true } }), expirationSnapshot: timestamp(), condition: text({ validation: { isRequired: true } }), temperatureEvidence: json(), quarantineReason: text(), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
