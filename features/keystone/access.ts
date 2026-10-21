import { currentSchedulerReadScope } from './appointmentSchedulingAuthority';

export type Session = {
  itemId: string
  listKey: string
  data: {
    name: string
    email?: string
    status?: "active" | "disabled"
    practice?: { id: string } | null
    locations?: { id: string }[]
    role?: {
      id: string
      name: string
      practice?: { id: string } | null
      canCreateTodos?: boolean
      canManageAllTodos?: boolean
      canSeeOtherPeople?: boolean
      canEditOtherPeople?: boolean
      canManagePeople: boolean
      canManageRoles: boolean
      canAccessDashboard: boolean
      canManageOnboarding: boolean
      canManagePractice: boolean
      canSchedule: boolean
      canReadClients: boolean
      canManageClinical: boolean
      canManageSensitiveRecords: boolean
      canManageInventory: boolean
      canManageFinance: boolean
      canManageCommunications: boolean
      canViewReports: boolean
      canManageIntegrations: boolean
    } | null
  }
}

export type AccessArgs = { session?: Session; context?: any }

export function isSignedIn({ session }: AccessArgs) {
  return Boolean(session?.itemId) && session?.data.status !== "disabled"
}

const roleFlag = (session: Session | undefined, key: keyof NonNullable<Session["data"]["role"]>) =>
  session?.data.status !== "disabled" && session?.data.role?.[key] === true

async function freshActor(args: AccessArgs) {
  const session = args.session
  if (!session?.itemId || !args.context) return null
  const actor = await args.context.sudo().query.User.findOne({
    where: { id: session.itemId },
    query: `id status practice { id } role { id practice { id }
      canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients
      canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations
    }`,
  })
  if (!actor || actor.status !== "active" || actor.practice?.id !== session.data.practice?.id) return null
  if (actor.role?.id !== session.data.role?.id || (actor.practice?.id && actor.role && actor.role.practice?.id !== actor.practice.id)) return null
  for (const key of ["canManagePeople","canManageRoles","canAccessDashboard","canManageOnboarding","canManagePractice","canSchedule","canReadClients","canManageClinical","canManageSensitiveRecords","canManageInventory","canManageFinance","canManageCommunications","canViewReports","canManageIntegrations"]) {
    if ((session.data.role as any)?.[key] === true && actor.role?.[key] !== true) return null
  }
  return actor
}

const activeRole = (key: string) => async (args: AccessArgs) => (await freshActor(args))?.role?.[key] === true
export const activeListPermissions = {
  signedIn: async (args: AccessArgs) => Boolean(await freshActor(args)),
  canManagePeople: activeRole("canManagePeople"), canManageRoles: activeRole("canManageRoles"), canAccessDashboard: activeRole("canAccessDashboard"),
  canManageOnboarding: activeRole("canManageOnboarding"), canManagePractice: activeRole("canManagePractice"), canSchedule: activeRole("canSchedule"),
  canReadClients: activeRole("canReadClients"), canManageClinical: activeRole("canManageClinical"), canManageSensitiveRecords: activeRole("canManageSensitiveRecords"),
  canManageInventory: activeRole("canManageInventory"), canManageFinance: activeRole("canManageFinance"), canManageCommunications: activeRole("canManageCommunications"),
  canViewReports: activeRole("canViewReports"), canManageIntegrations: activeRole("canManageIntegrations"),
}

export const permissions = {
  canCreateTodos: ({ session }: AccessArgs) => roleFlag(session, "canCreateTodos"),
  canManageAllTodos: ({ session }: AccessArgs) => roleFlag(session, "canManageAllTodos"),
  canManagePeople: ({ session }: AccessArgs) => roleFlag(session, "canManagePeople"),
  canManageRoles: ({ session }: AccessArgs) => roleFlag(session, "canManageRoles"),
  canAccessDashboard: ({ session }: AccessArgs) => roleFlag(session, "canAccessDashboard"),
  canManageOnboarding: ({ session }: AccessArgs) => roleFlag(session, "canManageOnboarding"),
  canManagePractice: ({ session }: AccessArgs) => roleFlag(session, "canManagePractice"),
  canSchedule: ({ session }: AccessArgs) => roleFlag(session, "canSchedule"),
  canReadClients: ({ session }: AccessArgs) => roleFlag(session, "canReadClients"),
  // Medical-practice authority is explicit. General practice administration must
  // never imply clinical, sensitive-record, inventory, finance, or integration scope.
  canManageClinical: ({ session }: AccessArgs) => roleFlag(session, "canManageClinical"),
  canManageSensitiveRecords: ({ session }: AccessArgs) => roleFlag(session, "canManageSensitiveRecords"),
  canManageInventory: ({ session }: AccessArgs) => roleFlag(session, "canManageInventory"),
  canManageFinance: ({ session }: AccessArgs) => roleFlag(session, "canManageFinance"),
  canManageCommunications: ({ session }: AccessArgs) => roleFlag(session, "canManageCommunications"),
  canViewReports: ({ session }: AccessArgs) => roleFlag(session, "canViewReports"),
  canManageIntegrations: ({ session }: AccessArgs) => roleFlag(session, "canManageIntegrations"),
  // Compatibility alias for inherited Med Spa workflow code. It deliberately means
  // dashboard access only; sensitive domain Lists use narrower capabilities below.
  canOperateMedSpa: ({ session }: AccessArgs) => roleFlag(session, "canAccessDashboard"),
}

