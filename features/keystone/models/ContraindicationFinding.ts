import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ContraindicationFinding = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), client: relationship({ ref: 'Client' }), consultation: relationship({ ref: 'Consultation.findings' }), service: relationship({ ref: 'Service' }),
    ruleCode: text({ validation: { isRequired: true } }), ruleVersion: text({ validation: { isRequired: true } }), sourceEvidence: json(), sourceEvidenceHash: text({ validation: { isRequired: true } }),
    severity: select({ type: 'enum', options: ['information','precaution','clinician_review','hard_stop'].map(value => ({ label: value, value })), validation: { isRequired: true } }),
    detectedAt: timestamp({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), decisions: relationship({ ref: 'ContraindicationDecision.finding', many: true }),
    ...trackingFields,
  },
})
