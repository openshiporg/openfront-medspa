import { tenantFilter } from './tenantAccess';
import { graphql, list } from '@keystone-6/core'
import { checkbox, image, integer, json, relationship, select, text, timestamp, virtual } from '@keystone-6/core/fields'
import { activeListPermissions, permissions } from '../access'
import { trackingFields } from './trackingFields'

function photographyOnlyFields<T extends Record<string, any>>(fields: T): T {
  return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key,
    key === 'image' || key === 'photoUrl' ? field : (...args: any[]) => {
      const initialized = field(...args);
      return { ...initialized, access: { ...initialized.access, update: () => false } };
    },
  ])) as T;
}

export const Resource = list({
  access: {
    operation: {
      query: permissions.canSchedule, create: () => false, delete: () => false,
      // Native admin uploads may change photography only. Scheduling/readiness
      // still require the revision-checked workflow mutations.
      update: activeListPermissions.canManagePractice,
    },
    filter: { query: tenantFilter, update: tenantFilter },
  },
  ui: { listView: { initialColumns: ['name', 'type', 'location', 'capacity', 'isActive', 'isPublic'] }, labelField: 'name' },
  fields: photographyOnlyFields({
    practice: relationship({ ref: 'Practice' }),
    name: text({ validation: { isRequired: true } }),
    image: image({ storage: 'my_images', label: 'Room photo' }),
    photoUrl: virtual({
      field: graphql.field({
        type: graphql.String,
        resolve(item: any, _args, context) {
          return item.image_id && item.image_extension
            ? context.images('my_images').getUrl(item.image_id, item.image_extension) : null;
        },
      }),
      ui: { itemView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } },
    }),
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
  }),
})
