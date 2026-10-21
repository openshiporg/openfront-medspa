import { list } from '@keystone-6/core'
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const AppointmentResourceReservation = list({
  access: { operation: { query: permissions.canSchedule, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), appointment: relationship({ ref: 'Appointment.resourceReservations' }), treatmentSession: relationship({ ref: 'TreatmentSession' }), resource: relationship({ ref: 'Resource.reservations' }), segmentKey: text({ validation: { isRequired: true } }), purpose: select({ type: 'enum', options: ['room','device','equipment','recovery','supervision'].map(value => ({ label: value, value })), validation: { isRequired: true } }), units: integer({ defaultValue: 1, validation: { isRequired: true, min: 1 } }), startsAt: timestamp({ validation: { isRequired: true } }), endsAt: timestamp({ validation: { isRequired: true } }), status: select({ type: 'enum', options: ['reserved','in_use','released','cancelled','superseded'].map(value => ({ label: value, value })), defaultValue: 'reserved', validation: { isRequired: true } }), revision: integer({ defaultValue: 1, validation: { min: 1 } }), assignmentEvidence: json(), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
