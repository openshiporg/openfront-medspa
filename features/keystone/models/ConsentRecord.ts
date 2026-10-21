import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ConsentRecord = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), client: relationship({ ref: 'Client' }), appointment: relationship({ ref: 'Appointment.consents' }), service: relationship({ ref: 'Service' }), templateVersion: relationship({ ref: 'ConsentTemplateVersion.records' }), presentedBy: relationship({ ref: 'Provider' }),
    status: select({ type: 'enum', options: ['effective','withdrawn','expired','superseded','invalidated'].map(value => ({ label: value, value })), defaultValue: 'effective', validation: { isRequired: true } }),
    signerName: text({ validation: { isRequired: true } }), signerRole: select({ type: 'enum', options: ['self','parent','guardian','representative'].map(value => ({ label: value, value })), validation: { isRequired: true } }), representativeAuthority: text(), interpreter: text(), witness: text(),
    discussionEvidence: json(), signatureEvidenceHash: text({ validation: { isRequired: true } }), evidenceHash: text({ validation: { isRequired: true } }), signedAt: timestamp({ validation: { isRequired: true } }), effectiveUntil: timestamp(), withdrawnAt: timestamp(),
    supersedes: relationship({ ref: 'ConsentRecord.supersededBy' }), supersededBy: relationship({ ref: 'ConsentRecord.supersedes' }), actions: relationship({ ref: 'ConsentAction.consent', many: true }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    ...trackingFields,
  },
})
