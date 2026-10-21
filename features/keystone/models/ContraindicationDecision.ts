import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ContraindicationDecision = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), finding: relationship({ ref: 'ContraindicationFinding.decisions' }), decidedBy: relationship({ ref: 'Provider' }),
    disposition: select({ type: 'enum', options: ['cleared_with_rationale','deferred','hard_stop','referred','reopened'].map(value => ({ label: value, value })), validation: { isRequired: true } }),
    rationale: text({ validation: { isRequired: true } }), authorityEvidence: json(), evidenceHash: text({ validation: { isRequired: true } }), decidedAt: timestamp({ validation: { isRequired: true } }), expiresAt: timestamp(), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    ...trackingFields,
  },
})
