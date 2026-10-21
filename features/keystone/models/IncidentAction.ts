import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const IncidentAction = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), incident: relationship({ ref: 'Incident.actions' }), actor: relationship({ ref: 'User' }), clinician: relationship({ ref: 'Provider' }), action: select({ type: 'enum', options: ['report','triage','clinical_review','intervention','referral','emergency_transfer','manufacturer_notice','regulatory_decision','regulatory_submit','capa_assign','capa_verify','clinical_resolve','close'].map(value => ({ label: value, value })), validation: { isRequired: true } }), fromStatus: text(), toStatus: text({ validation: { isRequired: true } }), severity: text(), rationale: text({ validation: { isRequired: true } }), evidence: json(), evidenceHash: text({ validation: { isRequired: true } }), occurredAt: timestamp({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
