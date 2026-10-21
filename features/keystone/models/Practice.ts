import { list } from '@keystone-6/core'
import { checkbox, relationship, text } from '@keystone-6/core/fields'
import { activeListPermissions, practiceId } from '../access'
import { trackingFields } from './trackingFields'

export const Practice = list({
  access: {
    operation: {
      query: activeListPermissions.signedIn,
      create: () => false,
      update: activeListPermissions.canManagePractice,
      delete: () => false,
    },
    filter: {
      query: ({ session }) => practiceId(session) ? { id: { equals: practiceId(session)! } } : false,
      update: ({ session }) => practiceId(session) ? { id: { equals: practiceId(session)! } } : false,
    },
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
    slug: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    isActive: checkbox({ defaultValue: true }),
    isDemo: checkbox({ defaultValue: false, access: { create: () => false, update: () => false } }),
    users: relationship({ ref: 'User.practice', many: true, access: { create: () => false, update: () => false } }),
    locations: relationship({ ref: 'Location.practice', many: true, access: { create: () => false, update: () => false } }),
    storefrontSetting: relationship({ ref: 'StorefrontSetting.practice', access: { create: () => false, update: () => false } }),
    memberships: relationship({ ref: 'PracticeMembership.practice', many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields,
  },
})
