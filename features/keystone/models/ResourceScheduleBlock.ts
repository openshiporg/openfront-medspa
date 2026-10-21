import { list } from '@keystone-6/core'
import { integer, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ResourceScheduleBlock = list({
  access: { operation: { query: permissions.canSchedule, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), resource: relationship({ ref: 'Resource.scheduleBlocks' }),
    type: select({ type: 'enum', options: [
      { label: 'Maintenance', value: 'maintenance' }, { label: 'Unavailable', value: 'unavailable' }, { label: 'Reserved', value: 'reserved' },
    ], defaultValue: 'unavailable', validation: { isRequired: true } }),
    startsAt: timestamp({ validation: { isRequired: true } }), endsAt: timestamp({ validation: { isRequired: true } }), reason: text({ validation: { isRequired: true } }),
    revision: integer({ defaultValue: 1, validation: { min: 1 } }), ...trackingFields,
  },
})
