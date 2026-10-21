import { list } from '@keystone-6/core'
import { checkbox, json, relationship, select, text, timestamp } from '@keystone-6/core/fields'
import { denyAll } from '@keystone-6/core/access'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const ClientAsset = list({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: relationship({ ref: 'Practice' }), client: relationship({ ref: 'Client' }), appointment: relationship({ ref: 'Appointment.assets' }), treatmentSession: relationship({ ref: 'TreatmentSession' }), incident: relationship({ ref: 'Incident.assets' }), note: relationship({ ref: 'ClientNote.assets' }), photoConsent: relationship({ ref: 'PhotoConsent.assets' }),
    category: select({ type: 'enum', options: [
      { label: 'Photo', value: 'photo' }, { label: 'Document', value: 'document' }, { label: 'Intake Attachment', value: 'intake_attachment' }, { label: 'Incident Attachment', value: 'incident_attachment' },
    ], validation: { isRequired: true } }),
    purpose: text({ validation: { isRequired: true } }), storageKey: text({ validation: { isRequired: true }, access: { read: denyAll } }),
    encryptionKeyReference: text({ validation: { isRequired: true }, access: { read: denyAll } }), storageRegion: text({ validation: { isRequired: true } }),
    originalFilename: text(), contentType: text({ validation: { isRequired: true } }), byteSize: text({ validation: { isRequired: true } }), checksum: text({ access: { read: denyAll } }),
    status: select({ type: 'enum', options: [
      { label: 'Quarantined', value: 'quarantined' }, { label: 'Ready', value: 'ready' }, { label: 'Tombstoned', value: 'tombstoned' },
    ], defaultValue: 'quarantined', validation: { isRequired: true } }),
    releasedToClient: checkbox({ defaultValue: false }), accessClass: select({ type: 'enum', options: ['clinical_restricted','incident_restricted','client_released','marketing_authorized'].map(value => ({ label: value, value })), defaultValue: 'clinical_restricted', validation: { isRequired: true } }),
    retentionClass: text({ validation: { isRequired: true } }), retainUntil: timestamp(), legalHold: checkbox({ defaultValue: false }), deletionRequestedAt: timestamp(), tombstonedAt: timestamp(),
    uploadedBy: relationship({ ref: 'User' }), readyAt: timestamp(), metadata: json(), accessEvents: relationship({ ref: 'AssetAccessEvent.asset', many: true }), ...trackingFields,
  },
})
