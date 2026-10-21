import { list } from '@keystone-6/core'
import { integer, relationship, select, text } from '@keystone-6/core/fields'
import { activeListPermissions, permissions, practiceId } from '../access'
import { trackingFields } from './trackingFields'

export const TreatmentPlanItem = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: async args => (await activeListPermissions.signedIn(args)) && practiceId(args.session) ? { plan: { practice: { id: { equals: practiceId(args.session)! } } } } : false } },
  fields: {
    plan: relationship({ ref: 'TreatmentPlan.items' }), service: relationship({ ref: 'Service' }),
    serviceTitle: text({ validation: { isRequired: true } }), plannedSessions: integer({ defaultValue: 1, validation: { min: 1 } }),
    completedSessions: integer({ defaultValue: 0, validation: { min: 0 } }), intervalNotes: text(),
    status: select({ type: 'enum', options: [
      { label: 'Planned', value: 'planned' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
    ], defaultValue: 'planned', validation: { isRequired: true } }),
    ...trackingFields,
  },
})
