import { list } from '@keystone-6/core'
import { integer, json, relationship, select, text } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const StockMovement = list({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), lot: relationship({ ref: 'InventoryLot.movements' }), product: relationship({ ref: 'Product' }),
    type: select({ type: 'enum', options: [
      { label: 'Receive', value: 'receive' }, { label: 'Consume', value: 'consume' }, { label: 'Retail Sale', value: 'retail_sale' },
      { label: 'Return', value: 'return' }, { label: 'Adjustment', value: 'adjustment' }, { label: 'Transfer', value: 'transfer' }, { label: 'Expire', value: 'expire' },
    ], validation: { isRequired: true } }),
    delta: integer({ validation: { isRequired: true } }), balanceBefore: integer({ validation: { isRequired: true, min: 0 } }),
    balanceAfter: integer({ validation: { isRequired: true, min: 0 } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    reason: text({ validation: { isRequired: true } }), actor: relationship({ ref: 'User' }), treatmentSession: relationship({ ref: 'TreatmentSession' }),
    transactionLine: relationship({ ref: 'MedSpaTransactionLineItem' }), metadata: json(), ...trackingFields,
  },
})
