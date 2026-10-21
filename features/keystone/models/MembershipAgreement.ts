import { list } from '@keystone-6/core'
import { integer, json, relationship, text, timestamp } from '@keystone-6/core/fields'
import { permissions } from '../access'
import { trackingFields } from './trackingFields'
import { tenantFilter } from './tenantAccess'

export const MembershipAgreement = list({
  access: { operation: { query: permissions.canManageFinance, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: relationship({ ref: 'Practice' }), clientMembership: relationship({ ref: 'ClientMembership.agreements' }), client: relationship({ ref: 'User' }), membership: relationship({ ref: 'Membership' }), termsVersion: text({ validation: { isRequired: true } }), termsHash: text({ validation: { isRequired: true } }), priceMinorSnapshot: integer({ validation: { isRequired: true, min: 0 } }), currencyCode: text({ validation: { isRequired: true } }), benefitSnapshot: json(), renewalDisclosure: json(), cancellationDisclosure: json(), affirmativeConsentHash: text({ validation: { isRequired: true } }), acceptedAt: timestamp({ validation: { isRequired: true } }), effectiveUntil: timestamp(), evidenceHash: text({ validation: { isRequired: true } }), idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }), ...trackingFields },
})
