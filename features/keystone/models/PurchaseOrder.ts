import { list } from '@keystone-6/core'
import { integer, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const PurchaseOrder = list({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location.purchaseOrders' }), vendor: relationship({ ref: 'Vendor.purchaseOrders' }),
    number: text({ validation: { isRequired: true } }), status: select({ type: 'enum', options: [
      { label: 'Draft', value: 'draft' }, { label: 'Submitted', value: 'submitted' }, { label: 'Partially Received', value: 'partially_received' },
      { label: 'Received', value: 'received' }, { label: 'Cancelled', value: 'cancelled' },
    ], defaultValue: 'draft', validation: { isRequired: true } }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }), totalMinor: integer({ defaultValue: 0, validation: { min: 0 } }),
    orderedAt: timestamp(), expectedAt: timestamp(), revision: integer({ defaultValue: 1, validation: { min: 1 } }),
    lines: relationship({ ref: 'PurchaseOrderLine.purchaseOrder', many: true }), receipts: relationship({ ref: 'GoodsReceipt.purchaseOrder', many: true }), ...trackingFields,
  },
})
