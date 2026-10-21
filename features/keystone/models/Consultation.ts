import { list } from '@keystone-6/core'
import { checkbox, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const Consultation = list({
  access: {
    operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter },
  },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }),
    client: relationship({ ref: 'Client' }), appointment: relationship({ ref: 'Appointment.consultation' }), service: relationship({ ref: 'Service' }),
    provider: relationship({ ref: 'Provider.consultations' }),
    status: select({ type: 'enum', options: [
      { label: 'Requested', value: 'requested' }, { label: 'In Review', value: 'in_review' },
      { label: 'Completed', value: 'completed' }, { label: 'Needs Follow-up', value: 'needs_follow_up' }, { label: 'Closed', value: 'closed' },
    ], defaultValue: 'requested', validation: { isRequired: true } }),
    historySnapshot: json(), examinationSnapshot: json(), goalsSnapshot: json(), alternativesSnapshot: json(),
    summary: text({ ui: { displayMode: 'textarea' } }),
    indication: text(), candidacyDecision: select({ type: 'enum', options: ['candidate','deferred','declined','referred'].map(value => ({ label: value, value })) }),
    staffDecisionRecorded: checkbox({ defaultValue: false, ui: { description: 'Records that an authorized staff member completed review; not a diagnosis or safety claim.' } }),
    reviewedAt: timestamp(), signedAt: timestamp(), revision: text({ defaultValue: '1' }), protocolVersion: text(), contraindicationProtocolVersion: text(), contraindicationReviewHash: text(), evidenceHash: text(), idempotencyKey: text({ isIndexed: 'unique' }),
    supersedes: relationship({ ref: 'Consultation.supersededBy' }), supersededBy: relationship({ ref: 'Consultation.supersedes' }),
    orders: relationship({ ref: 'ClinicalOrder.consultation', many: true }), findings: relationship({ ref: 'ContraindicationFinding.consultation', many: true }),
    ...trackingFields,
  },
})
