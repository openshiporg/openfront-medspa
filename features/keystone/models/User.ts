import { list } from '@keystone-6/core'
import { denyAll } from '@keystone-6/core/access'
import { password, relationship, select, text } from '@keystone-6/core/fields'
import { activeListPermissions, rules } from '../access'
import { canUpdateOwnPassword } from '../userPasswordAccess'
import { isCustomerCreation } from '../customerCreation'
import { trackingFields } from './trackingFields'
import { capabilitiesWithinGrantAuthority, hasRoleAssignmentChange } from '../roleGrantPolicy'

export const User = list({
  access: {
    operation: {
      create: () => false,
      query: activeListPermissions.signedIn,
      update: activeListPermissions.signedIn,
      delete: () => false,
    },
    filter: { query: rules.canReadPeople, update: rules.canUpdatePeople },
  },
  hooks: { validateInput: async ({ operation, resolvedData, context, item, addValidationError }) => {
    if (operation === 'create' && !context.session?.itemId) {
      if (isCustomerCreation(context, resolvedData)) return
      const existingUsers = await context.sudo().query.User.count({});
      if (existingUsers === 0 && resolvedData.role) return
      return addValidationError('Unauthenticated user creation is limited to the one-time init account')
    }
    if (!resolvedData.role && !resolvedData.practice && !resolvedData.locations && resolvedData.status === undefined) return
    const actor = context.session?.itemId ? await context.sudo().query.User.findOne({ where: { id: context.session.itemId }, query: 'id status practice { id } role { id canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations }' }) : null
    if (!actor || actor.status !== 'active' || actor.role?.canManagePeople !== true || !actor.practice?.id) return addValidationError('Active people-management authority is required')
    if (Object.prototype.hasOwnProperty.call(resolvedData, 'practice')) {
      const practiceId = resolvedData.practice?.connect?.id
      if (resolvedData.practice?.disconnect || practiceId !== actor.practice.id) addValidationError('User practice cannot be removed or moved by this workflow')
    }
    if (hasRoleAssignmentChange(resolvedData)) {
      if (item?.id === actor.id) return addValidationError('You cannot change your own access role')
      if (actor.role?.canManageRoles !== true) return addValidationError('Independent role-management authority is required to assign roles')
      if (resolvedData.role?.create || resolvedData.role?.update) return addValidationError('Create or update roles through the controlled role workflow')
      const roleId = resolvedData.role?.connect?.id
      if (roleId) {
        const role = await context.sudo().query.Role.findOne({ where: { id: roleId }, query: 'id practice { id } canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations' })
        if (role?.practice?.id !== actor.practice.id) return addValidationError('Role must belong to the authenticated practice')
        if (!capabilitiesWithinGrantAuthority(role, actor.role)) return addValidationError('You cannot assign a role with capabilities you do not hold')
      }
    }
    const locationIds = [...(resolvedData.locations?.connect || []), ...(resolvedData.locations?.set || [])].map((value: any) => value.id)
    if (locationIds.length) { const count = await context.sudo().query.Location.count({ where: { id: { in: locationIds }, practice: { id: { equals: actor.practice.id } } } }); if (count !== new Set(locationIds).size) return addValidationError('Locations must belong to the authenticated practice') }
  } },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ['name', 'email', 'role', 'practice'] },
  },
  fields: {
    name: text({ access: { update: canUpdateOwnPassword }, validation: { isRequired: true } }),
    email: text({
      isIndexed: 'unique', access: { update: canUpdateOwnPassword }, validation: { isRequired: true },
      hooks: { resolveInput: ({ resolvedData, fieldKey }) => typeof resolvedData[fieldKey] === 'string' ? resolvedData[fieldKey].trim().toLowerCase() : resolvedData[fieldKey] },
    }),
    password: password({
      access: {
        read: denyAll,
        update: canUpdateOwnPassword,
      },
      validation: { isRequired: true },
    }),
    phone: text({ access: { update: canUpdateOwnPassword } }),
    role: relationship({
      ref: 'Role.assignedTo',
      access: { create: activeListPermissions.canManagePeople, update: () => false },
    }),
    practice: relationship({ ref: 'Practice.users', access: { create: activeListPermissions.canManagePeople, update: activeListPermissions.canManagePeople } }),
    locations: relationship({ ref: 'Location.staff', many: true, access: { create: activeListPermissions.canManagePeople, update: activeListPermissions.canManagePeople } }),
    memberships: relationship({ ref: 'PracticeMembership.user', many: true, access: { create: () => false, update: () => false } }),
    providerProfile: relationship({ ref: 'Provider.user', access: { create: () => false, update: () => false } }),
    clientProfile: relationship({ ref: 'Client.user', access: { create: () => false, update: () => false } }),
    formSubmissions: relationship({ ref: 'FormSubmission.client', many: true, access: { create: () => false, update: () => false } }),
    clientPackages: relationship({ ref: 'ClientPackage.client', many: true, access: { create: () => false, update: () => false } }),
    clientMemberships: relationship({ ref: 'ClientMembership.client', many: true, access: { create: () => false, update: () => false } }),
    purchasedGiftCards: relationship({ ref: 'GiftCard.purchasedBy', many: true, access: { create: () => false, update: () => false } }),
    clientPointsRecords: relationship({ ref: 'ClientPoints.client', many: true, access: { create: () => false, update: () => false } }),
    referralsMade: relationship({ ref: 'Referral.referrer', many: true, access: { create: () => false, update: () => false } }),
    referralsReceived: relationship({ ref: 'Referral.referred', many: true, access: { create: () => false, update: () => false } }),
    messageLogs: relationship({ ref: 'MessageLog.recipient', many: true, access: { create: () => false, update: () => false } }),
    onboardingStatus: select({
      access: { update: activeListPermissions.canManageOnboarding },
      type: 'enum',
      options: [
        { label: 'Not Started', value: 'not_started' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Dismissed', value: 'dismissed' },
      ],
      defaultValue: 'not_started',
      validation: { isRequired: true },
    }),
    status: select({
      access: { update: canUpdateOwnPassword },
      type: 'enum',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Disabled', value: 'disabled' },
      ],
      defaultValue: 'active',
      validation: { isRequired: true },
    }),
    ...trackingFields,
  },
})
