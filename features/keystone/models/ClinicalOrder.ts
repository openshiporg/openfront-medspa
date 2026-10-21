import { list } from '@keystone-6/core'
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ClinicalOrder = list({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), client: relationship({ ref: 'Client' }), consultation: relationship({ ref: 'Consultation.orders' }), plan: relationship({ ref: 'TreatmentPlan.orders' }), service: relationship({ ref: 'Service' }),
    orderedBy: relationship({ ref: 'Provider' }), authorizedPerformer: relationship({ ref: 'Provider' }), requiredSupervisor: relationship({ ref: 'Provider' }),
    status: select({ type: 'enum', options: ['active','partially_fulfilled','fulfilled','held','revoked','expired','entered_in_error'].map(value => ({ label: value, value })), defaultValue: 'active', validation: { isRequired: true } }),
    instructionSnapshot: json(), protocolVersion: text({ validation: { isRequired: true } }), indication: text({ validation: { isRequired: true } }), anatomicSite: text(), doseRange: text(), performerConstraints: text(), supervisionSnapshot: text(),
    signedAt: timestamp({ validation: { isRequired: true } }), validFrom: timestamp({ validation: { isRequired: true } }), validUntil: timestamp({ validation: { isRequired: true } }),
    evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), supersedes: relationship({ ref: 'ClinicalOrder.supersededBy' }), supersededBy: relationship({ ref: 'ClinicalOrder.supersedes' }), actions: relationship({ ref: 'ClinicalOrderAction.order', many: true }), administrations: relationship({ ref: 'TreatmentAdministration.order', many: true }),
    ...trackingFields,
  },
})
