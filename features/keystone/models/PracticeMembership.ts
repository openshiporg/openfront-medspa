import { list } from '@keystone-6/core'
import { relationship, select } from '@keystone-6/core/fields'
import { activeListPermissions } from '../access'
import { tenantFilter } from './tenantAccess'
import { trackingFields } from './trackingFields'

export const PracticeMembership = list({
  access: {
    operation: { query: activeListPermissions.signedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter },
  },
  fields: {
    practice: relationship({ ref: 'Practice.memberships' }),
    user: relationship({ ref: 'User.memberships' }),
    locations: relationship({ ref: 'Location', many: true }),
    status: select({
      type: 'enum',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Ended', value: 'ended' },
      ],
      defaultValue: 'active',
      validation: { isRequired: true },
    }),
    ...trackingFields,
  },
})
