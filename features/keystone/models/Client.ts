import { list } from '@keystone-6/core'
import { checkbox, integer, relationship, text, timestamp } from '@keystone-6/core/fields'
import { rules } from '../access'
import { createLifecycleHooks } from '../lifecycle'
import { trackingFields } from './trackingFields'

export const Client = list({
  access: {
    operation: { query: () => true, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadClients },
  },
  hooks: createLifecycleHooks('client', ['userId', 'practiceId', 'preferredProviderId', 'homeLocationId', 'marketingConsent']),
  ui: { listView: { initialColumns: ['user', 'practice', 'preferredProvider', 'totalVisits', 'lifetimeValue'] } },
  fields: {
    practice: relationship({ ref: 'Practice' }),
    user: relationship({ ref: 'User.clientProfile' }),
    homeLocation: relationship({ ref: 'Location.clients' }),
    preferredProvider: relationship({ ref: 'Provider.preferredByClients' }),
    dateOfBirth: timestamp(),
    contactPreferences: text(),
    operationalNotes: text({ ui: { displayMode: 'textarea', description: 'Non-clinical scheduling preferences only.' } }),
    firstVisit: timestamp(), lastVisit: timestamp(), totalVisits: integer({ defaultValue: 0, validation: { min: 0 } }),
    lifetimeValue: integer({ defaultValue: 0, validation: { min: 0 }, ui: { description: 'Lifetime value in integer minor units.' } }),
    marketingConsent: checkbox({ defaultValue: false }), photoMarketingConsent: checkbox({ defaultValue: false }),
    appointments: relationship({ ref: 'Appointment.client', many: true }),
    reviews: relationship({ ref: 'Review.client', many: true }),
    ...trackingFields,
  },
})
