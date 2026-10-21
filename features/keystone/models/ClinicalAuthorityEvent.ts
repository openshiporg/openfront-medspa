import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ClinicalAuthorityEvent = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), provider: relationship({ ref: 'Provider' }), supervisor: relationship({ ref: 'Provider' }),
    credential: relationship({ ref: 'ProviderCredential' }), authorization: relationship({ ref: 'ProviderAuthorization' }), service: relationship({ ref: 'Service' }), client: relationship({ ref: 'Client' }), appointment: relationship({ ref: 'Appointment' }), treatmentSession: relationship({ ref: 'TreatmentSession' }),
    stage: select({ type: 'enum', options: ['scheduling','order','consent','treatment_start','administration','completion'].map(value => ({ label: value, value })), validation: { isRequired: true } }),
    decision: select({ type: 'enum', options: ['allowed','denied','review_required'].map(value => ({ label: value, value })), validation: { isRequired: true } }),
    reason: text({ validation: { isRequired: true } }), policyVersion: text({ validation: { isRequired: true } }), evidence: json(), evidenceHash: text({ validation: { isRequired: true } }), decidedAt: timestamp({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    ...trackingFields,
  },
})
