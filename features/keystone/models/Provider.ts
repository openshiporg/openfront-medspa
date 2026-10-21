import { list } from '@keystone-6/core'
import { checkbox, float, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { activeListPermissions, rules } from '../access'
import { createLifecycleHooks } from '../lifecycle'
import { trackingFields } from './trackingFields'

export const Provider = list({
  access: {
    operation: { query: () => true, create: () => false, update: () => false, delete: () => false },
    filter: {
      query: rules.canReadProviders,
    },
  },
  hooks: createLifecycleHooks('provider', ['status', 'userId', 'practiceId']),
  ui: { listView: { initialColumns: ['user', 'status', 'locations', 'isPublic'] } },
  fields: {
    practice: relationship({ ref: 'Practice' }),
    user: relationship({ ref: 'User.providerProfile' }),
    title: text({ ui: { description: 'Configured staff title; not a licensure verification claim.' } }),
    tier: select({ type: 'enum', options: [
      { label: 'Associate', value: 'junior' }, { label: 'Senior', value: 'senior' }, { label: 'Lead', value: 'master' }, { label: 'Specialist', value: 'celebrity' },
    ], defaultValue: 'junior' }),
    role: select({ type: 'enum', options: [
      { label: 'Provider', value: 'provider' }, { label: 'Esthetician', value: 'esthetician' }, { label: 'Nurse', value: 'nurse' },
      { label: 'Physician', value: 'physician' }, { label: 'Assistant', value: 'assistant' },
    ], defaultValue: 'provider' }),
    baseCommissionRate: float({ access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false }, defaultValue: 0, validation: { min: 0, max: 1 } }),
    commissionRate: float({ access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false }, defaultValue: 0, validation: { min: 0, max: 1 } }),
    bio: text({ ui: { displayMode: 'textarea' } }),
    isActive: checkbox({ defaultValue: false }),
    status: select({ type: 'enum', options: [
      { label: 'Active', value: 'active' }, { label: 'On Leave', value: 'on_leave' }, { label: 'Inactive', value: 'inactive' },
    ], defaultValue: 'inactive', validation: { isRequired: true } }),
    isPublic: checkbox({ defaultValue: false }),
    hireDate: timestamp({ access: { read: activeListPermissions.canAccessDashboard, create: () => false, update: () => false } }),
    employmentType: select({ access: { read: activeListPermissions.canAccessDashboard, create: () => false, update: () => false }, type: 'enum', options: [
      { label: 'Full-time', value: 'full_time' }, { label: 'Part-time', value: 'part_time' }, { label: 'Contractor', value: 'contractor' },
    ] }),
    photo: relationship({ ref: 'MedSpaImage' }),
    specializations: relationship({ ref: 'Service.specialists', many: true }),
    locations: relationship({ ref: 'Location.providers', many: true }),
    schedules: relationship({ ref: 'ProviderSchedule.provider', many: true }),
    appointments: relationship({ ref: 'Appointment.provider', many: true }),
    preferredByClients: relationship({ ref: 'Client.preferredProvider', many: true }),
    credentials: relationship({ ref: 'ProviderCredential.provider', many: true }),
    authorizations: relationship({ ref: 'ProviderAuthorization.provider', many: true }),
    consultations: relationship({ ref: 'Consultation.provider', many: true }),
    treatmentSessions: relationship({ ref: 'TreatmentSession.provider', many: true }),
    waitlistEntries: relationship({ ref: 'WaitlistEntry.preferredProviders', many: true }),
    reviews: relationship({ ref: 'Review.provider', many: true }),
    ...trackingFields,
  },
})
