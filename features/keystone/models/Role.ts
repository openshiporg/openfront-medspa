import { list } from '@keystone-6/core'
import { checkbox, relationship, text } from '@keystone-6/core/fields'
import { activeListPermissions, rules } from '../access'
import { trackingFields } from './trackingFields'

export const Role = list({
  access: {
    operation: { query: activeListPermissions.canAccessDashboard, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadRoles },
  },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ['name', 'assignedTo'] },
  },
  fields: {
    practice: relationship({ ref: 'Practice', ui: { description: 'May be empty only for the one-time init account before controlled onboarding assigns its practice.' } }),
    name: text({ validation: { isRequired: true } }),
    canManagePeople: checkbox({ defaultValue: false }),
    canManageRoles: checkbox({ defaultValue: false }),
    canAccessDashboard: checkbox({ defaultValue: false }),
    canManageOnboarding: checkbox({ defaultValue: false }),
    canManagePractice: checkbox({ defaultValue: false }),
    canSchedule: checkbox({ defaultValue: false }),
    canReadClients: checkbox({ defaultValue: false }),
    canManageClinical: checkbox({ defaultValue: false }),
    canManageSensitiveRecords: checkbox({ defaultValue: false }),
    canManageInventory: checkbox({ defaultValue: false }),
    canManageFinance: checkbox({ defaultValue: false }),
    canManageCommunications: checkbox({ defaultValue: false }),
    canViewReports: checkbox({ defaultValue: false }),
    canManageIntegrations: checkbox({ defaultValue: false }),
    assignedTo: relationship({ ref: 'User.role', many: true, access: { create: () => false, update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    ...trackingFields,
  },
})
