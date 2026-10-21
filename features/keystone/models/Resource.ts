import { tenantFilter } from './tenantAccess';
import { list } from '@keystone-6/core'
import { checkbox, integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions, practiceId } from '../access'
import { createLifecycleHooks } from '../lifecycle'
import { trackingFields } from './trackingFields'

export const Resource = list({
  access: {
    operation: { query: permissions.canSchedule, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter },
  },
  hooks: createLifecycleHooks('resource', ['name', 'type', 'capacity', 'isActive', 'revision', 'locationId']),
  ui: { listView: { initialColumns: ['name', 'type', 'location', 'capacity', 'isActive', 'isPublic'] }, labelField: 'name' },
  fields: {
    practice: relationship({ ref: 'Practice' }),
    name: text({ validation: { isRequired: true } }),
    type: select({ type: 'enum', options: [
      { label: 'Treatment Room', value: 'room' }, { label: 'Device', value: 'device' },
      { label: 'Equipment', value: 'equipment' }, { label: 'Station', value: 'station' }, { label: 'Other', value: 'other' },
    ], defaultValue: 'room', validation: { isRequired: true } }),
    revision: integer({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    capacity: integer({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    isActive: checkbox({ defaultValue: true }),
    isPublic: checkbox({ defaultValue: false, ui: { description: 'Explicit public scheduling flag. Active status alone never exposes this resource to storefront availability.' } }),
    readinessStatus: select({ type: 'enum', options: ['acceptance_testing','available','in_use','cleaning','maintenance_due','out_of_service','incident_lockout','recall_quarantine','retired'].map(value => ({ label: value, value })), defaultValue: 'acceptance_testing', validation: { isRequired: true } }),
    manufacturer: text(), model: text(), serialNumber: text(), udi: text(), softwareVersion: text(),
    maintenanceDueAt: timestamp(), calibrationDueAt: timestamp(), cleanedAt: timestamp(), releasedAt: timestamp(),
    roomCapabilities: json(), trainingRequirements: json(), metadata: json(),
    notes: text({ ui: { displayMode: 'textarea' } }),
    location: relationship({ ref: 'Location.resources' }),
    services: relationship({ ref: 'Service.requiredResources', many: true }),
    appointments: relationship({ ref: 'Appointment.resource', many: true }),
    scheduleBlocks: relationship({ ref: 'ResourceScheduleBlock.resource', many: true }),
    reservations: relationship({ ref: 'AppointmentResourceReservation.resource', many: true }),
    readinessEvents: relationship({ ref: 'DeviceReadinessEvent.resource', many: true }),
    recallCases: relationship({ ref: 'RecallCase.device', many: true }),
    ...trackingFields,
  },
})
