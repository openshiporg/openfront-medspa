import { list } from '@keystone-6/core'
import { json, relationship, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const GoodsReceipt = list({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), purchaseOrder: relationship({ ref: 'PurchaseOrder.receipts' }),
    receiptNumber: text({ validation: { isRequired: true } }), receivedAt: timestamp({ validation: { isRequired: true } }), receivedBy: relationship({ ref: 'User' }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), evidence: json({ ui: { description: 'Bounded receipt evidence; authoritative quantities live on immutable receipt lines, lots and stock movements.' } }),
    lines: relationship({ ref: 'GoodsReceiptLine.receipt', many: true }), ...trackingFields,
  },
})
