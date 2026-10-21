import { list } from '@keystone-6/core'
import { checkbox, relationship, text } from '@keystone-6/core/fields'
import { activeListPermissions, permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter, validateTenantInput } from './tenantAccess'

export const Vendor = list({ hooks: { validateInput: validateTenantInput },
  access: { operation: { query: permissions.canManageInventory, create: activeListPermissions.canManageInventory, update: activeListPermissions.canManageInventory, delete: activeListPermissions.canManageInventory }, filter: { query: tenantFilter, update: tenantFilter, delete: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), name: text({ validation: { isRequired: true } }), email: text(), phone: text(), isActive: checkbox({ defaultValue: true }),
    purchaseOrders: relationship({ ref: 'PurchaseOrder.vendor', many: true }), ...trackingFields,
  },
})
