import { list } from '@keystone-6/core'
import { checkbox, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ProviderAuthorization = list({
  access: {
    operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter },
  },
  fields: {
    practice: relationship({ ref: 'Practice' }),
    location: relationship({ ref: 'Location' }),
    provider: relationship({ ref: 'Provider.authorizations' }),
    service: relationship({ ref: 'Service' }),
    credential: relationship({ ref: 'ProviderCredential.authorizations' }),
    requiredSupervisor: relationship({ ref: 'Provider' }),
    status: select({ type: 'enum', options: [
      { label: 'Active', value: 'active' }, { label: 'Suspended', value: 'suspended' }, { label: 'Expired', value: 'expired' },
    ], defaultValue: 'active', validation: { isRequired: true } }),
    effectiveFrom: timestamp({ validation: { isRequired: true } }),
    effectiveTo: timestamp(),
    supervisionRequired: checkbox({ defaultValue: false }),
    supervisionMode: text(),
    policyVersion: text({ validation: { isRequired: true } }),
    authorityEvidenceHash: text({ validation: { isRequired: true } }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    evidenceLabel: text({ ui: { description: 'Configured authorization evidence; not a licensure verification claim.' } }),
    evidenceReference: text(),
    ...trackingFields,
  },
})
