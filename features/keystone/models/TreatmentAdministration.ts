import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const TreatmentAdministration = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), client: relationship({ ref: 'Client' }), appointment: relationship({ ref: 'Appointment.administrations' }), treatmentSession: relationship({ ref: 'TreatmentSession.administrations' }), order: relationship({ ref: 'ClinicalOrder.administrations' }), consent: relationship({ ref: 'ConsentRecord' }),
    performer: relationship({ ref: 'Provider' }), supervisor: relationship({ ref: 'Provider' }), service: relationship({ ref: 'Service' }), room: relationship({ ref: 'Resource' }), device: relationship({ ref: 'Resource' }),
    status: select({ type: 'enum', options: ['completed','aborted','entered_in_error'].map(value => ({ label: value, value })), validation: { isRequired: true } }),
    protocolVersion: text({ validation: { isRequired: true } }), timeOutEvidence: json(), anatomicMap: json(), deviceSettings: json(), technique: text(), immediateOutcome: text(), aftercareSnapshot: json(),
    startedAt: timestamp({ validation: { isRequired: true } }), completedAt: timestamp({ validation: { isRequired: true } }), signedAt: timestamp({ validation: { isRequired: true } }), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    lots: relationship({ ref: 'AdministrationLot.administration', many: true }), incidents: relationship({ ref: 'Incident.administration', many: true }),
    ...trackingFields,
  },
})
