import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const PhotoConsent = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), client: relationship({ ref: 'Client' }), appointment: relationship({ ref: 'Appointment' }),
    purpose: select({ type: 'enum', options: ['clinical_care','measurement','education','marketing'].map(value => ({ label: value, value })), validation: { isRequired: true } }),
    status: select({ type: 'enum', options: ['granted','partially_withdrawn','withdrawn','expired','superseded'].map(value => ({ label: value, value })), defaultValue: 'granted', validation: { isRequired: true } }),
    mediaScope: json(), audienceScope: json(), compensationDisclosure: text(), signerName: text({ validation: { isRequired: true } }), signerRole: text({ validation: { isRequired: true } }), signatureEvidenceHash: text({ validation: { isRequired: true } }),
    effectiveFrom: timestamp({ validation: { isRequired: true } }), effectiveUntil: timestamp(), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), actions: relationship({ ref: 'PhotoConsentAction.consent', many: true }), assets: relationship({ ref: 'ClientAsset.photoConsent', many: true }),
    ...trackingFields,
  },
})
