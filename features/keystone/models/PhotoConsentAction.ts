import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const PhotoConsentAction = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), consent: relationship({ ref: 'PhotoConsent.actions' }), actor: relationship({ ref: 'User' }), action: select({ type: 'enum', options: ['grant','partial_withdrawal','withdrawal','expire','supersede','publication_record','takedown_attempt'].map(value => ({ label: value, value })), validation: { isRequired: true } }), reason: text({ validation: { isRequired: true } }), scope: json(), occurredAt: timestamp({ validation: { isRequired: true } }), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
