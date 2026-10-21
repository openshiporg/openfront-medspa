import { list } from '@keystone-6/core'
import { integer, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const InventoryLot = list({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location.inventoryLots' }), product: relationship({ ref: 'Product.inventoryLots' }),
    vendor: relationship({ ref: 'Vendor' }), lotNumber: text({ validation: { isRequired: true } }),
    receivedQuantity: integer({ validation: { isRequired: true, min: 0 } }), remainingQuantity: integer({ validation: { isRequired: true, min: 0 } }),
    receivedAt: timestamp({ validation: { isRequired: true } }), expiresAt: timestamp(),
    status: select({ type: 'enum', options: [
      { label: 'Available', value: 'available' }, { label: 'Quarantined', value: 'quarantined' }, { label: 'Recalled', value: 'recalled' },
      { label: 'Expired', value: 'expired' }, { label: 'Depleted', value: 'depleted' }, { label: 'Returned', value: 'returned' }, { label: 'Destroyed', value: 'destroyed' },
    ], defaultValue: 'available', validation: { isRequired: true } }),
    movements: relationship({ ref: 'StockMovement.lot', many: true }), administrations: relationship({ ref: 'AdministrationLot.lot', many: true }),
    recallCases: relationship({ ref: 'RecallCase.lot', many: true }), receiptLine: relationship({ ref: 'GoodsReceiptLine.lot' }), ...trackingFields,
  },
})
