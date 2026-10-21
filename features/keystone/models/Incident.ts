import { list } from '@keystone-6/core'
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const Incident = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), location: relationship({ ref: 'Location' }), client: relationship({ ref: 'Client' }), appointment: relationship({ ref: 'Appointment' }), treatmentSession: relationship({ ref: 'TreatmentSession' }), administration: relationship({ ref: 'TreatmentAdministration.incidents' }),
    suspectLot: relationship({ ref: 'InventoryLot' }), suspectDevice: relationship({ ref: 'Resource' }),
    reportedBy: relationship({ ref: 'User' }), assignedTo: relationship({ ref: 'User' }), occurredAt: timestamp({ validation: { isRequired: true } }), summary: text({ validation: { isRequired: true }, ui: { displayMode: 'textarea' } }),
    severity: select({ type: 'enum', options: [
      { label: 'Low', value: 'low' }, { label: 'Moderate', value: 'moderate' }, { label: 'High', value: 'high' }, { label: 'Critical', value: 'critical' },
    ], validation: { isRequired: true } }),
    status: select({ type: 'enum', options: [
      { label: 'Open', value: 'open' }, { label: 'Under Review', value: 'under_review' }, { label: 'Closed', value: 'closed' },
    ], defaultValue: 'open', validation: { isRequired: true } }),
    triageDisposition: text(), interventions: json(), emergencyTransferEvidence: json(), regulatoryStatus: text({ defaultValue: 'reportability_pending' }), qualityStatus: text({ defaultValue: 'investigating' }),
    revision: integer({ defaultValue: 1, validation: { min: 1 } }), closedAt: timestamp(), evidenceHash: text(), idempotencyKey: text({ isIndexed: 'unique' }),
    assets: relationship({ ref: 'ClientAsset.incident', many: true }), actions: relationship({ ref: 'IncidentAction.incident', many: true }), ...trackingFields,
  },
})
