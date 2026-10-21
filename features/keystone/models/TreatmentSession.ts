import { list } from '@keystone-6/core'
import { checkbox, integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const TreatmentSession = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), plan: relationship({ ref: 'TreatmentPlan.sessions' }),
    appointment: relationship({ ref: 'Appointment.treatmentSessions' }), client: relationship({ ref: 'Client' }), provider: relationship({ ref: 'Provider.treatmentSessions' }), service: relationship({ ref: 'Service' }),
    order: relationship({ ref: 'ClinicalOrder' }), consent: relationship({ ref: 'ConsentRecord' }), supervisor: relationship({ ref: 'Provider' }),
    room: relationship({ ref: 'Resource' }), device: relationship({ ref: 'Resource' }),
    serviceTitle: text({ validation: { isRequired: true } }), durationMinutes: integer({ validation: { isRequired: true, min: 1 } }),
    status: select({ type: 'enum', options: [
      { label: 'Planned', value: 'planned' }, { label: 'Ready', value: 'ready' }, { label: 'In Progress', value: 'in_progress' },
      { label: 'Completed', value: 'completed' }, { label: 'Stopped', value: 'stopped' }, { label: 'Cancelled', value: 'cancelled' },
    ], defaultValue: 'planned', validation: { isRequired: true } }),
    staffAuthorizationConfirmed: checkbox({ defaultValue: false }), protocolVersion: text(), timeOutEvidence: json(), notes: text({ ui: { displayMode: 'textarea' } }),
    signedAt: timestamp(), evidenceHash: text(), idempotencyKey: text({ isIndexed: 'unique' }), startedAt: timestamp(), completedAt: timestamp(), revision: integer({ defaultValue: 1, validation: { min: 1 } }),
    administrations: relationship({ ref: 'TreatmentAdministration.treatmentSession', many: true }),
    ...trackingFields,
  },
})
