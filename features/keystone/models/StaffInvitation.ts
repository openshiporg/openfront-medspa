import { list } from '@keystone-6/core'
import { relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { activeListPermissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const StaffInvitation = list({
  access: {
    operation: { query: activeListPermissions.canManagePeople, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter },
  },
  fields: {
    practice: relationship({ ref: 'Practice' }),
    email: text({ validation: { isRequired: true } }),
    role: relationship({ ref: 'Role' }),
    locations: relationship({ ref: 'Location', many: true }),
    invitedBy: relationship({ ref: 'User' }),
    acceptedUser: relationship({ ref: 'User' }),
    tokenHash: text({ validation: { isRequired: true }, isIndexed: 'unique', access: { read: () => false, create: () => false, update: () => false } }),
    status: select({ type: 'enum', options: ['pending', 'accepted', 'expired', 'revoked'].map(value => ({ label: value, value })), defaultValue: 'pending', validation: { isRequired: true } }),
    expiresAt: timestamp({ validation: { isRequired: true } }),
    acceptedAt: timestamp(),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    ...trackingFields,
  },
})
