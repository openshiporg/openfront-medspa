import { list } from '@keystone-6/core'
import { integer, relationship, select, text, timestamp, checkbox } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const TreatmentPlan = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), client: relationship({ ref: 'Client' }), consultation: relationship({ ref: 'Consultation' }),
    createdBy: relationship({ ref: 'Provider' }),
    status: select({ type: 'enum', options: [
      { label: 'Draft', value: 'draft' }, { label: 'Active', value: 'active' }, { label: 'Paused', value: 'paused' },
      { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
    ], defaultValue: 'draft', validation: { isRequired: true } }),
    title: text({ validation: { isRequired: true } }), goals: text({ ui: { displayMode: 'textarea' } }),
    startsAt: timestamp(), endsAt: timestamp(), signedAt: timestamp(), evidenceHash: text(), idempotencyKey: text({ isIndexed: 'unique' }), revision: integer({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    supersedes: relationship({ ref: 'TreatmentPlan.supersededBy' }), supersededBy: relationship({ ref: 'TreatmentPlan.supersedes' }),
    portalVisible: checkbox({ defaultValue: false }), items: relationship({ ref: 'TreatmentPlanItem.plan', many: true }),
    sessions: relationship({ ref: 'TreatmentSession.plan', many: true }),
    orders: relationship({ ref: 'ClinicalOrder.plan', many: true }),
    ...trackingFields,
  },
})