export function practiceId(session?: Session) {
  return session?.data.practice?.id || null
}

export function locationIds(session?: Session) {
  return (session?.data.locations || []).map(location => location.id)
}

function practiceFilter(session?: Session) {
  const id = practiceId(session)
  return id ? { practice: { id: { equals: id } } } : false
}

async function actorScope(args: AccessArgs) {
  const actor = await freshActor(args)
  if (!actor?.practice?.id) return null
  return { actor, actorId: actor.id as string, practiceId: actor.practice.id as string, role: actor.role || {} }
}
const scopedPractice = (id: string) => ({ practice: { id: { equals: id } } })
const ownedInPractice = (id: string, owner: Record<string, unknown>) => ({ AND: [scopedPractice(id), owner] })
const ownedAppointmentsInPractice = (practiceId: string, actorId: string) => ({
  AND: [scopedPractice(practiceId), { client: { user: { id: { equals: actorId } } } }],
})

const publishedPractice = { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } }
function publicCatalogInPractice(scope: { practiceId: string } | null, predicate: Record<string, unknown>) {
  const filter = { ...predicate, practice: publishedPractice }
  return scope ? { AND: [scopedPractice(scope.practiceId), filter] } : filter
}

export const rules = {
  canReadTodos: () => false,
  canManageTodos: () => false,
  canReadRoles: async (args: AccessArgs) => { const actor = await freshActor(args); if (!actor) return false; return actor.practice?.id ? scopedPractice(actor.practice.id) : { assignedTo: { some: { id: { equals: actor.id as string } } } } },
  canReadPeople: async (args: AccessArgs) => { const actor = await freshActor(args); if (!actor) return false; const self = { id: { equals: actor.id as string } }; if (!actor.practice?.id) return self; return actor.role?.canManagePeople ? { OR: [scopedPractice(actor.practice.id), self] } : self },
  canUpdatePeople: async (args: AccessArgs) => { const actor = await freshActor(args); if (!actor) return false; const self = { id: { equals: actor.id as string } }; if (!actor.practice?.id) return self; return actor.role?.canManagePeople ? scopedPractice(actor.practice.id) : self },
  canReadClients: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canReadClients || scope.role.canSchedule || scope.role.canManageClinical ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { user: { id: { equals: scope.actorId } } }) },
  canReadAppointments: async (args: AccessArgs) => {
    const scope = await actorScope(args); if (!scope) return false;
    // Finance remains a separately granted practice purpose, NOT scheduling/clinical authority.
    if (scope.role.canManageFinance) return scopedPractice(scope.practiceId);
    if (scope.role.canSchedule) {
      try {
        if (!args.context) return false;
        const scheduler = await currentSchedulerReadScope(args.context);
        return scheduler.practiceWide ? scopedPractice(scheduler.practiceId) : { AND: [scopedPractice(scheduler.practiceId), { location: { id: { in: scheduler.locationIds } } }] };
      } catch { return false; }
    }
    return scope.role.canManageClinical ? scopedPractice(scope.practiceId) : ownedAppointmentsInPractice(scope.practiceId, scope.actorId);
  },
  canReadServices: async (args: AccessArgs) => { const scope = await actorScope(args); if (scope && (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice)) return scopedPractice(scope.practiceId); return { status: { equals: "active" }, isPublic: { equals: true }, practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } }; },
  canReadServiceRelationships: async (args: AccessArgs) => { const scope = await actorScope(args); return Boolean(scope && (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice)); },
  canReadServiceCategories: async (args: AccessArgs) => {
    const scope = await actorScope(args)
    const publicCategories = { isVisible: { equals: true }, practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } }, services: { some: { status: { equals: "active" as const }, isPublic: { equals: true } } } }
    if (!scope) return publicCategories
    if (scope.role.canManagePractice) return scopedPractice(scope.practiceId)
    if (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical) {
      return { AND: [scopedPractice(scope.practiceId), publicCategories] }
    }
    return publicCategories
  },
  canReadMedSpaImages: async (args: AccessArgs) => { const scope = await actorScope(args); if (scope && (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice)) return scopedPractice(scope.practiceId); return { practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } }; },
  // Public ServiceVariant reads lack a bounded same-practice relationship projection.
  // Keep variants operator-only; the public Service catalog has its own read boundary.
  canReadServiceVariants: async (args: AccessArgs) => {
    const scope = await actorScope(args)
    if (!scope) return false
    return scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice
      ? scopedPractice(scope.practiceId)
      : false
  },
  canReadProducts: async (args: AccessArgs) => {
    const scope = await actorScope(args)
    return scope && (scope.role.canAccessDashboard || scope.role.canManageInventory || scope.role.canManageFinance || scope.role.canManagePractice || scope.role.canManageClinical || scope.role.canSchedule) ? scopedPractice(scope.practiceId) : false
  },
  canReadMembershipCatalog: async (args: AccessArgs) => {
    const scope = await actorScope(args)
    return scope?.role.canManageFinance ? scopedPractice(scope.practiceId) : publicCatalogInPractice(scope, { isActive: { equals: true } })
  },
  canReadReviews: async (args: AccessArgs) => {
    const scope = await actorScope(args)
    return scope && (scope.role.canAccessDashboard || scope.role.canManagePractice || scope.role.canManageCommunications) ? scopedPractice(scope.practiceId) : publicCatalogInPractice(scope, { isApproved: { equals: true } })
  },
  canReadProviders: async (args: AccessArgs) => { const scope = await actorScope(args); if (scope && (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice)) return scopedPractice(scope.practiceId); return { status: { equals: "active" }, isActive: { equals: true }, isPublic: { equals: true }, practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } }; },
  canReadProviderSchedules: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canSchedule ? scopedPractice(scope.practiceId) : { isAvailable: { equals: true }, isPublic: { equals: true }, type: { in: ["recurring", "one_time"] }, provider: { status: { equals: "active" }, isActive: { equals: true }, isPublic: { equals: true }, practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } } } },
  canReadAppointmentLineItems: async (args: AccessArgs) => { const appointmentScope = await rules.canReadAppointments(args); return appointmentScope ? { appointment: appointmentScope } : false },
  canReadPayments: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { appointment: { client: { user: { id: { equals: scope.actorId } } } } }) },
  canReadMedSpaTransactions: async (args: AccessArgs) => {
    const scope = await actorScope(args); if (!scope) return false;
    return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { user: { id: { equals: scope.actorId } } } });
  },
  canReadMedSpaTransactionLineItems: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return ownedInPractice(scope.practiceId, scope.role.canManageFinance ? { transaction: scopedPractice(scope.practiceId) } : { transaction: { AND: [scopedPractice(scope.practiceId), { client: { user: { id: { equals: scope.actorId } } } }] } }) },
  canReadFormSubmissions: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canManageClinical ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { id: { equals: scope.actorId } } }) },
  canReadClientPackages: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canManageFinance || scope.role.canSchedule ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { id: { equals: scope.actorId } } }) },
  canReadClientPackageUsages: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canManageFinance || scope.role.canSchedule ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { clientPackage: { client: { id: { equals: scope.actorId } } } }) },
  canReadClientMemberships: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canManageFinance || scope.role.canSchedule ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { id: { equals: scope.actorId } } }) },
  canReadGiftCards: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { purchasedBy: { id: { equals: scope.actorId } } }) },
  canReadGiftCardTransactions: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { giftCard: { purchasedBy: { id: { equals: scope.actorId } } } }) },
  canReadClientPoints: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canReadClients ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { id: { equals: scope.actorId } } }) },
  canReadReferrals: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canReadClients ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { OR: [{ referrer: { id: { equals: scope.actorId } } }, { referred: { id: { equals: scope.actorId } } }] }) },
  canReadMessageLogs: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canManageCommunications ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { recipient: { id: { equals: scope.actorId } } }) },
  canReadProductSales: async (args: AccessArgs) => { const scope = await actorScope(args); if (!scope) return false; return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { appointment: { client: { user: { id: { equals: scope.actorId } } } } }) },
  canReadCommissions: async (args: AccessArgs) => {
    const scope = await actorScope(args); if (!scope) return false;
    return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { provider: { user: { id: { equals: scope.actorId } } } });
  },
}
