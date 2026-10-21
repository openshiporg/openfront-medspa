import { list } from '@keystone-6/core'
import { checkbox, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ProviderCredential = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), provider: relationship({ ref: 'Provider.credentials' }), location: relationship({ ref: 'Location' }),
    licenseType: text({ validation: { isRequired: true } }), licenseNumber: text({ validation: { isRequired: true } }), jurisdiction: text({ validation: { isRequired: true } }),
    status: select({ type: 'enum', options: ['pending','verified','restricted','suspended','expired','revoked'].map(value => ({ label: value, value })), defaultValue: 'pending', validation: { isRequired: true } }),
    effectiveFrom: timestamp({ validation: { isRequired: true } }), expiresAt: timestamp({ validation: { isRequired: true } }), verifiedAt: timestamp(), verificationSource: text(),
    primarySourceVerified: checkbox({ defaultValue: false }), authorizations: relationship({ ref: 'ProviderAuthorization.credential', many: true }), supervisionRequired: checkbox({ defaultValue: false }), supervisor: relationship({ ref: 'Provider' }),
    scopeEvidenceHash: text({ validation: { isRequired: true } }), evidenceReference: text(), protocolVersion: text(), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    ...trackingFields,
  },
})
