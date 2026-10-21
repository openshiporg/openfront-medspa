import { list } from '@keystone-6/core'
import { relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const FollowUpTask = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), client: relationship({ ref: 'Client' }), appointment: relationship({ ref: 'Appointment' }), treatmentSession: relationship({ ref: 'TreatmentSession' }),
    assignedTo: relationship({ ref: 'User' }), dueAt: timestamp({ validation: { isRequired: true } }), title: text({ validation: { isRequired: true } }), instructions: text({ ui: { displayMode: 'textarea' } }),
    actions: relationship({ ref: 'FollowUpAction.task', many: true }),
    status: select({ type: 'enum', options: [
      { label: 'Open', value: 'open' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
    ], defaultValue: 'open', validation: { isRequired: true } }), completedAt: timestamp(), ...trackingFields,
  },
})
