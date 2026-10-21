"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// features/integrations/payment/manual.ts
var manual_exports = {};
__export(manual_exports, {
  manualPaymentAdapter: () => manualPaymentAdapter
});
var reference, manualPaymentAdapter;
var init_manual = __esm({
  "features/integrations/payment/manual.ts"() {
    "use strict";
    reference = (idempotencyKey) => `manual_${idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    manualPaymentAdapter = {
      async createSession({ amount, currency, idempotencyKey }) {
        return {
          status: "pending",
          providerReference: reference(idempotencyKey),
          clientSecret: null,
          data: { amount, currency: currency.toLowerCase() }
        };
      },
      async confirm({ providerReference, amount }) {
        return {
          status: "completed",
          providerReference,
          amount,
          data: { completedAt: (/* @__PURE__ */ new Date()).toISOString() }
        };
      },
      async refund({ providerReference, amount }) {
        return {
          status: "refunded",
          providerReference,
          amount,
          data: { refundedAt: (/* @__PURE__ */ new Date()).toISOString() }
        };
      },
      async parseWebhook() {
        return { isValid: false, eventId: "unsupported", type: "unsupported", providerReference: null, status: null };
      }
    };
  }
});

// features/integrations/payment/stripe.ts
var stripe_exports = {};
__export(stripe_exports, {
  stripePaymentAdapter: () => stripePaymentAdapter
});
function stripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured");
  return new import_stripe.default(secretKey);
}
function mapStatus(status) {
  if (status === "succeeded") return "completed";
  if (status === "requires_action" || status === "requires_payment_method" || status === "requires_confirmation") return "requires_action";
  if (status === "processing") return "authorized";
  if (status === "canceled") return "cancelled";
  return "pending";
}
var import_stripe, stripePaymentAdapter;
var init_stripe = __esm({
  "features/integrations/payment/stripe.ts"() {
    "use strict";
    import_stripe = __toESM(require("stripe"));
    stripePaymentAdapter = {
      async createSession({ amount, currency, idempotencyKey, metadata }) {
        const intent = await stripeClient().paymentIntents.create(
          {
            amount,
            currency: currency.toLowerCase(),
            automatic_payment_methods: { enabled: true },
            metadata
          },
          { idempotencyKey }
        );
        return {
          status: mapStatus(intent.status),
          providerReference: intent.id,
          clientSecret: intent.client_secret,
          data: { status: intent.status }
        };
      },
      async confirm({ providerReference }) {
        const intent = await stripeClient().paymentIntents.retrieve(providerReference);
        return {
          status: mapStatus(intent.status),
          providerReference,
          amount: intent.amount_received,
          data: { status: intent.status }
        };
      },
      async refund({ providerReference, amount, idempotencyKey }) {
        const refund = await stripeClient().refunds.create(
          { payment_intent: providerReference, ...amount ? { amount } : {} },
          { idempotencyKey }
        );
        return {
          status: refund.status === "succeeded" ? "refunded" : "pending",
          providerReference,
          amount: refund.amount,
          data: { refundId: refund.id, status: refund.status }
        };
      },
      async parseWebhook({ payload, headers }) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const signature = headers["stripe-signature"];
        if (!secret || !signature) throw new Error("Stripe webhook verification is not configured");
        const event = stripeClient().webhooks.constructEvent(payload, signature, secret);
        const resource = event.data.object;
        const paymentIntent = "payment_intent" in resource ? resource.payment_intent : null;
        const providerReference = paymentIntent ? typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id : resource.object === "payment_intent" ? resource.id : null;
        const amount = resource.object === "payment_intent" ? resource.amount_received || resource.amount : resource.object === "charge" ? resource.amount_refunded : resource.amount;
        const status = event.type === "payment_intent.succeeded" ? "completed" : event.type === "payment_intent.payment_failed" ? "requires_action" : event.type === "payment_intent.canceled" ? "cancelled" : event.type === "charge.refunded" || event.type === "refund.updated" ? "refunded" : null;
        return {
          isValid: true,
          eventId: event.id,
          type: event.type,
          providerReference,
          status,
          amount,
          data: { livemode: event.livemode }
        };
      }
    };
  }
});

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default2
});
module.exports = __toCommonJS(keystone_exports);

// features/keystone/index.ts
var import_auth = require("@keystone-6/auth");
var import_core133 = require("@keystone-6/core");
var import_session = require("@keystone-6/core/session");
var import_config = require("dotenv/config");

// features/keystone/security/graphql-budget.ts
var import_graphql = require("graphql");
var GRAPHQL_MAX_TAKE = 5e3;

// features/keystone/appointmentSchedulingAuthority.ts
async function currentMember(sudo, practiceId5, actorId) {
  const members = await sudo.query.PracticeMembership.findMany({ where: { practice: { id: { equals: practiceId5 } }, user: { id: { equals: actorId } } }, take: 2, query: "id status practice { id } user { id } locations(take: 101) { id isActive practice { id } }" });
  const member = members[0];
  if (members.length !== 1 || !member?.id || member.status !== "active" || member.practice?.id !== practiceId5 || member.user?.id !== actorId || member.locations.length > 100 || member.locations.some((location) => location.practice?.id !== practiceId5 || location.isActive !== true)) throw new Error("Current scheduling membership is unavailable");
  return member;
}
async function currentSchedulerReadScope(context) {
  const actorId = context.session?.itemId, practiceId5 = context.session?.data.practice?.id;
  if (!actorId || !practiceId5 || !permissions.canSchedule({ session: context.session })) throw new Error("Scheduling authority is unavailable");
  const actor = await context.sudo().query.User.findOne({ where: { id: actorId }, query: "id status practice { id } role { practice { id } canSchedule canManagePractice }" });
  if (!actor || actor.id !== actorId || actor.status !== "active" || actor.practice?.id !== practiceId5 || actor.role?.practice?.id !== practiceId5 || actor.role.canSchedule !== true) throw new Error("Scheduling authority is unavailable");
  const member = await currentMember(context.sudo(), practiceId5, actorId);
  const locationIds = member.locations.map((location) => location.id);
  return { practiceId: practiceId5, practiceWide: actor.role.canManagePractice === true, locationIds };
}
async function canReadAppointmentPrivateFields({ context, item }, allowOwner = false) {
  try {
    const actorId = context.session?.itemId, practiceId5 = context.session?.data.practice?.id;
    if (!actorId || !practiceId5) return false;
    const sudo = context.sudo();
    const actor = await sudo.query.User.findOne({ where: { id: actorId }, query: "id status practice { id } role { practice { id } canManageClinical }" });
    if (!actor || actor.status !== "active" || actor.practice?.id !== practiceId5) return false;
    const header = await sudo.query.Appointment.findOne({ where: { id: item.id.toString() }, query: "id practice { id } location { id } client { id practice { id } user { id } }" });
    if (!header || header.practice?.id !== practiceId5 || header.client?.practice?.id !== practiceId5 || !header.location?.id) return false;
    if (allowOwner && header.client.user?.id === actorId) return true;
    if (!permissions.canManageClinical({ session: context.session }) || actor.role?.canManageClinical !== true || actor.role.practice?.id !== practiceId5) return false;
    const member = await currentMember(sudo, practiceId5, actorId);
    return member.locations.some((location) => location.id === header.location.id);
  } catch {
    return false;
  }
}
async function assertAppointmentSchedulingAuthority(context, appointmentId, options = {}) {
  const actorId = context.session?.itemId;
  const practiceId5 = context.session?.data.practice?.id;
  if (!actorId || !practiceId5 || !appointmentId) throw new Error("Appointment scheduling access is unavailable");
  const sudo = context.sudo();
  const actor = await sudo.query.User.findOne({ where: { id: actorId }, query: "id status practice { id } role { id practice { id } canSchedule canManagePractice }" });
  if (!actor || actor.id !== actorId || actor.status !== "active" || actor.practice?.id !== practiceId5) throw new Error("Appointment scheduling access is unavailable");
  const header = await sudo.query.Appointment.findOne({ where: { id: appointmentId }, query: "id practice { id } location { id } client { id practice { id } user { id } }" });
  if (!header || header.practice?.id !== practiceId5 || header.client?.practice?.id !== practiceId5 || !header.client?.id || !header.location?.id) throw new Error("Appointment scheduling access is unavailable");
  const location = await sudo.query.Location.findOne({ where: { id: header.location.id }, query: "id isActive practice { id }" });
  if (!location || location.id !== header.location.id || location.practice?.id !== practiceId5 || location.isActive !== true) throw new Error("Appointment scheduling access is unavailable");
  const owner = header.client.user?.id === actorId;
  const scheduler = permissions.canSchedule({ session: context.session }) && actor.role?.canSchedule === true && actor.role.practice?.id === practiceId5;
  if (owner && (options.purpose === "customer_cancel" || options.cancellationOnly && options.purpose !== "scheduler" || !scheduler)) {
    if (!options.cancellationOnly) throw new Error("Owned customer access is limited to cancellation and its readback");
    return { scope: { actorId, practiceId: practiceId5, locationId: location.id, clientId: header.client.id, appointmentId: header.id, purpose: "customer_cancel" }, membershipId: null, delegation: "owned_customer", header };
  }
  if (!scheduler || options.purpose === "customer_cancel") throw new Error("Appointment scheduling access is unavailable");
  const member = await currentMember(sudo, practiceId5, actorId);
  const assigned = member.locations.some((value) => value.id === location.id);
  if (!assigned && actor.role?.canManagePractice !== true) throw new Error("Current scheduling location authority is unavailable");
  return { scope: { actorId, practiceId: practiceId5, locationId: location.id, clientId: header.client.id, appointmentId: header.id, purpose: "scheduler" }, membershipId: member.id, delegation: assigned ? "location_member" : "practice_manager", header };
}

// features/keystone/access.ts
function isSignedIn({ session }) {
  return Boolean(session?.itemId) && session?.data.status !== "disabled";
}
var roleFlag = (session, key) => session?.data.status !== "disabled" && session?.data.role?.[key] === true;
async function freshActor(args) {
  const session = args.session;
  if (!session?.itemId || !args.context) return null;
  const actor = await args.context.sudo().query.User.findOne({
    where: { id: session.itemId },
    query: `id status practice { id } role { id practice { id }
      canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients
      canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations
    }`
  });
  if (!actor || actor.status !== "active" || actor.practice?.id !== session.data.practice?.id) return null;
  if (actor.role?.id !== session.data.role?.id || actor.practice?.id && actor.role && actor.role.practice?.id !== actor.practice.id) return null;
  for (const key of ["canManagePeople", "canManageRoles", "canAccessDashboard", "canManageOnboarding", "canManagePractice", "canSchedule", "canReadClients", "canManageClinical", "canManageSensitiveRecords", "canManageInventory", "canManageFinance", "canManageCommunications", "canViewReports", "canManageIntegrations"]) {
    if (session.data.role?.[key] === true && actor.role?.[key] !== true) return null;
  }
  return actor;
}
var activeRole = (key) => async (args) => (await freshActor(args))?.role?.[key] === true;
var activeListPermissions = {
  signedIn: async (args) => Boolean(await freshActor(args)),
  canManagePeople: activeRole("canManagePeople"),
  canManageRoles: activeRole("canManageRoles"),
  canAccessDashboard: activeRole("canAccessDashboard"),
  canManageOnboarding: activeRole("canManageOnboarding"),
  canManagePractice: activeRole("canManagePractice"),
  canSchedule: activeRole("canSchedule"),
  canReadClients: activeRole("canReadClients"),
  canManageClinical: activeRole("canManageClinical"),
  canManageSensitiveRecords: activeRole("canManageSensitiveRecords"),
  canManageInventory: activeRole("canManageInventory"),
  canManageFinance: activeRole("canManageFinance"),
  canManageCommunications: activeRole("canManageCommunications"),
  canViewReports: activeRole("canViewReports"),
  canManageIntegrations: activeRole("canManageIntegrations")
};
var permissions = {
  canCreateTodos: ({ session }) => roleFlag(session, "canCreateTodos"),
  canManageAllTodos: ({ session }) => roleFlag(session, "canManageAllTodos"),
  canManagePeople: ({ session }) => roleFlag(session, "canManagePeople"),
  canManageRoles: ({ session }) => roleFlag(session, "canManageRoles"),
  canAccessDashboard: ({ session }) => roleFlag(session, "canAccessDashboard"),
  canManageOnboarding: ({ session }) => roleFlag(session, "canManageOnboarding"),
  canManagePractice: ({ session }) => roleFlag(session, "canManagePractice"),
  canSchedule: ({ session }) => roleFlag(session, "canSchedule"),
  canReadClients: ({ session }) => roleFlag(session, "canReadClients"),
  // Medical-practice authority is explicit. General practice administration must
  // never imply clinical, sensitive-record, inventory, finance, or integration scope.
  canManageClinical: ({ session }) => roleFlag(session, "canManageClinical"),
  canManageSensitiveRecords: ({ session }) => roleFlag(session, "canManageSensitiveRecords"),
  canManageInventory: ({ session }) => roleFlag(session, "canManageInventory"),
  canManageFinance: ({ session }) => roleFlag(session, "canManageFinance"),
  canManageCommunications: ({ session }) => roleFlag(session, "canManageCommunications"),
  canViewReports: ({ session }) => roleFlag(session, "canViewReports"),
  canManageIntegrations: ({ session }) => roleFlag(session, "canManageIntegrations"),
  // Compatibility alias for inherited Med Spa workflow code. It deliberately means
  // dashboard access only; sensitive domain Lists use narrower capabilities below.
  canOperateMedSpa: ({ session }) => roleFlag(session, "canAccessDashboard")
};
function practiceId(session) {
  return session?.data.practice?.id || null;
}
async function actorScope(args) {
  const actor = await freshActor(args);
  if (!actor?.practice?.id) return null;
  return { actor, actorId: actor.id, practiceId: actor.practice.id, role: actor.role || {} };
}
var scopedPractice = (id) => ({ practice: { id: { equals: id } } });
var ownedInPractice = (id, owner) => ({ AND: [scopedPractice(id), owner] });
var ownedAppointmentsInPractice = (practiceId5, actorId) => ({
  AND: [scopedPractice(practiceId5), { client: { user: { id: { equals: actorId } } } }]
});
var publishedPractice = { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } };
function publicCatalogInPractice(scope, predicate) {
  const filter = { ...predicate, practice: publishedPractice };
  return scope ? { AND: [scopedPractice(scope.practiceId), filter] } : filter;
}
var rules = {
  canReadTodos: () => false,
  canManageTodos: () => false,
  canReadRoles: async (args) => {
    const actor = await freshActor(args);
    if (!actor) return false;
    return actor.practice?.id ? scopedPractice(actor.practice.id) : { assignedTo: { some: { id: { equals: actor.id } } } };
  },
  canReadPeople: async (args) => {
    const actor = await freshActor(args);
    if (!actor) return false;
    const self = { id: { equals: actor.id } };
    if (!actor.practice?.id) return self;
    return actor.role?.canManagePeople ? { OR: [scopedPractice(actor.practice.id), self] } : self;
  },
  canUpdatePeople: async (args) => {
    const actor = await freshActor(args);
    if (!actor) return false;
    const self = { id: { equals: actor.id } };
    if (!actor.practice?.id) return self;
    return actor.role?.canManagePeople ? scopedPractice(actor.practice.id) : self;
  },
  canReadClients: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canReadClients || scope.role.canSchedule || scope.role.canManageClinical ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { user: { id: { equals: scope.actorId } } });
  },
  canReadAppointments: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    if (scope.role.canManageFinance) return scopedPractice(scope.practiceId);
    if (scope.role.canSchedule) {
      try {
        if (!args.context) return false;
        const scheduler = await currentSchedulerReadScope(args.context);
        return scheduler.practiceWide ? scopedPractice(scheduler.practiceId) : { AND: [scopedPractice(scheduler.practiceId), { location: { id: { in: scheduler.locationIds } } }] };
      } catch {
        return false;
      }
    }
    return scope.role.canManageClinical ? scopedPractice(scope.practiceId) : ownedAppointmentsInPractice(scope.practiceId, scope.actorId);
  },
  canReadServices: async (args) => {
    const scope = await actorScope(args);
    if (scope && (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice)) return scopedPractice(scope.practiceId);
    return { status: { equals: "active" }, isPublic: { equals: true }, practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } };
  },
  canReadServiceRelationships: async (args) => {
    const scope = await actorScope(args);
    return Boolean(scope && (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice));
  },
  canReadServiceCategories: async (args) => {
    const scope = await actorScope(args);
    const publicCategories = { isVisible: { equals: true }, practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } }, services: { some: { status: { equals: "active" }, isPublic: { equals: true } } } };
    if (!scope) return publicCategories;
    if (scope.role.canManagePractice) return scopedPractice(scope.practiceId);
    if (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical) {
      return { AND: [scopedPractice(scope.practiceId), publicCategories] };
    }
    return publicCategories;
  },
  canReadMedSpaImages: async (args) => {
    const scope = await actorScope(args);
    if (scope && (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice)) return scopedPractice(scope.practiceId);
    return { practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } };
  },
  // Public ServiceVariant reads lack a bounded same-practice relationship projection.
  // Keep variants operator-only; the public Service catalog has its own read boundary.
  canReadServiceVariants: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice ? scopedPractice(scope.practiceId) : false;
  },
  canReadProducts: async (args) => {
    const scope = await actorScope(args);
    return scope && (scope.role.canAccessDashboard || scope.role.canManageInventory || scope.role.canManageFinance || scope.role.canManagePractice || scope.role.canManageClinical || scope.role.canSchedule) ? scopedPractice(scope.practiceId) : false;
  },
  canReadMembershipCatalog: async (args) => {
    const scope = await actorScope(args);
    return scope?.role.canManageFinance ? scopedPractice(scope.practiceId) : publicCatalogInPractice(scope, { isActive: { equals: true } });
  },
  canReadReviews: async (args) => {
    const scope = await actorScope(args);
    return scope && (scope.role.canAccessDashboard || scope.role.canManagePractice || scope.role.canManageCommunications) ? scopedPractice(scope.practiceId) : publicCatalogInPractice(scope, { isApproved: { equals: true } });
  },
  canReadProviders: async (args) => {
    const scope = await actorScope(args);
    if (scope && (scope.role.canAccessDashboard || scope.role.canSchedule || scope.role.canManageClinical || scope.role.canManagePractice)) return scopedPractice(scope.practiceId);
    return { status: { equals: "active" }, isActive: { equals: true }, isPublic: { equals: true }, practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } };
  },
  canReadProviderSchedules: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canSchedule ? scopedPractice(scope.practiceId) : { isAvailable: { equals: true }, isPublic: { equals: true }, type: { in: ["recurring", "one_time"] }, provider: { status: { equals: "active" }, isActive: { equals: true }, isPublic: { equals: true }, practice: { isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } } };
  },
  canReadAppointmentLineItems: async (args) => {
    const appointmentScope = await rules.canReadAppointments(args);
    return appointmentScope ? { appointment: appointmentScope } : false;
  },
  canReadPayments: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { appointment: { client: { user: { id: { equals: scope.actorId } } } } });
  },
  canReadMedSpaTransactions: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { user: { id: { equals: scope.actorId } } } });
  },
  canReadMedSpaTransactionLineItems: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return ownedInPractice(scope.practiceId, scope.role.canManageFinance ? { transaction: scopedPractice(scope.practiceId) } : { transaction: { AND: [scopedPractice(scope.practiceId), { client: { user: { id: { equals: scope.actorId } } } }] } });
  },
  canReadFormSubmissions: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageClinical ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { id: { equals: scope.actorId } } });
  },
  canReadClientPackages: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageFinance || scope.role.canSchedule ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { id: { equals: scope.actorId } } });
  },
  canReadClientPackageUsages: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageFinance || scope.role.canSchedule ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { clientPackage: { client: { id: { equals: scope.actorId } } } });
  },
  canReadClientMemberships: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageFinance || scope.role.canSchedule ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { id: { equals: scope.actorId } } });
  },
  canReadGiftCards: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { purchasedBy: { id: { equals: scope.actorId } } });
  },
  canReadGiftCardTransactions: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { giftCard: { purchasedBy: { id: { equals: scope.actorId } } } });
  },
  canReadClientPoints: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canReadClients ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { client: { id: { equals: scope.actorId } } });
  },
  canReadReferrals: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canReadClients ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { OR: [{ referrer: { id: { equals: scope.actorId } } }, { referred: { id: { equals: scope.actorId } } }] });
  },
  canReadMessageLogs: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageCommunications ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { recipient: { id: { equals: scope.actorId } } });
  },
  canReadProductSales: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { appointment: { client: { user: { id: { equals: scope.actorId } } } } });
  },
  canReadCommissions: async (args) => {
    const scope = await actorScope(args);
    if (!scope) return false;
    return scope.role.canManageFinance ? scopedPractice(scope.practiceId) : ownedInPractice(scope.practiceId, { provider: { user: { id: { equals: scope.actorId } } } });
  }
};

// features/keystone/models/tenantAccess.ts
async function resolveTenantPractice({ context, session, operation, resolvedData, inputData }) {
  if (operation !== "create" || Object.prototype.hasOwnProperty.call(inputData, "practice")) return resolvedData;
  const args = { context, session: session || context.session };
  if (!await activeListPermissions.signedIn(args)) return resolvedData;
  const id = practiceId(args.session);
  return id ? { ...resolvedData, practice: { connect: { id } } } : resolvedData;
}
async function validateTenantInput({ context, session, listKey, resolvedData, inputData, item, operation, addValidationError }) {
  const args = { context, session: session || context.session };
  if (!await activeListPermissions.signedIn(args)) return addValidationError("Authenticated practice access is unavailable");
  const actorPracticeId = practiceId(args.session);
  if (!actorPracticeId) return addValidationError("Authenticated practice access is unavailable");
  const relation = resolvedData.practice;
  const connectedPracticeId = relation?.connect?.id;
  const existingPracticeId = item?.practiceId;
  if (operation === "create" && connectedPracticeId !== actorPracticeId) addValidationError("Practice must match the authenticated practice");
  if (operation === "update" && (existingPracticeId !== actorPracticeId || Object.prototype.hasOwnProperty.call(inputData, "practice") && (connectedPracticeId !== actorPracticeId || relation?.disconnect))) addValidationError("Record practice cannot be removed or changed");
  const list99 = context.__internal.lists[listKey];
  if (!list99) return addValidationError("Native relationship metadata is unavailable");
  for (const [key, value] of Object.entries(resolvedData)) {
    const field2 = list99.fields[key];
    if (key === "practice" || field2?.dbField.kind !== "relation" || !value || typeof value !== "object") continue;
    const input = value;
    if (input.create || input.update) {
      addValidationError("Create and edit related records through their own scoped workflow");
      continue;
    }
    const relatedList = field2.dbField.list;
    const related = context.__internal.lists[relatedList];
    const connected = [input.connect, input.set].flatMap((entry) => Array.isArray(entry) ? entry : entry ? [entry] : []);
    if (!connected.length) continue;
    const ids = connected.map((entry) => entry && typeof entry === "object" ? entry.id : void 0);
    if (ids.length > 100 || ids.some((id) => typeof id !== "string" || !id)) {
      addValidationError("Related record identities are invalid");
      continue;
    }
    const uniqueIds = [...new Set(ids)];
    if (relatedList === "Practice") {
      if (uniqueIds.some((id) => id !== actorPracticeId)) addValidationError("Related record is outside the authenticated practice");
    } else if (related?.fields.practice) {
      const count2 = await context.sudo().query[relatedList].count({ where: { id: { in: uniqueIds }, practice: { id: { equals: actorPracticeId } } } });
      if (count2 !== uniqueIds.length) addValidationError("Related record is outside the authenticated practice");
    }
  }
}
var tenantFilter = async (args) => {
  if (!await activeListPermissions.signedIn(args)) return false;
  const id = practiceId(args.session);
  return id ? { practice: { id: { equals: id } } } : false;
};

// features/keystone/models/AdministrationLot.ts
var import_core = require("@keystone-6/core");
var import_fields2 = require("@keystone-6/core/fields");

// features/keystone/models/trackingFields.ts
var import_fields = require("@keystone-6/core/fields");
var trackingFields = {
  createdAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  }),
  updatedAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    db: { updatedAt: true },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  })
};

// features/keystone/models/AdministrationLot.ts
var AdministrationLot = (0, import_core.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields2.relationship)({ ref: "Practice" }),
    administration: (0, import_fields2.relationship)({ ref: "TreatmentAdministration.lots" }),
    lot: (0, import_fields2.relationship)({ ref: "InventoryLot.administrations" }),
    product: (0, import_fields2.relationship)({ ref: "Product" }),
    quantity: (0, import_fields2.text)({ validation: { isRequired: true } }),
    unit: (0, import_fields2.text)({ validation: { isRequired: true } }),
    doseSnapshot: (0, import_fields2.json)(),
    anatomicSite: (0, import_fields2.text)({ validation: { isRequired: true } }),
    lotNumberSnapshot: (0, import_fields2.text)({ validation: { isRequired: true } }),
    expirationSnapshot: (0, import_fields2.timestamp)({ validation: { isRequired: true } }),
    concentration: (0, import_fields2.text)(),
    diluentLot: (0, import_fields2.text)(),
    reconstitutedAt: (0, import_fields2.timestamp)(),
    openedAt: (0, import_fields2.timestamp)(),
    discardAt: (0, import_fields2.timestamp)(),
    wasteQuantity: (0, import_fields2.text)(),
    wasteReason: (0, import_fields2.text)(),
    witness: (0, import_fields2.relationship)({ ref: "User" }),
    evidenceHash: (0, import_fields2.text)({ validation: { isRequired: true } }),
    ...trackingFields
  }
});

// features/keystone/models/Appointment.ts
var import_core2 = require("@keystone-6/core");
var import_fields3 = require("@keystone-6/core/fields");

// features/keystone/lifecycle.ts
var import_node_crypto = require("node:crypto");

// features/keystone/domainEventReplayPolicy.ts
function assertDomainEventReplaySafe(existing, incoming) {
  if (!incoming.practiceId?.trim()) throw new Error("Domain event practice attribution is required");
  const sameIdentity = existing.eventType === incoming.eventType && existing.eventVersion === incoming.eventVersion && existing.aggregateType === incoming.aggregateType && existing.aggregateId === incoming.aggregateId && existing.operation === incoming.operation && (existing.locationId || null) === (incoming.locationId || null) && existing.payloadHash === incoming.payloadHash;
  if (!sameIdentity) throw new Error("Domain event key was reused with different immutable evidence");
  if (existing.practiceId && existing.practiceId !== incoming.practiceId) {
    throw new Error("Domain event key was reused across practice ownership");
  }
  return { repairPractice: !existing.practiceId };
}

// features/keystone/lifecycle.ts
function canonicalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([, child]) => child !== void 0).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}
function snapshot(item, fields) {
  const record = item || {};
  return Object.fromEntries(fields.filter((field2) => field2 in record).map((field2) => [field2, canonicalize(record[field2])]));
}
function payloadHash(payload) {
  return (0, import_node_crypto.createHash)("sha256").update(JSON.stringify(canonicalize(payload))).digest("hex");
}
async function enqueueDomainEvent(context, input) {
  if (!input.eventKey?.trim() || !input.aggregateId?.trim()) throw new Error("Domain event identity is required");
  if (!input.practiceId?.trim()) throw new Error("Domain event practice attribution is required");
  const occurredAt = input.occurredAt || /* @__PURE__ */ new Date();
  const hash = payloadHash(input.payload);
  const eventVersion = 1;
  const replayIdentity = {
    eventType: input.eventType,
    eventVersion,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    operation: input.operation,
    locationId: input.locationId || null,
    payloadHash: hash,
    practiceId: input.practiceId
  };
  await context.prisma.$executeRawUnsafe(
    "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
    "medspa-domain-outbox",
    input.eventKey
  );
  const existing = await context.sudo().query.DomainEvent.findOne({
    where: { eventKey: input.eventKey },
    query: "id eventType eventVersion aggregateType aggregateId operation locationId payloadHash practice { id }"
  });
  if (existing) {
    const replay = assertDomainEventReplaySafe({
      eventType: existing.eventType,
      eventVersion: existing.eventVersion,
      aggregateType: existing.aggregateType,
      aggregateId: existing.aggregateId,
      operation: existing.operation,
      locationId: existing.locationId,
      payloadHash: existing.payloadHash,
      practiceId: existing.practice?.id || null
    }, replayIdentity);
    if (replay.repairPractice) {
      await context.sudo().query.DomainEvent.updateOne({
        where: { id: existing.id },
        data: { practice: { connect: { id: input.practiceId } } },
        query: "id"
      });
    }
    return { id: existing.id, created: false };
  }
  const event = await context.sudo().query.DomainEvent.createOne({
    data: {
      eventKey: input.eventKey,
      eventType: input.eventType,
      eventVersion,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      operation: input.operation,
      practice: { connect: { id: input.practiceId } },
      actorId: context.session?.itemId || "system",
      locationId: input.locationId || "",
      payload: input.payload,
      payloadHash: hash,
      occurredAt: occurredAt.toISOString(),
      status: "pending",
      attempts: 0
    },
    query: "id"
  });
  return { id: event.id, created: true };
}
function createLifecycleHooks(aggregateType, fields) {
  return {
    afterOperation: async ({ operation, item, originalItem, context }) => {
      const aggregateId = String(item?.id || originalItem?.id || "");
      if (!aggregateId) throw new Error(`${aggregateType} lifecycle event is missing its aggregate id`);
      const versionSource = item?.updatedAt || item?.createdAt || originalItem?.updatedAt || originalItem?.createdAt;
      const version = versionSource ? new Date(versionSource).toISOString() : `${operation}:v1`;
      const before = operation === "create" ? null : snapshot(originalItem, fields);
      const after = operation === "delete" ? null : snapshot(item, fields);
      if (operation === "update" && JSON.stringify(canonicalize(before)) === JSON.stringify(canonicalize(after))) return;
      const payload = { aggregateType, aggregateId, operation, before, after };
      const practiceId5 = String(item?.practiceId || originalItem?.practiceId || "");
      if (!practiceId5) throw new Error(`${aggregateType} lifecycle event is missing its practice id`);
      await enqueueDomainEvent(context, {
        eventKey: `${aggregateType}:${aggregateId}:${operation}:${version}:${payloadHash(payload).slice(0, 16)}`,
        eventType: `medspa.${aggregateType}.${operation}.v1`,
        aggregateType,
        aggregateId,
        operation,
        practiceId: practiceId5,
        locationId: String(item?.locationId || originalItem?.locationId || "") || null,
        payload,
        occurredAt: versionSource ? new Date(versionSource) : /* @__PURE__ */ new Date()
      });
    }
  };
}

// features/keystone/models/Appointment.ts
var Appointment = (0, import_core2.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadAppointments
    }
  },
  hooks: createLifecycleHooks("appointment", ["startTime", "endTime", "duration", "status", "depositAmount", "depositPaid", "locationId", "clientId", "providerId", "resourceId"]),
  ui: {
    listView: {
      initialColumns: ["client", "provider", "startTime", "status", "duration"]
    }
  },
  fields: {
    practice: (0, import_fields3.relationship)({ ref: "Practice" }),
    revision: (0, import_fields3.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    idempotencyKey: (0, import_fields3.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    startTime: (0, import_fields3.timestamp)({
      validation: { isRequired: true },
      ui: {
        description: "Start date and time of the appointment"
      }
    }),
    endTime: (0, import_fields3.timestamp)({
      ui: {
        description: "End date and time of the appointment"
      }
    }),
    duration: (0, import_fields3.integer)({
      defaultValue: 60,
      ui: {
        description: "Total duration in minutes"
      }
    }),
    status: (0, import_fields3.select)({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Confirmed", value: "confirmed" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "No-show", value: "no_show" }
      ],
      defaultValue: "pending",
      validation: {
        isRequired: true
      }
    }),
    depositAmount: (0, import_fields3.integer)({
      ui: {
        description: "Deposit amount required in cents"
      }
    }),
    depositPaid: (0, import_fields3.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether deposit has been paid"
      }
    }),
    metadata: (0, import_fields3.json)({
      access: { read: canReadAppointmentPrivateFields },
      ui: {
        description: "Additional metadata for the appointment"
      }
    }),
    // Timestamps
    bookedAt: (0, import_fields3.timestamp)({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the appointment was booked"
      }
    }),
    confirmedAt: (0, import_fields3.timestamp)({
      ui: {
        description: "When the appointment was confirmed"
      }
    }),
    cancelledAt: (0, import_fields3.timestamp)({
      ui: {
        description: "When the appointment was cancelled"
      }
    }),
    cancellationReason: (0, import_fields3.text)({
      ui: {
        displayMode: "textarea",
        description: "Reason for cancellation"
      }
    }),
    // Notes
    notes: (0, import_fields3.text)({
      access: { read: canReadAppointmentPrivateFields, create: () => false, update: () => false },
      ui: {
        displayMode: "textarea",
        description: "Notes and special requests"
      }
    }),
    clientNotes: (0, import_fields3.text)({
      access: { read: (args) => canReadAppointmentPrivateFields(args, true) },
      ui: {
        displayMode: "textarea",
        description: "Special requests from client"
      }
    }),
    internalNotes: (0, import_fields3.text)({
      access: { read: canReadAppointmentPrivateFields, create: () => false, update: () => false },
      ui: {
        displayMode: "textarea",
        description: "Internal notes for providers"
      }
    }),
    // Relationships
    location: (0, import_fields3.relationship)({ ref: "Location.appointments" }),
    client: (0, import_fields3.relationship)({
      ref: "Client.appointments",
      ui: {
        displayMode: "select"
      }
    }),
    provider: (0, import_fields3.relationship)({
      ref: "Provider.appointments",
      ui: {
        displayMode: "select"
      }
    }),
    resource: (0, import_fields3.relationship)({
      ref: "Resource.appointments",
      ui: { displayMode: "select", description: "Primary room or device reserved for compatibility" }
    }),
    room: (0, import_fields3.relationship)({ ref: "Resource", ui: { description: "Reserved treatment room" } }),
    device: (0, import_fields3.relationship)({ ref: "Resource", ui: { description: "Reserved device or equipment" } }),
    consultation: (0, import_fields3.relationship)({ ref: "Consultation.appointment" }),
    treatmentSessions: (0, import_fields3.relationship)({ ref: "TreatmentSession.appointment", many: true }),
    assets: (0, import_fields3.relationship)({ ref: "ClientAsset.appointment", many: true }),
    consents: (0, import_fields3.relationship)({ ref: "ConsentRecord.appointment", many: true }),
    administrations: (0, import_fields3.relationship)({ ref: "TreatmentAdministration.appointment", many: true }),
    resourceReservations: (0, import_fields3.relationship)({ ref: "AppointmentResourceReservation.appointment", many: true }),
    supervisorReservations: (0, import_fields3.relationship)({ ref: "AppointmentSupervisorReservation.appointment", many: true }),
    // Services booked for this appointment (can book multiple)
    services: (0, import_fields3.relationship)({
      ref: "Service",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["name", "basePrice", "baseDuration"]
      }
    }),
    // Line items for detailed service tracking
    lineItems: (0, import_fields3.relationship)({
      ref: "AppointmentLineItem.appointment",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["service", "staff", "duration", "formattedPrice"]
      }
    }),
    // Payment for this appointment
    payment: (0, import_fields3.relationship)({
      ref: "Payment.appointment",
      ui: {
        displayMode: "cards",
        cardFields: ["totalAmount", "status", "paymentMethod"]
      }
    }),
    paymentSessions: (0, import_fields3.relationship)({
      ref: "PaymentSession.appointment",
      many: true,
      ui: {
        displayMode: "count"
      }
    }),
    transaction: (0, import_fields3.relationship)({
      ref: "MedSpaTransaction.appointment",
      ui: {
        displayMode: "cards",
        cardFields: ["paymentStatus", "status", "paymentMethod"],
        description: "Checkout transaction for this appointment"
      }
    }),
    // Review for this appointment
    inventoryMovements: (0, import_fields3.relationship)({ ref: "InventoryMovement.appointment", many: true }),
    review: (0, import_fields3.relationship)({
      ref: "Review.appointment",
      ui: {
        displayMode: "cards",
        cardFields: ["rating", "comment", "isApproved"]
      }
    }),
    ...(0, import_core2.group)({
      label: "Virtual Fields",
      description: "Calculated fields for appointment display",
      fields: {
        formattedDuration: (0, import_fields3.virtual)({
          field: import_core2.graphql.field({
            type: import_core2.graphql.String,
            async resolve(item, args, context) {
              const appointmentId = item.id;
              const appointment = await context.sudo().query.Appointment.findOne({
                where: { id: appointmentId },
                query: "duration"
              });
              if (!appointment?.duration) return "0 min";
              const hours = Math.floor(appointment.duration / 60);
              const minutes = appointment.duration % 60;
              if (hours === 0) return `${minutes} min`;
              if (minutes === 0) return `${hours} hr`;
              return `${hours} hr ${minutes} min`;
            }
          })
        }),
        isUpcoming: (0, import_fields3.virtual)({
          field: import_core2.graphql.field({
            type: import_core2.graphql.Boolean,
            async resolve(item, args, context) {
              const appointmentId = item.id;
              const appointment = await context.sudo().query.Appointment.findOne({
                where: { id: appointmentId },
                query: "startTime status"
              });
              if (!appointment?.startTime) return false;
              if (appointment.status === "completed" || appointment.status === "cancelled" || appointment.status === "no_show") {
                return false;
              }
              return new Date(appointment.startTime) > /* @__PURE__ */ new Date();
            }
          })
        }),
        isPast: (0, import_fields3.virtual)({
          field: import_core2.graphql.field({
            type: import_core2.graphql.Boolean,
            async resolve(item, args, context) {
              const appointmentId = item.id;
              const appointment = await context.sudo().query.Appointment.findOne({
                where: { id: appointmentId },
                query: "startTime"
              });
              if (!appointment?.startTime) return false;
              return new Date(appointment.startTime) < /* @__PURE__ */ new Date();
            }
          })
        })
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/AppointmentLineItem.ts
var import_core3 = require("@keystone-6/core");
var import_fields4 = require("@keystone-6/core/fields");
var formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount / 100);
};
var AppointmentLineItem = (0, import_core3.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadAppointmentLineItems
    }
  },
  ui: {
    listView: {
      initialColumns: ["serviceTitle", "staff", "duration", "price", "appointment"]
    }
  },
  fields: {
    practice: (0, import_fields4.relationship)({ ref: "Practice" }),
    service: (0, import_fields4.relationship)({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "Service being provided"
      }
    }),
    staff: (0, import_fields4.relationship)({
      ref: "Provider",
      ui: {
        displayMode: "select",
        description: "Staff member providing this service"
      }
    }),
    serviceTitle: (0, import_fields4.text)({
      validation: { isRequired: true, length: { max: 300 } },
      ui: {
        description: "Immutable service title captured when the appointment was booked"
      }
    }),
    serviceImagePath: (0, import_fields4.text)({
      ui: {
        description: "Immutable canonical relative service media path captured at booking"
      }
    }),
    duration: (0, import_fields4.integer)({
      defaultValue: 60,
      validation: { isRequired: true, min: 1 },
      ui: {
        description: "Immutable service duration captured at booking"
      }
    }),
    price: (0, import_fields4.integer)({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Price in cents"
      }
    }),
    quantity: (0, import_fields4.integer)({
      defaultValue: 1,
      validation: { isRequired: true, min: 1 },
      ui: {
        description: "Quantity of this service (usually 1)"
      }
    }),
    notes: (0, import_fields4.text)({
      ui: {
        displayMode: "textarea",
        description: "Special requests or notes for this service"
      }
    }),
    appointment: (0, import_fields4.relationship)({
      ref: "Appointment.lineItems",
      ui: {
        displayMode: "select",
        description: "Related appointment"
      }
    }),
    metadata: (0, import_fields4.json)({
      ui: {
        description: "Additional metadata for the line item"
      }
    }),
    formattedPrice: (0, import_fields4.virtual)({
      field: import_core3.graphql.field({
        type: import_core3.graphql.String,
        async resolve(item, args, context) {
          const lineItemId = item.id;
          const lineItem = await context.sudo().query.AppointmentLineItem.findOne({
            where: { id: lineItemId },
            query: "price"
          });
          if (!lineItem?.price) return "$0.00";
          return formatCurrency(lineItem.price);
        }
      })
    }),
    formattedTotal: (0, import_fields4.virtual)({
      field: import_core3.graphql.field({
        type: import_core3.graphql.String,
        async resolve(item, args, context) {
          const lineItemId = item.id;
          const lineItem = await context.sudo().query.AppointmentLineItem.findOne({
            where: { id: lineItemId },
            query: "price quantity"
          });
          if (!lineItem?.price || !lineItem?.quantity) return "$0.00";
          const total = lineItem.price * lineItem.quantity;
          return formatCurrency(total);
        }
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/AppointmentSupervisorReservation.ts
var import_core4 = require("@keystone-6/core");
var import_fields5 = require("@keystone-6/core/fields");
var AppointmentSupervisorReservation = (0, import_core4.list)({ access: { operation: { query: permissions.canSchedule, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } }, fields: { practice: (0, import_fields5.relationship)({ ref: "Practice" }), location: (0, import_fields5.relationship)({ ref: "Location" }), appointment: (0, import_fields5.relationship)({ ref: "Appointment.supervisorReservations" }), supervisor: (0, import_fields5.relationship)({ ref: "Provider" }), service: (0, import_fields5.relationship)({ ref: "Service" }), startsAt: (0, import_fields5.timestamp)({ validation: { isRequired: true } }), endsAt: (0, import_fields5.timestamp)({ validation: { isRequired: true } }), status: (0, import_fields5.select)({ type: "enum", options: ["reserved", "released", "cancelled", "superseded"].map((value) => ({ label: value, value })), defaultValue: "reserved" }), evidenceHash: (0, import_fields5.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields5.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields } });

// features/keystone/models/AppointmentResourceReservation.ts
var import_core5 = require("@keystone-6/core");
var import_fields6 = require("@keystone-6/core/fields");
var AppointmentResourceReservation = (0, import_core5.list)({
  access: { operation: { query: permissions.canSchedule, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields6.relationship)({ ref: "Practice" }), location: (0, import_fields6.relationship)({ ref: "Location" }), appointment: (0, import_fields6.relationship)({ ref: "Appointment.resourceReservations" }), treatmentSession: (0, import_fields6.relationship)({ ref: "TreatmentSession" }), resource: (0, import_fields6.relationship)({ ref: "Resource.reservations" }), segmentKey: (0, import_fields6.text)({ validation: { isRequired: true } }), purpose: (0, import_fields6.select)({ type: "enum", options: ["room", "device", "equipment", "recovery", "supervision"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), units: (0, import_fields6.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 } }), startsAt: (0, import_fields6.timestamp)({ validation: { isRequired: true } }), endsAt: (0, import_fields6.timestamp)({ validation: { isRequired: true } }), status: (0, import_fields6.select)({ type: "enum", options: ["reserved", "in_use", "released", "cancelled", "superseded"].map((value) => ({ label: value, value })), defaultValue: "reserved", validation: { isRequired: true } }), revision: (0, import_fields6.integer)({ defaultValue: 1, validation: { min: 1 } }), assignmentEvidence: (0, import_fields6.json)(), evidenceHash: (0, import_fields6.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields6.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/AssetAccessEvent.ts
var import_core6 = require("@keystone-6/core");
var import_fields7 = require("@keystone-6/core/fields");
var AssetAccessEvent = (0, import_core6.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields7.relationship)({ ref: "Practice" }), asset: (0, import_fields7.relationship)({ ref: "ClientAsset.accessEvents" }), actor: (0, import_fields7.relationship)({ ref: "User" }), action: (0, import_fields7.select)({ type: "enum", options: ["upload_intent", "validate", "view", "download", "release", "restrict", "tombstone", "delete_request", "delete_complete", "retention_hold"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), purpose: (0, import_fields7.text)({ validation: { isRequired: true } }), outcome: (0, import_fields7.text)({ validation: { isRequired: true } }), reason: (0, import_fields7.text)(), sessionReferenceHash: (0, import_fields7.text)(), evidence: (0, import_fields7.json)(), evidenceHash: (0, import_fields7.text)({ validation: { isRequired: true } }), occurredAt: (0, import_fields7.timestamp)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields7.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/AuditEvent.ts
var import_core7 = require("@keystone-6/core");
var import_fields8 = require("@keystone-6/core/fields");
var AuditEvent = (0, import_core7.list)({
  access: { operation: { query: permissions.canManagePractice, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields8.relationship)({ ref: "Practice" }),
    location: (0, import_fields8.relationship)({ ref: "Location" }),
    actor: (0, import_fields8.relationship)({ ref: "User" }),
    action: (0, import_fields8.text)({ validation: { isRequired: true } }),
    resourceType: (0, import_fields8.text)({ validation: { isRequired: true } }),
    resourceId: (0, import_fields8.text)({ validation: { isRequired: true } }),
    correlationId: (0, import_fields8.text)({ validation: { isRequired: true } }),
    evidence: (0, import_fields8.json)(),
    evidenceHash: (0, import_fields8.text)({ validation: { isRequired: true } }),
    occurredAt: (0, import_fields8.timestamp)({ validation: { isRequired: true } }),
    ...trackingFields
  }
});

// features/keystone/models/BreakGlassEvent.ts
var import_core8 = require("@keystone-6/core");
var import_fields9 = require("@keystone-6/core/fields");
var BreakGlassEvent = (0, import_core8.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields9.relationship)({ ref: "Practice" }), client: (0, import_fields9.relationship)({ ref: "Client" }), actor: (0, import_fields9.relationship)({ ref: "User" }), status: (0, import_fields9.select)({ type: "enum", options: ["opened", "reviewed", "approved", "inappropriate", "closed"].map((value) => ({ label: value, value })), defaultValue: "opened", validation: { isRequired: true } }), emergencyReason: (0, import_fields9.text)({ validation: { isRequired: true } }), requestedScope: (0, import_fields9.json)(), openedAt: (0, import_fields9.timestamp)({ validation: { isRequired: true } }), expiresAt: (0, import_fields9.timestamp)({ validation: { isRequired: true } }), reviewer: (0, import_fields9.relationship)({ ref: "User" }), reviewedAt: (0, import_fields9.timestamp)(), reviewReason: (0, import_fields9.text)(), evidenceHash: (0, import_fields9.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields9.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/Client.ts
var import_core9 = require("@keystone-6/core");
var import_fields10 = require("@keystone-6/core/fields");
var Client = (0, import_core9.list)({
  access: {
    operation: { query: () => true, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadClients }
  },
  hooks: createLifecycleHooks("client", ["userId", "practiceId", "preferredProviderId", "homeLocationId", "marketingConsent"]),
  ui: { listView: { initialColumns: ["user", "practice", "preferredProvider", "totalVisits", "lifetimeValue"] } },
  fields: {
    practice: (0, import_fields10.relationship)({ ref: "Practice" }),
    user: (0, import_fields10.relationship)({ ref: "User.clientProfile" }),
    homeLocation: (0, import_fields10.relationship)({ ref: "Location.clients" }),
    preferredProvider: (0, import_fields10.relationship)({ ref: "Provider.preferredByClients" }),
    dateOfBirth: (0, import_fields10.timestamp)(),
    contactPreferences: (0, import_fields10.text)(),
    operationalNotes: (0, import_fields10.text)({ ui: { displayMode: "textarea", description: "Non-clinical scheduling preferences only." } }),
    firstVisit: (0, import_fields10.timestamp)(),
    lastVisit: (0, import_fields10.timestamp)(),
    totalVisits: (0, import_fields10.integer)({ defaultValue: 0, validation: { min: 0 } }),
    lifetimeValue: (0, import_fields10.integer)({ defaultValue: 0, validation: { min: 0 }, ui: { description: "Lifetime value in integer minor units." } }),
    marketingConsent: (0, import_fields10.checkbox)({ defaultValue: false }),
    photoMarketingConsent: (0, import_fields10.checkbox)({ defaultValue: false }),
    appointments: (0, import_fields10.relationship)({ ref: "Appointment.client", many: true }),
    reviews: (0, import_fields10.relationship)({ ref: "Review.client", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ClientAsset.ts
var import_core10 = require("@keystone-6/core");
var import_fields11 = require("@keystone-6/core/fields");
var import_access12 = require("@keystone-6/core/access");
var ClientAsset = (0, import_core10.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields11.relationship)({ ref: "Practice" }),
    client: (0, import_fields11.relationship)({ ref: "Client" }),
    appointment: (0, import_fields11.relationship)({ ref: "Appointment.assets" }),
    treatmentSession: (0, import_fields11.relationship)({ ref: "TreatmentSession" }),
    incident: (0, import_fields11.relationship)({ ref: "Incident.assets" }),
    note: (0, import_fields11.relationship)({ ref: "ClientNote.assets" }),
    photoConsent: (0, import_fields11.relationship)({ ref: "PhotoConsent.assets" }),
    category: (0, import_fields11.select)({ type: "enum", options: [
      { label: "Photo", value: "photo" },
      { label: "Document", value: "document" },
      { label: "Intake Attachment", value: "intake_attachment" },
      { label: "Incident Attachment", value: "incident_attachment" }
    ], validation: { isRequired: true } }),
    purpose: (0, import_fields11.text)({ validation: { isRequired: true } }),
    storageKey: (0, import_fields11.text)({ validation: { isRequired: true }, access: { read: import_access12.denyAll } }),
    encryptionKeyReference: (0, import_fields11.text)({ validation: { isRequired: true }, access: { read: import_access12.denyAll } }),
    storageRegion: (0, import_fields11.text)({ validation: { isRequired: true } }),
    originalFilename: (0, import_fields11.text)(),
    contentType: (0, import_fields11.text)({ validation: { isRequired: true } }),
    byteSize: (0, import_fields11.text)({ validation: { isRequired: true } }),
    checksum: (0, import_fields11.text)({ access: { read: import_access12.denyAll } }),
    status: (0, import_fields11.select)({ type: "enum", options: [
      { label: "Quarantined", value: "quarantined" },
      { label: "Ready", value: "ready" },
      { label: "Tombstoned", value: "tombstoned" }
    ], defaultValue: "quarantined", validation: { isRequired: true } }),
    releasedToClient: (0, import_fields11.checkbox)({ defaultValue: false }),
    accessClass: (0, import_fields11.select)({ type: "enum", options: ["clinical_restricted", "incident_restricted", "client_released", "marketing_authorized"].map((value) => ({ label: value, value })), defaultValue: "clinical_restricted", validation: { isRequired: true } }),
    retentionClass: (0, import_fields11.text)({ validation: { isRequired: true } }),
    retainUntil: (0, import_fields11.timestamp)(),
    legalHold: (0, import_fields11.checkbox)({ defaultValue: false }),
    deletionRequestedAt: (0, import_fields11.timestamp)(),
    tombstonedAt: (0, import_fields11.timestamp)(),
    uploadedBy: (0, import_fields11.relationship)({ ref: "User" }),
    readyAt: (0, import_fields11.timestamp)(),
    metadata: (0, import_fields11.json)(),
    accessEvents: (0, import_fields11.relationship)({ ref: "AssetAccessEvent.asset", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ClientMembership.ts
var import_core11 = require("@keystone-6/core");
var import_fields12 = require("@keystone-6/core/fields");
var ClientMembership = (0, import_core11.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadClientMemberships
    }
  },
  hooks: createLifecycleHooks("client_membership", ["status", "startDate", "nextBillingDate", "pausedUntil", "clientId", "membershipId"]),
  ui: {
    listView: {
      initialColumns: ["client", "membership", "status", "startDate", "nextBillingDate"]
    }
  },
  fields: {
    practice: (0, import_fields12.relationship)({ ref: "Practice" }),
    // Link to User (client)
    client: (0, import_fields12.relationship)({
      ref: "User.clientMemberships",
      ui: {
        displayMode: "select",
        description: "The client who holds this membership"
      }
    }),
    // Link to Membership plan
    membership: (0, import_fields12.relationship)({
      ref: "Membership",
      ui: {
        displayMode: "select",
        description: "The membership plan"
      }
    }),
    // Membership dates
    startDate: (0, import_fields12.timestamp)({
      validation: { isRequired: true },
      ui: {
        description: "When the membership started"
      }
    }),
    nextBillingDate: (0, import_fields12.timestamp)({
      ui: {
        description: "Next billing date for recurring memberships"
      }
    }),
    // Membership status
    status: (0, import_fields12.select)({
      type: "string",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Paused", value: "paused" },
        { label: "Cancelled", value: "cancelled" }
      ],
      ui: {
        displayMode: "segmented-control",
        description: "Current status of the membership"
      }
    }),
    // Pause management
    pausedUntil: (0, import_fields12.timestamp)({
      ui: {
        description: "If paused, when the membership will resume"
      }
    }),
    agreements: (0, import_fields12.relationship)({ ref: "MembershipAgreement.clientMembership", many: true }),
    ledgerEntries: (0, import_fields12.relationship)({ ref: "MembershipLedgerEntry.clientMembership", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ClientPackageAdjustment.ts
var import_core12 = require("@keystone-6/core");
var import_fields13 = require("@keystone-6/core/fields");
var ClientPackageAdjustment = (0, import_core12.list)({
  access: { operation: { query: permissions.canManageFinance, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields13.relationship)({ ref: "Practice" }), clientPackage: (0, import_fields13.relationship)({ ref: "ClientPackage.adjustments" }), usage: (0, import_fields13.relationship)({ ref: "ClientPackageUsage" }), actor: (0, import_fields13.relationship)({ ref: "User" }), type: (0, import_fields13.select)({ type: "enum", options: ["purchase", "reservation", "release", "consume", "reverse", "refund", "expire", "transfer"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), valueDelta: (0, import_fields13.integer)({ validation: { isRequired: true } }), reason: (0, import_fields13.text)({ validation: { isRequired: true } }), evidence: (0, import_fields13.json)(), occurredAt: (0, import_fields13.timestamp)({ validation: { isRequired: true } }), evidenceHash: (0, import_fields13.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields13.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/ClinicalAuthorityEvent.ts
var import_core13 = require("@keystone-6/core");
var import_fields14 = require("@keystone-6/core/fields");
var ClinicalAuthorityEvent = (0, import_core13.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields14.relationship)({ ref: "Practice" }),
    location: (0, import_fields14.relationship)({ ref: "Location" }),
    provider: (0, import_fields14.relationship)({ ref: "Provider" }),
    supervisor: (0, import_fields14.relationship)({ ref: "Provider" }),
    credential: (0, import_fields14.relationship)({ ref: "ProviderCredential" }),
    authorization: (0, import_fields14.relationship)({ ref: "ProviderAuthorization" }),
    service: (0, import_fields14.relationship)({ ref: "Service" }),
    client: (0, import_fields14.relationship)({ ref: "Client" }),
    appointment: (0, import_fields14.relationship)({ ref: "Appointment" }),
    treatmentSession: (0, import_fields14.relationship)({ ref: "TreatmentSession" }),
    stage: (0, import_fields14.select)({ type: "enum", options: ["scheduling", "order", "consent", "treatment_start", "administration", "completion"].map((value) => ({ label: value, value })), validation: { isRequired: true } }),
    decision: (0, import_fields14.select)({ type: "enum", options: ["allowed", "denied", "review_required"].map((value) => ({ label: value, value })), validation: { isRequired: true } }),
    reason: (0, import_fields14.text)({ validation: { isRequired: true } }),
    policyVersion: (0, import_fields14.text)({ validation: { isRequired: true } }),
    evidence: (0, import_fields14.json)(),
    evidenceHash: (0, import_fields14.text)({ validation: { isRequired: true } }),
    decidedAt: (0, import_fields14.timestamp)({ validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields14.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    ...trackingFields
  }
});

// features/keystone/models/ClinicalOrder.ts
var import_core14 = require("@keystone-6/core");
var import_fields15 = require("@keystone-6/core/fields");
var ClinicalOrder = (0, import_core14.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields15.relationship)({ ref: "Practice" }),
    location: (0, import_fields15.relationship)({ ref: "Location" }),
    client: (0, import_fields15.relationship)({ ref: "Client" }),
    consultation: (0, import_fields15.relationship)({ ref: "Consultation.orders" }),
    plan: (0, import_fields15.relationship)({ ref: "TreatmentPlan.orders" }),
    service: (0, import_fields15.relationship)({ ref: "Service" }),
    orderedBy: (0, import_fields15.relationship)({ ref: "Provider" }),
    authorizedPerformer: (0, import_fields15.relationship)({ ref: "Provider" }),
    requiredSupervisor: (0, import_fields15.relationship)({ ref: "Provider" }),
    status: (0, import_fields15.select)({ type: "enum", options: ["active", "partially_fulfilled", "fulfilled", "held", "revoked", "expired", "entered_in_error"].map((value) => ({ label: value, value })), defaultValue: "active", validation: { isRequired: true } }),
    instructionSnapshot: (0, import_fields15.json)(),
    protocolVersion: (0, import_fields15.text)({ validation: { isRequired: true } }),
    indication: (0, import_fields15.text)({ validation: { isRequired: true } }),
    anatomicSite: (0, import_fields15.text)(),
    doseRange: (0, import_fields15.text)(),
    performerConstraints: (0, import_fields15.text)(),
    supervisionSnapshot: (0, import_fields15.text)(),
    signedAt: (0, import_fields15.timestamp)({ validation: { isRequired: true } }),
    validFrom: (0, import_fields15.timestamp)({ validation: { isRequired: true } }),
    validUntil: (0, import_fields15.timestamp)({ validation: { isRequired: true } }),
    evidenceHash: (0, import_fields15.text)({ validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields15.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    supersedes: (0, import_fields15.relationship)({ ref: "ClinicalOrder.supersededBy" }),
    supersededBy: (0, import_fields15.relationship)({ ref: "ClinicalOrder.supersedes" }),
    actions: (0, import_fields15.relationship)({ ref: "ClinicalOrderAction.order", many: true }),
    administrations: (0, import_fields15.relationship)({ ref: "TreatmentAdministration.order", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ClinicalOrderAction.ts
var import_core15 = require("@keystone-6/core");
var import_fields16 = require("@keystone-6/core/fields");
var ClinicalOrderAction = (0, import_core15.list)({ access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } }, fields: { practice: (0, import_fields16.relationship)({ ref: "Practice" }), order: (0, import_fields16.relationship)({ ref: "ClinicalOrder.actions" }), actor: (0, import_fields16.relationship)({ ref: "Provider" }), action: (0, import_fields16.select)({ type: "enum", options: ["hold", "release", "partially_fulfill", "fulfill", "revoke", "expire", "enter_in_error"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), fromStatus: (0, import_fields16.text)({ validation: { isRequired: true } }), toStatus: (0, import_fields16.text)({ validation: { isRequired: true } }), reason: (0, import_fields16.text)({ validation: { isRequired: true } }), evidence: (0, import_fields16.json)(), evidenceHash: (0, import_fields16.text)({ validation: { isRequired: true } }), occurredAt: (0, import_fields16.timestamp)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields16.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields } });

// features/keystone/models/ConsentAction.ts
var import_core16 = require("@keystone-6/core");
var import_fields17 = require("@keystone-6/core/fields");
var ConsentAction = (0, import_core16.list)({ access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } }, fields: { practice: (0, import_fields17.relationship)({ ref: "Practice" }), consent: (0, import_fields17.relationship)({ ref: "ConsentRecord.actions" }), actor: (0, import_fields17.relationship)({ ref: "User" }), action: (0, import_fields17.select)({ type: "enum", options: ["withdraw", "expire", "supersede", "invalidate"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), fromStatus: (0, import_fields17.text)({ validation: { isRequired: true } }), toStatus: (0, import_fields17.text)({ validation: { isRequired: true } }), reason: (0, import_fields17.text)({ validation: { isRequired: true } }), evidence: (0, import_fields17.json)(), evidenceHash: (0, import_fields17.text)({ validation: { isRequired: true } }), occurredAt: (0, import_fields17.timestamp)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields17.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields } });

// features/keystone/models/ConsentRecord.ts
var import_core17 = require("@keystone-6/core");
var import_fields18 = require("@keystone-6/core/fields");
var ConsentRecord = (0, import_core17.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields18.relationship)({ ref: "Practice" }),
    client: (0, import_fields18.relationship)({ ref: "Client" }),
    appointment: (0, import_fields18.relationship)({ ref: "Appointment.consents" }),
    service: (0, import_fields18.relationship)({ ref: "Service" }),
    templateVersion: (0, import_fields18.relationship)({ ref: "ConsentTemplateVersion.records" }),
    presentedBy: (0, import_fields18.relationship)({ ref: "Provider" }),
    status: (0, import_fields18.select)({ type: "enum", options: ["effective", "withdrawn", "expired", "superseded", "invalidated"].map((value) => ({ label: value, value })), defaultValue: "effective", validation: { isRequired: true } }),
    signerName: (0, import_fields18.text)({ validation: { isRequired: true } }),
    signerRole: (0, import_fields18.select)({ type: "enum", options: ["self", "parent", "guardian", "representative"].map((value) => ({ label: value, value })), validation: { isRequired: true } }),
    representativeAuthority: (0, import_fields18.text)(),
    interpreter: (0, import_fields18.text)(),
    witness: (0, import_fields18.text)(),
    discussionEvidence: (0, import_fields18.json)(),
    signatureEvidenceHash: (0, import_fields18.text)({ validation: { isRequired: true } }),
    evidenceHash: (0, import_fields18.text)({ validation: { isRequired: true } }),
    signedAt: (0, import_fields18.timestamp)({ validation: { isRequired: true } }),
    effectiveUntil: (0, import_fields18.timestamp)(),
    withdrawnAt: (0, import_fields18.timestamp)(),
    supersedes: (0, import_fields18.relationship)({ ref: "ConsentRecord.supersededBy" }),
    supersededBy: (0, import_fields18.relationship)({ ref: "ConsentRecord.supersedes" }),
    actions: (0, import_fields18.relationship)({ ref: "ConsentAction.consent", many: true }),
    idempotencyKey: (0, import_fields18.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    ...trackingFields
  }
});

// features/keystone/models/ConsentTemplateVersion.ts
var import_core18 = require("@keystone-6/core");
var import_fields19 = require("@keystone-6/core/fields");
var ConsentTemplateVersion = (0, import_core18.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields19.relationship)({ ref: "Practice" }),
    service: (0, import_fields19.relationship)({ ref: "Service" }),
    jurisdiction: (0, import_fields19.text)({ validation: { isRequired: true } }),
    language: (0, import_fields19.text)({ validation: { isRequired: true } }),
    version: (0, import_fields19.text)({ validation: { isRequired: true } }),
    contentSnapshot: (0, import_fields19.json)(),
    contentHash: (0, import_fields19.text)({ validation: { isRequired: true } }),
    effectiveFrom: (0, import_fields19.timestamp)({ validation: { isRequired: true } }),
    effectiveUntil: (0, import_fields19.timestamp)(),
    supersedes: (0, import_fields19.relationship)({ ref: "ConsentTemplateVersion.supersededBy" }),
    supersededBy: (0, import_fields19.relationship)({ ref: "ConsentTemplateVersion.supersedes" }),
    records: (0, import_fields19.relationship)({ ref: "ConsentRecord.templateVersion", many: true }),
    idempotencyKey: (0, import_fields19.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    ...trackingFields
  }
});

// features/keystone/models/ContraindicationDecision.ts
var import_core19 = require("@keystone-6/core");
var import_fields20 = require("@keystone-6/core/fields");
var ContraindicationDecision = (0, import_core19.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields20.relationship)({ ref: "Practice" }),
    finding: (0, import_fields20.relationship)({ ref: "ContraindicationFinding.decisions" }),
    decidedBy: (0, import_fields20.relationship)({ ref: "Provider" }),
    disposition: (0, import_fields20.select)({ type: "enum", options: ["cleared_with_rationale", "deferred", "hard_stop", "referred", "reopened"].map((value) => ({ label: value, value })), validation: { isRequired: true } }),
    rationale: (0, import_fields20.text)({ validation: { isRequired: true } }),
    authorityEvidence: (0, import_fields20.json)(),
    evidenceHash: (0, import_fields20.text)({ validation: { isRequired: true } }),
    decidedAt: (0, import_fields20.timestamp)({ validation: { isRequired: true } }),
    expiresAt: (0, import_fields20.timestamp)(),
    idempotencyKey: (0, import_fields20.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    ...trackingFields
  }
});

// features/keystone/models/ContraindicationFinding.ts
var import_core20 = require("@keystone-6/core");
var import_fields21 = require("@keystone-6/core/fields");
var ContraindicationFinding = (0, import_core20.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields21.relationship)({ ref: "Practice" }),
    client: (0, import_fields21.relationship)({ ref: "Client" }),
    consultation: (0, import_fields21.relationship)({ ref: "Consultation.findings" }),
    service: (0, import_fields21.relationship)({ ref: "Service" }),
    ruleCode: (0, import_fields21.text)({ validation: { isRequired: true } }),
    ruleVersion: (0, import_fields21.text)({ validation: { isRequired: true } }),
    sourceEvidence: (0, import_fields21.json)(),
    sourceEvidenceHash: (0, import_fields21.text)({ validation: { isRequired: true } }),
    severity: (0, import_fields21.select)({ type: "enum", options: ["information", "precaution", "clinician_review", "hard_stop"].map((value) => ({ label: value, value })), validation: { isRequired: true } }),
    detectedAt: (0, import_fields21.timestamp)({ validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields21.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    decisions: (0, import_fields21.relationship)({ ref: "ContraindicationDecision.finding", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ClientNote.ts
var import_core21 = require("@keystone-6/core");
var import_fields22 = require("@keystone-6/core/fields");
var ClientNote = (0, import_core21.list)({
  access: {
    operation: {
      query: async (args) => await activeListPermissions.canManageClinical(args) || await activeListPermissions.canManageSensitiveRecords(args),
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  ui: {
    listView: {
      initialColumns: ["client", "author", "isPrivate", "createdAt"]
    }
  },
  fields: {
    client: (0, import_fields22.relationship)({
      ref: "Client",
      ui: {
        displayMode: "select",
        description: "Client this note is about"
      }
    }),
    author: (0, import_fields22.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who wrote this note"
      }
    }),
    content: (0, import_fields22.text)({
      ui: {
        displayMode: "textarea",
        description: "Note content"
      },
      validation: {
        isRequired: true
      }
    }),
    isPrivate: (0, import_fields22.checkbox)({
      defaultValue: true,
      ui: {
        description: "Visible only to staff (not shown to client)"
      }
    }),
    appointment: (0, import_fields22.relationship)({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Related appointment (if any)"
      }
    }),
    practice: (0, import_fields22.relationship)({ ref: "Practice" }),
    type: (0, import_fields22.text)({ defaultValue: "clinical" }),
    status: (0, import_fields22.text)({ defaultValue: "signed" }),
    signedAt: (0, import_fields22.timestamp)(),
    evidenceHash: (0, import_fields22.text)(),
    idempotencyKey: (0, import_fields22.text)({ isIndexed: "unique" }),
    lateEntryReason: (0, import_fields22.text)(),
    supersedes: (0, import_fields22.relationship)({ ref: "ClientNote.supersededBy" }),
    supersededBy: (0, import_fields22.relationship)({ ref: "ClientNote.supersedes" }),
    assets: (0, import_fields22.relationship)({ ref: "ClientAsset.note", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ClientPackage.ts
var import_core22 = require("@keystone-6/core");
var import_fields23 = require("@keystone-6/core/fields");
var formatCurrency2 = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount / 100);
};
var ClientPackage = (0, import_core22.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadClientPackages
    }
  },
  hooks: createLifecycleHooks("client_package", ["status", "totalValue", "paidAmount", "usedValue", "expiresAt", "clientId", "packageId"]),
  ui: {
    listView: {
      initialColumns: ["client", "package", "status", "purchasedAt", "expiresAt"]
    }
  },
  fields: {
    practice: (0, import_fields23.relationship)({ ref: "Practice" }),
    client: (0, import_fields23.relationship)({
      ref: "User.clientPackages",
      ui: {
        displayMode: "select",
        description: "Client who purchased the package"
      }
    }),
    package: (0, import_fields23.relationship)({
      ref: "ServicePackage",
      ui: {
        displayMode: "select",
        description: "The service package purchased"
      }
    }),
    purchasedAt: (0, import_fields23.timestamp)({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the package was purchased"
      }
    }),
    expiresAt: (0, import_fields23.timestamp)({
      ui: {
        description: "When the package expires (calculated from validityDays)"
      }
    }),
    status: (0, import_fields23.select)({
      type: "string",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Expired", value: "expired" },
        { label: "Fully Used", value: "fully-used" },
        { label: "Cancelled", value: "cancelled" }
      ],
      ui: {
        displayMode: "select",
        description: "Current status of the package"
      }
    }),
    totalValue: (0, import_fields23.integer)({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Total package value in cents"
      }
    }),
    paidAmount: (0, import_fields23.integer)({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Amount paid in cents"
      }
    }),
    usedValue: (0, import_fields23.integer)({
      defaultValue: 0,
      ui: {
        description: "Amount used so far in cents"
      }
    }),
    usageHistory: (0, import_fields23.relationship)({
      ref: "ClientPackageUsage.clientPackage",
      many: true,
      ui: {
        displayMode: "count",
        description: "Usage history of this package"
      }
    }),
    adjustments: (0, import_fields23.relationship)({ ref: "ClientPackageAdjustment.clientPackage", many: true }),
    metadata: (0, import_fields23.json)({
      ui: {
        description: "Additional metadata"
      }
    }),
    remainingValue: (0, import_fields23.virtual)({
      field: import_core22.graphql.field({
        type: import_core22.graphql.Int,
        async resolve(item, args, context) {
          const clientPackageId = item.id;
          const pkg = await context.sudo().query.ClientPackage.findOne({
            where: { id: clientPackageId },
            query: "totalValue usedValue"
          });
          if (!pkg) return 0;
          return (pkg.totalValue || 0) - (pkg.usedValue || 0);
        }
      })
    }),
    formattedRemainingValue: (0, import_fields23.virtual)({
      field: import_core22.graphql.field({
        type: import_core22.graphql.String,
        async resolve(item, args, context) {
          const clientPackageId = item.id;
          const pkg = await context.sudo().query.ClientPackage.findOne({
            where: { id: clientPackageId },
            query: "totalValue usedValue"
          });
          if (!pkg) return "$0.00";
          const remaining = (pkg.totalValue || 0) - (pkg.usedValue || 0);
          return formatCurrency2(remaining);
        }
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/ClientPackageUsage.ts
var import_core23 = require("@keystone-6/core");
var import_fields24 = require("@keystone-6/core/fields");
var formatCurrency3 = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount / 100);
};
var ClientPackageUsage = (0, import_core23.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadClientPackageUsages
    }
  },
  ui: {
    listView: {
      initialColumns: ["clientPackage", "service", "quantityUsed", "valueUsed", "usedAt"]
    }
  },
  fields: {
    practice: (0, import_fields24.relationship)({ ref: "Practice" }),
    clientPackage: (0, import_fields24.relationship)({
      ref: "ClientPackage.usageHistory",
      ui: {
        displayMode: "select",
        description: "The client package this usage is for"
      }
    }),
    appointment: (0, import_fields24.relationship)({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "The appointment where this was used"
      }
    }),
    service: (0, import_fields24.relationship)({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "The service that was used"
      }
    }),
    quantityUsed: (0, import_fields24.integer)({
      defaultValue: 1,
      validation: { min: 1 },
      ui: {
        description: "Number of units used"
      }
    }),
    valueUsed: (0, import_fields24.integer)({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Value used in cents"
      }
    }),
    usedAt: (0, import_fields24.timestamp)({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the package was used"
      }
    }),
    idempotencyKey: (0, import_fields24.text)({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Workflow idempotency key that produced this immutable usage record"
      }
    }),
    formattedValueUsed: (0, import_fields24.virtual)({
      field: import_core23.graphql.field({
        type: import_core23.graphql.String,
        async resolve(item, args, context) {
          const usageId = item.id;
          const usage = await context.sudo().query.ClientPackageUsage.findOne({
            where: { id: usageId },
            query: "valueUsed"
          });
          if (!usage?.valueUsed) return "$0.00";
          return formatCurrency3(usage.valueUsed);
        }
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/ClientPoints.ts
var import_core24 = require("@keystone-6/core");
var import_fields25 = require("@keystone-6/core/fields");
var ClientPoints = (0, import_core24.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadClientPoints
    }
  },
  graphql: {
    plural: "ClientPointsRecords"
  },
  ui: {
    listView: {
      initialColumns: ["client", "points", "tier"]
    }
  },
  fields: {
    practice: (0, import_fields25.relationship)({ ref: "Practice" }),
    // Link to User/Client
    client: (0, import_fields25.relationship)({
      ref: "User.clientPointsRecords",
      ui: {
        displayMode: "select",
        description: "The client who owns these points"
      }
    }),
    // Current points balance
    points: (0, import_fields25.integer)({
      defaultValue: 0,
      validation: { isRequired: true },
      ui: {
        description: "Current loyalty points balance"
      }
    }),
    // Loyalty tier based on points
    tier: (0, import_fields25.text)({
      defaultValue: "bronze",
      ui: {
        description: "Loyalty tier (e.g., bronze, silver, gold, platinum)"
      }
    }),
    // Transaction history stored as JSON array
    // Each transaction: { date: string, amount: number, reason: string }
    transactions: (0, import_fields25.json)({
      defaultValue: [],
      ui: {
        description: "Array of point transactions with date, amount, and reason",
        createView: { fieldMode: "hidden" }
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Commission.ts
var import_core25 = require("@keystone-6/core");
var import_fields26 = require("@keystone-6/core/fields");
var Commission = (0, import_core25.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadCommissions
    }
  },
  hooks: createLifecycleHooks("commission", ["saleAmount", "commissionRate", "commissionAmount", "isPaid", "paidAt", "providerId", "serviceId", "paymentId"]),
  ui: {
    listView: {
      initialColumns: ["provider", "payment", "saleAmount", "commissionRate", "commissionAmount", "isPaid"]
    }
  },
  fields: {
    practice: (0, import_fields26.relationship)({ ref: "Practice" }),
    // Commission calculation fields
    saleAmount: (0, import_fields26.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Total sale amount for this service"
      }
    }),
    commissionRate: (0, import_fields26.float)({
      validation: { isRequired: true, min: 0, max: 1 },
      ui: {
        description: "Commission rate applied (e.g., 0.5 for 50%)"
      }
    }),
    commissionAmount: (0, import_fields26.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Calculated commission amount (saleAmount * commissionRate)"
      }
    }),
    // Payment status
    isPaid: (0, import_fields26.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether this commission has been paid to the provider"
      }
    }),
    paidAt: (0, import_fields26.timestamp)({
      ui: {
        description: "When the commission was paid to the provider"
      }
    }),
    // Notes
    notes: (0, import_fields26.text)({
      ui: {
        displayMode: "textarea",
        description: "Notes about this commission"
      }
    }),
    // Relationships
    provider: (0, import_fields26.relationship)({
      ref: "Provider",
      ui: {
        displayMode: "select",
        description: "Provider who earned this commission"
      }
    }),
    service: (0, import_fields26.relationship)({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "Service that generated this commission"
      }
    }),
    payment: (0, import_fields26.relationship)({
      ref: "Payment",
      ui: {
        displayMode: "select",
        description: "Payment associated with this commission"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Consultation.ts
var import_core26 = require("@keystone-6/core");
var import_fields27 = require("@keystone-6/core/fields");
var Consultation = (0, import_core26.list)({
  access: {
    operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter }
  },
  fields: {
    practice: (0, import_fields27.relationship)({ ref: "Practice" }),
    location: (0, import_fields27.relationship)({ ref: "Location" }),
    client: (0, import_fields27.relationship)({ ref: "Client" }),
    appointment: (0, import_fields27.relationship)({ ref: "Appointment.consultation" }),
    service: (0, import_fields27.relationship)({ ref: "Service" }),
    provider: (0, import_fields27.relationship)({ ref: "Provider.consultations" }),
    status: (0, import_fields27.select)({ type: "enum", options: [
      { label: "Requested", value: "requested" },
      { label: "In Review", value: "in_review" },
      { label: "Completed", value: "completed" },
      { label: "Needs Follow-up", value: "needs_follow_up" },
      { label: "Closed", value: "closed" }
    ], defaultValue: "requested", validation: { isRequired: true } }),
    historySnapshot: (0, import_fields27.json)(),
    examinationSnapshot: (0, import_fields27.json)(),
    goalsSnapshot: (0, import_fields27.json)(),
    alternativesSnapshot: (0, import_fields27.json)(),
    summary: (0, import_fields27.text)({ ui: { displayMode: "textarea" } }),
    indication: (0, import_fields27.text)(),
    candidacyDecision: (0, import_fields27.select)({ type: "enum", options: ["candidate", "deferred", "declined", "referred"].map((value) => ({ label: value, value })) }),
    staffDecisionRecorded: (0, import_fields27.checkbox)({ defaultValue: false, ui: { description: "Records that an authorized staff member completed review; not a diagnosis or safety claim." } }),
    reviewedAt: (0, import_fields27.timestamp)(),
    signedAt: (0, import_fields27.timestamp)(),
    revision: (0, import_fields27.text)({ defaultValue: "1" }),
    protocolVersion: (0, import_fields27.text)(),
    contraindicationProtocolVersion: (0, import_fields27.text)(),
    contraindicationReviewHash: (0, import_fields27.text)(),
    evidenceHash: (0, import_fields27.text)(),
    idempotencyKey: (0, import_fields27.text)({ isIndexed: "unique" }),
    supersedes: (0, import_fields27.relationship)({ ref: "Consultation.supersededBy" }),
    supersededBy: (0, import_fields27.relationship)({ ref: "Consultation.supersedes" }),
    orders: (0, import_fields27.relationship)({ ref: "ClinicalOrder.consultation", many: true }),
    findings: (0, import_fields27.relationship)({ ref: "ContraindicationFinding.consultation", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/DomainEvent.ts
var import_core27 = require("@keystone-6/core");
var import_fields28 = require("@keystone-6/core/fields");
var DomainEvent = (0, import_core27.list)({
  access: {
    operation: {
      query: permissions.canManageIntegrations,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  ui: {
    listView: { initialColumns: ["eventType", "aggregateType", "aggregateId", "operation", "status", "occurredAt"] }
  },
  fields: {
    practice: (0, import_fields28.relationship)({ ref: "Practice" }),
    eventKey: (0, import_fields28.text)({ validation: { isRequired: true }, isIndexed: "unique", access: { update: () => false } }),
    eventType: (0, import_fields28.text)({ validation: { isRequired: true }, access: { update: () => false } }),
    eventVersion: (0, import_fields28.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 }, access: { update: () => false } }),
    aggregateType: (0, import_fields28.text)({ validation: { isRequired: true }, access: { update: () => false } }),
    aggregateId: (0, import_fields28.text)({ validation: { isRequired: true }, access: { update: () => false } }),
    operation: (0, import_fields28.select)({
      type: "enum",
      options: [
        { label: "Create", value: "create" },
        { label: "Update", value: "update" },
        { label: "Delete", value: "delete" }
      ],
      validation: { isRequired: true },
      access: { update: () => false }
    }),
    actorId: (0, import_fields28.text)({ validation: { isRequired: true }, access: { update: () => false } }),
    locationId: (0, import_fields28.text)({ access: { update: () => false } }),
    payload: (0, import_fields28.json)({ access: { update: () => false } }),
    payloadHash: (0, import_fields28.text)({ validation: { isRequired: true }, access: { update: () => false } }),
    occurredAt: (0, import_fields28.timestamp)({ validation: { isRequired: true }, access: { update: () => false } }),
    status: (0, import_fields28.select)({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Delivered", value: "delivered" },
        { label: "Dead letter", value: "dead_letter" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true }
    }),
    attempts: (0, import_fields28.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    availableAt: (0, import_fields28.timestamp)({ defaultValue: { kind: "now" }, validation: { isRequired: true } }),
    deliveredAt: (0, import_fields28.timestamp)(),
    lastError: (0, import_fields28.text)({ ui: { displayMode: "textarea" } }),
    ...trackingFields
  }
});

// features/keystone/models/FollowUpAction.ts
var import_core28 = require("@keystone-6/core");
var import_fields29 = require("@keystone-6/core/fields");
var FollowUpAction = (0, import_core28.list)({ access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } }, fields: { practice: (0, import_fields29.relationship)({ ref: "Practice" }), task: (0, import_fields29.relationship)({ ref: "FollowUpTask.actions" }), actor: (0, import_fields29.relationship)({ ref: "User" }), action: (0, import_fields29.select)({ type: "enum", options: ["schedule", "contact", "patient_response", "escalate", "complete", "cancel"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), reason: (0, import_fields29.text)({ validation: { isRequired: true } }), evidence: (0, import_fields29.json)(), redFlag: (0, import_fields29.select)({ type: "enum", options: ["none", "review", "urgent"].map((value) => ({ label: value, value })), defaultValue: "none" }), evidenceHash: (0, import_fields29.text)({ validation: { isRequired: true } }), occurredAt: (0, import_fields29.timestamp)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields29.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields } });

// features/keystone/models/FollowUpTask.ts
var import_core29 = require("@keystone-6/core");
var import_fields30 = require("@keystone-6/core/fields");
var FollowUpTask = (0, import_core29.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields30.relationship)({ ref: "Practice" }),
    location: (0, import_fields30.relationship)({ ref: "Location" }),
    client: (0, import_fields30.relationship)({ ref: "Client" }),
    appointment: (0, import_fields30.relationship)({ ref: "Appointment" }),
    treatmentSession: (0, import_fields30.relationship)({ ref: "TreatmentSession" }),
    assignedTo: (0, import_fields30.relationship)({ ref: "User" }),
    dueAt: (0, import_fields30.timestamp)({ validation: { isRequired: true } }),
    title: (0, import_fields30.text)({ validation: { isRequired: true } }),
    instructions: (0, import_fields30.text)({ ui: { displayMode: "textarea" } }),
    actions: (0, import_fields30.relationship)({ ref: "FollowUpAction.task", many: true }),
    status: (0, import_fields30.select)({ type: "enum", options: [
      { label: "Open", value: "open" },
      { label: "In Progress", value: "in_progress" },
      { label: "Completed", value: "completed" },
      { label: "Cancelled", value: "cancelled" }
    ], defaultValue: "open", validation: { isRequired: true } }),
    completedAt: (0, import_fields30.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/FormSubmission.ts
var import_core30 = require("@keystone-6/core");
var import_fields31 = require("@keystone-6/core/fields");
var FormSubmission = (0, import_core30.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadFormSubmissions
    }
  },
  ui: {
    listView: {
      initialColumns: ["client", "form", "submittedAt", "appointment"]
    }
  },
  fields: {
    practice: (0, import_fields31.relationship)({ ref: "Practice" }),
    templateVersion: (0, import_fields31.integer)({ validation: { isRequired: true, min: 1 } }),
    status: (0, import_fields31.select)({ type: "enum", options: [
      { label: "Submitted", value: "submitted" },
      { label: "In Review", value: "in_review" },
      { label: "Reviewed", value: "reviewed" },
      { label: "Superseded", value: "superseded" }
    ], defaultValue: "submitted", validation: { isRequired: true } }),
    reviewedBy: (0, import_fields31.relationship)({ ref: "User" }),
    reviewedAt: (0, import_fields31.timestamp)(),
    signedAt: (0, import_fields31.timestamp)(),
    evidenceHash: (0, import_fields31.text)(),
    idempotencyKey: (0, import_fields31.text)({ isIndexed: "unique" }),
    supersedes: (0, import_fields31.relationship)({ ref: "FormSubmission.supersededBy" }),
    supersededBy: (0, import_fields31.relationship)({ ref: "FormSubmission.supersedes" }),
    reviewActions: (0, import_fields31.relationship)({ ref: "IntakeReviewAction.submission", many: true }),
    // Form data stored as JSON
    data: (0, import_fields31.json)({
      ui: {
        description: "Form field responses as JSON object"
      }
    }),
    // Digital signature
    acknowledgement: (0, import_fields31.text)({
      ui: { displayMode: "textarea", description: "Bounded acknowledgement evidence; not a compliance or safety certification." }
    }),
    // Submission timestamp
    submittedAt: (0, import_fields31.timestamp)({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the form was submitted"
      }
    }),
    // Relationships
    client: (0, import_fields31.relationship)({
      ref: "User.formSubmissions",
      ui: {
        displayMode: "select",
        description: "Client who submitted the form"
      }
    }),
    form: (0, import_fields31.relationship)({
      ref: "IntakeForm.submissions",
      ui: {
        displayMode: "select",
        description: "The intake form template that was filled out (legacy)"
      }
    }),
    template: (0, import_fields31.relationship)({
      ref: "FormTemplate.submissions",
      ui: {
        displayMode: "select",
        description: "The form template that was filled out"
      }
    }),
    // Optional link to appointment
    appointment: (0, import_fields31.relationship)({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Associated appointment (if applicable)"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/FormTemplate.ts
var import_core31 = require("@keystone-6/core");
var import_fields32 = require("@keystone-6/core/fields");
var FormTemplate = (0, import_core31.list)({
  access: {
    operation: {
      query: permissions.canManageClinical,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  ui: {
    listView: {
      initialColumns: ["name", "type", "isActive", "requiredForCategories"]
    }
  },
  fields: {
    practice: (0, import_fields32.relationship)({ ref: "Practice" }),
    version: (0, import_fields32.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    name: (0, import_fields32.text)({
      validation: { isRequired: true },
      ui: {
        description: "Versioned intake, acknowledgement, or consultation form name"
      }
    }),
    type: (0, import_fields32.select)({
      type: "string",
      options: [
        { label: "Intake", value: "intake" },
        { label: "Consent", value: "consent" },
        { label: "Clinical Intake", value: "clinical_intake" },
        { label: "Waiver", value: "waiver" }
      ],
      defaultValue: "intake",
      ui: {
        displayMode: "select",
        description: "Type of form"
      }
    }),
    description: (0, import_fields32.text)({
      ui: {
        displayMode: "textarea",
        description: "Description of the form's purpose"
      }
    }),
    fields: (0, import_fields32.json)({
      ui: {
        description: `JSON array of field definitions: [{id, type (text/textarea/checkbox/radio/select/signature/file), label, required, options (for select/radio), validation}]`
      }
    }),
    isActive: (0, import_fields32.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this form is currently active"
      }
    }),
    requiredForCategories: (0, import_fields32.relationship)({
      ref: "ServiceCategory",
      many: true,
      ui: {
        displayMode: "select",
        description: "Service categories that require this form"
      }
    }),
    submissions: (0, import_fields32.relationship)({
      ref: "FormSubmission.template",
      many: true,
      ui: {
        displayMode: "count"
      }
    }),
    metadata: (0, import_fields32.json)({
      ui: {
        description: "Additional form metadata"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/GiftCard.ts
var import_core32 = require("@keystone-6/core");
var import_fields33 = require("@keystone-6/core/fields");
var GiftCard = (0, import_core32.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadGiftCards
    }
  },
  ui: {
    listView: {
      initialColumns: ["code", "initialValue", "currentBalance", "recipientName", "isActive", "expiresAt"]
    }
  },
  fields: {
    practice: (0, import_fields33.relationship)({ ref: "Practice" }),
    // Unique gift card code
    code: (0, import_fields33.text)({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Unique gift card code for redemption"
      }
    }),
    // Value fields
    initialValue: (0, import_fields33.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Original value of the gift card when purchased"
      }
    }),
    currentBalance: (0, import_fields33.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Current remaining balance on the gift card"
      }
    }),
    // Recipient information
    recipientEmail: (0, import_fields33.text)({
      ui: {
        description: "Email address of the gift card recipient"
      }
    }),
    recipientName: (0, import_fields33.text)({
      ui: {
        description: "Name of the gift card recipient"
      }
    }),
    // Personal message
    message: (0, import_fields33.text)({
      ui: {
        displayMode: "textarea",
        description: "Personal message from purchaser to recipient"
      }
    }),
    // Expiration and status
    expiresAt: (0, import_fields33.timestamp)({
      ui: {
        description: "Expiration date of the gift card"
      }
    }),
    isActive: (0, import_fields33.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether the gift card is currently active and can be redeemed"
      }
    }),
    // Timestamps
    // Relationships
    purchasedBy: (0, import_fields33.relationship)({
      ref: "User.purchasedGiftCards",
      ui: {
        displayMode: "select",
        description: "User who purchased this gift card"
      }
    }),
    // Transactions on this gift card
    transactions: (0, import_fields33.relationship)({
      ref: "GiftCardTransaction.giftCard",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["amount", "type", "createdAt"],
        description: "Transaction history for this gift card"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/GiftCardTransaction.ts
var import_core33 = require("@keystone-6/core");
var import_fields34 = require("@keystone-6/core/fields");
var GiftCardTransaction = (0, import_core33.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadGiftCardTransactions
    }
  },
  ui: {
    listView: {
      initialColumns: ["giftCard", "amount", "type", "createdAt"]
    }
  },
  fields: {
    practice: (0, import_fields34.relationship)({ ref: "Practice" }),
    // Transaction amount
    amount: (0, import_fields34.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Transaction amount (positive for purchase/refund, negative for redemption)"
      }
    }),
    // Transaction type
    type: (0, import_fields34.select)({
      type: "string",
      options: [
        { label: "Purchase", value: "purchase" },
        { label: "Redemption", value: "redemption" },
        { label: "Refund", value: "refund" }
      ],
      validation: { isRequired: true },
      ui: {
        description: "Type of transaction"
      }
    }),
    idempotencyKey: (0, import_fields34.text)({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Workflow idempotency key that produced this immutable balance event"
      }
    }),
    // Notes
    notes: (0, import_fields34.text)({
      ui: {
        displayMode: "textarea",
        description: "Additional notes about this transaction"
      }
    }),
    // Relationships
    giftCard: (0, import_fields34.relationship)({
      ref: "GiftCard.transactions",
      ui: {
        displayMode: "select",
        description: "Gift card this transaction belongs to"
      }
    }),
    // Optional appointment (for redemptions)
    appointment: (0, import_fields34.relationship)({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Appointment this redemption was applied to (if applicable)"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/GoodsReceipt.ts
var import_core34 = require("@keystone-6/core");
var import_fields35 = require("@keystone-6/core/fields");
var GoodsReceipt = (0, import_core34.list)({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields35.relationship)({ ref: "Practice" }),
    location: (0, import_fields35.relationship)({ ref: "Location" }),
    purchaseOrder: (0, import_fields35.relationship)({ ref: "PurchaseOrder.receipts" }),
    receiptNumber: (0, import_fields35.text)({ validation: { isRequired: true } }),
    receivedAt: (0, import_fields35.timestamp)({ validation: { isRequired: true } }),
    receivedBy: (0, import_fields35.relationship)({ ref: "User" }),
    idempotencyKey: (0, import_fields35.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    evidence: (0, import_fields35.json)({ ui: { description: "Bounded receipt evidence; authoritative quantities live on immutable receipt lines, lots and stock movements." } }),
    lines: (0, import_fields35.relationship)({ ref: "GoodsReceiptLine.receipt", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/GoodsReceiptLine.ts
var import_core35 = require("@keystone-6/core");
var import_fields36 = require("@keystone-6/core/fields");
var GoodsReceiptLine = (0, import_core35.list)({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields36.relationship)({ ref: "Practice" }), receipt: (0, import_fields36.relationship)({ ref: "GoodsReceipt.lines" }), purchaseOrderLine: (0, import_fields36.relationship)({ ref: "PurchaseOrderLine" }), product: (0, import_fields36.relationship)({ ref: "Product" }), lot: (0, import_fields36.relationship)({ ref: "InventoryLot.receiptLine" }), quantity: (0, import_fields36.integer)({ validation: { isRequired: true, min: 1 } }), lotNumberSnapshot: (0, import_fields36.text)({ validation: { isRequired: true } }), expirationSnapshot: (0, import_fields36.timestamp)(), condition: (0, import_fields36.text)({ validation: { isRequired: true } }), temperatureEvidence: (0, import_fields36.json)(), quarantineReason: (0, import_fields36.text)(), evidenceHash: (0, import_fields36.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields36.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/Incident.ts
var import_core36 = require("@keystone-6/core");
var import_fields37 = require("@keystone-6/core/fields");
var Incident = (0, import_core36.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields37.relationship)({ ref: "Practice" }),
    location: (0, import_fields37.relationship)({ ref: "Location" }),
    client: (0, import_fields37.relationship)({ ref: "Client" }),
    appointment: (0, import_fields37.relationship)({ ref: "Appointment" }),
    treatmentSession: (0, import_fields37.relationship)({ ref: "TreatmentSession" }),
    administration: (0, import_fields37.relationship)({ ref: "TreatmentAdministration.incidents" }),
    suspectLot: (0, import_fields37.relationship)({ ref: "InventoryLot" }),
    suspectDevice: (0, import_fields37.relationship)({ ref: "Resource" }),
    reportedBy: (0, import_fields37.relationship)({ ref: "User" }),
    assignedTo: (0, import_fields37.relationship)({ ref: "User" }),
    occurredAt: (0, import_fields37.timestamp)({ validation: { isRequired: true } }),
    summary: (0, import_fields37.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    severity: (0, import_fields37.select)({ type: "enum", options: [
      { label: "Low", value: "low" },
      { label: "Moderate", value: "moderate" },
      { label: "High", value: "high" },
      { label: "Critical", value: "critical" }
    ], validation: { isRequired: true } }),
    status: (0, import_fields37.select)({ type: "enum", options: [
      { label: "Open", value: "open" },
      { label: "Under Review", value: "under_review" },
      { label: "Closed", value: "closed" }
    ], defaultValue: "open", validation: { isRequired: true } }),
    triageDisposition: (0, import_fields37.text)(),
    interventions: (0, import_fields37.json)(),
    emergencyTransferEvidence: (0, import_fields37.json)(),
    regulatoryStatus: (0, import_fields37.text)({ defaultValue: "reportability_pending" }),
    qualityStatus: (0, import_fields37.text)({ defaultValue: "investigating" }),
    revision: (0, import_fields37.integer)({ defaultValue: 1, validation: { min: 1 } }),
    closedAt: (0, import_fields37.timestamp)(),
    evidenceHash: (0, import_fields37.text)(),
    idempotencyKey: (0, import_fields37.text)({ isIndexed: "unique" }),
    assets: (0, import_fields37.relationship)({ ref: "ClientAsset.incident", many: true }),
    actions: (0, import_fields37.relationship)({ ref: "IncidentAction.incident", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/IncidentAction.ts
var import_core37 = require("@keystone-6/core");
var import_fields38 = require("@keystone-6/core/fields");
var IncidentAction = (0, import_core37.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields38.relationship)({ ref: "Practice" }), incident: (0, import_fields38.relationship)({ ref: "Incident.actions" }), actor: (0, import_fields38.relationship)({ ref: "User" }), clinician: (0, import_fields38.relationship)({ ref: "Provider" }), action: (0, import_fields38.select)({ type: "enum", options: ["report", "triage", "clinical_review", "intervention", "referral", "emergency_transfer", "manufacturer_notice", "regulatory_decision", "regulatory_submit", "capa_assign", "capa_verify", "clinical_resolve", "close"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), fromStatus: (0, import_fields38.text)(), toStatus: (0, import_fields38.text)({ validation: { isRequired: true } }), severity: (0, import_fields38.text)(), rationale: (0, import_fields38.text)({ validation: { isRequired: true } }), evidence: (0, import_fields38.json)(), evidenceHash: (0, import_fields38.text)({ validation: { isRequired: true } }), occurredAt: (0, import_fields38.timestamp)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields38.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/LegalHold.ts
var import_core38 = require("@keystone-6/core");
var import_fields39 = require("@keystone-6/core/fields");
var LegalHold = (0, import_core38.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields39.relationship)({ ref: "Practice" }), client: (0, import_fields39.relationship)({ ref: "Client" }), asset: (0, import_fields39.relationship)({ ref: "ClientAsset" }), incident: (0, import_fields39.relationship)({ ref: "Incident" }), status: (0, import_fields39.select)({ type: "enum", options: ["active", "released"].map((value) => ({ label: value, value })), defaultValue: "active", validation: { isRequired: true } }), reason: (0, import_fields39.text)({ validation: { isRequired: true } }), authorityReference: (0, import_fields39.text)({ validation: { isRequired: true } }), placedBy: (0, import_fields39.relationship)({ ref: "User" }), placedAt: (0, import_fields39.timestamp)({ validation: { isRequired: true } }), releasedBy: (0, import_fields39.relationship)({ ref: "User" }), releasedAt: (0, import_fields39.timestamp)(), releaseReason: (0, import_fields39.text)(), releaseAuthorityReference: (0, import_fields39.text)(), releaseEvidenceHash: (0, import_fields39.text)(), evidenceHash: (0, import_fields39.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields39.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/IntakeForm.ts
var import_core39 = require("@keystone-6/core");
var import_fields40 = require("@keystone-6/core/fields");
var IntakeForm = (0, import_core39.list)({
  access: {
    operation: {
      query: permissions.canManageClinical,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  ui: {
    listView: {
      initialColumns: ["name", "isActive", "requiredForServices"]
    }
  },
  fields: {
    practice: (0, import_fields40.relationship)({ ref: "Practice" }),
    name: (0, import_fields40.text)({
      validation: { isRequired: true },
      ui: {
        description: "Form name (e.g., New Client Intake, Color Consultation)"
      }
    }),
    // JSON schema for form fields
    fields: (0, import_fields40.json)({
      ui: {
        description: "JSON schema defining form fields, e.g., [{name: 'allergies', type: 'text', required: true}, {name: 'hairGoals', type: 'textarea'}]"
      }
    }),
    // Services that require this form
    requiredForServices: (0, import_fields40.relationship)({
      ref: "Service",
      many: true,
      ui: {
        displayMode: "select",
        description: "Services that require this intake form to be completed"
      }
    }),
    // Whether the form is currently active
    isActive: (0, import_fields40.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this form is currently in use"
      }
    }),
    // Submissions of this form
    submissions: (0, import_fields40.relationship)({
      ref: "FormSubmission.form",
      many: true,
      ui: {
        displayMode: "count"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/IntakeReviewAction.ts
var import_core40 = require("@keystone-6/core");
var import_fields41 = require("@keystone-6/core/fields");
var IntakeReviewAction = (0, import_core40.list)({ access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } }, fields: { practice: (0, import_fields41.relationship)({ ref: "Practice" }), submission: (0, import_fields41.relationship)({ ref: "FormSubmission.reviewActions" }), reviewer: (0, import_fields41.relationship)({ ref: "User" }), disposition: (0, import_fields41.select)({ type: "enum", options: ["reviewed", "needs_clarification", "escalated", "superseded"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), rationale: (0, import_fields41.text)({ validation: { isRequired: true } }), findings: (0, import_fields41.json)(), evidenceHash: (0, import_fields41.text)({ validation: { isRequired: true } }), occurredAt: (0, import_fields41.timestamp)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields41.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields } });

// features/keystone/models/InventoryLot.ts
var import_core41 = require("@keystone-6/core");
var import_fields42 = require("@keystone-6/core/fields");
var InventoryLot = (0, import_core41.list)({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields42.relationship)({ ref: "Practice" }),
    location: (0, import_fields42.relationship)({ ref: "Location.inventoryLots" }),
    product: (0, import_fields42.relationship)({ ref: "Product.inventoryLots" }),
    vendor: (0, import_fields42.relationship)({ ref: "Vendor" }),
    lotNumber: (0, import_fields42.text)({ validation: { isRequired: true } }),
    receivedQuantity: (0, import_fields42.integer)({ validation: { isRequired: true, min: 0 } }),
    remainingQuantity: (0, import_fields42.integer)({ validation: { isRequired: true, min: 0 } }),
    receivedAt: (0, import_fields42.timestamp)({ validation: { isRequired: true } }),
    expiresAt: (0, import_fields42.timestamp)(),
    status: (0, import_fields42.select)({ type: "enum", options: [
      { label: "Available", value: "available" },
      { label: "Quarantined", value: "quarantined" },
      { label: "Recalled", value: "recalled" },
      { label: "Expired", value: "expired" },
      { label: "Depleted", value: "depleted" },
      { label: "Returned", value: "returned" },
      { label: "Destroyed", value: "destroyed" }
    ], defaultValue: "available", validation: { isRequired: true } }),
    movements: (0, import_fields42.relationship)({ ref: "StockMovement.lot", many: true }),
    administrations: (0, import_fields42.relationship)({ ref: "AdministrationLot.lot", many: true }),
    recallCases: (0, import_fields42.relationship)({ ref: "RecallCase.lot", many: true }),
    receiptLine: (0, import_fields42.relationship)({ ref: "GoodsReceiptLine.lot" }),
    ...trackingFields
  }
});

// features/keystone/models/InventoryMovement.ts
var import_core42 = require("@keystone-6/core");
var import_fields43 = require("@keystone-6/core/fields");
var InventoryMovement = (0, import_core42.list)({
  access: {
    operation: {
      query: permissions.canManageInventory,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  hooks: createLifecycleHooks("inventory_movement", [
    "type",
    "delta",
    "balanceBefore",
    "balanceAfter",
    "reason",
    "idempotencyKey",
    "locationId",
    "productId",
    "appointmentId"
  ]),
  fields: {
    practice: (0, import_fields43.relationship)({ ref: "Practice" }),
    type: (0, import_fields43.select)({
      type: "enum",
      options: [
        { label: "Receive", value: "receive" },
        { label: "Adjustment", value: "adjustment" },
        { label: "Sale", value: "sale" },
        { label: "Return", value: "return" }
      ],
      validation: { isRequired: true }
    }),
    delta: (0, import_fields43.integer)({ validation: { isRequired: true } }),
    balanceBefore: (0, import_fields43.integer)({ validation: { isRequired: true, min: 0 } }),
    balanceAfter: (0, import_fields43.integer)({ validation: { isRequired: true, min: 0 } }),
    reason: (0, import_fields43.text)({ validation: { isRequired: true, length: { max: 500 } } }),
    idempotencyKey: (0, import_fields43.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    location: (0, import_fields43.relationship)({ ref: "Location.inventoryMovements" }),
    product: (0, import_fields43.relationship)({ ref: "Product.inventoryMovements" }),
    appointment: (0, import_fields43.relationship)({ ref: "Appointment.inventoryMovements" }),
    metadata: (0, import_fields43.json)({ defaultValue: {} }),
    ...trackingFields
  }
});

// features/keystone/models/Location.ts
var import_core43 = require("@keystone-6/core");
var import_fields44 = require("@keystone-6/core/fields");
var Location = (0, import_core43.list)({
  access: {
    operation: {
      query: activeListPermissions.signedIn,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: ({ session }) => practiceId(session) ? { practice: { id: { equals: practiceId(session) } } } : false,
      update: ({ session }) => practiceId(session) ? { practice: { id: { equals: practiceId(session) } } } : false
    }
  },
  hooks: { ...createLifecycleHooks("location", ["name", "city", "state", "timezone", "isActive"]), validateInput: validateTenantInput },
  ui: {
    listView: {
      initialColumns: ["name", "city", "state", "phone", "isActive"]
    }
  },
  fields: {
    practice: (0, import_fields44.relationship)({ ref: "Practice.locations" }),
    staff: (0, import_fields44.relationship)({ ref: "User.locations", many: true }),
    name: (0, import_fields44.text)({
      validation: { isRequired: true },
      ui: {
        description: "Location/branch name"
      }
    }),
    address: (0, import_fields44.text)({
      validation: { isRequired: true },
      ui: {
        description: "Street address"
      }
    }),
    city: (0, import_fields44.text)({
      validation: { isRequired: true },
      ui: {
        description: "City"
      }
    }),
    state: (0, import_fields44.text)({
      validation: { isRequired: true },
      ui: {
        description: "State/Province"
      }
    }),
    zipCode: (0, import_fields44.text)({
      validation: { isRequired: true },
      ui: {
        description: "ZIP/Postal code"
      }
    }),
    phone: (0, import_fields44.text)({
      ui: {
        description: "Contact phone number"
      }
    }),
    email: (0, import_fields44.text)({
      ui: {
        description: "Contact email address"
      }
    }),
    hours: (0, import_fields44.json)({
      defaultValue: {
        monday: { open: "09:00", close: "18:00", closed: false },
        tuesday: { open: "09:00", close: "18:00", closed: false },
        wednesday: { open: "09:00", close: "18:00", closed: false },
        thursday: { open: "09:00", close: "18:00", closed: false },
        friday: { open: "09:00", close: "18:00", closed: false },
        saturday: { open: "09:00", close: "17:00", closed: false },
        sunday: { open: null, close: null, closed: true }
      },
      ui: {
        description: "Business hours by day of week (JSON object with open/close times)"
      }
    }),
    timezone: (0, import_fields44.text)({
      defaultValue: "America/New_York",
      ui: {
        description: "Timezone for this location (e.g., America/New_York)"
      }
    }),
    isActive: (0, import_fields44.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this location is currently active and accepting appointments"
      }
    }),
    resources: (0, import_fields44.relationship)({
      ref: "Resource.location",
      many: true,
      ui: {
        displayMode: "count",
        description: "Rooms, chairs, stations, and equipment at this location"
      }
    }),
    providers: (0, import_fields44.relationship)({ ref: "Provider.locations", many: true }),
    clients: (0, import_fields44.relationship)({ ref: "Client.homeLocation", many: true }),
    appointments: (0, import_fields44.relationship)({ ref: "Appointment.location", many: true }),
    schedules: (0, import_fields44.relationship)({ ref: "ProviderSchedule.location", many: true }),
    inventoryMovements: (0, import_fields44.relationship)({ ref: "InventoryMovement.location", many: true }),
    inventoryLots: (0, import_fields44.relationship)({ ref: "InventoryLot.location", many: true }),
    purchaseOrders: (0, import_fields44.relationship)({ ref: "PurchaseOrder.location", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/LoyaltyProgram.ts
var import_core44 = require("@keystone-6/core");
var import_fields45 = require("@keystone-6/core/fields");
var LoyaltyProgram = (0, import_core44.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadMembershipCatalog
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "pointsPerDollar", "redemptionRate", "isActive"]
    }
  },
  fields: {
    practice: (0, import_fields45.relationship)({ ref: "Practice" }),
    // Program name
    name: (0, import_fields45.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the loyalty program"
      }
    }),
    // Points configuration
    pointsPerDollar: (0, import_fields45.float)({
      validation: { isRequired: true },
      defaultValue: 1,
      ui: {
        description: "Number of points earned per dollar spent"
      }
    }),
    redemptionRate: (0, import_fields45.float)({
      validation: { isRequired: true },
      defaultValue: 0.01,
      ui: {
        description: "Dollar value per point when redeeming (e.g., 0.01 = 1 cent per point)"
      }
    }),
    // Tier configuration stored as JSON array
    // Example: [{ name: "Bronze", minPoints: 0, benefits: ["5% off"] }, { name: "Gold", minPoints: 1000, benefits: ["10% off", "Free shipping"] }]
    tiers: (0, import_fields45.json)({
      ui: {
        description: "Tier configuration as JSON array with name, minPoints, and benefits for each tier"
      }
    }),
    // Program status
    isActive: (0, import_fields45.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this loyalty program is currently active"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/MedSpaImage.ts
var import_core45 = require("@keystone-6/core");
var import_fields46 = require("@keystone-6/core/fields");
var MedSpaImage = (0, import_core45.list)({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: () => true,
      create: activeListPermissions.canManagePractice,
      update: activeListPermissions.canManagePractice,
      delete: activeListPermissions.canManagePractice
    },
    filter: { query: rules.canReadMedSpaImages, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false }
  },
  ui: {
    listView: {
      initialColumns: ["altText", "imagePath", "image"]
    }
  },
  fields: {
    practice: (0, import_fields46.relationship)({ ref: "Practice" }),
    image: (0, import_fields46.image)({
      storage: "my_images"
    }),
    imagePath: (0, import_fields46.text)({
      ui: {
        description: "Relative public image path (for example /images/services/signature-cut-blowout.svg)"
      }
    }),
    altText: (0, import_fields46.text)({
      ui: {
        description: "Alternative text for the image (accessibility)"
      }
    }),
    metadata: (0, import_fields46.json)({
      access: { read: activeListPermissions.canManagePractice },
      ui: {
        description: "Additional metadata about the image"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/MedSpaTransaction.ts
var import_core46 = require("@keystone-6/core");
var import_fields47 = require("@keystone-6/core/fields");
var formatCurrency4 = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount / 100);
};
var MedSpaTransaction = (0, import_core46.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadMedSpaTransactions
    }
  },
  hooks: createLifecycleHooks("medspa_transaction", ["type", "tip", "paymentMethod", "paymentStatus", "status", "completedAt", "locationId", "clientId", "appointmentId", "staffId"]),
  ui: {
    listView: {
      initialColumns: ["type", "client", "staff", "total", "paymentStatus", "status"]
    }
  },
  fields: {
    practice: (0, import_fields47.relationship)({ ref: "Practice" }),
    currencyCode: (0, import_fields47.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields47.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    type: (0, import_fields47.select)({
      type: "enum",
      options: [
        { label: "Appointment", value: "appointment" },
        { label: "Walk-in", value: "walk_in" },
        { label: "Retail", value: "retail" }
      ],
      defaultValue: "appointment",
      validation: {
        isRequired: true
      }
    }),
    location: (0, import_fields47.relationship)({ ref: "Location" }),
    client: (0, import_fields47.relationship)({
      ref: "Client",
      ui: {
        displayMode: "select",
        description: "Client (optional for walk-ins)"
      }
    }),
    appointment: (0, import_fields47.relationship)({
      ref: "Appointment.transaction",
      ui: {
        displayMode: "select",
        description: "Appointment being checked out"
      }
    }),
    staff: (0, import_fields47.relationship)({
      ref: "Provider",
      ui: {
        displayMode: "select",
        description: "Staff member who processed the transaction"
      }
    }),
    lineItems: (0, import_fields47.relationship)({
      ref: "MedSpaTransactionLineItem.transaction",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["itemType", "service", "product", "formattedTotal"]
      }
    }),
    tip: (0, import_fields47.integer)({
      defaultValue: 0,
      ui: {
        description: "Tip amount in cents"
      }
    }),
    paymentMethod: (0, import_fields47.select)({
      type: "enum",
      options: [
        { label: "Cash", value: "cash" },
        { label: "Card", value: "card" },
        { label: "Split", value: "split" },
        { label: "Gift Card", value: "gift_card" },
        { label: "Package", value: "package" }
      ],
      ui: {
        description: "Payment method used"
      }
    }),
    paymentStatus: (0, import_fields47.select)({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Paid", value: "paid" },
        { label: "Partially Paid", value: "partially_paid" },
        { label: "Refunded", value: "refunded" }
      ],
      defaultValue: "pending",
      validation: {
        isRequired: true
      }
    }),
    status: (0, import_fields47.select)({
      type: "enum",
      options: [
        { label: "Open", value: "open" },
        { label: "Completed", value: "completed" },
        { label: "Voided", value: "voided" }
      ],
      defaultValue: "open",
      validation: {
        isRequired: true
      }
    }),
    metadata: (0, import_fields47.json)({
      ui: {
        description: "Additional transaction metadata"
      }
    }),
    completedAt: (0, import_fields47.timestamp)({
      ui: {
        description: "When the transaction was completed"
      }
    }),
    ...(0, import_core46.group)({
      label: "Virtual Fields",
      description: "Calculated fields for transaction totals",
      fields: {
        subtotal: (0, import_fields47.virtual)({
          field: import_core46.graphql.field({
            type: import_core46.graphql.String,
            async resolve(item, args, context) {
              const transactionId = item.id;
              const transaction = await context.sudo().query.MedSpaTransaction.findOne({
                where: { id: transactionId },
                query: `
                  lineItems {
                    quantity
                    unitPrice
                    discount
                  }
                `
              });
              if (!transaction?.lineItems?.length) return "$0.00";
              let subtotal = 0;
              for (const lineItem of transaction.lineItems) {
                const lineTotal = lineItem.unitPrice * lineItem.quantity - (lineItem.discount || 0);
                subtotal += lineTotal;
              }
              return formatCurrency4(subtotal);
            }
          })
        }),
        tax: (0, import_fields47.virtual)({
          field: import_core46.graphql.field({
            type: import_core46.graphql.String,
            async resolve(item, args, context) {
              const transactionId = item.id;
              const transaction = await context.sudo().query.MedSpaTransaction.findOne({
                where: { id: transactionId },
                query: `
                  lineItems {
                    quantity
                    unitPrice
                    discount
                  }
                `
              });
              if (!transaction?.lineItems?.length) return "$0.00";
              let subtotal = 0;
              for (const lineItem of transaction.lineItems) {
                const lineTotal = lineItem.unitPrice * lineItem.quantity - (lineItem.discount || 0);
                subtotal += lineTotal;
              }
              const tax = subtotal * 0.08;
              return formatCurrency4(tax);
            }
          })
        }),
        discount: (0, import_fields47.virtual)({
          field: import_core46.graphql.field({
            type: import_core46.graphql.String,
            async resolve(item, args, context) {
              const transactionId = item.id;
              const transaction = await context.sudo().query.MedSpaTransaction.findOne({
                where: { id: transactionId },
                query: `
                  lineItems {
                    discount
                  }
                `
              });
              if (!transaction?.lineItems?.length) return "$0.00";
              const totalDiscount = transaction.lineItems.reduce(
                (sum, item2) => sum + (item2.discount || 0),
                0
              );
              if (totalDiscount === 0) return "$0.00";
              return formatCurrency4(totalDiscount);
            }
          })
        }),
        total: (0, import_fields47.virtual)({
          field: import_core46.graphql.field({
            type: import_core46.graphql.String,
            async resolve(item, args, context) {
              const transactionId = item.id;
              const transaction = await context.sudo().query.MedSpaTransaction.findOne({
                where: { id: transactionId },
                query: `
                  lineItems {
                    quantity
                    unitPrice
                    discount
                  }
                  tip
                `
              });
              if (!transaction?.lineItems?.length) return "$0.00";
              let subtotal = 0;
              for (const lineItem of transaction.lineItems) {
                const lineTotal = lineItem.unitPrice * lineItem.quantity - (lineItem.discount || 0);
                subtotal += lineTotal;
              }
              const tax = subtotal * 0.08;
              const total = subtotal + tax + (transaction.tip || 0);
              return formatCurrency4(total);
            }
          })
        })
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/MedSpaTransactionLineItem.ts
var import_core47 = require("@keystone-6/core");
var import_fields48 = require("@keystone-6/core/fields");
var formatCurrency5 = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount / 100);
};
var MedSpaTransactionLineItem = (0, import_core47.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadMedSpaTransactionLineItems
    }
  },
  ui: {
    listView: {
      initialColumns: ["transaction", "itemType", "service", "product", "staff", "formattedTotal"]
    }
  },
  fields: {
    practice: (0, import_fields48.relationship)({ ref: "Practice" }),
    transaction: (0, import_fields48.relationship)({
      ref: "MedSpaTransaction.lineItems",
      ui: {
        displayMode: "select",
        description: "Related transaction"
      }
    }),
    itemType: (0, import_fields48.select)({
      type: "enum",
      options: [
        { label: "Service", value: "service" },
        { label: "Product", value: "product" }
      ],
      validation: {
        isRequired: true
      }
    }),
    service: (0, import_fields48.relationship)({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "Service (if itemType is service)"
      }
    }),
    product: (0, import_fields48.relationship)({
      ref: "Product",
      ui: {
        displayMode: "select",
        description: "Product (if itemType is product)"
      }
    }),
    staff: (0, import_fields48.relationship)({
      ref: "Provider",
      ui: {
        displayMode: "select",
        description: "Staff member who provided the service"
      }
    }),
    quantity: (0, import_fields48.integer)({
      defaultValue: 1,
      validation: {
        isRequired: true
      }
    }),
    unitPrice: (0, import_fields48.integer)({
      validation: {
        isRequired: true
      },
      ui: {
        description: "Price per unit in cents"
      }
    }),
    discount: (0, import_fields48.integer)({
      defaultValue: 0,
      ui: {
        description: "Discount amount in cents"
      }
    }),
    commissionRate: (0, import_fields48.float)({
      ui: {
        description: "Commission rate for staff (percentage)"
      }
    }),
    metadata: (0, import_fields48.json)({
      ui: {
        description: "Additional line item metadata"
      }
    }),
    formattedPrice: (0, import_fields48.virtual)({
      field: import_core47.graphql.field({
        type: import_core47.graphql.String,
        async resolve(item, args, context) {
          const lineItemId = item.id;
          const lineItem = await context.sudo().query.MedSpaTransactionLineItem.findOne({
            where: { id: lineItemId },
            query: "unitPrice"
          });
          if (!lineItem?.unitPrice) return "$0.00";
          return formatCurrency5(lineItem.unitPrice);
        }
      })
    }),
    formattedTotal: (0, import_fields48.virtual)({
      field: import_core47.graphql.field({
        type: import_core47.graphql.String,
        async resolve(item, args, context) {
          const lineItemId = item.id;
          const lineItem = await context.sudo().query.MedSpaTransactionLineItem.findOne({
            where: { id: lineItemId },
            query: "unitPrice quantity discount"
          });
          if (!lineItem?.unitPrice || !lineItem?.quantity) return "$0.00";
          const total = lineItem.unitPrice * lineItem.quantity - (lineItem.discount || 0);
          return formatCurrency5(total);
        }
      })
    }),
    commissionAmount: (0, import_fields48.virtual)({
      field: import_core47.graphql.field({
        type: import_core47.graphql.String,
        async resolve(item, args, context) {
          const lineItemId = item.id;
          const lineItem = await context.sudo().query.MedSpaTransactionLineItem.findOne({
            where: { id: lineItemId },
            query: "unitPrice quantity discount commissionRate"
          });
          if (!lineItem?.unitPrice || !lineItem?.quantity || !lineItem?.commissionRate) {
            return "$0.00";
          }
          const total = lineItem.unitPrice * lineItem.quantity - (lineItem.discount || 0);
          const commission = total * (lineItem.commissionRate / 100);
          return formatCurrency5(commission);
        }
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/Membership.ts
var import_core48 = require("@keystone-6/core");
var import_fields49 = require("@keystone-6/core/fields");
var Membership = (0, import_core48.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadMembershipCatalog
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "monthlyPrice", "discountPercent", "isActive"]
    }
  },
  fields: {
    practice: (0, import_fields49.relationship)({ ref: "Practice" }),
    name: (0, import_fields49.text)({
      validation: { isRequired: true },
      ui: {
        description: "Membership tier name (e.g., Bronze, Silver, Gold, Platinum)"
      }
    }),
    description: (0, import_fields49.text)({
      ui: {
        displayMode: "textarea",
        description: "Description of membership benefits and perks"
      }
    }),
    monthlyPrice: (0, import_fields49.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Monthly membership fee"
      }
    }),
    discountPercent: (0, import_fields49.integer)({
      defaultValue: 0,
      validation: { min: 0, max: 100 },
      ui: {
        description: "Percentage discount on services (0-100)"
      }
    }),
    isActive: (0, import_fields49.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this membership is currently available"
      }
    }),
    // Relationships
    includedServices: (0, import_fields49.relationship)({
      ref: "Service",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["name", "basePrice", "baseDuration"],
        inlineConnect: true,
        description: "Services included for free or at a discount with this membership"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/MembershipAgreement.ts
var import_core49 = require("@keystone-6/core");
var import_fields50 = require("@keystone-6/core/fields");
var MembershipAgreement = (0, import_core49.list)({
  access: { operation: { query: permissions.canManageFinance, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields50.relationship)({ ref: "Practice" }), clientMembership: (0, import_fields50.relationship)({ ref: "ClientMembership.agreements" }), client: (0, import_fields50.relationship)({ ref: "User" }), membership: (0, import_fields50.relationship)({ ref: "Membership" }), termsVersion: (0, import_fields50.text)({ validation: { isRequired: true } }), termsHash: (0, import_fields50.text)({ validation: { isRequired: true } }), priceMinorSnapshot: (0, import_fields50.integer)({ validation: { isRequired: true, min: 0 } }), currencyCode: (0, import_fields50.text)({ validation: { isRequired: true } }), benefitSnapshot: (0, import_fields50.json)(), renewalDisclosure: (0, import_fields50.json)(), cancellationDisclosure: (0, import_fields50.json)(), affirmativeConsentHash: (0, import_fields50.text)({ validation: { isRequired: true } }), acceptedAt: (0, import_fields50.timestamp)({ validation: { isRequired: true } }), effectiveUntil: (0, import_fields50.timestamp)(), evidenceHash: (0, import_fields50.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields50.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/MembershipLedgerEntry.ts
var import_core50 = require("@keystone-6/core");
var import_fields51 = require("@keystone-6/core/fields");
var MembershipLedgerEntry = (0, import_core50.list)({
  access: { operation: { query: permissions.canManageFinance, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields51.relationship)({ ref: "Practice" }), clientMembership: (0, import_fields51.relationship)({ ref: "ClientMembership.ledgerEntries" }), agreement: (0, import_fields51.relationship)({ ref: "MembershipAgreement" }), actor: (0, import_fields51.relationship)({ ref: "User" }), type: (0, import_fields51.select)({ type: "enum", options: ["activate", "renewal_due", "charge_authorized", "charge_settled", "charge_failed", "benefit_issue", "benefit_use", "benefit_reverse", "freeze", "resume", "nonrenew", "cancel", "expire"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), amountMinor: (0, import_fields51.integer)({ defaultValue: 0 }), benefitDelta: (0, import_fields51.integer)({ defaultValue: 0 }), reason: (0, import_fields51.text)({ validation: { isRequired: true } }), evidence: (0, import_fields51.json)(), occurredAt: (0, import_fields51.timestamp)({ validation: { isRequired: true } }), evidenceHash: (0, import_fields51.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields51.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/MessageLog.ts
var import_core51 = require("@keystone-6/core");
var import_fields52 = require("@keystone-6/core/fields");
var MessageLog = (0, import_core51.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadMessageLogs
    }
  },
  ui: {
    listView: {
      initialColumns: ["recipient", "template", "sentAt", "channel", "status"]
    }
  },
  fields: {
    practice: (0, import_fields52.relationship)({ ref: "Practice" }),
    // Recipient of the message
    recipient: (0, import_fields52.relationship)({
      ref: "User.messageLogs",
      ui: {
        displayMode: "select",
        description: "User who received this message"
      }
    }),
    // Template used for this message
    template: (0, import_fields52.relationship)({
      ref: "MessageTemplate",
      ui: {
        displayMode: "select",
        description: "Message template used"
      }
    }),
    sentAt: (0, import_fields52.timestamp)({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the message was sent"
      }
    }),
    channel: (0, import_fields52.select)({
      type: "string",
      options: [
        { label: "Email", value: "email" },
        { label: "SMS", value: "sms" },
        { label: "Push Notification", value: "push" }
      ],
      validation: { isRequired: true },
      ui: {
        description: "Communication channel used to send the message"
      }
    }),
    status: (0, import_fields52.select)({
      type: "string",
      options: [
        { label: "Sent", value: "sent" },
        { label: "Delivered", value: "delivered" },
        { label: "Failed", value: "failed" }
      ],
      defaultValue: "sent",
      ui: {
        description: "Delivery status of the message"
      }
    }),
    errorMessage: (0, import_fields52.text)({
      ui: {
        displayMode: "textarea",
        description: "Error details if the message failed to deliver"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/MessageTemplate.ts
var import_core52 = require("@keystone-6/core");
var import_fields53 = require("@keystone-6/core/fields");
var MessageTemplate = (0, import_core52.list)({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: permissions.canManageCommunications,
      create: activeListPermissions.canManageCommunications,
      update: activeListPermissions.canManageCommunications,
      delete: activeListPermissions.canManageCommunications
    },
    filter: { query: tenantFilter, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false }
  },
  ui: {
    listView: {
      initialColumns: ["name", "type", "isActive"]
    }
  },
  fields: {
    practice: (0, import_fields53.relationship)({ ref: "Practice" }),
    name: (0, import_fields53.text)({
      validation: { isRequired: true },
      ui: {
        description: "Template name for identification"
      }
    }),
    type: (0, import_fields53.select)({
      type: "string",
      options: [
        { label: "Reminder", value: "reminder" },
        { label: "Confirmation", value: "confirmation" },
        { label: "Marketing", value: "marketing" }
      ],
      validation: { isRequired: true },
      ui: {
        description: "Type of message template"
      }
    }),
    content: (0, import_fields53.text)({
      validation: { isRequired: true },
      ui: {
        displayMode: "textarea",
        description: "Message content with variables like {{clientName}}, {{appointmentDate}}, {{providerName}}"
      }
    }),
    variables: (0, import_fields53.json)({
      ui: {
        description: 'Available variables for this template, e.g., ["clientName", "appointmentDate", "providerName"]'
      }
    }),
    isActive: (0, import_fields53.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this template is currently active and available for use"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/OutboxEvent.ts
var import_core53 = require("@keystone-6/core");
var import_fields54 = require("@keystone-6/core/fields");
var OutboxEvent = (0, import_core53.list)({
  access: { operation: { query: permissions.canManageIntegrations, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields54.relationship)({ ref: "Practice" }),
    eventKey: (0, import_fields54.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    topic: (0, import_fields54.text)({ validation: { isRequired: true } }),
    version: (0, import_fields54.integer)({ defaultValue: 1, validation: { min: 1 } }),
    aggregateType: (0, import_fields54.text)({ validation: { isRequired: true } }),
    aggregateId: (0, import_fields54.text)({ validation: { isRequired: true } }),
    payload: (0, import_fields54.json)(),
    status: (0, import_fields54.select)({ type: "enum", options: [
      { label: "Pending", value: "pending" },
      { label: "Processing", value: "processing" },
      { label: "Delivered", value: "delivered" },
      { label: "Dead Letter", value: "dead_letter" }
    ], defaultValue: "pending", validation: { isRequired: true } }),
    attempts: (0, import_fields54.integer)({ defaultValue: 0, validation: { min: 0 } }),
    availableAt: (0, import_fields54.timestamp)({ defaultValue: { kind: "now" } }),
    deliveredAt: (0, import_fields54.timestamp)(),
    lastError: (0, import_fields54.text)(),
    ...trackingFields
  }
});

// features/keystone/models/Payment.ts
var import_core54 = require("@keystone-6/core");
var import_fields55 = require("@keystone-6/core/fields");
var Payment = (0, import_core54.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadPayments
    }
  },
  hooks: createLifecycleHooks("payment", ["subtotal", "tax", "tip", "discount", "totalAmount", "refundedAmount", "paymentMethod", "status", "processedAt", "refundedAt", "appointmentId", "sessionId"]),
  ui: {
    listView: {
      initialColumns: ["appointment", "totalAmount", "paymentMethod", "status", "processedAt"]
    }
  },
  fields: {
    practice: (0, import_fields55.relationship)({ ref: "Practice" }),
    currencyCode: (0, import_fields55.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields55.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    refunds: (0, import_fields55.relationship)({ ref: "Refund.payment", many: true }),
    // Core amount fields
    subtotal: (0, import_fields55.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Service charges before tax and tip"
      }
    }),
    tax: (0, import_fields55.integer)({
      defaultValue: 0,
      ui: {
        description: "Tax amount"
      }
    }),
    tip: (0, import_fields55.integer)({
      defaultValue: 0,
      ui: {
        description: "Tip amount"
      }
    }),
    discount: (0, import_fields55.integer)({
      defaultValue: 0,
      ui: {
        description: "Any discount applied"
      }
    }),
    totalAmount: (0, import_fields55.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Total amount charged (subtotal + tax + tip - discount)"
      }
    }),
    // Payment method and processing
    paymentMethod: (0, import_fields55.select)({
      type: "string",
      options: [
        { label: "Credit Card", value: "credit_card" },
        { label: "Debit Card", value: "debit_card" },
        { label: "Cash", value: "cash" },
        { label: "Gift Card", value: "gift_card" },
        { label: "Apple Pay", value: "apple_pay" },
        { label: "Google Pay", value: "google_pay" }
      ],
      defaultValue: "credit_card",
      validation: { isRequired: true }
    }),
    status: (0, import_fields55.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" },
        { label: "Refunded", value: "refunded" },
        { label: "Partially Refunded", value: "partially_refunded" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true }
    }),
    // Stripe integration fields
    stripePaymentIntentId: (0, import_fields55.text)({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        description: "Stripe Payment Intent ID for card payments"
      }
    }),
    stripeChargeId: (0, import_fields55.text)({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        description: "Stripe Charge ID for completed payments"
      }
    }),
    stripeRefundId: (0, import_fields55.text)({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        description: "Stripe Refund ID if payment was refunded"
      }
    }),
    // Card details (last 4 digits, brand)
    cardBrand: (0, import_fields55.text)({
      ui: {
        description: "Card brand (Visa, Mastercard, etc.)"
      }
    }),
    cardLast4: (0, import_fields55.text)({
      ui: {
        description: "Last 4 digits of card"
      }
    }),
    // Refund tracking
    refundedAmount: (0, import_fields55.integer)({
      defaultValue: 0,
      ui: {
        description: "Amount refunded"
      }
    }),
    refundReason: (0, import_fields55.text)({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        displayMode: "textarea",
        description: "Reason for refund if applicable"
      }
    }),
    // Tip distribution
    tipDistributed: (0, import_fields55.checkbox)({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      defaultValue: false,
      ui: {
        description: "Whether tip has been distributed to provider"
      }
    }),
    // Timestamps
    processedAt: (0, import_fields55.timestamp)({
      ui: {
        description: "When the payment was successfully processed"
      }
    }),
    refundedAt: (0, import_fields55.timestamp)({
      ui: {
        description: "When the refund was processed"
      }
    }),
    // Notes
    notes: (0, import_fields55.text)({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        displayMode: "textarea",
        description: "Internal notes about the payment"
      }
    }),
    // Relationships
    appointment: (0, import_fields55.relationship)({
      ref: "Appointment.payment",
      ui: {
        displayMode: "select"
      }
    }),
    session: (0, import_fields55.relationship)({
      ref: "PaymentSession.payment",
      ui: {
        displayMode: "select",
        description: "Provider session that created this payment"
      }
    }),
    // Processed by (staff member who processed the payment)
    processedBy: (0, import_fields55.relationship)({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who processed this payment"
      }
    }),
    // Receipt tracking
    receiptSent: (0, import_fields55.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether receipt email was sent to client"
      }
    }),
    receiptEmail: (0, import_fields55.text)({
      ui: {
        description: "Email address receipt was sent to"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentProvider.ts
var import_core55 = require("@keystone-6/core");
var import_fields56 = require("@keystone-6/core/fields");
var PaymentProvider = (0, import_core55.list)({
  hooks: { validateInput: async (args) => {
    await validateTenantInput(args);
    const adapter = args.resolvedData.adapter ?? args.item?.adapter;
    const installed = args.resolvedData.isInstalled ?? args.item?.isInstalled;
    if (adapter === "stripe" && installed === true) args.addValidationError("Stripe is not launch-enabled until durable refund outbox reconciliation is implemented");
  } },
  access: {
    operation: {
      query: permissions.canManageIntegrations,
      create: activeListPermissions.canManageIntegrations,
      update: activeListPermissions.canManageIntegrations,
      delete: activeListPermissions.canManageIntegrations
    },
    filter: { query: tenantFilter, update: tenantFilter, delete: tenantFilter }
  },
  ui: {
    listView: {
      initialColumns: ["name", "code", "adapter", "isInstalled", "isDefault"]
    }
  },
  fields: {
    practice: (0, import_fields56.relationship)({ ref: "Practice" }),
    name: (0, import_fields56.text)({ validation: { isRequired: true } }),
    code: (0, import_fields56.text)({
      isIndexed: "unique",
      validation: {
        isRequired: true,
        match: {
          regex: /^pp_[a-z0-9_-]+$/,
          explanation: "Provider codes must start with pp_ and contain lowercase letters, numbers, underscores, or hyphens."
        }
      }
    }),
    adapter: (0, import_fields56.select)({
      type: "enum",
      validation: { isRequired: true },
      options: [
        { label: "Manual / terminal", value: "manual" },
        { label: "Stripe", value: "stripe" }
      ]
    }),
    isInstalled: (0, import_fields56.checkbox)({ defaultValue: false }),
    isDefault: (0, import_fields56.checkbox)({ defaultValue: false }),
    config: (0, import_fields56.json)({
      defaultValue: {},
      ui: {
        description: "Non-secret provider configuration only. API keys and webhook secrets are read from environment variables by the adapter."
      }
    }),
    sessions: (0, import_fields56.relationship)({ ref: "PaymentSession.provider", many: true }),
    webhookEvents: (0, import_fields56.relationship)({ ref: "PaymentWebhookEvent.provider", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentSession.ts
var import_core56 = require("@keystone-6/core");
var import_fields57 = require("@keystone-6/core/fields");
var PaymentSession = (0, import_core56.list)({
  access: {
    operation: {
      query: permissions.canManageFinance,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  ui: {
    listView: {
      initialColumns: ["appointment", "provider", "status", "amount", "currency", "idempotencyKey"]
    }
  },
  fields: {
    practice: (0, import_fields57.relationship)({ ref: "Practice" }),
    appointment: (0, import_fields57.relationship)({ ref: "Appointment.paymentSessions" }),
    provider: (0, import_fields57.relationship)({ ref: "PaymentProvider.sessions" }),
    payment: (0, import_fields57.relationship)({ ref: "Payment.session" }),
    idempotencyKey: (0, import_fields57.text)({ isIndexed: "unique", validation: { isRequired: true } }),
    amount: (0, import_fields57.integer)({ validation: { isRequired: true, min: 0 } }),
    currency: (0, import_fields57.text)({ defaultValue: "usd", validation: { isRequired: true } }),
    status: (0, import_fields57.select)({
      type: "enum",
      defaultValue: "pending",
      validation: { isRequired: true },
      options: [
        { label: "Pending", value: "pending" },
        { label: "Requires action", value: "requires_action" },
        { label: "Authorized", value: "authorized" },
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Partially refunded", value: "partially_refunded" },
        { label: "Refunded", value: "refunded" }
      ]
    }),
    providerReference: (0, import_fields57.text)({ isIndexed: true }),
    data: (0, import_fields57.json)({ defaultValue: {} }),
    authorizedAt: (0, import_fields57.timestamp)(),
    completedAt: (0, import_fields57.timestamp)(),
    failedAt: (0, import_fields57.timestamp)(),
    refundedAt: (0, import_fields57.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/PaymentWebhookEvent.ts
var import_core57 = require("@keystone-6/core");
var import_fields58 = require("@keystone-6/core/fields");
var PaymentWebhookEvent = (0, import_core57.list)({
  access: {
    operation: {
      query: permissions.canManageIntegrations,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  ui: {
    listView: { initialColumns: ["provider", "eventId", "type", "status", "processedAt"] }
  },
  fields: {
    practice: (0, import_fields58.relationship)({ ref: "Practice" }),
    provider: (0, import_fields58.relationship)({ ref: "PaymentProvider.webhookEvents" }),
    replayKey: (0, import_fields58.text)({ isIndexed: "unique", validation: { isRequired: true } }),
    eventId: (0, import_fields58.text)({ validation: { isRequired: true } }),
    type: (0, import_fields58.text)({ validation: { isRequired: true } }),
    providerReference: (0, import_fields58.text)({ isIndexed: true }),
    payloadHash: (0, import_fields58.text)({ validation: { isRequired: true } }),
    status: (0, import_fields58.select)({
      type: "enum",
      defaultValue: "processed",
      validation: { isRequired: true },
      options: [
        { label: "Processed", value: "processed" },
        { label: "Ignored", value: "ignored" }
      ]
    }),
    data: (0, import_fields58.json)({ defaultValue: {} }),
    processedAt: (0, import_fields58.timestamp)({ defaultValue: { kind: "now" } }),
    ...trackingFields
  }
});

// features/keystone/models/PatientRightsAction.ts
var import_core58 = require("@keystone-6/core");
var import_fields59 = require("@keystone-6/core/fields");
var PatientRightsAction = (0, import_core58.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields59.relationship)({ ref: "Practice" }), request: (0, import_fields59.relationship)({ ref: "PatientRightsRequest.actionEntries" }), actor: (0, import_fields59.relationship)({ ref: "User" }), action: (0, import_fields59.select)({ type: "enum", options: ["receive", "verify_identity", "assign", "collect_records", "approve", "partial", "deny_with_basis", "deliver", "close"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), reason: (0, import_fields59.text)({ validation: { isRequired: true } }), evidence: (0, import_fields59.json)(), evidenceHash: (0, import_fields59.text)({ validation: { isRequired: true } }), occurredAt: (0, import_fields59.timestamp)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields59.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/PatientRightsRequest.ts
var import_core59 = require("@keystone-6/core");
var import_fields60 = require("@keystone-6/core/fields");
var PatientRightsRequest = (0, import_core59.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields60.relationship)({ ref: "Practice" }), client: (0, import_fields60.relationship)({ ref: "Client" }), requestedBy: (0, import_fields60.relationship)({ ref: "User" }), assignedTo: (0, import_fields60.relationship)({ ref: "User" }), type: (0, import_fields60.select)({ type: "enum", options: ["access", "export", "amendment", "restriction", "disclosure_accounting", "representative_update", "deletion_review"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), status: (0, import_fields60.select)({ type: "enum", options: ["received", "identity_review", "in_progress", "fulfilled", "partially_fulfilled", "denied_with_basis", "closed"].map((value) => ({ label: value, value })), defaultValue: "received", validation: { isRequired: true } }), scope: (0, import_fields60.json)(), requestedAt: (0, import_fields60.timestamp)({ validation: { isRequired: true } }), dueAt: (0, import_fields60.timestamp)({ validation: { isRequired: true } }), completedAt: (0, import_fields60.timestamp)(), legalBasis: (0, import_fields60.text)(), responseEvidenceHash: (0, import_fields60.text)(), idempotencyKey: (0, import_fields60.text)({ validation: { isRequired: true }, isIndexed: "unique" }), actionEntries: (0, import_fields60.relationship)({ ref: "PatientRightsAction.request", many: true }), ...trackingFields }
});

// features/keystone/models/PhotoConsent.ts
var import_core60 = require("@keystone-6/core");
var import_fields61 = require("@keystone-6/core/fields");
var PhotoConsent = (0, import_core60.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields61.relationship)({ ref: "Practice" }),
    client: (0, import_fields61.relationship)({ ref: "Client" }),
    appointment: (0, import_fields61.relationship)({ ref: "Appointment" }),
    purpose: (0, import_fields61.select)({ type: "enum", options: ["clinical_care", "measurement", "education", "marketing"].map((value) => ({ label: value, value })), validation: { isRequired: true } }),
    status: (0, import_fields61.select)({ type: "enum", options: ["granted", "partially_withdrawn", "withdrawn", "expired", "superseded"].map((value) => ({ label: value, value })), defaultValue: "granted", validation: { isRequired: true } }),
    mediaScope: (0, import_fields61.json)(),
    audienceScope: (0, import_fields61.json)(),
    compensationDisclosure: (0, import_fields61.text)(),
    signerName: (0, import_fields61.text)({ validation: { isRequired: true } }),
    signerRole: (0, import_fields61.text)({ validation: { isRequired: true } }),
    signatureEvidenceHash: (0, import_fields61.text)({ validation: { isRequired: true } }),
    effectiveFrom: (0, import_fields61.timestamp)({ validation: { isRequired: true } }),
    effectiveUntil: (0, import_fields61.timestamp)(),
    evidenceHash: (0, import_fields61.text)({ validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields61.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    actions: (0, import_fields61.relationship)({ ref: "PhotoConsentAction.consent", many: true }),
    assets: (0, import_fields61.relationship)({ ref: "ClientAsset.photoConsent", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/PhotoConsentAction.ts
var import_core61 = require("@keystone-6/core");
var import_fields62 = require("@keystone-6/core/fields");
var PhotoConsentAction = (0, import_core61.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields62.relationship)({ ref: "Practice" }), consent: (0, import_fields62.relationship)({ ref: "PhotoConsent.actions" }), actor: (0, import_fields62.relationship)({ ref: "User" }), action: (0, import_fields62.select)({ type: "enum", options: ["grant", "partial_withdrawal", "withdrawal", "expire", "supersede", "publication_record", "takedown_attempt"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), reason: (0, import_fields62.text)({ validation: { isRequired: true } }), scope: (0, import_fields62.json)(), occurredAt: (0, import_fields62.timestamp)({ validation: { isRequired: true } }), evidenceHash: (0, import_fields62.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields62.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/Practice.ts
var import_core62 = require("@keystone-6/core");
var import_fields63 = require("@keystone-6/core/fields");
var Practice = (0, import_core62.list)({
  access: {
    operation: {
      query: activeListPermissions.signedIn,
      create: () => false,
      update: activeListPermissions.canManagePractice,
      delete: () => false
    },
    filter: {
      query: ({ session }) => practiceId(session) ? { id: { equals: practiceId(session) } } : false,
      update: ({ session }) => practiceId(session) ? { id: { equals: practiceId(session) } } : false
    }
  },
  fields: {
    name: (0, import_fields63.text)({ validation: { isRequired: true } }),
    slug: (0, import_fields63.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    currencyCode: (0, import_fields63.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    isActive: (0, import_fields63.checkbox)({ defaultValue: true }),
    isDemo: (0, import_fields63.checkbox)({ defaultValue: false, access: { create: () => false, update: () => false } }),
    users: (0, import_fields63.relationship)({ ref: "User.practice", many: true, access: { create: () => false, update: () => false } }),
    locations: (0, import_fields63.relationship)({ ref: "Location.practice", many: true, access: { create: () => false, update: () => false } }),
    storefrontSetting: (0, import_fields63.relationship)({ ref: "StorefrontSetting.practice", access: { create: () => false, update: () => false } }),
    memberships: (0, import_fields63.relationship)({ ref: "PracticeMembership.practice", many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields
  }
});

// features/keystone/models/PracticeMembership.ts
var import_core63 = require("@keystone-6/core");
var import_fields64 = require("@keystone-6/core/fields");
var PracticeMembership = (0, import_core63.list)({
  access: {
    operation: { query: activeListPermissions.signedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter }
  },
  fields: {
    practice: (0, import_fields64.relationship)({ ref: "Practice.memberships" }),
    user: (0, import_fields64.relationship)({ ref: "User.memberships" }),
    locations: (0, import_fields64.relationship)({ ref: "Location", many: true }),
    status: (0, import_fields64.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Ended", value: "ended" }
      ],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Product.ts
var import_core64 = require("@keystone-6/core");
var import_fields65 = require("@keystone-6/core/fields");
var Product = (0, import_core64.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadProducts
    }
  },
  hooks: createLifecycleHooks("product", ["name", "sku", "price", "cost", "quantity", "reorderPoint", "isActive"]),
  ui: {
    listView: {
      initialColumns: ["name", "sku", "price", "quantity", "category", "isActive"]
    }
  },
  fields: {
    practice: (0, import_fields65.relationship)({ ref: "Practice" }),
    kind: (0, import_fields65.select)({ type: "enum", options: [
      { label: "Retail", value: "retail" },
      { label: "Treatment Consumable", value: "consumable" },
      { label: "Both", value: "both" }
    ], defaultValue: "retail", validation: { isRequired: true } }),
    trackLots: (0, import_fields65.checkbox)({ defaultValue: true }),
    name: (0, import_fields65.text)({
      validation: { isRequired: true },
      ui: {
        description: "Product name"
      }
    }),
    sku: (0, import_fields65.text)({
      isIndexed: "unique",
      ui: {
        description: "Stock Keeping Unit - unique product identifier"
      }
    }),
    price: (0, import_fields65.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Retail price"
      }
    }),
    cost: (0, import_fields65.integer)({
      access: { read: activeListPermissions.canManageInventory, create: () => false, update: () => false },
      ui: {
        description: "Wholesale/cost price for profit tracking"
      }
    }),
    quantity: (0, import_fields65.integer)({
      access: { read: activeListPermissions.canManageInventory, create: () => false, update: () => false },
      defaultValue: 0,
      ui: {
        description: "Current stock quantity"
      }
    }),
    reorderPoint: (0, import_fields65.integer)({
      access: { read: activeListPermissions.canManageInventory, create: () => false, update: () => false },
      defaultValue: 5,
      ui: {
        description: "Minimum quantity before reorder alert"
      }
    }),
    category: (0, import_fields65.text)({
      ui: {
        description: "Product category (e.g., Shampoo, Conditioner, Styling, Color)"
      }
    }),
    description: (0, import_fields65.text)({
      ui: {
        displayMode: "textarea",
        description: "Product description"
      }
    }),
    image: (0, import_fields65.relationship)({
      ref: "MedSpaImage",
      ui: {
        displayMode: "cards",
        cardFields: ["image", "altText"],
        inlineCreate: { fields: ["image", "altText"] },
        inlineEdit: { fields: ["image", "altText"] }
      }
    }),
    isActive: (0, import_fields65.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this product is available for sale"
      }
    }),
    inventoryMovements: (0, import_fields65.relationship)({ ref: "InventoryMovement.product", many: true }),
    inventoryLots: (0, import_fields65.relationship)({ ref: "InventoryLot.product", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ProductSale.ts
var import_core65 = require("@keystone-6/core");
var import_fields66 = require("@keystone-6/core/fields");
var ProductSale = (0, import_core65.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadProductSales
    }
  },
  hooks: createLifecycleHooks("product_sale", ["total", "soldAt", "appointmentId", "soldById"]),
  ui: {
    listView: {
      initialColumns: ["soldAt", "total", "soldBy", "appointment"]
    }
  },
  fields: {
    practice: (0, import_fields66.relationship)({ ref: "Practice" }),
    // Optional link to appointment (for retail sales during service)
    appointment: (0, import_fields66.relationship)({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Associated appointment (optional - for sales during service visits)"
      }
    }),
    // Products sold in this transaction
    products: (0, import_fields66.json)({
      defaultValue: [],
      ui: {
        description: "Array of products sold: [{ productId, name, quantity, price, subtotal }]"
      }
    }),
    total: (0, import_fields66.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Total sale amount"
      }
    }),
    // Staff member who made the sale
    soldBy: (0, import_fields66.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who processed the sale"
      }
    }),
    soldAt: (0, import_fields66.timestamp)({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the sale occurred"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Provider.ts
var import_core66 = require("@keystone-6/core");
var import_fields67 = require("@keystone-6/core/fields");
var Provider = (0, import_core66.list)({
  access: {
    operation: { query: () => true, create: () => false, update: () => false, delete: () => false },
    filter: {
      query: rules.canReadProviders
    }
  },
  hooks: createLifecycleHooks("provider", ["status", "userId", "practiceId"]),
  ui: { listView: { initialColumns: ["user", "status", "locations", "isPublic"] } },
  fields: {
    practice: (0, import_fields67.relationship)({ ref: "Practice" }),
    user: (0, import_fields67.relationship)({ ref: "User.providerProfile" }),
    title: (0, import_fields67.text)({ ui: { description: "Configured staff title; not a licensure verification claim." } }),
    tier: (0, import_fields67.select)({ type: "enum", options: [
      { label: "Associate", value: "junior" },
      { label: "Senior", value: "senior" },
      { label: "Lead", value: "master" },
      { label: "Specialist", value: "celebrity" }
    ], defaultValue: "junior" }),
    role: (0, import_fields67.select)({ type: "enum", options: [
      { label: "Provider", value: "provider" },
      { label: "Esthetician", value: "esthetician" },
      { label: "Nurse", value: "nurse" },
      { label: "Physician", value: "physician" },
      { label: "Assistant", value: "assistant" }
    ], defaultValue: "provider" }),
    baseCommissionRate: (0, import_fields67.float)({ access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false }, defaultValue: 0, validation: { min: 0, max: 1 } }),
    commissionRate: (0, import_fields67.float)({ access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false }, defaultValue: 0, validation: { min: 0, max: 1 } }),
    bio: (0, import_fields67.text)({ ui: { displayMode: "textarea" } }),
    isActive: (0, import_fields67.checkbox)({ defaultValue: false }),
    status: (0, import_fields67.select)({ type: "enum", options: [
      { label: "Active", value: "active" },
      { label: "On Leave", value: "on_leave" },
      { label: "Inactive", value: "inactive" }
    ], defaultValue: "inactive", validation: { isRequired: true } }),
    isPublic: (0, import_fields67.checkbox)({ defaultValue: false }),
    hireDate: (0, import_fields67.timestamp)({ access: { read: activeListPermissions.canAccessDashboard, create: () => false, update: () => false } }),
    employmentType: (0, import_fields67.select)({ access: { read: activeListPermissions.canAccessDashboard, create: () => false, update: () => false }, type: "enum", options: [
      { label: "Full-time", value: "full_time" },
      { label: "Part-time", value: "part_time" },
      { label: "Contractor", value: "contractor" }
    ] }),
    photo: (0, import_fields67.relationship)({ ref: "MedSpaImage" }),
    specializations: (0, import_fields67.relationship)({ ref: "Service.specialists", many: true }),
    locations: (0, import_fields67.relationship)({ ref: "Location.providers", many: true }),
    schedules: (0, import_fields67.relationship)({ ref: "ProviderSchedule.provider", many: true }),
    appointments: (0, import_fields67.relationship)({ ref: "Appointment.provider", many: true }),
    preferredByClients: (0, import_fields67.relationship)({ ref: "Client.preferredProvider", many: true }),
    credentials: (0, import_fields67.relationship)({ ref: "ProviderCredential.provider", many: true }),
    authorizations: (0, import_fields67.relationship)({ ref: "ProviderAuthorization.provider", many: true }),
    consultations: (0, import_fields67.relationship)({ ref: "Consultation.provider", many: true }),
    treatmentSessions: (0, import_fields67.relationship)({ ref: "TreatmentSession.provider", many: true }),
    waitlistEntries: (0, import_fields67.relationship)({ ref: "WaitlistEntry.preferredProviders", many: true }),
    reviews: (0, import_fields67.relationship)({ ref: "Review.provider", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ProviderAuthorization.ts
var import_core67 = require("@keystone-6/core");
var import_fields68 = require("@keystone-6/core/fields");
var ProviderAuthorization = (0, import_core67.list)({
  access: {
    operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter }
  },
  fields: {
    practice: (0, import_fields68.relationship)({ ref: "Practice" }),
    location: (0, import_fields68.relationship)({ ref: "Location" }),
    provider: (0, import_fields68.relationship)({ ref: "Provider.authorizations" }),
    service: (0, import_fields68.relationship)({ ref: "Service" }),
    credential: (0, import_fields68.relationship)({ ref: "ProviderCredential.authorizations" }),
    requiredSupervisor: (0, import_fields68.relationship)({ ref: "Provider" }),
    status: (0, import_fields68.select)({ type: "enum", options: [
      { label: "Active", value: "active" },
      { label: "Suspended", value: "suspended" },
      { label: "Expired", value: "expired" }
    ], defaultValue: "active", validation: { isRequired: true } }),
    effectiveFrom: (0, import_fields68.timestamp)({ validation: { isRequired: true } }),
    effectiveTo: (0, import_fields68.timestamp)(),
    supervisionRequired: (0, import_fields68.checkbox)({ defaultValue: false }),
    supervisionMode: (0, import_fields68.text)(),
    policyVersion: (0, import_fields68.text)({ validation: { isRequired: true } }),
    authorityEvidenceHash: (0, import_fields68.text)({ validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields68.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    evidenceLabel: (0, import_fields68.text)({ ui: { description: "Configured authorization evidence; not a licensure verification claim." } }),
    evidenceReference: (0, import_fields68.text)(),
    ...trackingFields
  }
});

// features/keystone/models/ProviderCredential.ts
var import_core68 = require("@keystone-6/core");
var import_fields69 = require("@keystone-6/core/fields");
var ProviderCredential = (0, import_core68.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields69.relationship)({ ref: "Practice" }),
    provider: (0, import_fields69.relationship)({ ref: "Provider.credentials" }),
    location: (0, import_fields69.relationship)({ ref: "Location" }),
    licenseType: (0, import_fields69.text)({ validation: { isRequired: true } }),
    licenseNumber: (0, import_fields69.text)({ validation: { isRequired: true } }),
    jurisdiction: (0, import_fields69.text)({ validation: { isRequired: true } }),
    status: (0, import_fields69.select)({ type: "enum", options: ["pending", "verified", "restricted", "suspended", "expired", "revoked"].map((value) => ({ label: value, value })), defaultValue: "pending", validation: { isRequired: true } }),
    effectiveFrom: (0, import_fields69.timestamp)({ validation: { isRequired: true } }),
    expiresAt: (0, import_fields69.timestamp)({ validation: { isRequired: true } }),
    verifiedAt: (0, import_fields69.timestamp)(),
    verificationSource: (0, import_fields69.text)(),
    primarySourceVerified: (0, import_fields69.checkbox)({ defaultValue: false }),
    authorizations: (0, import_fields69.relationship)({ ref: "ProviderAuthorization.credential", many: true }),
    supervisionRequired: (0, import_fields69.checkbox)({ defaultValue: false }),
    supervisor: (0, import_fields69.relationship)({ ref: "Provider" }),
    scopeEvidenceHash: (0, import_fields69.text)({ validation: { isRequired: true } }),
    evidenceReference: (0, import_fields69.text)(),
    protocolVersion: (0, import_fields69.text)(),
    idempotencyKey: (0, import_fields69.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    ...trackingFields
  }
});

// features/keystone/models/ProviderSchedule.ts
var import_core69 = require("@keystone-6/core");
var import_fields70 = require("@keystone-6/core/fields");
var ProviderSchedule = (0, import_core69.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadProviderSchedules
    }
  },
  hooks: createLifecycleHooks("provider_schedule", ["type", "dayOfWeek", "localDate", "startTime", "endTime", "isAvailable", "revision", "providerId", "locationId"]),
  ui: {
    listView: {
      initialColumns: ["provider", "dayOfWeek", "startTime", "endTime", "isAvailable", "isPublic"]
    }
  },
  fields: {
    practice: (0, import_fields70.relationship)({ ref: "Practice" }),
    type: (0, import_fields70.select)({
      type: "enum",
      options: [
        { label: "Recurring", value: "recurring" },
        { label: "One-time", value: "one_time" },
        { label: "Time-off", value: "time_off" }
      ],
      defaultValue: "recurring",
      validation: {
        isRequired: true
      }
    }),
    idempotencyKey: (0, import_fields70.text)({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Stable workflow key for idempotent schedule creation"
      }
    }),
    revision: (0, import_fields70.integer)({
      defaultValue: 1,
      validation: { isRequired: true, min: 1 },
      ui: {
        description: "Optimistic concurrency revision managed by schedule workflows"
      }
    }),
    // Day of week for recurring schedules (0-6, Sunday = 0)
    dayOfWeek: (0, import_fields70.integer)({
      validation: {
        min: 0,
        max: 6
      },
      ui: {
        description: "Day of week (0=Sunday, 1=Monday, etc) for recurring schedules"
      }
    }),
    // Legacy string-based day of week
    dayOfWeekLegacy: (0, import_fields70.select)({
      type: "enum",
      options: [
        { label: "Monday", value: "monday" },
        { label: "Tuesday", value: "tuesday" },
        { label: "Wednesday", value: "wednesday" },
        { label: "Thursday", value: "thursday" },
        { label: "Friday", value: "friday" },
        { label: "Saturday", value: "saturday" },
        { label: "Sunday", value: "sunday" }
      ]
    }),
    localDate: (0, import_fields70.text)({
      ui: {
        description: "MedSpa-local YYYY-MM-DD date for one-time and time-off entries"
      }
    }),
    // Legacy timestamp mirror for one-time or time-off entries
    date: (0, import_fields70.timestamp)({
      ui: {
        description: "Specific date for one-time schedule or time-off"
      }
    }),
    startTime: (0, import_fields70.text)({
      validation: { isRequired: true },
      ui: {
        description: "Start time in HH:MM format (e.g., 09:00)"
      }
    }),
    endTime: (0, import_fields70.text)({
      validation: { isRequired: true },
      ui: {
        description: "End time in HH:MM format (e.g., 17:00)"
      }
    }),
    isAvailable: (0, import_fields70.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether provider is available on this day (false for time off)"
      }
    }),
    isPublic: (0, import_fields70.checkbox)({
      defaultValue: false,
      ui: {
        description: "Explicit storefront scheduling flag. Returned times remain request options, not confirmed availability."
      }
    }),
    // Break times
    breakStart: (0, import_fields70.text)({
      ui: {
        description: "Lunch/break start time in HH:MM format"
      }
    }),
    breakEnd: (0, import_fields70.text)({
      ui: {
        description: "Lunch/break end time in HH:MM format"
      }
    }),
    reason: (0, import_fields70.text)({
      ui: {
        displayMode: "textarea",
        description: "Reason for time-off or special schedule"
      }
    }),
    // Schedule validity period
    effectiveFrom: (0, import_fields70.timestamp)({
      ui: {
        description: "When this schedule starts being effective"
      }
    }),
    effectiveTo: (0, import_fields70.timestamp)({
      ui: {
        description: "When this schedule ends (null for ongoing recurring schedules)"
      }
    }),
    // Legacy fields
    effectiveDate: (0, import_fields70.timestamp)({
      ui: {
        description: "When this schedule starts being effective (legacy - use effectiveFrom)"
      }
    }),
    endDate: (0, import_fields70.timestamp)({
      ui: {
        description: "When this schedule ends (legacy - use effectiveTo)"
      }
    }),
    location: (0, import_fields70.relationship)({ ref: "Location.schedules" }),
    // Relationship to provider
    provider: (0, import_fields70.relationship)({
      ref: "Provider.schedules",
      ui: {
        displayMode: "select"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/PurchaseOrder.ts
var import_core70 = require("@keystone-6/core");
var import_fields71 = require("@keystone-6/core/fields");
var PurchaseOrder = (0, import_core70.list)({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields71.relationship)({ ref: "Practice" }),
    location: (0, import_fields71.relationship)({ ref: "Location.purchaseOrders" }),
    vendor: (0, import_fields71.relationship)({ ref: "Vendor.purchaseOrders" }),
    number: (0, import_fields71.text)({ validation: { isRequired: true } }),
    status: (0, import_fields71.select)({ type: "enum", options: [
      { label: "Draft", value: "draft" },
      { label: "Submitted", value: "submitted" },
      { label: "Partially Received", value: "partially_received" },
      { label: "Received", value: "received" },
      { label: "Cancelled", value: "cancelled" }
    ], defaultValue: "draft", validation: { isRequired: true } }),
    currencyCode: (0, import_fields71.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    totalMinor: (0, import_fields71.integer)({ defaultValue: 0, validation: { min: 0 } }),
    orderedAt: (0, import_fields71.timestamp)(),
    expectedAt: (0, import_fields71.timestamp)(),
    revision: (0, import_fields71.integer)({ defaultValue: 1, validation: { min: 1 } }),
    lines: (0, import_fields71.relationship)({ ref: "PurchaseOrderLine.purchaseOrder", many: true }),
    receipts: (0, import_fields71.relationship)({ ref: "GoodsReceipt.purchaseOrder", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/PurchaseOrderLine.ts
var import_core71 = require("@keystone-6/core");
var import_fields72 = require("@keystone-6/core/fields");
var PurchaseOrderLine = (0, import_core71.list)({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: async (args) => await activeListPermissions.signedIn(args) && practiceId(args.session) ? { purchaseOrder: { practice: { id: { equals: practiceId(args.session) } } } } : false } },
  fields: {
    purchaseOrder: (0, import_fields72.relationship)({ ref: "PurchaseOrder.lines" }),
    product: (0, import_fields72.relationship)({ ref: "Product" }),
    productTitle: (0, import_fields72.text)({ validation: { isRequired: true } }),
    orderedQuantity: (0, import_fields72.integer)({ validation: { isRequired: true, min: 1 } }),
    receivedQuantity: (0, import_fields72.integer)({ defaultValue: 0, validation: { min: 0 } }),
    unitCostMinor: (0, import_fields72.integer)({ validation: { isRequired: true, min: 0 } }),
    ...trackingFields
  }
});

// features/keystone/models/RecallAction.ts
var import_core72 = require("@keystone-6/core");
var import_fields73 = require("@keystone-6/core/fields");
var RecallAction = (0, import_core72.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields73.relationship)({ ref: "Practice" }), recall: (0, import_fields73.relationship)({ ref: "RecallCase.actions" }), exposure: (0, import_fields73.relationship)({ ref: "RecallExposure" }), actor: (0, import_fields73.relationship)({ ref: "User" }), action: (0, import_fields73.select)({ type: "enum", options: ["open", "assess", "quarantine", "identify_exposure", "notify", "clinical_assessment", "dispose", "close"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), reason: (0, import_fields73.text)({ validation: { isRequired: true } }), evidence: (0, import_fields73.json)(), evidenceHash: (0, import_fields73.text)({ validation: { isRequired: true } }), occurredAt: (0, import_fields73.timestamp)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields73.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/RecallCase.ts
var import_core73 = require("@keystone-6/core");
var import_fields74 = require("@keystone-6/core/fields");
var RecallCase = (0, import_core73.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields74.relationship)({ ref: "Practice" }), location: (0, import_fields74.relationship)({ ref: "Location" }), lot: (0, import_fields74.relationship)({ ref: "InventoryLot.recallCases" }), device: (0, import_fields74.relationship)({ ref: "Resource.recallCases" }), openedBy: (0, import_fields74.relationship)({ ref: "User" }), sourceReference: (0, import_fields74.text)({ validation: { isRequired: true } }), scopeReason: (0, import_fields74.text)({ validation: { isRequired: true } }), status: (0, import_fields74.select)({ type: "enum", options: ["open", "applicability_review", "quarantined", "patients_identified", "notifications_in_progress", "disposition_complete", "closed"].map((value) => ({ label: value, value })), defaultValue: "open", validation: { isRequired: true } }), openedAt: (0, import_fields74.timestamp)({ validation: { isRequired: true } }), closedAt: (0, import_fields74.timestamp)(), evidenceHash: (0, import_fields74.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields74.text)({ validation: { isRequired: true }, isIndexed: "unique" }), exposures: (0, import_fields74.relationship)({ ref: "RecallExposure.recall", many: true }), actions: (0, import_fields74.relationship)({ ref: "RecallAction.recall", many: true }), ...trackingFields }
});

// features/keystone/models/RecallExposure.ts
var import_core74 = require("@keystone-6/core");
var import_fields75 = require("@keystone-6/core/fields");
var RecallExposure = (0, import_core74.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields75.relationship)({ ref: "Practice" }), recall: (0, import_fields75.relationship)({ ref: "RecallCase.exposures" }), client: (0, import_fields75.relationship)({ ref: "Client" }), administration: (0, import_fields75.relationship)({ ref: "TreatmentAdministration" }), administrationLot: (0, import_fields75.relationship)({ ref: "AdministrationLot" }), status: (0, import_fields75.select)({ type: "enum", options: ["identified", "reviewed", "notified", "assessed", "closed"].map((value) => ({ label: value, value })), defaultValue: "identified", validation: { isRequired: true } }), identifiedAt: (0, import_fields75.timestamp)({ validation: { isRequired: true } }), notificationDueAt: (0, import_fields75.timestamp)(), evidenceHash: (0, import_fields75.text)({ validation: { isRequired: true } }), ...trackingFields }
});

// features/keystone/models/Referral.ts
var import_core75 = require("@keystone-6/core");
var import_fields76 = require("@keystone-6/core/fields");
var Referral = (0, import_core75.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadReferrals
    }
  },
  ui: {
    listView: {
      initialColumns: ["referrer", "referred", "rewardAmount", "rewardType", "status"]
    }
  },
  fields: {
    practice: (0, import_fields76.relationship)({ ref: "Practice" }),
    // The user who made the referral
    referrer: (0, import_fields76.relationship)({
      ref: "User.referralsMade",
      ui: {
        displayMode: "select",
        description: "The client who made the referral"
      }
    }),
    // The new user who was referred
    referred: (0, import_fields76.relationship)({
      ref: "User.referralsReceived",
      ui: {
        displayMode: "select",
        description: "The new client who was referred"
      }
    }),
    // Reward details
    rewardAmount: (0, import_fields76.integer)({
      defaultValue: 0,
      validation: { isRequired: true },
      ui: {
        description: "Amount of reward (points or credit value)"
      }
    }),
    rewardType: (0, import_fields76.select)({
      type: "string",
      options: [
        { label: "Points", value: "points" },
        { label: "Credit", value: "credit" }
      ],
      defaultValue: "points",
      validation: { isRequired: true },
      ui: {
        description: "Type of reward given for the referral"
      }
    }),
    // Referral status
    status: (0, import_fields76.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Completed", value: "completed" },
        { label: "Expired", value: "expired" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
      ui: {
        description: "Current status of the referral"
      }
    }),
    completedAt: (0, import_fields76.timestamp)({
      ui: {
        description: "When the referral was completed (referred client made first purchase)"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Refund.ts
var import_core76 = require("@keystone-6/core");
var import_fields77 = require("@keystone-6/core/fields");
var Refund = (0, import_core76.list)({
  access: { operation: { query: permissions.canManageFinance, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields77.relationship)({ ref: "Practice" }),
    payment: (0, import_fields77.relationship)({ ref: "Payment.refunds" }),
    amountMinor: (0, import_fields77.integer)({ validation: { isRequired: true, min: 1 } }),
    currencyCode: (0, import_fields77.text)({ validation: { isRequired: true } }),
    reason: (0, import_fields77.text)({ validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields77.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    providerReference: (0, import_fields77.text)(),
    status: (0, import_fields77.select)({ type: "enum", options: [
      { label: "Pending", value: "pending" },
      { label: "Completed", value: "completed" },
      { label: "Failed", value: "failed" }
    ], defaultValue: "pending", validation: { isRequired: true } }),
    processedAt: (0, import_fields77.timestamp)(),
    data: (0, import_fields77.json)(),
    ...trackingFields
  }
});

// features/keystone/models/RetentionPolicy.ts
var import_core77 = require("@keystone-6/core");
var import_fields78 = require("@keystone-6/core/fields");
var RetentionPolicy = (0, import_core77.list)({
  access: { operation: { query: permissions.canManageSensitiveRecords, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields78.relationship)({ ref: "Practice" }), jurisdiction: (0, import_fields78.text)({ validation: { isRequired: true } }), recordClass: (0, import_fields78.text)({ validation: { isRequired: true } }), version: (0, import_fields78.text)({ validation: { isRequired: true } }), retainMonths: (0, import_fields78.integer)({ validation: { isRequired: true, min: 1 } }), minorsRule: (0, import_fields78.text)(), dispositionRule: (0, import_fields78.text)({ validation: { isRequired: true } }), sourceCitations: (0, import_fields78.text)({ validation: { isRequired: true } }), approvedBy: (0, import_fields78.relationship)({ ref: "User" }), effectiveFrom: (0, import_fields78.timestamp)({ validation: { isRequired: true } }), effectiveUntil: (0, import_fields78.timestamp)(), evidenceHash: (0, import_fields78.text)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields78.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/Resource.ts
var import_core78 = require("@keystone-6/core");
var import_fields79 = require("@keystone-6/core/fields");
var Resource = (0, import_core78.list)({
  access: {
    operation: { query: permissions.canSchedule, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter }
  },
  hooks: createLifecycleHooks("resource", ["name", "type", "capacity", "isActive", "revision", "locationId"]),
  ui: { listView: { initialColumns: ["name", "type", "location", "capacity", "isActive", "isPublic"] }, labelField: "name" },
  fields: {
    practice: (0, import_fields79.relationship)({ ref: "Practice" }),
    name: (0, import_fields79.text)({ validation: { isRequired: true } }),
    type: (0, import_fields79.select)({ type: "enum", options: [
      { label: "Treatment Room", value: "room" },
      { label: "Device", value: "device" },
      { label: "Equipment", value: "equipment" },
      { label: "Station", value: "station" },
      { label: "Other", value: "other" }
    ], defaultValue: "room", validation: { isRequired: true } }),
    revision: (0, import_fields79.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    capacity: (0, import_fields79.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    isActive: (0, import_fields79.checkbox)({ defaultValue: true }),
    isPublic: (0, import_fields79.checkbox)({ defaultValue: false, ui: { description: "Explicit public scheduling flag. Active status alone never exposes this resource to storefront availability." } }),
    readinessStatus: (0, import_fields79.select)({ type: "enum", options: ["acceptance_testing", "available", "in_use", "cleaning", "maintenance_due", "out_of_service", "incident_lockout", "recall_quarantine", "retired"].map((value) => ({ label: value, value })), defaultValue: "acceptance_testing", validation: { isRequired: true } }),
    manufacturer: (0, import_fields79.text)(),
    model: (0, import_fields79.text)(),
    serialNumber: (0, import_fields79.text)(),
    udi: (0, import_fields79.text)(),
    softwareVersion: (0, import_fields79.text)(),
    maintenanceDueAt: (0, import_fields79.timestamp)(),
    calibrationDueAt: (0, import_fields79.timestamp)(),
    cleanedAt: (0, import_fields79.timestamp)(),
    releasedAt: (0, import_fields79.timestamp)(),
    roomCapabilities: (0, import_fields79.json)(),
    trainingRequirements: (0, import_fields79.json)(),
    metadata: (0, import_fields79.json)(),
    notes: (0, import_fields79.text)({ ui: { displayMode: "textarea" } }),
    location: (0, import_fields79.relationship)({ ref: "Location.resources" }),
    services: (0, import_fields79.relationship)({ ref: "Service.requiredResources", many: true }),
    appointments: (0, import_fields79.relationship)({ ref: "Appointment.resource", many: true }),
    scheduleBlocks: (0, import_fields79.relationship)({ ref: "ResourceScheduleBlock.resource", many: true }),
    reservations: (0, import_fields79.relationship)({ ref: "AppointmentResourceReservation.resource", many: true }),
    readinessEvents: (0, import_fields79.relationship)({ ref: "DeviceReadinessEvent.resource", many: true }),
    recallCases: (0, import_fields79.relationship)({ ref: "RecallCase.device", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ResourceScheduleBlock.ts
var import_core79 = require("@keystone-6/core");
var import_fields80 = require("@keystone-6/core/fields");
var ResourceScheduleBlock = (0, import_core79.list)({
  access: { operation: { query: permissions.canSchedule, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields80.relationship)({ ref: "Practice" }),
    location: (0, import_fields80.relationship)({ ref: "Location" }),
    resource: (0, import_fields80.relationship)({ ref: "Resource.scheduleBlocks" }),
    type: (0, import_fields80.select)({ type: "enum", options: [
      { label: "Maintenance", value: "maintenance" },
      { label: "Unavailable", value: "unavailable" },
      { label: "Reserved", value: "reserved" }
    ], defaultValue: "unavailable", validation: { isRequired: true } }),
    startsAt: (0, import_fields80.timestamp)({ validation: { isRequired: true } }),
    endsAt: (0, import_fields80.timestamp)({ validation: { isRequired: true } }),
    reason: (0, import_fields80.text)({ validation: { isRequired: true } }),
    revision: (0, import_fields80.integer)({ defaultValue: 1, validation: { min: 1 } }),
    ...trackingFields
  }
});

// features/keystone/models/DeviceReadinessEvent.ts
var import_core80 = require("@keystone-6/core");
var import_fields81 = require("@keystone-6/core/fields");
var DeviceReadinessEvent = (0, import_core80.list)({
  access: { operation: { query: permissions.canSchedule, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: { practice: (0, import_fields81.relationship)({ ref: "Practice" }), resource: (0, import_fields81.relationship)({ ref: "Resource.readinessEvents" }), actor: (0, import_fields81.relationship)({ ref: "User" }), qualifiedReleaseBy: (0, import_fields81.relationship)({ ref: "Provider" }), action: (0, import_fields81.select)({ type: "enum", options: ["acceptance_test", "clean", "maintenance_due", "lockout", "service", "recall_quarantine", "release", "retire"].map((value) => ({ label: value, value })), validation: { isRequired: true } }), fromStatus: (0, import_fields81.text)(), toStatus: (0, import_fields81.text)({ validation: { isRequired: true } }), reason: (0, import_fields81.text)({ validation: { isRequired: true } }), evidence: (0, import_fields81.json)(), evidenceHash: (0, import_fields81.text)({ validation: { isRequired: true } }), occurredAt: (0, import_fields81.timestamp)({ validation: { isRequired: true } }), idempotencyKey: (0, import_fields81.text)({ validation: { isRequired: true }, isIndexed: "unique" }), ...trackingFields }
});

// features/keystone/models/Review.ts
var import_core81 = require("@keystone-6/core");
var import_fields82 = require("@keystone-6/core/fields");
var Review = (0, import_core81.list)({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: {
      query: rules.canReadReviews
    }
  },
  ui: {
    listView: {
      initialColumns: ["client", "rating", "service", "provider", "isApproved", "createdAt"]
    }
  },
  fields: {
    practice: (0, import_fields82.relationship)({ ref: "Practice" }),
    // Rating (1-5 stars)
    rating: (0, import_fields82.integer)({
      validation: {
        isRequired: true,
        min: 1,
        max: 5
      },
      ui: {
        description: "Rating from 1 to 5 stars"
      }
    }),
    // Review content
    comment: (0, import_fields82.text)({
      ui: {
        displayMode: "textarea",
        description: "Review comment from the client"
      }
    }),
    // Moderation
    isApproved: (0, import_fields82.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether this review has been approved to display publicly"
      }
    }),
    // Timestamps
    // Relationships
    client: (0, import_fields82.relationship)({
      ref: "Client.reviews",
      ui: {
        displayMode: "select",
        description: "Client who wrote this review"
      }
    }),
    service: (0, import_fields82.relationship)({
      ref: "Service.reviews",
      ui: {
        displayMode: "select",
        description: "Service being reviewed"
      }
    }),
    provider: (0, import_fields82.relationship)({
      ref: "Provider.reviews",
      ui: {
        displayMode: "select",
        description: "Provider being reviewed"
      }
    }),
    appointment: (0, import_fields82.relationship)({
      ref: "Appointment.review",
      ui: {
        displayMode: "select",
        description: "Associated appointment (optional)"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Role.ts
var import_core82 = require("@keystone-6/core");
var import_fields83 = require("@keystone-6/core/fields");
var Role = (0, import_core82.list)({
  access: {
    operation: { query: activeListPermissions.canAccessDashboard, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadRoles }
  },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ["name", "assignedTo"] }
  },
  fields: {
    practice: (0, import_fields83.relationship)({ ref: "Practice", ui: { description: "May be empty only for the one-time init account before controlled onboarding assigns its practice." } }),
    name: (0, import_fields83.text)({ validation: { isRequired: true } }),
    canManagePeople: (0, import_fields83.checkbox)({ defaultValue: false }),
    canManageRoles: (0, import_fields83.checkbox)({ defaultValue: false }),
    canAccessDashboard: (0, import_fields83.checkbox)({ defaultValue: false }),
    canManageOnboarding: (0, import_fields83.checkbox)({ defaultValue: false }),
    canManagePractice: (0, import_fields83.checkbox)({ defaultValue: false }),
    canSchedule: (0, import_fields83.checkbox)({ defaultValue: false }),
    canReadClients: (0, import_fields83.checkbox)({ defaultValue: false }),
    canManageClinical: (0, import_fields83.checkbox)({ defaultValue: false }),
    canManageSensitiveRecords: (0, import_fields83.checkbox)({ defaultValue: false }),
    canManageInventory: (0, import_fields83.checkbox)({ defaultValue: false }),
    canManageFinance: (0, import_fields83.checkbox)({ defaultValue: false }),
    canManageCommunications: (0, import_fields83.checkbox)({ defaultValue: false }),
    canViewReports: (0, import_fields83.checkbox)({ defaultValue: false }),
    canManageIntegrations: (0, import_fields83.checkbox)({ defaultValue: false }),
    assignedTo: (0, import_fields83.relationship)({ ref: "User.role", many: true, access: { create: () => false, update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    ...trackingFields
  }
});

// features/keystone/models/Service.ts
var import_core83 = require("@keystone-6/core");
var import_fields84 = require("@keystone-6/core/fields");
var formatCurrency6 = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
};
var Service = (0, import_core83.list)({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: () => true,
      create: activeListPermissions.canManagePractice,
      update: activeListPermissions.canManagePractice,
      delete: activeListPermissions.canManagePractice
    },
    filter: {
      query: rules.canReadServices,
      update: ({ session }) => practiceId(session) ? { practice: { id: { equals: practiceId(session) } } } : false,
      delete: ({ session }) => practiceId(session) ? { practice: { id: { equals: practiceId(session) } } } : false
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "category", "basePrice", "baseDuration"]
    }
  },
  fields: {
    practice: (0, import_fields84.relationship)({ ref: "Practice" }),
    currencyCode: (0, import_fields84.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    cleanupBufferMinutes: (0, import_fields84.integer)({ defaultValue: 15, validation: { min: 0, max: 240 } }),
    staffAuthorizationRequired: (0, import_fields84.checkbox)({
      defaultValue: true,
      ui: { description: "Requires an active configured ProviderAuthorization before booking or treatment. This is not a licensure verification claim." }
    }),
    name: (0, import_fields84.text)({
      validation: { isRequired: true },
      ui: {
        description: "Public treatment or consultation service name"
      }
    }),
    description: (0, import_fields84.text)({
      ui: {
        displayMode: "textarea"
      }
    }),
    baseDuration: (0, import_fields84.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Duration in minutes"
      }
    }),
    // Price in cents for consistency with other models
    price: (0, import_fields84.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Base price in cents"
      }
    }),
    // Deprecated alias retained for API compatibility; values are cents.
    basePrice: (0, import_fields84.integer)({
      ui: {
        description: "Base price in cents (deprecated; use price)"
      }
    }),
    depositRequired: (0, import_fields84.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether a deposit is required to book this service"
      }
    }),
    depositAmount: (0, import_fields84.integer)({
      ui: {
        description: "Deposit amount required in cents"
      }
    }),
    status: (0, import_fields84.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" }
      ],
      defaultValue: "active"
    }),
    isPublic: (0, import_fields84.checkbox)({
      defaultValue: false,
      access: {
        read: () => true,
        create: activeListPermissions.canManagePractice,
        update: activeListPermissions.canManagePractice
      },
      ui: { description: "Explicit public-catalog publication flag. Active status alone never publishes a service." }
    }),
    metadata: (0, import_fields84.json)({
      access: { read: activeListPermissions.canAccessDashboard, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice },
      ui: {
        description: "Additional service metadata"
      }
    }),
    pricingTier: (0, import_fields84.json)({
      ui: {
        description: "Pricing by provider tier, e.g., {junior: 50, senior: 75, master: 100}"
      }
    }),
    requiresConsultation: (0, import_fields84.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether this service requires a consultation first"
      }
    }),
    requiresIntakeReview: (0, import_fields84.checkbox)({
      defaultValue: true,
      ui: { description: "Whether authorized staff must review current intake before treatment starts" }
    }),
    requiresLotTraceability: (0, import_fields84.checkbox)({ access: { read: activeListPermissions.canAccessDashboard, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice }, defaultValue: true, ui: { description: "Fail-closed: disable only for approved services that administer no tracked product." } }),
    clinicalProducts: (0, import_fields84.relationship)({ access: { read: activeListPermissions.canAccessDashboard, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice }, ref: "Product", many: true, ui: { description: "Approved products/lots for treatment administration." } }),
    // Public Service rows retain catalog fields, but generic relationship traversal is operator-only.
    // Target list filters also keep authorized operators inside their current practice.
    category: (0, import_fields84.relationship)({
      access: { read: rules.canReadServiceRelationships },
      ref: "ServiceCategory.services",
      ui: {
        displayMode: "select"
      }
    }),
    // Image relationship (optional - for service photos)
    image: (0, import_fields84.relationship)({
      access: { read: rules.canReadServiceRelationships },
      ref: "MedSpaImage",
      ui: {
        displayMode: "cards",
        cardFields: ["image", "imagePath", "altText"],
        inlineCreate: { fields: ["imagePath", "altText"] },
        inlineEdit: { fields: ["imagePath", "altText"] }
      }
    }),
    // Providers who specialize in this service
    specialists: (0, import_fields84.relationship)({
      ref: "Provider.specializations",
      many: true,
      ui: {
        displayMode: "count"
      }
    }),
    requiredResources: (0, import_fields84.relationship)({
      access: { read: activeListPermissions.canAccessDashboard, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice },
      ref: "Resource.services",
      many: true,
      ui: {
        displayMode: "count",
        description: "Rooms, devices, stations, or equipment required to deliver this service"
      }
    }),
    reviews: (0, import_fields84.relationship)({
      ref: "Review.service",
      many: true,
      ui: {
        displayMode: "count"
      }
    }),
    variants: (0, import_fields84.relationship)({
      ref: "ServiceVariant.service",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["name", "price", "duration", "staffLevel"],
        inlineCreate: { fields: ["name", "price", "duration", "staffLevel", "displayOrder"] },
        inlineEdit: { fields: ["name", "price", "duration", "staffLevel", "displayOrder"] },
        description: "Pricing variants by provider tier"
      }
    }),
    formattedPrice: (0, import_fields84.virtual)({
      field: import_core83.graphql.field({
        type: import_core83.graphql.String,
        async resolve(item, args, context) {
          const serviceId = item.id;
          const service = await context.sudo().query.Service.findOne({
            where: { id: serviceId },
            query: "price"
          });
          if (!service?.price) return "$0.00";
          return formatCurrency6(service.price / 100);
        }
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/ServiceCategory.ts
var import_core84 = require("@keystone-6/core");
var import_fields85 = require("@keystone-6/core/fields");

// features/keystone/serviceCategoryPolicy.ts
async function categoryChildrenRemainInPractice(context, item) {
  if (typeof item.practiceId !== "string" || !item.practiceId) return false;
  const foreignChildren = await context.sudo().query.Service.count({ where: { category: { id: { equals: item.id.toString() } }, NOT: { practice: { id: { equals: item.practiceId } } } } });
  return foreignChildren === 0;
}

// features/keystone/models/ServiceCategory.ts
var ServiceCategory = (0, import_core84.list)({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: () => true,
      create: activeListPermissions.canManagePractice,
      update: activeListPermissions.canManagePractice,
      delete: activeListPermissions.canManagePractice
    },
    filter: { query: rules.canReadServiceCategories, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false }
  },
  ui: {
    listView: {
      initialColumns: ["name", "sortOrder", "services"]
    }
  },
  fields: {
    practice: (0, import_fields85.relationship)({ ref: "Practice" }),
    name: (0, import_fields85.text)({
      validation: { isRequired: true },
      ui: {
        description: "Category name (e.g., Hair, Nails, Skin, Massage, Makeup)"
      }
    }),
    description: (0, import_fields85.text)({
      ui: {
        displayMode: "textarea"
      }
    }),
    slug: (0, import_fields85.text)({
      isIndexed: "unique",
      ui: {
        description: "URL-friendly slug (auto-generated from name)"
      }
    }),
    parent: (0, import_fields85.relationship)({
      ref: "ServiceCategory",
      ui: {
        displayMode: "select",
        description: "Parent category (for subcategories)"
      }
    }),
    displayOrder: (0, import_fields85.integer)({
      defaultValue: 0,
      ui: {
        description: "Sort order for display"
      }
    }),
    // Legacy field
    sortOrder: (0, import_fields85.integer)({
      defaultValue: 0,
      ui: {
        description: "Order in which categories appear in the service menu (legacy)"
      }
    }),
    isVisible: (0, import_fields85.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this category is visible on the storefront"
      }
    }),
    icon: (0, import_fields85.text)({
      ui: {
        description: "Icon name or emoji for the category"
      }
    }),
    // Relationships
    services: (0, import_fields85.relationship)({
      ref: "Service.category",
      many: true,
      access: { read: ({ context, item }) => categoryChildrenRemainInPractice(context, item) },
      ui: {
        displayMode: "cards",
        cardFields: ["name", "basePrice", "baseDuration"],
        inlineCreate: { fields: ["name", "basePrice", "baseDuration"] },
        inlineEdit: { fields: ["name", "basePrice", "baseDuration"] }
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/ServicePackage.ts
var import_core85 = require("@keystone-6/core");
var import_fields86 = require("@keystone-6/core/fields");
var ServicePackage = (0, import_core85.list)({
  access: {
    operation: {
      query: permissions.canManageFinance,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  ui: {
    listView: {
      initialColumns: ["name", "totalPrice", "savingsAmount", "isActive"]
    }
  },
  fields: {
    practice: (0, import_fields86.relationship)({ ref: "Practice" }),
    name: (0, import_fields86.text)({
      validation: { isRequired: true },
      ui: {
        description: "Package name (e.g., Bridal Package, Spa Day Package)"
      }
    }),
    description: (0, import_fields86.text)({
      ui: {
        displayMode: "textarea",
        description: "Detailed description of what's included in the package"
      }
    }),
    totalPrice: (0, import_fields86.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Total package price"
      }
    }),
    savingsAmount: (0, import_fields86.integer)({
      defaultValue: 0,
      ui: {
        description: "Amount saved compared to booking services individually"
      }
    }),
    validDays: (0, import_fields86.integer)({
      defaultValue: 30,
      ui: {
        description: "Number of days the package is valid after purchase"
      }
    }),
    isActive: (0, import_fields86.checkbox)({
      defaultValue: true,
      ui: {
        description: "Whether this package is currently available for purchase"
      }
    }),
    // Relationships
    services: (0, import_fields86.relationship)({
      ref: "Service",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["name", "basePrice", "baseDuration"],
        inlineConnect: true,
        description: "Services included in this package"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/ServiceVariant.ts
var import_core86 = require("@keystone-6/core");
var import_fields87 = require("@keystone-6/core/fields");

// features/keystone/serviceVariantTenantScope.ts
var hasOwn = (value, key) => Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
async function validateServiceVariantTenantLinks({
  practiceId: practiceId5,
  operation,
  resolvedData,
  item,
  findServices,
  addValidationError
}) {
  const practiceChange = hasOwn(resolvedData, "practice") ? resolvedData?.practice : void 0;
  if (practiceChange !== void 0) {
    const relationKeys = practiceChange && typeof practiceChange === "object" ? Object.keys(practiceChange) : [];
    const connectedPracticeId = practiceChange?.connect?.id;
    if (typeof practiceId5 !== "string" || !practiceId5 || connectedPracticeId !== practiceId5 || relationKeys.length !== 1 || relationKeys[0] !== "connect") {
      addValidationError("Service variant practice must remain connected to the authenticated practice");
      return;
    }
  }
  let serviceId;
  const serviceChangeProvided = hasOwn(resolvedData, "service") && resolvedData?.service !== void 0;
  if (serviceChangeProvided) {
    const serviceChange = resolvedData?.service;
    if (serviceChange == null) {
      serviceId = null;
    } else if (typeof serviceChange === "object") {
      const relationKeys = Object.keys(serviceChange);
      if (relationKeys.length === 1 && relationKeys[0] === "disconnect" && serviceChange.disconnect === true) {
        if (operation === "create") {
          addValidationError("A new service variant cannot disconnect an existing service");
          return;
        }
        serviceId = null;
      } else if (relationKeys.length === 1 && relationKeys[0] === "connect" && typeof serviceChange.connect?.id === "string" && serviceChange.connect.id) {
        serviceId = serviceChange.connect.id;
      } else {
        addValidationError("Service variant must connect to one existing same-practice service");
        return;
      }
    } else {
      addValidationError("Service variant must connect to one existing same-practice service");
      return;
    }
  } else {
    serviceId = item?.serviceId ?? item?.service?.id ?? null;
  }
  if (serviceId == null) return;
  if (typeof serviceId !== "string" || !serviceId || typeof practiceId5 !== "string" || !practiceId5) {
    addValidationError("Service variant and linked service must belong to the authenticated practice");
    return;
  }
  const rows = await findServices({
    where: {
      AND: [
        { id: { equals: serviceId } },
        { practice: { id: { equals: practiceId5 } } }
      ]
    },
    take: 2,
    query: "id practice { id }"
  });
  if (!Array.isArray(rows) || rows.length !== 1) {
    addValidationError("Service variant and linked service must belong to the authenticated practice");
    return;
  }
  const service = rows[0];
  if (service?.id !== serviceId || service.practice?.id !== practiceId5) {
    addValidationError("Service variant and linked service must belong to the authenticated practice");
  }
}

// features/keystone/models/ServiceVariant.ts
var formatCurrency7 = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount / 100);
};
var ServiceVariant = (0, import_core86.list)({
  hooks: {
    validateInput: async (args) => {
      await validateTenantInput(args);
      await validateServiceVariantTenantLinks({
        practiceId: practiceId(args.context.session),
        operation: args.operation,
        resolvedData: args.resolvedData,
        item: args.item,
        findServices: (query) => args.context.sudo().query.Service.findMany(query),
        addValidationError: args.addValidationError
      });
    }
  },
  access: {
    operation: {
      query: () => true,
      create: activeListPermissions.canManagePractice,
      update: activeListPermissions.canManagePractice,
      delete: activeListPermissions.canManagePractice
    },
    filter: { query: rules.canReadServiceVariants, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false }
  },
  ui: {
    listView: {
      initialColumns: ["name", "service", "price", "duration", "displayOrder"]
    },
    labelField: "name"
  },
  fields: {
    practice: (0, import_fields87.relationship)({ ref: "Practice" }),
    name: (0, import_fields87.text)({
      validation: { isRequired: true },
      ui: {
        description: "Variant name (e.g., Junior Provider, Senior Provider, Master Provider)"
      }
    }),
    service: (0, import_fields87.relationship)({
      ref: "Service.variants",
      ui: {
        displayMode: "select",
        description: "The service this variant belongs to"
      }
    }),
    price: (0, import_fields87.integer)({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Price in cents (overrides base service price if set)"
      }
    }),
    duration: (0, import_fields87.integer)({
      ui: {
        description: "Duration in minutes (overrides base service duration if different)"
      }
    }),
    staffLevel: (0, import_fields87.text)({
      ui: {
        description: "Staff level/tier this variant applies to (e.g., junior, senior, master)"
      }
    }),
    displayOrder: (0, import_fields87.integer)({
      defaultValue: 0,
      ui: {
        description: "Order in which this variant appears"
      }
    }),
    formattedPrice: (0, import_fields87.virtual)({
      field: import_core86.graphql.field({
        type: import_core86.graphql.String,
        async resolve(item, args, context) {
          const variantId = item.id;
          const variant = await context.sudo().query.ServiceVariant.findOne({
            where: { id: variantId },
            query: "price"
          });
          if (!variant?.price) return "$0.00";
          return formatCurrency7(variant.price);
        }
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/StaffInvitation.ts
var import_core87 = require("@keystone-6/core");
var import_fields88 = require("@keystone-6/core/fields");
var StaffInvitation = (0, import_core87.list)({
  access: {
    operation: { query: activeListPermissions.canManagePeople, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter }
  },
  fields: {
    practice: (0, import_fields88.relationship)({ ref: "Practice" }),
    email: (0, import_fields88.text)({ validation: { isRequired: true } }),
    role: (0, import_fields88.relationship)({ ref: "Role" }),
    locations: (0, import_fields88.relationship)({ ref: "Location", many: true }),
    invitedBy: (0, import_fields88.relationship)({ ref: "User" }),
    acceptedUser: (0, import_fields88.relationship)({ ref: "User" }),
    tokenHash: (0, import_fields88.text)({ validation: { isRequired: true }, isIndexed: "unique", access: { read: () => false, create: () => false, update: () => false } }),
    status: (0, import_fields88.select)({ type: "enum", options: ["pending", "accepted", "expired", "revoked"].map((value) => ({ label: value, value })), defaultValue: "pending", validation: { isRequired: true } }),
    expiresAt: (0, import_fields88.timestamp)({ validation: { isRequired: true } }),
    acceptedAt: (0, import_fields88.timestamp)(),
    idempotencyKey: (0, import_fields88.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    ...trackingFields
  }
});

// features/keystone/models/StockMovement.ts
var import_core88 = require("@keystone-6/core");
var import_fields89 = require("@keystone-6/core/fields");
var StockMovement = (0, import_core88.list)({
  access: { operation: { query: permissions.canManageInventory, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields89.relationship)({ ref: "Practice" }),
    location: (0, import_fields89.relationship)({ ref: "Location" }),
    lot: (0, import_fields89.relationship)({ ref: "InventoryLot.movements" }),
    product: (0, import_fields89.relationship)({ ref: "Product" }),
    type: (0, import_fields89.select)({ type: "enum", options: [
      { label: "Receive", value: "receive" },
      { label: "Consume", value: "consume" },
      { label: "Retail Sale", value: "retail_sale" },
      { label: "Return", value: "return" },
      { label: "Adjustment", value: "adjustment" },
      { label: "Transfer", value: "transfer" },
      { label: "Expire", value: "expire" }
    ], validation: { isRequired: true } }),
    delta: (0, import_fields89.integer)({ validation: { isRequired: true } }),
    balanceBefore: (0, import_fields89.integer)({ validation: { isRequired: true, min: 0 } }),
    balanceAfter: (0, import_fields89.integer)({ validation: { isRequired: true, min: 0 } }),
    idempotencyKey: (0, import_fields89.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    reason: (0, import_fields89.text)({ validation: { isRequired: true } }),
    actor: (0, import_fields89.relationship)({ ref: "User" }),
    treatmentSession: (0, import_fields89.relationship)({ ref: "TreatmentSession" }),
    transactionLine: (0, import_fields89.relationship)({ ref: "MedSpaTransactionLineItem" }),
    metadata: (0, import_fields89.json)(),
    ...trackingFields
  }
});

// features/keystone/models/StorefrontSetting.ts
var import_core89 = require("@keystone-6/core");
var import_fields90 = require("@keystone-6/core/fields");

// features/keystone/workflowAuth.ts
var import_node_crypto2 = require("node:crypto");
function requireActorPractice(context, capability = isSignedIn, message = "Authorized practice access is required") {
  if (!context.session?.itemId || !capability({ session: context.session })) throw new Error(message);
  const id = practiceId(context.session);
  if (!id) throw new Error("The authenticated actor is not assigned to a practice");
  return { actorId: context.session.itemId, practiceId: id };
}
async function assertActiveActor(context) {
  const expectedPracticeId = practiceId(context.session);
  if (!context.session?.itemId || !expectedPracticeId) throw new Error("Authenticated practice access is unavailable");
  const actor = await context.sudo().query.User.findOne({ where: { id: context.session.itemId }, query: `id status practice { id } role { id practice { id } canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations }` });
  if (!actor || actor.status !== "active" || actor.practice?.id !== expectedPracticeId) throw new Error("Authenticated practice access is unavailable");
  if (actor.role && (actor.role.id !== context.session.data.role?.id || actor.role.practice?.id !== expectedPracticeId)) throw new Error("Authenticated role scope is unavailable");
  const sessionRole = context.session.data.role || {};
  for (const key of ["canManagePeople", "canManageRoles", "canAccessDashboard", "canManageOnboarding", "canManagePractice", "canSchedule", "canReadClients", "canManageClinical", "canManageSensitiveRecords", "canManageInventory", "canManageFinance", "canManageCommunications", "canViewReports", "canManageIntegrations"]) {
    if (sessionRole[key] === true && actor.role?.[key] !== true) throw new Error("Authenticated capability is no longer active");
  }
  return { actorId: actor.id, practiceId: expectedPracticeId, role: actor.role || {} };
}
async function assertProviderActor(context, providerId, actorId) {
  const provider = await assertPracticeRecord(context, "Provider", providerId, "id practice { id } user { id }");
  if (provider.user?.id !== actorId) throw new Error("The provider must match the authenticated actor");
  return provider;
}
async function assertPracticeRecord(context, listKey, recordId, query = "id practice { id }") {
  const expectedPracticeId = practiceId(context.session);
  if (!context.session?.itemId || !expectedPracticeId || !recordId) throw new Error("Record not found");
  await assertActiveActor(context);
  const api = context.sudo().query[listKey];
  if (!api) throw new Error("Record not found");
  const record = await api.findOne({ where: { id: recordId }, query });
  if (!record || record.practice?.id !== expectedPracticeId) throw new Error("Record not found");
  return record;
}
function canonicalize2(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize2);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).filter(([, child]) => child !== void 0).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, canonicalize2(child)])
  );
  return value;
}
function jsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("JSON evidence contains a non-finite number");
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === "object") {
    const normalized = {};
    for (const [key, child] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
      if (child !== void 0) normalized[key] = jsonValue(child);
    }
    return normalized;
  }
  throw new Error("Evidence payload is not JSON-compatible");
}
function bounded(value, maxBytes = 1e5) {
  const normalized = jsonValue(value ?? {});
  if (JSON.stringify(normalized).length > maxBytes) throw new Error("Evidence payload is too large");
  return normalized;
}
function evidenceHash(value) {
  return (0, import_node_crypto2.createHash)("sha256").update(JSON.stringify(canonicalize2(value))).digest("hex");
}
function validIdempotencyKey(value) {
  return typeof value === "string" && value.trim().length >= 12 && value.length <= 200;
}

// features/lib/sanitize-store-logo.ts
var ALLOWED_ELEMENTS = /* @__PURE__ */ new Set([
  "svg",
  "g",
  "path",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "title",
  "desc"
]);
var ALLOWED_ATTRIBUTES = /* @__PURE__ */ new Set([
  "xmlns",
  "fill",
  "fill-rule",
  "clip-rule",
  "height",
  "width",
  "viewbox",
  "d",
  "clip-path",
  "id",
  "x1",
  "x2",
  "y1",
  "y2",
  "gradientunits",
  "gradienttransform",
  "offset",
  "stop-color",
  "stop-opacity",
  "opacity",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "transform",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "points",
  "role",
  "aria-hidden",
  "aria-label",
  "preserveaspectratio"
]);
var ATTRIBUTE_PATTERN = /\s+([A-Za-z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g;
var TAG_PATTERN = /<\/?\s*([A-Za-z][\w:-]*)([^<>]*)>/g;
function sanitizeStoreLogoSvg(svg) {
  const source = svg.trim();
  if (!source.startsWith("<svg") || !source.endsWith("</svg>") || source.length > 1e5) return "";
  if (/<!|<\?|\b(?:javascript|data|vbscript):|\bon[a-z]+\s*=|\b(?:href|src|style)\s*=/i.test(source)) return "";
  let tagCount = 0;
  let match;
  TAG_PATTERN.lastIndex = 0;
  while (match = TAG_PATTERN.exec(source)) {
    tagCount += 1;
    const element = match[1].toLowerCase();
    if (!ALLOWED_ELEMENTS.has(element)) return "";
    if (match[0].startsWith("</")) continue;
    const attributes = match[2];
    let consumed = "";
    ATTRIBUTE_PATTERN.lastIndex = 0;
    let attributeMatch;
    while (attributeMatch = ATTRIBUTE_PATTERN.exec(attributes)) {
      consumed += attributeMatch[0];
      const attribute = attributeMatch[1].toLowerCase();
      const value = attributeMatch[2].slice(1, -1);
      if (!ALLOWED_ATTRIBUTES.has(attribute)) return "";
      if (attribute === "id" && !/^[A-Za-z_][\w:.-]*$/.test(value)) return "";
      if (/url\(/i.test(value) && !/^url\(#[A-Za-z_][\w:.-]*\)$/.test(value)) return "";
    }
    const remainder = attributes.replace(consumed, "").replace(/\//g, "").trim();
    if (remainder) return "";
  }
  TAG_PATTERN.lastIndex = 0;
  if (tagCount === 0 || source.replace(TAG_PATTERN, "").trim()) return "";
  return source;
}

// features/platform/storefront-settings/lib/icon-registry.ts
var LOGO_ICONS = [
  {
    id: "3portals",
    name: "3Portals",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill-rule="evenodd"><path d="m34.5868 8.40061-9.6868-2.59556c-.6687-.17919-1.2108.23679-1.2108.92911v10.02854c0 .6923.5421 1.3988 1.2108 1.578l9.6868 2.5955c.6687.1792 1.2109-.2368 1.2109-.9291v-10.02848c0-.69232-.5422-1.39882-1.2109-1.57801zm-9.6868-6.35625c-2.6749-.71674-4.8434.94718-4.8434 3.71647v10.02847c0 2.7693 2.1685 5.5953 4.8434 6.312l9.6868 2.5956c2.6749.7168 4.8434-.9472 4.8434-3.7165v-10.0284c0-2.76934-2.1685-5.59533-4.8434-6.31207z" fill="#8098f9"/><path d="m26.9812 16.5707-12.1085-3.2444c-.6687-.1792-1.2109.2368-1.2109.9291v12.5356c0 .6923.5422 1.3988 1.2109 1.578l12.1085 3.2445c.6687.1792 1.2108-.2368 1.2108-.9291v-12.5356c0-.6924-.5421-1.3989-1.2108-1.5781zm-12.1085-7.0051c-2.6749-.71674-4.8434.9472-4.8434 3.7165v12.5356c0 2.7693 2.1685 5.5953 4.8434 6.312l12.1085 3.2445c2.6749.7167 4.8433-.9472 4.8433-3.7165v-12.5356c0-2.7693-2.1684-5.5953-4.8433-6.312z" fill="#6172f3"/><path d="m19.3736 24.7409-14.53021-3.8934c-.66873-.1792-1.21085.2368-1.21085.9291v15.0428c0 .6923.54212 1.3988 1.21085 1.578l14.53021 3.8933c.6687.1792 1.2108-.2368 1.2108-.9291v-15.0427c0-.6923-.5421-1.3988-1.2108-1.578zm-14.53021-7.6541c-2.67493-.7167-4.84339.9472-4.84339 3.7165v15.0427c0 2.7693 2.16846 5.5953 4.84339 6.3121l14.53021 3.8933c2.6749.7168 4.8433-.9472 4.8433-3.7164v-15.0428c0-2.7693-2.1684-5.5953-4.8433-6.312z" fill="#444ce7"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#fff" fill-rule="evenodd"><path d="m34.5868 8.40061-9.6868-2.59556c-.6687-.17919-1.2108.23679-1.2108.92911v10.02854c0 .6923.5421 1.3988 1.2108 1.578l9.6868 2.5955c.6687.1792 1.2109-.2368 1.2109-.9291v-10.02848c0-.69232-.5422-1.39882-1.2109-1.57801zm-9.6868-6.35625c-2.6749-.71674-4.8434.94718-4.8434 3.71647v10.02847c0 2.7693 2.1685 5.5953 4.8434 6.312l9.6868 2.5956c2.6749.7168 4.8434-.9472 4.8434-3.7165v-10.0284c0-2.76934-2.1685-5.59533-4.8434-6.31207z" opacity=".5"/><path d="m26.9812 16.5707-12.1085-3.2444c-.6687-.1792-1.2109.2368-1.2109.9291v12.5356c0 .6923.5422 1.3988 1.2109 1.578l12.1085 3.2445c.6687.1792 1.2108-.2368 1.2108-.9291v-12.5356c0-.6924-.5421-1.3989-1.2108-1.5781zm-12.1085-7.0051c-2.6749-.71674-4.8434.9472-4.8434 3.7165v12.5356c0 2.7693 2.1685 5.5953 4.8434 6.312l12.1085 3.2445c2.6749.7167 4.8433-.9472 4.8433-3.7165v-12.5356c0-2.7693-2.1684-5.5953-4.8433-6.312z" opacity=".7"/><path d="m19.3736 24.7409-14.53021-3.8934c-.66873-.1792-1.21085.2368-1.21085.9291v15.0428c0 .6923.54212 1.3988 1.21085 1.578l14.53021 3.8933c.6687.1792 1.2108-.2368 1.2108-.9291v-15.0427c0-.6923-.5421-1.3988-1.2108-1.578zm-14.53021-7.6541c-2.67493-.7167-4.84339.9472-4.84339 3.7165v15.0427c0 2.7693 2.16846 5.5953 4.84339 6.3121l14.53021 3.8933c2.6749.7168 4.8433-.9472 4.8433-3.7164v-15.0428c0-2.7693-2.1684-5.5953-4.8433-6.312z"/></g></svg>`
  },
  {
    id: "45-degrees",
    name: "45 Degrees",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 24 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 15.8981h17.3455l-17.061314 17.0613 2.756374 2.7564 17.06134-17.0613v17.3455h.1104l3.7877-3.7877v-15.9638l-4.2485-4.2485h-15.96596l-3.78553995 3.7855z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 24 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 15.8981h17.3455l-17.061314 17.0613 2.756374 2.7564 17.06134-17.0613v17.3455h.1104l3.7877-3.7877v-15.9638l-4.2485-4.2485h-15.96596l-3.78553995 3.7855z" fill="#155eef"/></svg>`
  },
  {
    id: "acme-corp",
    name: "Acme Corp",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m0 24c15.2548 0 24-8.7452 24-24 0 15.2548 8.7452 24 24 24-15.2548 0-24 8.7452-24 24 0-15.2548-8.7452-24-24-24z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m0 24c15.2548 0 24-8.7452 24-24 0 15.2548 8.7452 24 24 24-15.2548 0-24 8.7452-24 24 0-15.2548-8.7452-24-24-24z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "alphawave",
    name: "AlphaWave",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 47 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m24.9706 7.03309c-3.1242-3.1242-8.1896-3.1242-11.3137 0l-11.31375 11.31371c-3.124199 3.1242-3.124199 8.1895 0 11.3137l11.31375 11.3137c3.1241 3.1242 8.1895 3.1242 11.3137 0l5.3982-5.3983c-4.4939-1.7337-7.682-6.0944-7.682-11.1997 0-5.3087 3.4472-9.8123 8.2254-11.3943-.0935-.0982-.1884-.1955-.2848-.292z" fill="#155eef"/><path d="m30.3691 35.5798c1.3398.5168 2.7955.8001 4.3174.8001 6.6274 0 12-5.3726 12-12s-5.3726-12-12-12c-1.3185 0-2.5873.2126-3.774.6055 5.9623 6.2681 5.8675 16.1836-.2846 22.3356z" fill="#155eef" opacity=".7"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 47 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m24.9706 7.03309c-3.1242-3.1242-8.1896-3.1242-11.3137 0l-11.31375 11.31371c-3.124199 3.1242-3.124199 8.1895 0 11.3137l11.31375 11.3137c3.1241 3.1242 8.1895 3.1242 11.3137 0l5.3982-5.3983c-4.4939-1.7337-7.682-6.0944-7.682-11.1997 0-5.3087 3.4472-9.8123 8.2254-11.3943-.0935-.0982-.1884-.1955-.2848-.292z" fill="#155eef"/><path d="m30.3691 35.5798c1.3398.5168 2.7955.8001 4.3174.8001 6.6274 0 12-5.3726 12-12s-5.3726-12-12-12c-1.3185 0-2.5873.2126-3.774.6055 5.9623 6.2681 5.8675 16.1836-.2846 22.3356z" fill="#155eef" opacity=".7"/></svg>`
  },
  {
    id: "alt-shift",
    name: "Alt+Shift",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m23.4538 34.7189c-3.1818-1.1818-6.4544-1.3636-9.4544-.5455-2.0909.5455-4.09082 1.6364-5.90897 3l-1.27273 1.0909-.36362.3636.81816.7273c.09091 0 .09092.0909.18183.1818.18181.1818.36364.2727.63636.4545l.54542.3636.54545-.4545c.09091-.0909.27273-.2727.45454-.3636 1.63636-1.3636 3.45446-2.2727 5.36356-2.7272 2.4545-.6364 5.0908-.5455 7.7271.4545 2.1818.8182 6.6363 1.8181 11.9998-.4545l.1818-.091.2728-.2727c0-.0909.0909-.0909.1818-.1818.4545-.5454.9091-1.0909 1.2727-1.7272l1.8181-2.8182-2.909 1.6363c-4.2727 2.3636-8.1817 2.8182-12.0907 1.3637z"/><path d="m10.9998 24.9011c2.4545-.6363 5.0908-.5454 7.7272.4546 2.909 1.0909 10.3634 2.6363 18.7269-4.909l1.8182-1.8182-.1819-.4545c-.0909-.3636-.2727-.8182-.4545-1.2727l-.4545-1.2727-.9091.909c-.0909.1819-.2727.2728-.4546.4546-3.9999 4.0908-10.1816 8.2726-17.2724 5.7272-3.1817-1.1818-6.4544-1.3637-9.4544-.5455-2.909.8182-5.45442 2.3636-7.81801 4.5454v-.0909l-1.363614 1.4545c0 .0909-.090891.0909-.181798.1818l-.27274.2727.090913.3637c.090908.4545.272717.909.363625 1.3636l.545454 1.4545.90907-1.1818c.09091-.1818.27272-.2727.36363-.4545 1.90905-1.7273 4.54538-4.1818 8.27257-5.1818z"/><path d="m2.1818 23.2646c2.09088-2.1818 4.45445-3.5454 6.99987-4.2727 2.45453-.6363 5.09083-.5454 7.72713.4546 8.1817 2.9999 15.2725-1.9091 18.3633-4.5454l1.1818-1.1818.4546-.3636-.3637-.5455c-.2727-.2727-.4545-.6363-.7272-1l-.5455-.7272-.6363.6363c-.0909.0909-.2727.2727-.3637.3637-3.8181 3.6363-9.7271 7.3635-16.4542 4.8181-3.1818-1.1818-6.4544-1.3637-9.4544-.5455-1.90906.5455-3.72721 1.4545-5.54536 2.6363l-1.909065 1.5455c-.181815.1818-.272722.2727-.454537.4545l-.181799.1818v.2727c-.090907.6364-.090918 1.2727-.1818259 1.8182l-.0909131 2.2727 1.54544-1.6364c.18181-.1818.36364-.4545.63636-.6363z"/><path d="m26.0908 40.9007c-.2727-.0909-.4545-.1819-.7272-.2728-3.1818-1.1818-6.4545-1.3636-9.4545-.5454-.6363.1818-1.2726.3636-1.909.6364l-2.1818.9999-.5454.2728 1.8181.6363c.5455.1818 1.0909.3637 1.6364.5455l.2727.0909.2727-.0909c.2727-.0909.5455-.2728.8182-.2728.1818 0 .3636-.0909.5454-.1818 2.1818-.5454 4.5454-.5454 7.0908.2727.2727.091.4546.1819.7273.2728l.4545.1818.2727-.0909c.6364-.1818 1.3636-.3636 1.9091-.6364l2.5454-.909-2.6363-.6364c-.2727-.0909-.6364-.1818-.9091-.2727z"/><path d="m40 22.0829-1.3636 1.3636c-.1818.1818-.3636.3636-.5454.5454-3.7272 3.5454-9.7271 7.3635-16.4543 4.8181-3.1818-1.1818-6.4544-1.3636-9.4544-.5454-2.81811.8182-5.36354 2.2727-7.63623 4.4545l-1.18179 1.2727-.36362.4545.36362.5454c.27273.3637.45455.6364.63637 1l.54542.8182.63636-.8182c.09091-.0909.27272-.2727.36363-.3636 2.18178-2.3636 4.54534-3.8181 7.27264-4.5454 2.4545-.6364 5.0908-.5454 7.7271.4545 2.2727.8182 4.6363 1.0909 6.9999.8182 4.1817-.4545 8.3635-2.8181 11.4543-5.4544.1819-.1818.3636-.2727.5455-.4546l.2727-.2727v-.2727c0-.5455.0909-1.1818.0909-1.7273z"/><path d="m5.45373 13.7196c.54545-.2728 1.18182-.4546 1.72726-.6364 2.45451-.6364 5.09081-.5455 7.72711.4545 1.7273.6364 3.4545.9091 5.3636.9091 3.8181 0 7.6362-1.3636 11.1816-3.9999l1.8181-1.45455-.8181-.63636c-.2727-.27273-.6364-.54544-1-.72725l-.5455-.36363-.4545.36363c-.1818.09091-.2727.27272-.4545.36362-4.8181 3.63634-9.6362 4.63634-14.1816 2.90904-3.2727-1.18178-6.54535-1.45451-9.81802-.4545-.27272.0909-.54544.1818-.90907.2727l-.1818.0909-.27274.2727c0 .0909-.09089.0909-.1818.1818-.36363.5455-.81818 1-1.18181 1.5455l-1.72724 2.6363 2.81814-1.4545c.45453 0 .81815-.1818 1.09087-.2727z"/><path d="m12.9089 7.53769.2727.09091c1.1818.45454 3 .90907 5.2726.90907 2.3636 0 4.6363-.54545 6.909-1.45452l2.8181-1.36361-1.909-.63634c-.5454-.18182-1.0909-.36363-1.7273-.45454h-.2727l-.2727.09089c-.2727.0909-.5455.27274-.8182.36365-2.7272.99998-5.4544 1.1818-8.0907.45454-.2728-.09091-.5455-.18183-.8182-.27274l-.2727-.09091-.2728.09091c-.5454.18181-1.0908.36364-1.6363.63636l-2.09087.90908 2.18177.63633c.1818-.0909.4546.00001.7273.09092z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m23.4538 34.7189c-3.1818-1.1818-6.4544-1.3636-9.4544-.5455-2.0909.5455-4.09082 1.6364-5.90897 3l-1.27273 1.0909-.36362.3636.81816.7273c.09091 0 .09092.0909.18183.1818.18181.1818.36364.2727.63636.4545l.54542.3636.54545-.4545c.09091-.0909.27273-.2727.45454-.3636 1.63636-1.3636 3.45446-2.2727 5.36356-2.7272 2.4545-.6364 5.0908-.5455 7.7271.4545 2.1818.8182 6.6363 1.8181 11.9998-.4545l.1818-.091.2728-.2727c0-.0909.0909-.0909.1818-.1818.4545-.5454.9091-1.0909 1.2727-1.7272l1.8181-2.8182-2.909 1.6363c-4.2727 2.3636-8.1817 2.8182-12.0907 1.3637z"/><path d="m10.9998 24.9011c2.4545-.6363 5.0908-.5454 7.7272.4546 2.909 1.0909 10.3634 2.6363 18.7269-4.909l1.8182-1.8182-.1819-.4545c-.0909-.3636-.2727-.8182-.4545-1.2727l-.4545-1.2727-.9091.909c-.0909.1819-.2727.2728-.4546.4546-3.9999 4.0908-10.1816 8.2726-17.2724 5.7272-3.1817-1.1818-6.4544-1.3637-9.4544-.5455-2.909.8182-5.45442 2.3636-7.81801 4.5454v-.0909l-1.363614 1.4545c0 .0909-.090891.0909-.181798.1818l-.27274.2727.090913.3637c.090908.4545.272717.909.363625 1.3636l.545454 1.4545.90907-1.1818c.09091-.1818.27272-.2727.36363-.4545 1.90905-1.7273 4.54538-4.1818 8.27257-5.1818z"/><path d="m2.1818 23.2646c2.09088-2.1818 4.45445-3.5454 6.99987-4.2727 2.45453-.6363 5.09083-.5454 7.72713.4546 8.1817 2.9999 15.2725-1.9091 18.3633-4.5454l1.1818-1.1818.4546-.3636-.3637-.5455c-.2727-.2727-.4545-.6363-.7272-1l-.5455-.7272-.6363.6363c-.0909.0909-.2727.2727-.3637.3637-3.8181 3.6363-9.7271 7.3635-16.4542 4.8181-3.1818-1.1818-6.4544-1.3637-9.4544-.5455-1.90906.5455-3.72721 1.4545-5.54536 2.6363l-1.909065 1.5455c-.181815.1818-.272722.2727-.454537.4545l-.181799.1818v.2727c-.090907.6364-.090918 1.2727-.1818259 1.8182l-.0909131 2.2727 1.54544-1.6364c.18181-.1818.36364-.4545.63636-.6363z"/><path d="m26.0908 40.9007c-.2727-.0909-.4545-.1819-.7272-.2728-3.1818-1.1818-6.4545-1.3636-9.4545-.5454-.6363.1818-1.2726.3636-1.909.6364l-2.1818.9999-.5454.2728 1.8181.6363c.5455.1818 1.0909.3637 1.6364.5455l.2727.0909.2727-.0909c.2727-.0909.5455-.2728.8182-.2728.1818 0 .3636-.0909.5454-.1818 2.1818-.5454 4.5454-.5454 7.0908.2727.2727.091.4546.1819.7273.2728l.4545.1818.2727-.0909c.6364-.1818 1.3636-.3636 1.9091-.6364l2.5454-.909-2.6363-.6364c-.2727-.0909-.6364-.1818-.9091-.2727z"/><path d="m40 22.0829-1.3636 1.3636c-.1818.1818-.3636.3636-.5454.5454-3.7272 3.5454-9.7271 7.3635-16.4543 4.8181-3.1818-1.1818-6.4544-1.3636-9.4544-.5454-2.81811.8182-5.36354 2.2727-7.63623 4.4545l-1.18179 1.2727-.36362.4545.36362.5454c.27273.3637.45455.6364.63637 1l.54542.8182.63636-.8182c.09091-.0909.27272-.2727.36363-.3636 2.18178-2.3636 4.54534-3.8181 7.27264-4.5454 2.4545-.6364 5.0908-.5454 7.7271.4545 2.2727.8182 4.6363 1.0909 6.9999.8182 4.1817-.4545 8.3635-2.8181 11.4543-5.4544.1819-.1818.3636-.2727.5455-.4546l.2727-.2727v-.2727c0-.5455.0909-1.1818.0909-1.7273z"/><path d="m5.45373 13.7196c.54545-.2728 1.18182-.4546 1.72726-.6364 2.45451-.6364 5.09081-.5455 7.72711.4545 1.7273.6364 3.4545.9091 5.3636.9091 3.8181 0 7.6362-1.3636 11.1816-3.9999l1.8181-1.45455-.8181-.63636c-.2728-.27273-.6364-.54544-1-.72725l-.5455-.36363-.4545.36363c-.1818.09091-.2727.27272-.4545.36362-4.8181 3.63634-9.6362 4.63634-14.1816 2.90904-3.2727-1.18178-6.54535-1.45451-9.81802-.4545-.27272.0909-.54544.1818-.90907.2727l-.1818.0909-.27274.2727c0 .0909-.09089.0909-.1818.1818-.36363.5455-.81818 1-1.18181 1.5455l-1.72724 2.6363 2.81814-1.4545c.45453 0 .81815-.1818 1.09087-.2727z"/><path d="m12.9089 7.53769.2727.09091c1.1818.45454 3 .90907 5.2726.90907 2.3636 0 4.6363-.54545 6.909-1.45452l2.8181-1.36361-1.909-.63634c-.5454-.18182-1.0909-.36363-1.7273-.45454h-.2727l-.2727.09089c-.2727.0909-.5455.27274-.8182.36365-2.7272.99998-5.4544 1.1818-8.0907.45454-.2728-.09091-.5455-.18183-.8182-.27274l-.2727-.09091-.2728.09091c-.5454.18181-1.0908.36364-1.6363.63636l-2.09087.90908 2.18177.63633c.1818-.0909.4546.00001.7273.09092z"/></g></svg>`
  },
  {
    id: "biosynthesis",
    name: "Biosynthesis",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill-rule="evenodd"><path d="m4.29111 28.6025c.90712.9019.9071 2.3641-.00003 3.266l-.04646.0462c-.90713.9019-2.37788.9018-3.284994-.0001-.9071177-.9019-.9071038-2.3641.000031-3.266l.046453-.0462c.90714-.9019 2.37788-.9018 3.285.0001z" fill="#a4bcfd"/><path d="m15.2112 29.298c.9055.9035.9028 2.3658-.006 3.266l-6.43424 6.3741c-.90876.9002-2.3795.8976-3.28499-.0059-.90548-.9035-.90282-2.3658.00594-3.266l6.43429-6.3741c.9088-.9002 2.3795-.8976 3.285.0059z" fill="#6172f3"/><path d="m23.9431 40.2706c.7116-1.0613 2.1538-1.348 3.2212-.6405l.1394.0923c1.0674.7075 1.3558 2.1414.6442 3.2026-.7116 1.0613-2.1538 1.3481-3.2212.6406l-.1394-.0924c-1.0674-.7075-1.3558-2.1414-.6442-3.2026z" fill="#a4bcfd"/><path d="m39.2728 28.4638c.9072.9019.9072 2.3641 0 3.266l-3.159 3.1408c-.9072.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l3.1591-3.1408c.9071-.9019 2.3778-.9019 3.2849 0z" fill="#6172f3"/><g fill="#444ce7"><path d="m39.3197 16.8473c.9071.9019.9071 2.3642 0 3.266l-23.3446 23.2098c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l23.3446-23.2098c.9071-.9019 2.3778-.9019 3.285 0z"/><path d="m34.905 9.71133c.9072.90187.9072 2.36417 0 3.26607l-13.426 13.3485c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3642 0-3.2661l13.4261-13.34847c.9071-.90189 2.3778-.90189 3.2849 0z"/><path d="m27.8187 5.18362c.9077.90128.9087 2.36353.0022 3.26603l-17.2588 17.18215c-.90647.9025-2.37721.9035-3.28495.0022-.90773-.9013-.90872-2.3635-.00221-3.266l17.25876-17.18218c.9065-.9025 2.3772-.90348 3.285-.0022z"/></g><path d="m10.7276 10.6841c.9056.9035.9031 2.3657-.0056 3.266l-6.75949 6.6974c-.90869.9003-2.37943.8978-3.28499-.0056-.905563-.9035-.903032-2.3657.005654-3.2661l6.759476-6.6973c.90868-.90034 2.37942-.89783 3.28495.0056z" fill="#6172f3"/><path d="m14.8678 4.00024c1.2828 0 2.3228 1.03397 2.3228 2.30944v.23094c0 1.27546-1.04 2.30943-2.3228 2.30943-1.2829 0-2.3229-1.03397-2.3229-2.30943v-.23094c0-1.27547 1.04-2.30944 2.3229-2.30944z" fill="#a4bcfd"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#fff" fill-rule="evenodd"><path d="m4.29111 28.6025c.90712.9019.9071 2.3641-.00003 3.266l-.04646.0462c-.90713.9019-2.37788.9018-3.284994-.0001-.9071177-.9019-.9071038-2.3641.000031-3.266l.046453-.0462c.90714-.9019 2.37788-.9018 3.285.0001z" opacity=".5"/><path d="m15.2112 29.298c.9055.9035.9028 2.3658-.006 3.266l-6.43424 6.3741c-.90876.9002-2.3795.8976-3.28499-.0059-.90548-.9035-.90282-2.3658.00594-3.266l6.43429-6.3741c.9088-.9002 2.3795-.8976 3.285.0059z" opacity=".7"/><path d="m23.9431 40.2706c.7116-1.0613 2.1538-1.348 3.2212-.6405l.1394.0923c1.0674.7075 1.3558 2.1414.6442 3.2026-.7116 1.0613-2.1538 1.3481-3.2212.6406l-.1394-.0924c-1.0674-.7075-1.3558-2.1414-.6442-3.2026z" opacity=".5"/><path d="m39.2728 28.4638c.9072.9019.9072 2.3641 0 3.266l-3.159 3.1408c-.9072.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l3.1591-3.1408c.9071-.9019 2.3778-.9019 3.2849 0z" opacity=".7"/><path d="m39.3197 16.8473c.9071.9019.9071 2.3642 0 3.266l-23.3446 23.2098c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l23.3446-23.2098c.9071-.9019 2.3778-.9019 3.285 0z"/><path d="m34.905 9.71133c.9072.90187.9072 2.36417 0 3.26607l-13.426 13.3485c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3642 0-3.2661l13.4261-13.34847c.9071-.90189 2.3778-.90189 3.2849 0z"/><path d="m27.8187 5.18362c.9077.90128.9087 2.36353.0022 3.26603l-17.2588 17.18215c-.90647.9025-2.37721.9035-3.28495.0022-.90773-.9013-.90872-2.3635-.00221-3.266l17.25876-17.18218c.9065-.9025 2.3772-.90348 3.285-.0022z"/><path d="m10.7276 10.6841c.9056.9035.9031 2.3657-.0056 3.266l-6.75949 6.6974c-.90869.9003-2.37943.8978-3.28499-.0056-.905563-.9035-.903032-2.3657.005654-3.2661l6.759476-6.6973c.90868-.90034 2.37942-.89783 3.28495.0056z" opacity=".7"/><path d="m14.8678 4.00024c1.2828 0 2.3228 1.03397 2.3228 2.30944v.23094c0 1.27546-1.04 2.30943-2.3228 2.30943-1.2829 0-2.3229-1.03397-2.3229-2.30943v-.23094c0-1.27547 1.04-2.30944 2.3229-2.30944z" opacity=".5"/></g></svg>`
  },
  {
    id: "boltshift",
    name: "Boltshift",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 44c11.0457 0 20-8.9543 20-20s-8.9543-20-20-20c-11.04572 0-20 8.9543-20 20s8.95428 20 20 20zm6.2393-30.6832c.3037-1.0787-.7432-1.7167-1.6993-1.0355l-13.3469 9.5083c-1.0369.7387-.8738 2.2104.245 2.2104h3.5146v-.0272h6.8498l-5.5813 1.9693-2.4605 8.7411c-.3037 1.0788.7431 1.7167 1.6993 1.0355l13.3469-9.5082c1.0369-.7387.8737-2.2105-.245-2.2105h-5.3298z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 44c11.0457 0 20-8.9543 20-20s-8.9543-20-20-20c-11.04572 0-20 8.9543-20 20s8.95428 20 20 20zm6.2393-30.6832c.3037-1.0787-.7432-1.7167-1.6993-1.0355l-13.3469 9.5083c-1.0369.7387-.8738 2.2104.245 2.2104h3.5146v-.0272h6.8498l-5.5813 1.9693-2.4605 8.7411c-.3037 1.0788.7431 1.7167 1.6993 1.0355l13.3469-9.5082c1.0369-.7387.8737-2.2105-.245-2.2105h-5.3298z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "buildingblocks",
    name: "BuildingBlocks",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 37 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.8841 4.30945-6.8842 3.97574 6.8891 3.97661 6.8862-3.97575zm8.8919 7.44025-6.887 3.9762-.0007 7.9532 6.8877-3.9771zm2 11.4164-6.8879 3.9772 6.8889 3.9765 6.8871-3.9763zm8.8879 7.4416-6.8868 3.9761v7.9522l6.8868-3.9761zm-10.8868 11.9287v-7.9525l-6.8891-3.9766v7.9525zm-10.8888-18.8569-6.8883-3.9775v-7.9526l6.889 3.9765zm-.0003 4.6187-9.38814-5.4209c-.928127-.5359-1.49986-1.5262-1.49986-2.598v-11.99368c0-.71444.381106-1.37463.999789-1.73193l10.383811-5.996798c.9281-.5359626 2.0716-.5361538 2.9998-.000505l10.3922 5.996973c.619.3572 1.0004 1.01758 1.0004 1.73226v11.41638l9.888 5.7096c.6188.3573.9999 1.0175.9999 1.732v11.9937c0 1.0718-.5718 2.0621-1.5 2.598l-10.3868 5.9969c-.6187.3572-1.381.3572-1.9998.0001l-10.3891-5.9969c-.9283-.5358-1.5002-1.5263-1.5002-2.5982z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 37 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.8841 4.30945-6.8842 3.97574 6.8891 3.97661 6.8862-3.97575zm8.8919 7.44025-6.887 3.9762-.0007 7.9532 6.8877-3.9771zm2 11.4164-6.8879 3.9772 6.8889 3.9765 6.8871-3.9763zm8.8879 7.4416-6.8868 3.9761v7.9522l6.8868-3.9761zm-10.8868 11.9287v-7.9525l-6.8891-3.9766v7.9525zm-10.8888-18.8569-6.8883-3.9775v-7.9526l6.889 3.9765zm-.0003 4.6187-9.38814-5.4209c-.928127-.5359-1.49986-1.5262-1.49986-2.598v-11.99368c0-.71444.381106-1.37463.999789-1.73193l10.383811-5.996798c.9281-.5359626 2.0716-.5361538 2.9998-.000505l10.3922 5.996973c.619.3572 1.0004 1.01758 1.0004 1.73226v11.41638l9.888 5.7096c.6188.3573.9999 1.0175.9999 1.732v11.9937c0 1.0718-.5718 2.0621-1.5 2.598l-10.3868 5.9969c-.6187.3572-1.381.3572-1.9998.0001l-10.3891-5.9969c-.9283-.5358-1.5002-1.5263-1.5002-2.5982z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "calescence",
    name: "Calescence",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#1570ef" fill-rule="evenodd"><path d="m35.3721 14v8.0492h-9.9698v-2.2927z"/><path d="m35.3699 14.0001-9.9698 5.7565-7.3513-4.2436v-11.513z" opacity=".9"/><path d="m18.0512 4v11.513l-7.349 4.2436-9.969778-5.7565z" opacity=".8"/><path d="m10.7002 19.7565v8.4868l-9.969731 5.756v-19.9993z" opacity=".7"/><path d="m18.0492 32.4871v11.5129l-17.318731-10.0006 9.969731-5.756z" opacity=".6"/><path d="m35.3699 33.9994-17.3211 10.0006v-11.5129l7.3513-4.2437z" opacity=".5"/><path d="m35.3721 25.9507v8.0487l-9.9698-5.756v-2.2927z" opacity=".4"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#fff" fill-rule="evenodd"><path d="m35.3721 14v8.0492h-9.9698v-2.2927z"/><path d="m35.3699 14.0001-9.9698 5.7565-7.3513-4.2436v-11.513z" opacity=".9"/><path d="m18.0512 4v11.513l-7.349 4.2436-9.969778-5.7565z" opacity=".8"/><path d="m10.7002 19.7565v8.4868l-9.969731 5.756v-19.9993z" opacity=".7"/><path d="m18.0492 32.4871v11.5129l-17.318731-10.0006 9.969731-5.756z" opacity=".6"/><path d="m35.3699 33.9994-17.3211 10.0006v-11.5129l7.3513-4.2437z" opacity=".5"/><path d="m35.3721 25.9507v8.0487l-9.9698-5.756v-2.2927z" opacity=".4"/></g></svg>`
  },
  {
    id: "capsule",
    name: "Capsule",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="18" fill="#1570ef" r="14"/><circle cx="26" cy="30" fill="#53b1fd" r="14"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><circle cx="14" cy="18" opacity=".7" r="14"/><circle cx="26" cy="30" opacity=".7" r="14"/></g></svg>`
  },
  {
    id: "constellation",
    name: "Constellation",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m16 8 5.0912 10.9088 10.9088 5.0912-10.9088 5.0912-5.0912 10.9088-5.0912-10.9088-10.9088-5.0912 10.9088-5.0912z"/><path d="m20.0469 31.3286 6.3539-1.0932 3.6 9.7646 3.6-9.7646 10.2565 1.7646-6.6564-8 6.6564-8-10.2565 1.7646-3.6-9.7646-3.6 9.7646-6.3539-1.0932 1.0442 2.2374 10.9088 5.0912-10.9088 5.0912z" opacity=".5"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m16 8 5.0912 10.9088 10.9088 5.0912-10.9088 5.0912-5.0912 10.9088-5.0912-10.9088-10.9088-5.0912 10.9088-5.0912z"/><path d="m20.0469 31.3286 6.3539-1.0932 3.6 9.7646 3.6-9.7646 10.2565 1.7646-6.6564-8 6.6564-8-10.2565 1.7646-3.6-9.7646-3.6 9.7646-6.3539-1.0932 1.0442 2.2374 10.9088 5.0912-10.9088 5.0912z" opacity=".5"/></g></svg>`
  },
  {
    id: "codecraft",
    name: "Codecraft",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 9c0-2.76142 2.23858-5 5-5h10c2.7614 0 5 2.23858 5 5v9.8192c.0002.06.0003.1203.0003.1808 0 2.7575 2.2322 4.9936 4.9881 5h.0116 10c2.7614 0 5 2.2386 5 5v10c0 2.7614-2.2386 5-5 5h-10c-2.7614 0-5-2.2386-5-5v-10c0-.0139.0001-.0277.0002-.0416-.0224-2.7422-2.2523-4.9584-4.9999-4.9584-.0129 0-.0258 0-.0387 0h-9.9616c-2.76142 0-5-2.2386-5-5z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 9c0-2.76142 2.23858-5 5-5h10c2.7614 0 5 2.23858 5 5v9.8192c.0002.06.0003.1203.0003.1808 0 2.7575 2.2322 4.9936 4.9881 5h.0116 10c2.7614 0 5 2.2386 5 5v10c0 2.7614-2.2386 5-5 5h-10c-2.7614 0-5-2.2386-5-5v-10c0-.0139.0001-.0277.0002-.0416-.0224-2.7422-2.2523-4.9584-4.9999-4.9584-.0129 0-.0258 0-.0387 0h-9.9616c-2.76142 0-5-2.2386-5-5z" fill="#155eef"/></svg>`
  },
  {
    id: "command-r",
    name: "Command+R",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m18.6667 30.6667c7.3638 0 13.3333-5.9696 13.3333-13.3334 0-7.36376-5.9695-13.3333-13.3333-13.3333h-18.6667v26.6667z" fill="#155eef"/><path d="m0 4 32 40h-21.3333l-10.6667-13.3333z" fill="#2e90fa"/><path d="m21.1488 30.436c-.8042.1515-1.6339.2307-2.4821.2307h-18.6667v-26.6667z" fill="#53b1fd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m18.6667 30.6667c7.3638 0 13.3333-5.9696 13.3333-13.3334 0-7.36376-5.9695-13.3333-13.3333-13.3333h-18.6667v26.6667z" opacity=".7"/><path d="m0 4 32 40h-21.3333l-10.6667-13.3333z" opacity=".7"/><path d="m21.1488 30.436c-.8042.1515-1.6339.2307-2.4821.2307h-18.6667v-26.6667z" opacity=".7"/></g></svg>`
  },
  {
    id: "contrast-ai",
    name: "ContrastAI",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 4c11.0457 0 20 8.9543 20 20s-8.9543 20-20 20-20-8.9543-20-20 8.9543-20 20-20zm15 20c0 8.2843-6.7157 15-15 15v-30c8.2843 0 15 6.7157 15 15z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 4c11.0457 0 20 8.9543 20 20s-8.9543 20-20 20-20-8.9543-20-20 8.9543-20 20-20zm15 20c0 8.2843-6.7157 15-15 15v-30c8.2843 0 15 6.7157 15 15z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "convergence",
    name: "Convergence",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m22.1017 20.8596 9.8995-9.8994-2.1213-2.12137-7.3389 7.33887v-13.1777h-3v13.1777l-7.3388-7.33887-2.1213 2.12137 9.8995 9.8994 1.0606 1.0607zm2.1207 2.1214 9.8995-9.8995 2.1213 2.1213-7.3388 7.3388h13.0956v3h-13.0956l7.3388 7.3389-2.1213 2.1213-9.8995-9.8995-1.0607-1.0607zm-16.26224 12.0208 9.89944-9.8995 1.0607-1.0607-1.0607-1.0606-9.89944-9.8995-2.12133 2.1213 7.33887 7.3388h-13.17574688v3h13.17574688l-7.33887 7.3389zm12.02024-7.7782-9.8995 9.8995 2.1213 2.1213 7.3388-7.3388v13.0944h3v-13.0944l7.3389 7.3388 2.1213-2.1213-9.8995-9.8995-1.0607-1.0607z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m22.1017 20.8596 9.8995-9.8994-2.1213-2.12137-7.3389 7.33887v-13.1777h-3v13.1777l-7.3388-7.33887-2.1213 2.12137 9.8995 9.8994 1.0606 1.0607zm2.1207 2.1214 9.8995-9.8995 2.1213 2.1213-7.3388 7.3388h13.0956v3h-13.0956l7.3388 7.3389-2.1213 2.1213-9.8995-9.8995-1.0607-1.0607zm-16.26224 12.0208 9.89944-9.8995 1.0607-1.0607-1.0607-1.0606-9.89944-9.8995-2.12133 2.1213 7.33887 7.3388h-13.17574688v3h13.17574688l-7.33887 7.3389zm12.02024-7.7782-9.8995 9.8995 2.1213 2.1213 7.3388-7.3388v13.0944h3v-13.0944l7.3389 7.3388 2.1213-2.1213-9.8995-9.8995-1.0607-1.0607z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "core-os",
    name: "CoreOS",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m15.2286 4.99951c-3.2154 0-6.18655 1.71539-7.79425 4.5l-5.7735 9.99999c-1.6076941 2.7846-1.607697 6.2154 0 9l5.7735 10c1.6077 2.7846 4.57885 4.5 7.79425 4.5h11.547c3.2154 0 6.1865-1.7154 7.7942-4.5l5.7735-10c1.6077-2.7846 1.6077-6.2154 0-9l-5.7735-9.99999c-1.6077-2.78461-4.5788-4.5-7.7942-4.5zm11.547 5.99999h-7.2169c-1.1547 0-1.8762 1.2499-1.298 2.2494 1.784 3.0838 3.5722 6.1653 5.3536 9.2506.5359.9282.5359 2.0718 0 3-1.7814 3.0854-3.5696 6.1668-5.3536 9.2506-.5782.9995.1433 2.2494 1.298 2.2494h7.2169c1.0718 0 2.0622-.5718 2.5981-1.5l5.7735-10c.5359-.9282.5359-2.0718 0-3l-5.7735-10c-.5359-.9282-1.5263-1.5-2.5981-1.5z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m15.2286 4.99951c-3.2154 0-6.18655 1.71539-7.79425 4.5l-5.7735 9.99999c-1.6076941 2.7846-1.607697 6.2154 0 9l5.7735 10c1.6077 2.7846 4.57885 4.5 7.79425 4.5h11.547c3.2154 0 6.1865-1.7154 7.7942-4.5l5.7735-10c1.6077-2.7846 1.6077-6.2154 0-9l-5.7735-9.99999c-1.6077-2.78461-4.5788-4.5-7.7942-4.5zm11.547 5.99999h-7.2169c-1.1547 0-1.8762 1.2499-1.298 2.2494 1.784 3.0838 3.5722 6.1653 5.3536 9.2506.5359.9282.5359 2.0718 0 3-1.7814 3.0854-3.5696 6.1668-5.3536 9.2506-.5782.9995.1433 2.2494 1.298 2.2494h7.2169c1.0718 0 2.0622-.5718 2.5981-1.5l5.7735-10c.5359-.9282.5359-2.0718 0-3l-5.7735-10c-.5359-.9282-1.5263-1.5-2.5981-1.5z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "cubekit",
    name: "Cubekit",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 14.5264v18.9473l17.8947-12.2437v-18.94741z" fill="#155eef" opacity=".5"/><path d="m0 33.4737v-18.9474l17.8947 12.2438v18.9474z" fill="#1570ef" opacity=".5"/><path d="m40 14.5263v18.9474l-17.8947-12.2438v-18.94737z" fill="#155eef" opacity=".5"/><path d="m40 33.4737v-18.9474l-17.8947 12.2438v18.9474z" fill="#1570ef" opacity=".5"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m0 14.5264v18.9473l17.8947-12.2437v-18.94741z" opacity=".5"/><path d="m0 33.4737v-18.9474l17.8947 12.2438v18.9474z" opacity=".5"/><path d="m40 14.5263v18.9474l-17.8947-12.2438v-18.94737z" opacity=".5"/><path d="m40 33.4737v-18.9474l-17.8947 12.2438v18.9474z" opacity=".5"/></g></svg>`
  },
  {
    id: "europa",
    name: "Europa",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m28.6446 39.168c-.6032 1.3404-1.353 2.6531-2.2519 3.7888 7.4581-2.5137 12.9483-9.3054 13.5527-17.4568h-2.6549c-3.2399 0-5.8424 2.5861-6.369 5.7829-.4855 2.9468-1.2621 5.6301-2.2769 7.8851z"/><path d="m22.7724 25.5c3.3921 0 6.167 2.8299 5.5439 6.1643-1.3533 7.2424-4.5667 12.3357-8.3155 12.3357-4.7435 0-8.6299-8.1549-8.975-18.5z"/><path d="m30.9904 17.1502c.4961 3.2267 3.1106 5.8498 6.3752 5.8498h2.6107c-.4123-8.3729-5.9735-15.39183-13.5836-17.95683.8989 1.13575 1.6487 2.44843 2.2519 3.78878 1.0643 2.36505 1.8666 5.20115 2.3458 8.31825z"/><path d="m28.4165 16.8957c.5674 3.3176-2.1954 6.1043-5.5612 6.1043h-11.8434c.2344-10.5811 4.1693-19 8.9889-19 3.8447 0 7.1263 5.35721 8.4157 12.8957z"/><path d="m8.51131 23c.11359-5.4083 1.14536-10.3894 2.84579-14.16805.6031-1.34035 1.3529-2.65303 2.2519-3.78878-7.61011 2.565-13.171316 9.58393-13.5836094 17.95683z"/><path d="m.0562286 25.5c.6043994 8.1514 6.0946514 14.9431 13.5527714 17.4568-.899-1.1357-1.6488-2.4484-2.2519-3.7888-1.6479-3.6619-2.66781-8.4531-2.83264-13.668z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m28.6446 39.168c-.6032 1.3404-1.353 2.6531-2.2519 3.7888 7.4581-2.5137 12.9483-9.3054 13.5527-17.4568h-2.6549c-3.2399 0-5.8424 2.5861-6.369 5.7829-.4855 2.9468-1.2621 5.6301-2.2769 7.8851z"/><path d="m22.7724 25.5c3.3921 0 6.167 2.8299 5.5439 6.1643-1.3533 7.2424-4.5667 12.3357-8.3155 12.3357-4.7435 0-8.6299-8.1549-8.975-18.5z"/><path d="m30.9904 17.1502c.4961 3.2267 3.1106 5.8498 6.3752 5.8498h2.6107c-.4123-8.3729-5.9735-15.39183-13.5836-17.95683.8989 1.13575 1.6487 2.44843 2.2519 3.78878 1.0643 2.36505 1.8666 5.20115 2.3458 8.31825z"/><path d="m28.4165 16.8957c.5674 3.3176-2.1954 6.1043-5.5612 6.1043h-11.8434c.2344-10.5811 4.1693-19 8.9889-19 3.8447 0 7.1263 5.35721 8.4157 12.8957z"/><path d="m8.51131 23c.11359-5.4083 1.14536-10.3894 2.84579-14.16805.6031-1.34035 1.3529-2.65303 2.2519-3.78878-7.61011 2.565-13.171316 9.58393-13.5836094 17.95683z"/><path d="m.0562286 25.5c.6043994 8.1514 6.0946514 14.9431 13.5527714 17.4568-.899-1.1357-1.6488-2.4484-2.2519-3.7888-1.6479-3.6619-2.66781-8.4531-2.83264-13.668z"/></g></svg>`
  },
  {
    id: "feather-dev",
    name: "FeatherDev",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m36.3068 11.4224c-.4322-.4323-.8644-.8645-1.2967-1.2967-1.2966-1.38311-2.6797-2.76621-4.4086-3.63065-1.9882-1.03733-4.1493-.778-6.3104-.778-3.2849 0-11.4971 0-16.33798 0l3.28488 4.40865h19.6228c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.5186.0864.6051 0z" fill="#53b1fd"/><path d="m39.9368 18.511c-.4322-.4322-.8645-.8645-1.2967-1.2967-1.2967-1.3831-2.6797-2.7662-4.4086-3.6306-1.9882-1.0374-4.1494-.778-6.3105-.778-2.8526 0-9.6817 0-14.5226 0l3.2849 4.4086h17.8939c1.8154 0 3.3714.3458 4.8409 1.2967.1729.0864.3458.0864.5187 0z" fill="#2e90fa"/><path d="m44 25.4263c-.4322-.4323-.8645-.8645-1.2967-1.2967-1.2966-1.3831-2.6797-2.7662-4.4086-3.6307-1.9882-1.0373-4.1493-.7779-6.3104-.7779-2.6798 0-8.558 0-13.3124 0l3.2848 4.4086h16.5973c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.4322.1729.6051 0z" fill="#1570ef"/><path d="m7.60742 37.0961c.43222.4322.86444.8644 1.29666 1.2966 1.29662 1.3831 2.67972 2.7662 4.40862 3.6307 1.9882 1.0373 4.1493.778 6.3104.778h16.338l-3.2849-4.4087c-5.9646 0-15.3006 0-19.6228 0-1.8153 0-3.37132-.3457-4.84087-1.2966-.25933-.0865-.43222-.0865-.60511 0z" fill="#53b1fd"/><path d="m3.97656 30.0079c.43222.4323.86444.8645 1.29666 1.2967 1.29667 1.3831 2.67976 2.7662 4.40864 3.6307 1.98824 1.0373 4.14934.778 6.31044.778h14.5226l-3.2849-4.4087c-5.8782 0-13.9175 0-17.89391 0-1.81532 0-3.37132-.3458-4.84087-1.2967-.17289-.0864-.34577-.0864-.51866 0z" fill="#2e90fa"/><path d="m0 23.0058c.43222.4322.864441.8644 1.29666 1.2966 1.29666 1.3831 2.67977 2.7662 4.40866 3.6307 1.98821 1.0373 4.1493.778 6.31038.778h13.3124l-3.2849-4.4087c-5.7053 0-12.96657 0-16.59722 0-1.81533 0-3.37132-.3458-4.840874-1.2966-.259332-.0865-.432218-.0865-.605106 0z" fill="#1570ef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m36.3068 11.4224c-.4322-.4323-.8644-.8645-1.2967-1.2967-1.2966-1.38311-2.6797-2.76621-4.4086-3.63065-1.9882-1.03733-4.1493-.778-6.3104-.778-3.2849 0-11.4971 0-16.33798 0l3.28488 4.40865h19.6228c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.5186.0864.6051 0z" opacity=".5"/><path d="m39.9368 18.511c-.4322-.4322-.8645-.8645-1.2967-1.2967-1.2967-1.3831-2.6797-2.7662-4.4086-3.6306-1.9882-1.0374-4.1494-.778-6.3105-.778-2.8526 0-9.6817 0-14.5226 0l3.2849 4.4086h17.8939c1.8154 0 3.3714.3458 4.8409 1.2967.1729.0864.3458.0864.5187 0z" opacity=".7"/><path d="m44 25.4263c-.4322-.4323-.8645-.8645-1.2967-1.2967-1.2966-1.3831-2.6797-2.7662-4.4086-3.6307-1.9882-1.0373-4.1493-.7779-6.3104-.7779-2.6798 0-8.558 0-13.3124 0l3.2848 4.4086h16.5973c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.4322.1729.6051 0z"/><path d="m7.60742 37.0961c.43222.4322.86444.8644 1.29666 1.2966 1.29662 1.3832 2.67972 2.7662 4.40862 3.6307 1.9882 1.0373 4.1493.778 6.3104.778h16.338l-3.2849-4.4087c-5.9646 0-15.3006 0-19.6228 0-1.8153 0-3.37132-.3457-4.84087-1.2966-.25933-.0865-.43222-.0865-.60511 0z" opacity=".5"/><path d="m3.97656 30.0079c.43222.4323.86444.8645 1.29666 1.2967 1.29667 1.3831 2.67976 2.7662 4.40864 3.6307 1.98824 1.0373 4.14934.778 6.31044.778h14.5226l-3.2849-4.4087c-5.8782 0-13.9175 0-17.89391 0-1.81532 0-3.37132-.3458-4.84087-1.2967-.17289-.0864-.34577-.0864-.51866 0z" opacity=".7"/><path d="m0 23.0058c.43222.4322.864441.8644 1.29666 1.2966 1.29666 1.3831 2.67977 2.7662 4.40866 3.6307 1.98821 1.0373 4.1493.778 6.31038.778h13.3124l-3.2849-4.4087c-5.7053 0-12.96657 0-16.59722 0-1.81533 0-3.37132-.3458-4.840874-1.2966-.259332-.0865-.432218-.0865-.605106 0z"/></g></svg>`
  },
  {
    id: "flora-fauna",
    name: "Flora&Fauna",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m13.7146 4c-2.2564 0-4.4203.89634-6.01579 2.49183l-7.69881 7.69877v3.524c0 2.4897 1.06944 4.7296 2.77401 6.2854-1.70457 1.5558-2.77401 3.7957-2.77401 6.2854v3.524l7.69881 7.6988c1.59549 1.5955 3.75939 2.4918 6.01579 2.4918 2.4897 0 4.7296-1.0694 6.2854-2.774 1.5558 1.7046 3.7957 2.774 6.2854 2.774 2.2564 0 4.4203-.8963 6.0158-2.4918l7.6988-7.6988v-3.524c0-2.4897-1.0694-4.7296-2.774-6.2854 1.7046-1.5558 2.774-3.7957 2.774-6.2854v-3.524l-7.6988-7.69877c-1.5955-1.59549-3.7594-2.49183-6.0158-2.49183-2.4897 0-4.7296 1.06944-6.2854 2.77401-1.5558-1.70457-3.7957-2.77401-6.2854-2.77401zm12.0442 20c-.0959-.0875-.19-.1774-.2822-.2696l-5.4766-5.4766-5.4766 5.4766c-.0922.0922-.1863.1821-.2822.2696.0959.0875.19.1774.2822.2696l5.4766 5.4766 5.4766-5.4766c.0922-.0922.1863-.1821.2822-.2696zm-3.5366 9.8094v1.683c0 2.244 1.8192 4.0632 4.0632 4.0632 1.0776 0 2.1111-.4281 2.8731-1.1901l6.3971-6.3971v-1.683c0-2.244-1.8192-4.0632-4.0632-4.0632-1.0776 0-2.1111.4281-2.8731 1.1901zm-4.4444 0-6.3971-6.3971c-.762-.762-1.79546-1.1901-2.87308-1.1901-2.24403 0-4.06318 1.8192-4.06318 4.0632v1.683l6.39706 6.3971c.762.762 1.7955 1.1901 2.8731 1.1901 2.244 0 4.0632-1.8192 4.0632-4.0632zm0-21.3018v1.683l-6.3971 6.3971c-.762.762-1.79546 1.1901-2.87308 1.1901-2.24403 0-4.06318-1.8192-4.06318-4.0632v-1.683l6.39706-6.39708c.762-.76199 1.7955-1.19007 2.8731-1.19007 2.244 0 4.0632 1.81915 4.0632 4.06315zm10.8415 8.0801-6.3971-6.3971v-1.683c0-2.244 1.8192-4.06315 4.0632-4.06315 1.0776 0 2.1111.42808 2.8731 1.19007l6.3971 6.39708v1.683c0 2.244-1.8192 4.0632-4.0632 4.0632-1.0776 0-2.1111-.4281-2.8731-1.1901z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m13.7146 4c-2.2564 0-4.4203.89634-6.01579 2.49183l-7.69881 7.69877v3.524c0 2.4897 1.06944 4.7296 2.77401 6.2854-1.70457 1.5558-2.77401 3.7957-2.77401 6.2854v3.524l7.69881 7.6988c1.59549 1.5955 3.75939 2.4918 6.01579 2.4918 2.4897 0 4.7296-1.0694 6.2854-2.774 1.5558 1.7046 3.7957 2.774 6.2854 2.774 2.2564 0 4.4203-.8963 6.0158-2.4918l7.6988-7.6988v-3.524c0-2.4897-1.0694-4.7296-2.774-6.2854 1.7046-1.5558 2.774-3.7957 2.774-6.2854v-3.524l-7.6988-7.69877c-1.5955-1.59549-3.7594-2.49183-6.0158-2.49183-2.4897 0-4.7296 1.06944-6.2854 2.77401-1.5558-1.70457-3.7957-2.77401-6.2854-2.77401zm12.0442 20c-.0959-.0875-.19-.1774-.2822-.2696l-5.4766-5.4766-5.4766 5.4766c-.0922.0922-.1863.1821-.2822.2696.0959.0875.19.1774.2822.2696l5.4766 5.4766 5.4766-5.4766c.0922-.0922.1863-.1821.2822-.2696zm-3.5366 9.8094v1.683c0 2.244 1.8192 4.0632 4.0632 4.0632 1.0776 0 2.1111-.4281 2.8731-1.1901l6.3971-6.3971v-1.683c0-2.244-1.8192-4.0632-4.0632-4.0632-1.0776 0-2.1111.4281-2.8731 1.1901zm-4.4444 0-6.3971-6.3971c-.762-.762-1.79546-1.1901-2.87308-1.1901-2.24403 0-4.06318 1.8192-4.06318 4.0632v1.683l6.39706 6.3971c.762.762 1.7955 1.1901 2.8731 1.1901 2.244 0 4.0632-1.8192 4.0632-4.0632zm0-21.3018v1.683l-6.3971 6.3971c-.762.762-1.79546 1.1901-2.87308 1.1901-2.24403 0-4.06318-1.8192-4.06318-4.0632v-1.683l6.39706-6.39708c.762-.76199 1.7955-1.19007 2.8731-1.19007 2.244 0 4.0632 1.81915 4.0632 4.06315zm10.8415 8.0801-6.3971-6.3971v-1.683c0-2.244 1.8192-4.06315 4.0632-4.06315 1.0776 0 2.1111.42808 2.8731 1.19007l6.3971 6.39708v1.683c0 2.244-1.8192 4.0632-4.0632 4.0632-1.0776 0-2.1111-.4281-2.8731-1.1901z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "focal-point",
    name: "FocalPoint",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m10.7788 6.1817 4.6901 17.5036v-19.24382c.3719-.08679.7478-.16322 1.1273-.22897v19.47459l5.2752-19.6871c.3801.03442.7572.07945 1.1309.13479l-5.3176 19.84571 10.5701-18.30794c.3443.15492.6835.31927 1.0172.49274l-10.6095 18.3763 15.1464-15.1465c.2731.25824.5389.52407.7971.7972l-15.1486 15.1487 18.3784-10.6108c.1734.3337.3377.6729.4926 1.0173l-18.3034 10.5675 19.8403-5.3162c.0553.3737.1003.7508.1347 1.1309l-19.6869 5.2751h19.4741c-.0658.3796-.1422.7554-.229 1.1273h-19.2481l17.507 4.691c-.1798.3443-.3693.6827-.5681 1.0149l-17.2257-4.6156 14.3874 8.3066c-.2723.2801-.5528.5522-.8411.8161l-14.1087-8.1457 10.6759 10.6758c-.3377.1973-.6817.385-1.0316.5628l-10.4426-10.4426 6.8421 11.8508c-.3746.1059-.7537.2012-1.1368.2855l-6.6825-11.5744 3.2219 12.0243c-.2872.0122-.5759.0184-.8661.0184-.0991 0-.198-.0007-.2967-.0022l-3.1483-11.7497v11.4569c-.3795-.0657-.7554-.1421-1.1273-.2289v-11.2261l-2.7759 10.36c-.3541-.1396-.7033-.289-1.0471-.4478l2.7337-10.2024-5.13175 8.8884c-.3177-.2034-.62928-.4156-.9344-.6361l5.09135-8.8186-7.1301 7.1302c-.2731-.2583-.53893-.5241-.79717-.7971l7.12787-7.1279-8.81599 5.0899c-.22059-.3051-.4328-.6167-.6363-.9344l8.89259-5.1341-10.20737 2.735c-.15888-.3438-.3083-.693-.44793-1.047l10.3599-2.776h-11.226124c-.086806-.3719-.163256-.7477-.22903-1.1273h11.452154l-11.74511583-3.1471c-.00145443-.0995-.00218417-.1991-.00218417-.2989 0-.2894.00613487-.5774.0182816-.8639l12.0258184 3.2224-11.57621-6.6836c.084291-.3832.179549-.7623.285427-1.1369l11.855683 6.8449-10.44698-10.447c.17774-.3499.36544-.6939.56273-1.0315l10.68025 10.6802-8.14896-14.1144c.26387-.2882.53605-.56863.81617-.84096l8.30809 14.38996-4.61634-17.22828c.33214-.1988.67064-.38826 1.01484-.56802z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m10.7788 6.1817 4.6901 17.5036v-19.24382c.3719-.08679.7478-.16322 1.1273-.22897v19.47459l5.2752-19.6871c.3801.03442.7572.07945 1.1309.13479l-5.3176 19.84571 10.5701-18.30794c.3443.15492.6835.31927 1.0172.49274l-10.6095 18.3763 15.1464-15.1465c.2731.25824.5389.52407.7971.7972l-15.1486 15.1487 18.3784-10.6108c.1734.3337.3377.6729.4926 1.0173l-18.3034 10.5675 19.8403-5.3162c.0553.3737.1003.7508.1347 1.1309l-19.6869 5.2751h19.4741c-.0658.3796-.1422.7554-.229 1.1273h-19.2481l17.507 4.691c-.1798.3443-.3693.6827-.5681 1.0149l-17.2257-4.6156 14.3874 8.3066c-.2723.2801-.5528.5522-.8411.8161l-14.1087-8.1457 10.6759 10.6758c-.3377.1973-.6817.385-1.0316.5628l-10.4426-10.4426 6.8421 11.8508c-.3746.1059-.7537.2012-1.1368.2855l-6.6825-11.5744 3.2219 12.0243c-.2872.0122-.5759.0184-.8661.0184-.0991 0-.198-.0007-.2967-.0022l-3.1483-11.7497v11.4569c-.3795-.0657-.7554-.1421-1.1273-.2289v-11.2261l-2.7759 10.36c-.3541-.1396-.7033-.289-1.0471-.4478l2.7337-10.2024-5.13174 8.8884c-.31771-.2034-.62929-.4156-.93441-.6361l5.09135-8.8186-7.1301 7.1302c-.2731-.2583-.53893-.5241-.79717-.7971l7.12787-7.1279-8.81599 5.0899c-.22059-.3051-.4328-.6167-.6363-.9344l8.89259-5.1341-10.20737 2.735c-.15888-.3438-.3083-.693-.44793-1.047l10.3599-2.776h-11.226124c-.086806-.3719-.163256-.7477-.22903-1.1273h11.452154l-11.74511583-3.1471c-.00145443-.0995-.00218417-.1991-.00218417-.2989 0-.2894.00613486-.5774.0182816-.8639l12.0258184 3.2224-11.57621-6.6836c.084291-.3832.179549-.7623.285427-1.1369l11.855683 6.8449-10.44698-10.447c.17774-.3499.36544-.6939.56273-1.0315l10.68025 10.6802-8.14896-14.1144c.26387-.2882.53605-.56863.81617-.84096l8.30809 14.38996-4.61634-17.22828c.33214-.1988.67064-.38826 1.01484-.56802z" fill="#fff"/></svg>`
  },
  {
    id: "foresight",
    name: "Foresight",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 31 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#444ce7"><path d="m-.00195312 17.8433 30.90545312-17.8433-.8189 12.6994-26.32058 15.1961z"/><path d="m3.76367 27.8951 21.73573-12.5492-.8189 12.6994-17.15086 9.902z" opacity=".5"/><path d="m7.52734 37.9477 12.56596-7.255-.8189 12.6994-7.9811 4.6079z" opacity=".25"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 31 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m-.00195312 17.8433 30.90545312-17.8433-.8189 12.6994-26.32058 15.1961z"/><path d="m3.76367 27.8951 21.73573-12.5492-.8189 12.6994-17.15086 9.902z" opacity=".5"/><path d="m7.52734 37.9477 12.56596-7.255-.8189 12.6994-7.9811 4.6079z" opacity=".25"/></g></svg>`
  },
  {
    id: "galileo",
    name: "Galileo",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m29.5411 6.41772c2.6913 5.27688 4.209 11.25228 4.209 17.58218s-1.5177 12.3054-4.2091 17.5823c6.2304-3.3881 10.4593-9.9914 10.4593-17.5823s-4.2289-14.19404-10.4592-17.58218z" fill="#6172f3"/><path d="m20.5481 5.99826c-.9047-1.28153-2.4457-1.9717-3.9913-1.70349-9.40496 1.63214-16.5568 9.83343-16.5568 19.70503 0 9.8717 7.1518 18.0729 16.5567 19.7051 1.5456.2682 3.0867-.4219 3.9913-1.7035 3.5923-5.0889 5.7025-11.2988 5.7025-18.0016 0-6.7027-2.1101-12.9126-5.7024-18.00154z" fill="#444ce7"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m29.5411 6.41772c2.6913 5.27688 4.209 11.25228 4.209 17.58218s-1.5177 12.3054-4.2091 17.5823c6.2304-3.3881 10.4593-9.9914 10.4593-17.5823s-4.2289-14.19404-10.4592-17.58218z" opacity=".7"/><path d="m20.5481 5.99826c-.9047-1.28153-2.4457-1.9717-3.9913-1.70349-9.40496 1.63214-16.5568 9.83343-16.5568 19.70503 0 9.8717 7.1518 18.0729 16.5567 19.7051 1.5456.2682 3.0867-.4219 3.9913-1.7035 3.5923-5.0889 5.7025-11.2988 5.7025-18.0016 0-6.7027-2.1101-12.9126-5.7024-18.00154z"/></g></svg>`
  },
  {
    id: "global-bank",
    name: "GlobalBank",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m27.6627 4h-15.3253l-12.3374 12.3373v15.3253l12.3374 12.3374h15.3253l12.3373-12.3374v-15.3253zm-13.2049 27.8554-7.90357-7.9036 7.90357-7.9036c2.988-2.988 7.9037-2.988 10.8916 0l7.9036 7.9036-7.9036 7.9036c-2.9879 2.988-7.8072 2.988-10.8916 0z" fill="#444ce7"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m27.6627 4h-15.3253l-12.3374 12.3373v15.3253l12.3374 12.3374h15.3253l12.3373-12.3374v-15.3253zm-13.2049 27.8554-7.90357-7.9036 7.90357-7.9036c2.988-2.988 7.9037-2.988 10.8916 0l7.9036 7.9036-7.9036 7.9036c-2.9879 2.988-7.8072 2.988-10.8916 0z" fill="#fff"/></svg>`
  },
  {
    id: "hexsmith",
    name: "Hexsmith",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m9.72461 41.7983h18.49589c1.2717 0 2.4469-.6785 3.0827-1.7798l4.1102-7.1191h-20.5481z" opacity=".7"/><path d="m25.1445 15.1015h-20.55661l4.11021-7.11909c.63585-1.10133 1.811-1.77977 3.0827-1.77977h18.4959z" opacity=".4"/><path d="m39.5272 25.7801c.6358-1.1014.6358-2.4582 0-3.5596l-4.1102-7.1191-5.1378 8.8989h-20.55068l5.13718 8.8989h20.5481l.0016-.0027.0016.0027z" opacity=".4"/><path d="m14.8634 32.8992-5.13775-8.8988-5.13776 8.8988 5.13776 8.8989z"/><path d="m25.1445 15.1014h-20.55593l-4.108166 7.1192c-.635516 1.1013-.635318 2.458.000521 3.5591l4.111125 7.1195 5.13775-8.8989h20.55l.0013-.0021z" opacity=".7"/><path d="m35.4181 15.1015-5.1378-8.89886-5.1377 8.89886 5.1377 8.8989z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m9.72461 41.7983h18.49589c1.2717 0 2.4469-.6785 3.0827-1.7798l4.1102-7.1191h-20.5481z" opacity=".7"/><path d="m25.1445 15.1015h-20.55661l4.11021-7.11909c.63585-1.10133 1.811-1.77977 3.0827-1.77977h18.4959z" opacity=".4"/><path d="m39.5272 25.7801c.6358-1.1013.6358-2.4582 0-3.5596l-4.1102-7.1191-5.1378 8.8989h-20.55068l5.13718 8.8989h20.5481l.0016-.0027.0016.0027z" opacity=".4"/><path d="m14.8634 32.8992-5.13775-8.8988-5.13776 8.8988 5.13776 8.8989z"/><path d="m25.1445 15.1014h-20.55593l-4.108166 7.1192c-.635516 1.1013-.635318 2.458.000521 3.5591l4.111125 7.1195 5.13775-8.8989h20.55l.0013-.0022z" opacity=".7"/><path d="m35.4181 15.1015-5.1378-8.89886-5.1377 8.89886 5.1377 8.8989z"/></g></svg>`
  },
  {
    id: "hourglass",
    name: "Hourglass",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 30 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 41.2222c0 1.5341 1.24365 2.7778 2.77778 2.7778h24.44442c1.5341 0 2.7778-1.2437 2.7778-2.7778v-7.2222c0-8.2843-6.7157-15-15-15-8.28427 0-15 6.7157-15 15z" fill="#1570ef"/><path d="m0 6.77778c0-1.53413 1.24365-2.77778 2.77778-2.77778h24.44442c1.5341 0 2.7778 1.24365 2.7778 2.77778v7.22222c0 8.2843-6.7157 15-15 15-8.28427 0-15-6.7157-15-15z" fill="#53b1fd" opacity=".5"/></svg>`,
    darkSvg: `<svg width="100%" height="100%" viewBox="0 0 30 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity="0.7" d="M0 41.2222C0 42.7563 1.24365 44 2.77778 44H27.2222C28.7563 44 30 42.7563 30 41.2222V34C30 25.7157 23.2843 19 15 19C6.71573 19 0 25.7157 0 34V41.2222Z" fill="white"/><path opacity="0.7" d="M0 6.77778C0 5.24365 1.24365 4 2.77778 4H27.2222C28.7563 4 30 5.24365 30 6.77778V14C30 22.2843 23.2843 29 15 29C6.71573 29 0 22.2843 0 14V6.77778Z" fill="white"/></svg>`
  },
  {
    id: "kintsugi",
    name: "Kintsugi",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m20 4 4.2861 9.6525 9.856-3.79464-3.7946 9.85604 9.6525 4.2861-9.6525 4.2861 3.7946 9.856-9.856-3.7946-4.2861 9.6525-4.2861-9.6525-9.85604 3.7946 3.79469-9.856-9.65255-4.2861 9.65255-4.2861-3.79469-9.85604 9.85604 3.79464z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m20 4 4.2861 9.6525 9.856-3.79464-3.7946 9.85604 9.6525 4.2861-9.6525 4.2861 3.7946 9.856-9.856-3.7946-4.2861 9.6525-4.2861-9.6525-9.85604 3.7946 3.79469-9.856-9.65255-4.2861 9.65255-4.2861-3.79469-9.85604 9.85604 3.79464z" fill="#155eef"/></svg>`
  },
  {
    id: "layers",
    name: "Layers",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m5.03741 15.4637c.7506-2.8008 3.62961-5.67985 6.43049-6.43044l17.4617-4.67957c2.8009-.7506 4.4629.91146 3.7123 3.71231l-4.6795 17.4617c-.7506 2.8009-3.6297 5.6799-6.4305 6.4305l-17.46175 4.6796c-2.80085.7505-4.462904-.9115-3.712306-3.7124z" opacity=".7"/><path d="m12.0355 22.4642c.7506-2.8008 3.6296-5.6799 6.4304-6.4305l17.4617-4.6795c2.8009-.7506 4.4629.9114 3.7123 3.7123l-4.6795 17.4617c-.7506 2.8009-3.6296 5.6799-6.4305 6.4305l-17.4617 4.6795c-2.80085.7506-4.46291-.9114-3.71231-3.7123z" opacity=".7"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m5.03741 15.4637c.7506-2.8008 3.62961-5.67985 6.43049-6.43044l17.4617-4.67957c2.8009-.7506 4.4629.91146 3.7123 3.71231l-4.6795 17.4617c-.7506 2.8009-3.6297 5.6799-6.4305 6.4305l-17.46175 4.6795c-2.80085.7506-4.462904-.9114-3.712306-3.7123z" opacity=".7"/><path d="m12.0355 22.4642c.7506-2.8008 3.6296-5.6799 6.4304-6.4305l17.4617-4.6795c2.8009-.7506 4.4629.9114 3.7123 3.7123l-4.6795 17.4617c-.7506 2.8009-3.6296 5.6799-6.4305 6.4305l-17.4617 4.6795c-2.80085.7506-4.46291-.9114-3.71231-3.7123z" opacity=".7"/></g></svg>`
  },
  {
    id: "lightspeed",
    name: "Lightspeed",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 24c0 6.6274 5.37258 12 12 12v-12c0 6.6274 5.3726 12 12 12v-12c0 6.6274 5.3726 12 12 12s12-5.3726 12-12-5.3726-12-12-12-12 5.3726-12 12v-12c-6.6274 0-12 5.3726-12 12v-12c-6.62742 0-12 5.3726-12 12z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 24c0 6.6274 5.37258 12 12 12v-12c0 6.6274 5.3726 12 12 12v-12c0 6.6274 5.3726 12 12 12s12-5.3726 12-12-5.3726-12-12-12-12 5.3726-12 12v-12c-6.6274 0-12 5.3726-12 12v-12c-6.62742 0-12 5.3726-12 12z" fill="#155eef"/></svg>`
  },
  {
    id: "luminescence",
    name: "Luminescence",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m32.3008 36h-.1015c-.0261.0402-.0523.0804-.0787.1204-2.7604 1.8201-6.0668 2.8794-9.6206 2.8794-9.665 0-17.5-7.835-17.5-17.5 0-3.5538 1.05931-6.8602 2.87939-9.6206.04009-.0264.08029-.0527.12061-.0788v-.1017c-.04056.0599-.08077.1201-.12061.1805-4.7469 3.1299-7.87939 8.5094-7.87939 14.6206 0 9.665 7.83502 17.5 17.5 17.5 6.1112 0 11.4907-3.1325 14.6206-7.8794.0603-.0398.1204-.0799.1802-.1204z"/><g opacity=".5"><path d="m40.0003 21.5c0 6.1112-3.1325 11.4907-7.8794 14.6206 1.8201-2.7604 2.8794-6.0668 2.8794-9.6206 0-9.665-7.835-17.5-17.5-17.5-3.5538 0-6.8602 1.0593-9.6206 2.8794 3.1299-4.74691 8.5094-7.8794 14.6206-7.8794 9.665 0 17.5 7.835 17.5 17.5z"/><path d="m32.0003 36.1994c.0403-.0261.0805-.0524.1206-.0788-.0398.0604-.08.1206-.1206.1805z"/><path d="m7.80088 12c.02611-.0403.05238-.0805.07882-.1206-.06043.0398-.12059.08-.18048.1206z"/></g></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m32.3008 36h-.1015c-.0261.0402-.0523.0804-.0787.1204-2.7604 1.8201-6.0668 2.8794-9.6206 2.8794-9.665 0-17.5-7.835-17.5-17.5 0-3.5538 1.05931-6.8602 2.87939-9.6206.04009-.0264.08029-.0527.12061-.0788v-.1017c-.04056.0599-.08077.1201-.12061.1805-4.7469 3.1299-7.87939 8.5094-7.87939 14.6206 0 9.665 7.83502 17.5 17.5 17.5 6.1112 0 11.4907-3.1325 14.6206-7.8794.0603-.0398.1204-.0799.1802-.1204z"/><g opacity=".5"><path d="m40.0003 21.5c0 6.1112-3.1325 11.4907-7.8794 14.6206 1.8201-2.7604 2.8794-6.0668 2.8794-9.6206 0-9.665-7.835-17.5-17.5-17.5-3.5538 0-6.8602 1.0593-9.6206 2.8794 3.1299-4.74691 8.5094-7.8794 14.6206-7.8794 9.665 0 17.5 7.835 17.5 17.5z"/><path d="m32.0003 36.1994c.0403-.0261.0805-.0524.1206-.0788-.0398.0604-.08.1206-.1206.1805z"/><path d="m7.80088 12c.02611-.0403.05238-.0805.07882-.1206-.06043.0398-.12059.08-.18048.1206z"/></g></g></svg>`
  },
  {
    id: "luminous",
    name: "Luminous",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m14.1061 19.6565c5.499-2.6299 9.8025-7.0929 12.2731-12.67168-1.5939-1.67362-3.666-2.86907-5.8975-3.58634l-1.1954-.39848c-.0797.15939-.1594.39849-.1594.55788-1.9127 5.41936-5.8178 9.80262-11.07766 12.27322-3.66599 1.7533-6.37564 4.9412-7.650763 8.7666l-.398477 1.1955c.159391.0797.39848.1593.557871.1593 1.514209.5579 3.028419 1.2752 4.462939 2.1519 1.99238-3.5864 5.18019-6.6148 9.08529-8.4479z"/><path d="m37.2173 19.9753c-2.9487 4.463-7.0132 8.0494-12.034 10.4403-4.0645 1.9127-7.1726 5.499-8.6071 9.8026l-.3985 1.3549c1.5142 1.3548 3.3472 2.3909 5.3396 3.0284l1.1955.3985c.0796-.1594.1593-.3985.1593-.5579 1.9127-5.4193 5.8178-9.8026 11.0777-12.2732 3.666-1.7533 6.4553-4.9412 7.6507-8.7666l.3985-1.1954c-1.6736-.4782-3.2675-1.2752-4.7817-2.2316z" opacity=".6"/><path d="m12.9903 37.4284c1.9924-4.7818 5.6584-8.6869 10.3604-10.9184 4.3035-2.0721 7.8898-5.26 10.3604-9.1651-1.833-1.7533-3.3472-3.7458-4.463-6.1366-2.9487 5.4193-7.571 9.8026-13.2294 12.5123-3.2675 1.5142-5.8974 4.1442-7.49136 7.3321 1.75326 1.6736 3.18786 3.7457 4.30356 6.0569 0 0 .0797.1594.1594.3188z" opacity=".8"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m14.1061 19.6565c5.499-2.6299 9.8025-7.0929 12.2731-12.67168-1.5939-1.67362-3.666-2.86907-5.8975-3.58634l-1.1954-.39848c-.0797.15939-.1594.39849-.1594.55788-1.9127 5.41936-5.8178 9.80262-11.07766 12.27322-3.66599 1.7533-6.37564 4.9412-7.650763 8.7666l-.398477 1.1955c.159391.0797.39848.1593.557871.1593 1.514209.5579 3.028419 1.2752 4.462939 2.1519 1.99238-3.5864 5.18019-6.6148 9.08529-8.4479z"/><path d="m37.2173 19.9753c-2.9487 4.463-7.0132 8.0494-12.034 10.4403-4.0645 1.9127-7.1726 5.499-8.6071 9.8026l-.3985 1.3549c1.5142 1.3548 3.3472 2.3909 5.3396 3.0284l1.1955.3985c.0796-.1594.1593-.3985.1593-.5579 1.9127-5.4193 5.8178-9.8026 11.0777-12.2732 3.666-1.7533 6.4553-4.9412 7.6507-8.7666l.3985-1.1954c-1.6736-.4782-3.2675-1.2752-4.7817-2.2316z" opacity=".5"/><path d="m12.9903 37.4284c1.9924-4.7818 5.6584-8.6869 10.3604-10.9184 4.3035-2.0721 7.8898-5.26 10.3604-9.1651-1.833-1.7533-3.3472-3.7458-4.463-6.1366-2.9487 5.4193-7.571 9.8026-13.2294 12.5123-3.2675 1.5142-5.8974 4.1442-7.49136 7.3321 1.75326 1.6736 3.18786 3.7457 4.30356 6.0569 0 0 .0797.1594.1594.3188z" opacity=".7"/></g></svg>`
  },
  {
    id: "pollinate",
    name: "Pollinate",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m25.0008 24c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m25.0008 10c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6c0-3.31371 2.6863-6 6-6s6 2.68629 6 6z"/><path d="m37.125 31c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m37.127 17.0002c0 3.3137-2.6863 6-6 6-3.3138 0-6-2.6863-6-6s2.6862-6 6-6c3.3137 0 6 2.6863 6 6z"/><path d="m25.0008 38c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m12.877 17c0 3.3137-2.6863 6-6.00005 6-3.31371 0-5.999997-2.6863-5.999997-6s2.686287-6 5.999997-6c3.31375 0 6.00005 2.6863 6.00005 6z"/><path d="m12.875 30.9997c0 3.3137-2.6863 6-6 6-3.31371 0-6-2.6863-6-6s2.68629-6 6-6c3.3137 0 6 2.6863 6 6z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m25.0008 24c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m25.0008 10c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6c0-3.31371 2.6863-6 6-6s6 2.68629 6 6z"/><path d="m37.125 31c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m37.127 17.0002c0 3.3137-2.6863 6-6 6-3.3138 0-6-2.6863-6-6s2.6862-6 6-6c3.3137 0 6 2.6863 6 6z"/><path d="m25.0008 38c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m12.877 17c0 3.3137-2.6863 6-6.00005 6-3.31371 0-5.999997-2.6863-5.999997-6s2.686287-6 5.999997-6c3.31375 0 6.00005 2.6863 6.00005 6z"/><path d="m12.875 30.9997c0 3.3137-2.6863 6-6 6-3.31371 0-6-2.6863-6-6s2.68629-6 6-6c3.3137 0 6 2.6863 6 6z"/></g></svg>`
  },
  {
    id: "polymath",
    name: "Polymath",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="24" r="16" stroke="#155eef" stroke-width="6"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="24" r="16" stroke="#fff" stroke-width="6"/></svg>`
  },
  {
    id: "prometheus",
    name: "Prometheus",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m10.4993 16.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h19c2.2091 0 4-1.7909 4-4v-3h-22.5c-3.0376 0-5.5 2.46243-5.5 5.5 0 3.0376-2.4631 5.5-5.5007 5.5z"/><path d="m10.4993 26.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h13c2.2091 0 4-1.7909 4-4v-3h-16.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".7"/><path d="m10.4993 36.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h7.8c1.7673 0 3.2-1.4327 3.2-3.2v-3.8h-10.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".5"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m10.4993 16.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h19c2.2091 0 4-1.7909 4-4v-3h-22.5c-3.0376 0-5.5 2.46243-5.5 5.5 0 3.0376-2.4631 5.5-5.5007 5.5z"/><path d="m10.4993 26.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h13c2.2091 0 4-1.7909 4-4v-3h-16.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".75"/><path d="m10.4993 36.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h7.8c1.7673 0 3.2-1.4327 3.2-3.2v-3.8h-10.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".5"/></g></svg>`
  },
  {
    id: "quantum",
    name: "Quantum",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 39 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m9 23c0-5.5228 4.4772-10 10-10 5.5229 0 10 4.4772 10 10h9c0-10.4934-8.5066-19-19-19-10.49341 0-18.99999908 8.5066-19 19s8.50659 19 19 19v-9c-5.5228 0-10-4.4771-10-10z"/><path d="m29 23c0 5.5228 4.4772 10 10 10v9c-10.4934 0-19-8.5066-19-19z" opacity=".5"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 39 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m9 23c0-5.5228 4.4772-10 10-10 5.5229 0 10 4.4772 10 10h9c0-10.4934-8.5066-19-19-19-10.49341 0-18.99999908 8.5066-19 19s8.50659 19 19 19v-9c-5.5228 0-10-4.4771-10-10z"/><path d="m29 23c0 5.5228 4.4772 10 10 10v9c-10.4934 0-19-8.5066-19-19z" opacity=".5"/></g></svg>`
  },
  {
    id: "quartz-ai",
    name: "QuartzAI",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m17.6264 6.5h14.8017l11.4661 18.6661-15.7786 15.9489-22.68835-4.0459-5.157719-19.2098zm.5273 4.9692-6.816 15.105 6.4504 5.3411 8.8246-3.7975zm12.3276 15.3 9.2139-2.7073-7.1983-11.7184zm-.6163-17.2692h-9.3468l7.3309 14.4284zm6.9795 18.5263-6.779 1.9919-.5448 5.4109zm-10.5005 9.008.5824-5.7856-6.0573 2.6067zm-6.8394-.5022-10.91261-1.9459 1.64741-5.0264 6.438 5.3308zm-11.69782-9.1824-2.7037-3.0571 1.66868 6.215zm-3.53432-8.5248 4.81433 5.4437 5.50351-12.1963z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m17.6264 6.5h14.8017l11.4661 18.6661-15.7786 15.9489-22.68835-4.0459-5.157719-19.2098zm.5273 4.9692-6.816 15.105 6.4504 5.3411 8.8246-3.7975zm12.3276 15.3 9.2139-2.7073-7.1983-11.7184zm-.6163-17.2692h-9.3468l7.3309 14.4284zm6.9795 18.5263-6.779 1.9919-.5448 5.4109zm-10.5005 9.008.5824-5.7856-6.0573 2.6067zm-6.8394-.5022-10.91261-1.9459 1.64741-5.0264 6.438 5.3308zm-11.69782-9.1824-2.7037-3.0571 1.66868 6.215zm-3.53432-8.5248 4.81433 5.4437 5.50351-12.1963z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "radius",
    name: "Radius",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#155eef" fill-rule="evenodd"><path d="m18.5 19v-15h3v15z"/><path d="m18.5 44v-15h3v15z"/><path d="m22.4754 19.404 10.6066-10.60664 2.1214 2.12134-8.4853 8.4853z"/><path d="m4.79776 37.0816 10.60664-10.6066 2.1213 2.1214-10.60662 10.6066z"/><path d="m26.7178 28.5963 8.4853 8.4852-2.1213 2.1214-10.6066-10.6066z"/><path d="m6.91885 8.79727 10.60665 10.60663-2.1214 2.1213-10.60657-10.6066z"/><path d="m18.5 22.5h21.5v3h-21.5z"/><path d="m.00000026 22.5h14.99999974v3h-15z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#155eef" fill-rule="evenodd"><path d="m18.5 19v-15h3v15z"/><path d="m18.5 44v-15h3v15z"/><path d="m22.4754 19.404 10.6066-10.60664 2.1214 2.12134-8.4853 8.4853z"/><path d="m4.79776 37.0816 10.60664-10.6066 2.1213 2.1214-10.60662 10.6066z"/><path d="m26.7178 28.5963 8.4853 8.4852-2.1213 2.1214-10.6066-10.6066z"/><path d="m6.91885 8.79727 10.60665 10.60663-2.1214 2.1213-10.60657-10.6066z"/><path d="m18.5 22.5h21.5v3h-21.5z"/><path d="m.00000026 22.5h14.99999974v3h-15z"/></g></svg>`
  },
  {
    id: "railspeed",
    name: "Railspeed",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m0 7.5h28.8c2.5202 0 3.7804 0 4.743.49047.8467.43143 1.5351 1.11984 1.9665 1.96657.4905.96256.4905 2.22276.4905 4.74296v1.8h-28.8c-2.52024 0-3.78035 0-4.74296-.4905-.84673-.4314-1.535139-1.1198-1.966569-1.9665-.490471-.9626-.490471-2.2228-.490471-4.743z"/><path d="m0 28.5h28.8c2.5202 0 3.7804 0 4.743-.4905.8467-.4314 1.5351-1.1198 1.9665-1.9665.4905-.9626.4905-2.2228.4905-4.743v-1.8h-28.8c-2.52024 0-3.78035 0-4.74296.4905-.84673.4314-1.535139 1.1198-1.966569 1.9665-.490471.9626-.490471 2.2228-.490471 4.743z"/><path d="m14 31.5h14.8c2.5202 0 3.7804 0 4.743.4905.8467.4314 1.5351 1.1198 1.9665 1.9665.4905.9626.4905 2.2228.4905 4.743v1.8h-14.8c-2.5202 0-3.7804 0-4.743-.4905-.8467-.4314-1.5351-1.1198-1.9665-1.9665-.4905-.9626-.4905-2.2228-.4905-4.743z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m0 7.5h28.8c2.5202 0 3.7804 0 4.743.49047.8467.43143 1.5351 1.11984 1.9665 1.96657.4905.96256.4905 2.22276.4905 4.74296v1.8h-28.8c-2.52024 0-3.78035 0-4.74296-.4905-.84673-.4314-1.535139-1.1198-1.966569-1.9665-.490471-.9626-.490471-2.2228-.490471-4.743z"/><path d="m0 28.5h28.8c2.5202 0 3.7804 0 4.743-.4905.8467-.4314 1.5351-1.1198 1.9665-1.9665.4905-.9626.4905-2.2228.4905-4.743v-1.8h-28.8c-2.52024 0-3.78035 0-4.74296.4905-.84673.4314-1.535139 1.1198-1.966569 1.9665-.490471.9626-.490471 2.2228-.490471 4.743z"/><path d="m14 31.5h14.8c2.5202 0 3.7804 0 4.743.4905.8467.4314 1.5351 1.1198 1.9665 1.9665.4905.9626.4905 2.2228.4905 4.743v1.8h-14.8c-2.5202 0-3.7804 0-4.743-.4905-.8467-.4314-1.5351-1.1198-1.9665-1.9665-.4905-.9626-.4905-2.2228-.4905-4.743z"/></g></svg>`
  },
  {
    id: "refractional",
    name: "Refractional",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m48 11h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z" fill="#444ce7"/><path d="m46 19h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z" fill="#155eef"/><path d="m44 27h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z" fill="#8098f9"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m48 11h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z"/><path d="m46 19h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z"/><path d="m44 27h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z"/></g></svg>`
  },
  {
    id: "renaissance",
    name: "Renaissance",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 35 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.7018 5c1.841 0 3.4172 1.31967 3.7408 3.13199l.4648 2.60271c.3236 1.8123 1.8998 3.132 3.7408 3.132h3.1518c4.8969 0 8.8667 3.9697 8.8667 8.8666 0 2.9333-1.4244 5.5339-3.6191 7.1479.92.3126 1.6466.809 2.1799 1.461.549.7191.9411 1.7411 1.1764 3.028.0392.3406.0883.6718.1373 1.003s.098.6624.1372 1.003c.0408.3538.0709.6566.096.9083.0232.233.042.4223.0609.5679.0784 1.0598.1961 1.9303.3529 2.5738.1655.9048.4994 1.7867.9727 2.5738h-6.6982c-.3137-.6056-.5098-1.3248-.6666-2.1196-.1349-.6836-.2408-1.5352-.3676-2.5548-.0207-.1659-.0418-.3362-.0638-.5111l-.2353-1.7411c-.1961-1.3247-.4314-2.271-.6667-2.8766-.2745-.5677-.7058-.9841-1.2941-1.2112-.6274-.2271-1.5686-.3856-2.9019-.3856h-.3018c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.68517v10.1334h-6.33333v-27.8667zm13.6315 17.7333c0 1.3992-1.1342 2.5334-2.5333 2.5334h-3.1518c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.36847v-5.0667h5.68517c1.841 0 3.4172 1.3197 3.7408 3.132l.4647 2.6027c.3237 1.8123 1.8999 3.132 3.7409 3.132h2.8351c1.3991 0 2.5333 1.1342 2.5333 2.5333z" fill="#1849a9" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 35 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.7018 5c1.841 0 3.4172 1.31967 3.7408 3.13199l.4648 2.60271c.3236 1.8123 1.8998 3.132 3.7408 3.132h3.1518c4.8969 0 8.8667 3.9697 8.8667 8.8666 0 2.9333-1.4244 5.5339-3.6191 7.1479.92.3126 1.6466.809 2.1799 1.461.549.7191.9411 1.7411 1.1764 3.028.0392.3406.0883.6718.1373 1.003s.098.6624.1372 1.003c.0408.3538.0709.6566.096.9083.0232.233.042.4223.0609.5679.0784 1.0598.1961 1.9303.3529 2.5738.1655.9048.4994 1.7867.9727 2.5738h-6.6982c-.3137-.6056-.5098-1.3247-.6666-2.1196-.1349-.6836-.2408-1.5352-.3676-2.5548-.0207-.1659-.0418-.3362-.0638-.5111l-.2353-1.7411c-.1961-1.3247-.4314-2.271-.6667-2.8766-.2745-.5677-.7058-.9841-1.2941-1.2112-.6274-.2271-1.5686-.3856-2.9019-.3856h-.3018c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.68517v10.1334h-6.33333v-27.8667zm13.6315 17.7333c0 1.3992-1.1342 2.5334-2.5333 2.5334h-3.1518c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.36847v-5.0667h5.68517c1.841 0 3.4172 1.3197 3.7408 3.132l.4647 2.6027c.3237 1.8123 1.8999 3.132 3.7409 3.132h2.8351c1.3991 0 2.5333 1.1342 2.5333 2.5333z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "sisyphus",
    name: "Sisyphus",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m.599609 19.2002h9.59998v9.59999h-9.59998z"/><path d="m31.4004 28.7998h9.6v9.59999h-9.6z" transform="matrix(-1 0 -0 -1 62.8008 57.5996)"/><path d="m10.1992 19.2001 11.6-9.6v9.6l-11.6 9.6z" opacity=".2"/><path d="m21.7988 28.7999-11.6 9.6v-9.6l11.6-9.6z" opacity=".5"/><path d="m.599609 19.2 21.199991-19.2v9.59999l-11.6 9.60001z" opacity=".6"/><path d="m31.4004 28.8-21.2 19.2v-9.6l11.6-9.6z" opacity=".7"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m.599609 19.2002h9.59998v9.59999h-9.59998z"/><path d="m31.4004 28.7998h9.6v9.59999h-9.6z" transform="matrix(-1 0 -0 -1 62.8008 57.5996)"/><path d="m10.1992 19.2001 11.6-9.6v9.6l-11.6 9.6z" opacity=".2"/><path d="m21.7988 28.7999-11.6 9.6v-9.6l11.6-9.6z" opacity=".5"/><path d="m.599609 19.2 21.199991-19.2v9.59999l-11.6 9.60001z" opacity=".6"/><path d="m31.4004 28.8-21.2 19.2v-9.6l11.6-9.6z" opacity=".7"/></g></svg>`
  },
  {
    id: "solaris-energy",
    name: "Solaris Energy",
    lightSvg: `<svg width="100%" height="100%" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4V16.3604C20 19.087 16.6569 20.3998 14.8016 18.4017L7 10M40 24H27.6396C24.913 24 23.6002 20.6569 25.5983 18.8016L34 11M20 44V31.6396C20 28.913 23.3431 27.6002 25.1984 29.5983L33 38M0 24L12.3604 24C15.087 24 16.3998 27.3431 14.4017 29.1984L6 37" stroke="#175CD3" stroke-width="4"/></svg>`,
    darkSvg: `<svg width="100%" height="100%" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4V16.3604C20 19.087 16.6569 20.3998 14.8016 18.4017L7 10M40 24H27.6396C24.913 24 23.6002 20.6569 25.5983 18.8016L34 11M20 44V31.6396C20 28.913 23.3431 27.6002 25.1984 29.5983L33 38M0 24L12.3604 24C15.087 24 16.3998 27.3431 14.4017 29.1984L6 37" stroke="white" stroke-width="4"/></svg>`
  }
];

// features/lib/store-logo.ts
var DEFAULT_LOGO_SVG = LOGO_ICONS[0].lightSvg;
function publicLogoSvg(value) {
  return typeof value === "string" && sanitizeStoreLogoSvg(value) || DEFAULT_LOGO_SVG;
}
function validLogoHue(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 360;
}

// features/keystone/models/StorefrontSetting.ts
var DISPLAY_NAME_MAX = 80;
var StorefrontSetting = (0, import_core89.list)({
  access: {
    operation: {
      query: activeListPermissions.signedIn,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  ui: { isHidden: true },
  hooks: {
    resolveInput: async ({ resolvedData }) => ({
      ...resolvedData,
      ...typeof resolvedData.logoSvg === "string" && sanitizeStoreLogoSvg(resolvedData.logoSvg) ? { logoSvg: sanitizeStoreLogoSvg(resolvedData.logoSvg) } : {},
      displayName: typeof resolvedData.displayName === "string" ? resolvedData.displayName.trim() : resolvedData.displayName
    }),
    validateInput: async ({ context, item, resolvedData, operation, addValidationError }) => {
      const actor = await assertActiveActor(context).catch(() => null);
      if (!actor?.role?.canManagePractice) {
        addValidationError("Current practice-management authorization is required");
        return;
      }
      const practiceId5 = resolvedData.practice?.connect?.id || item?.practiceId;
      if (!practiceId5 || practiceId5 !== actor.practiceId) {
        addValidationError("Storefront settings must remain in the authenticated practice");
      }
      const displayName = resolvedData.displayName ?? item?.displayName;
      if (typeof displayName !== "string" || !displayName.trim() || displayName.length > DISPLAY_NAME_MAX || /[\u0000-\u001f\u007f]/.test(displayName)) {
        addValidationError(`Display name must be 1-${DISPLAY_NAME_MAX} printable characters`);
      }
      const hue = resolvedData.accentHue ?? item?.accentHue;
      if (!Number.isInteger(hue) || hue < 0 || hue > 360) {
        addValidationError("Accent hue must be a whole number from 0 through 360");
      }
      const logoSvg = resolvedData.logoSvg ?? item?.logoSvg ?? "";
      if (typeof logoSvg !== "string" || logoSvg && !sanitizeStoreLogoSvg(logoSvg)) {
        addValidationError("Logo must be a safe SVG document");
      }
      if (!validLogoHue(resolvedData.logoHue ?? item?.logoHue ?? 0)) {
        addValidationError("Logo hue must be a whole number from 0 through 360");
      }
      const isPublished = resolvedData.isPublished ?? item?.isPublished ?? false;
      const locationId = resolvedData.primaryLocation?.connect?.id || (resolvedData.primaryLocation?.disconnect ? null : item?.primaryLocationId);
      if (isPublished && !locationId) {
        addValidationError("A primary location is required before publishing");
        return;
      }
      if (locationId) {
        const location = await context.sudo().query.Location.findOne({
          where: { id: locationId },
          query: "id isActive practice { id }"
        });
        if (!location || location.practice?.id !== actor.practiceId) {
          addValidationError("Primary location must belong to the authenticated practice");
        } else if (isPublished && location.isActive !== true) {
          addValidationError("Primary location must be active before publishing");
        }
      }
      if (operation === "create") {
        const existing = await context.sudo().query.StorefrontSetting.findMany({
          where: { practice: { id: { equals: actor.practiceId } } },
          take: 1,
          query: "id"
        });
        if (existing.length) addValidationError("This practice already has storefront settings");
      }
    }
  },
  fields: {
    practice: (0, import_fields90.relationship)({
      ref: "Practice.storefrontSetting",
      access: { create: () => false, update: () => false }
    }),
    displayName: (0, import_fields90.text)({
      validation: { isRequired: true, length: { min: 1, max: DISPLAY_NAME_MAX } }
    }),
    primaryLocation: (0, import_fields90.relationship)({ ref: "Location" }),
    accentHue: (0, import_fields90.integer)({
      defaultValue: 220,
      validation: { isRequired: true, min: 0, max: 360 }
    }),
    logoSvg: (0, import_fields90.text)({ defaultValue: "" }),
    logoHue: (0, import_fields90.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0, max: 360 } }),
    isPublished: (0, import_fields90.checkbox)({ defaultValue: false }),
    revision: (0, import_fields90.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    ...trackingFields
  }
});

// features/keystone/models/TreatmentAdministration.ts
var import_core90 = require("@keystone-6/core");
var import_fields91 = require("@keystone-6/core/fields");
var TreatmentAdministration = (0, import_core90.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields91.relationship)({ ref: "Practice" }),
    location: (0, import_fields91.relationship)({ ref: "Location" }),
    client: (0, import_fields91.relationship)({ ref: "Client" }),
    appointment: (0, import_fields91.relationship)({ ref: "Appointment.administrations" }),
    treatmentSession: (0, import_fields91.relationship)({ ref: "TreatmentSession.administrations" }),
    order: (0, import_fields91.relationship)({ ref: "ClinicalOrder.administrations" }),
    consent: (0, import_fields91.relationship)({ ref: "ConsentRecord" }),
    performer: (0, import_fields91.relationship)({ ref: "Provider" }),
    supervisor: (0, import_fields91.relationship)({ ref: "Provider" }),
    service: (0, import_fields91.relationship)({ ref: "Service" }),
    room: (0, import_fields91.relationship)({ ref: "Resource" }),
    device: (0, import_fields91.relationship)({ ref: "Resource" }),
    status: (0, import_fields91.select)({ type: "enum", options: ["completed", "aborted", "entered_in_error"].map((value) => ({ label: value, value })), validation: { isRequired: true } }),
    protocolVersion: (0, import_fields91.text)({ validation: { isRequired: true } }),
    timeOutEvidence: (0, import_fields91.json)(),
    anatomicMap: (0, import_fields91.json)(),
    deviceSettings: (0, import_fields91.json)(),
    technique: (0, import_fields91.text)(),
    immediateOutcome: (0, import_fields91.text)(),
    aftercareSnapshot: (0, import_fields91.json)(),
    startedAt: (0, import_fields91.timestamp)({ validation: { isRequired: true } }),
    completedAt: (0, import_fields91.timestamp)({ validation: { isRequired: true } }),
    signedAt: (0, import_fields91.timestamp)({ validation: { isRequired: true } }),
    evidenceHash: (0, import_fields91.text)({ validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields91.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    lots: (0, import_fields91.relationship)({ ref: "AdministrationLot.administration", many: true }),
    incidents: (0, import_fields91.relationship)({ ref: "Incident.administration", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/TreatmentPlan.ts
var import_core91 = require("@keystone-6/core");
var import_fields92 = require("@keystone-6/core/fields");
var TreatmentPlan = (0, import_core91.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields92.relationship)({ ref: "Practice" }),
    client: (0, import_fields92.relationship)({ ref: "Client" }),
    consultation: (0, import_fields92.relationship)({ ref: "Consultation" }),
    createdBy: (0, import_fields92.relationship)({ ref: "Provider" }),
    status: (0, import_fields92.select)({ type: "enum", options: [
      { label: "Draft", value: "draft" },
      { label: "Active", value: "active" },
      { label: "Paused", value: "paused" },
      { label: "Completed", value: "completed" },
      { label: "Cancelled", value: "cancelled" }
    ], defaultValue: "draft", validation: { isRequired: true } }),
    title: (0, import_fields92.text)({ validation: { isRequired: true } }),
    goals: (0, import_fields92.text)({ ui: { displayMode: "textarea" } }),
    startsAt: (0, import_fields92.timestamp)(),
    endsAt: (0, import_fields92.timestamp)(),
    signedAt: (0, import_fields92.timestamp)(),
    evidenceHash: (0, import_fields92.text)(),
    idempotencyKey: (0, import_fields92.text)({ isIndexed: "unique" }),
    revision: (0, import_fields92.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    supersedes: (0, import_fields92.relationship)({ ref: "TreatmentPlan.supersededBy" }),
    supersededBy: (0, import_fields92.relationship)({ ref: "TreatmentPlan.supersedes" }),
    portalVisible: (0, import_fields92.checkbox)({ defaultValue: false }),
    items: (0, import_fields92.relationship)({ ref: "TreatmentPlanItem.plan", many: true }),
    sessions: (0, import_fields92.relationship)({ ref: "TreatmentSession.plan", many: true }),
    orders: (0, import_fields92.relationship)({ ref: "ClinicalOrder.plan", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/TreatmentPlanItem.ts
var import_core92 = require("@keystone-6/core");
var import_fields93 = require("@keystone-6/core/fields");
var TreatmentPlanItem = (0, import_core92.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: async (args) => await activeListPermissions.signedIn(args) && practiceId(args.session) ? { plan: { practice: { id: { equals: practiceId(args.session) } } } } : false } },
  fields: {
    plan: (0, import_fields93.relationship)({ ref: "TreatmentPlan.items" }),
    service: (0, import_fields93.relationship)({ ref: "Service" }),
    serviceTitle: (0, import_fields93.text)({ validation: { isRequired: true } }),
    plannedSessions: (0, import_fields93.integer)({ defaultValue: 1, validation: { min: 1 } }),
    completedSessions: (0, import_fields93.integer)({ defaultValue: 0, validation: { min: 0 } }),
    intervalNotes: (0, import_fields93.text)(),
    status: (0, import_fields93.select)({ type: "enum", options: [
      { label: "Planned", value: "planned" },
      { label: "In Progress", value: "in_progress" },
      { label: "Completed", value: "completed" },
      { label: "Cancelled", value: "cancelled" }
    ], defaultValue: "planned", validation: { isRequired: true } }),
    ...trackingFields
  }
});

// features/keystone/models/TreatmentSession.ts
var import_core93 = require("@keystone-6/core");
var import_fields94 = require("@keystone-6/core/fields");
var TreatmentSession = (0, import_core93.list)({
  access: { operation: { query: permissions.canManageClinical, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields94.relationship)({ ref: "Practice" }),
    location: (0, import_fields94.relationship)({ ref: "Location" }),
    plan: (0, import_fields94.relationship)({ ref: "TreatmentPlan.sessions" }),
    appointment: (0, import_fields94.relationship)({ ref: "Appointment.treatmentSessions" }),
    client: (0, import_fields94.relationship)({ ref: "Client" }),
    provider: (0, import_fields94.relationship)({ ref: "Provider.treatmentSessions" }),
    service: (0, import_fields94.relationship)({ ref: "Service" }),
    order: (0, import_fields94.relationship)({ ref: "ClinicalOrder" }),
    consent: (0, import_fields94.relationship)({ ref: "ConsentRecord" }),
    supervisor: (0, import_fields94.relationship)({ ref: "Provider" }),
    room: (0, import_fields94.relationship)({ ref: "Resource" }),
    device: (0, import_fields94.relationship)({ ref: "Resource" }),
    serviceTitle: (0, import_fields94.text)({ validation: { isRequired: true } }),
    durationMinutes: (0, import_fields94.integer)({ validation: { isRequired: true, min: 1 } }),
    status: (0, import_fields94.select)({ type: "enum", options: [
      { label: "Planned", value: "planned" },
      { label: "Ready", value: "ready" },
      { label: "In Progress", value: "in_progress" },
      { label: "Completed", value: "completed" },
      { label: "Stopped", value: "stopped" },
      { label: "Cancelled", value: "cancelled" }
    ], defaultValue: "planned", validation: { isRequired: true } }),
    staffAuthorizationConfirmed: (0, import_fields94.checkbox)({ defaultValue: false }),
    protocolVersion: (0, import_fields94.text)(),
    timeOutEvidence: (0, import_fields94.json)(),
    notes: (0, import_fields94.text)({ ui: { displayMode: "textarea" } }),
    signedAt: (0, import_fields94.timestamp)(),
    evidenceHash: (0, import_fields94.text)(),
    idempotencyKey: (0, import_fields94.text)({ isIndexed: "unique" }),
    startedAt: (0, import_fields94.timestamp)(),
    completedAt: (0, import_fields94.timestamp)(),
    revision: (0, import_fields94.integer)({ defaultValue: 1, validation: { min: 1 } }),
    administrations: (0, import_fields94.relationship)({ ref: "TreatmentAdministration.treatmentSession", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/User.ts
var import_core94 = require("@keystone-6/core");
var import_access98 = require("@keystone-6/core/access");
var import_fields95 = require("@keystone-6/core/fields");

// features/keystone/userPasswordAccess.ts
function canUpdateOwnPassword({ session, item }) {
  return Boolean(session?.itemId && item?.id && session.itemId === String(item.id));
}

// features/keystone/customerCreation.ts
var scopes = /* @__PURE__ */ new WeakMap();
async function withinCustomerCreation(context, scope, work) {
  if (context.session?.itemId || scopes.has(context.prisma)) throw new Error("Invalid customer creation context");
  scopes.set(context.prisma, scope);
  try {
    return await work();
  } finally {
    scopes.delete(context.prisma);
  }
}
function isCustomerCreation(context, data) {
  const scope = scopes.get(context.prisma);
  const practice = data.practice;
  return Boolean(scope && !context.session?.itemId && data.email === scope.email && data.name === scope.name && practice?.connect?.id === scope.practiceId && !data.role && !data.locations && data.status === "active" && data.onboardingStatus === "dismissed");
}

// features/keystone/roleGrantPolicy.ts
var capabilityKeys = [
  "canManagePeople",
  "canManageRoles",
  "canAccessDashboard",
  "canManageOnboarding",
  "canManagePractice",
  "canSchedule",
  "canReadClients",
  "canManageClinical",
  "canManageSensitiveRecords",
  "canManageInventory",
  "canManageFinance",
  "canManageCommunications",
  "canViewReports",
  "canManageIntegrations"
];
function capabilitiesWithinGrantAuthority(requested, actor) {
  if (!actor) return false;
  const ownerGated = /* @__PURE__ */ new Set([
    "canManageRoles",
    "canManagePractice",
    "canManageClinical",
    "canManageSensitiveRecords",
    "canManageFinance",
    "canManageIntegrations"
  ]);
  return capabilityKeys.every((key) => {
    if (requested[key] !== true) return true;
    if (actor[key] !== true) return false;
    return !ownerGated.has(key) || actor.canManagePractice === true;
  });
}
function hasRoleAssignmentChange(data) {
  if (!data || typeof data !== "object") return false;
  return Object.prototype.hasOwnProperty.call(data, "role");
}

// features/keystone/models/User.ts
var User = (0, import_core94.list)({
  access: {
    operation: {
      create: () => false,
      query: activeListPermissions.signedIn,
      update: activeListPermissions.signedIn,
      delete: () => false
    },
    filter: { query: rules.canReadPeople, update: rules.canUpdatePeople }
  },
  hooks: { validateInput: async ({ operation, resolvedData, context, item, addValidationError }) => {
    if (operation === "create" && !context.session?.itemId) {
      if (isCustomerCreation(context, resolvedData)) return;
      const existingUsers = await context.sudo().query.User.count({});
      if (existingUsers === 0 && resolvedData.role) return;
      return addValidationError("Unauthenticated user creation is limited to the one-time init account");
    }
    if (!resolvedData.role && !resolvedData.practice && !resolvedData.locations && resolvedData.status === void 0) return;
    const actor = context.session?.itemId ? await context.sudo().query.User.findOne({ where: { id: context.session.itemId }, query: "id status practice { id } role { id canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations }" }) : null;
    if (!actor || actor.status !== "active" || actor.role?.canManagePeople !== true || !actor.practice?.id) return addValidationError("Active people-management authority is required");
    if (Object.prototype.hasOwnProperty.call(resolvedData, "practice")) {
      const practiceId5 = resolvedData.practice?.connect?.id;
      if (resolvedData.practice?.disconnect || practiceId5 !== actor.practice.id) addValidationError("User practice cannot be removed or moved by this workflow");
    }
    if (hasRoleAssignmentChange(resolvedData)) {
      if (item?.id === actor.id) return addValidationError("You cannot change your own access role");
      if (actor.role?.canManageRoles !== true) return addValidationError("Independent role-management authority is required to assign roles");
      if (resolvedData.role?.create || resolvedData.role?.update) return addValidationError("Create or update roles through the controlled role workflow");
      const roleId = resolvedData.role?.connect?.id;
      if (roleId) {
        const role = await context.sudo().query.Role.findOne({ where: { id: roleId }, query: "id practice { id } canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations" });
        if (role?.practice?.id !== actor.practice.id) return addValidationError("Role must belong to the authenticated practice");
        if (!capabilitiesWithinGrantAuthority(role, actor.role)) return addValidationError("You cannot assign a role with capabilities you do not hold");
      }
    }
    const locationIds = [...resolvedData.locations?.connect || [], ...resolvedData.locations?.set || []].map((value) => value.id);
    if (locationIds.length) {
      const count2 = await context.sudo().query.Location.count({ where: { id: { in: locationIds }, practice: { id: { equals: actor.practice.id } } } });
      if (count2 !== new Set(locationIds).size) return addValidationError("Locations must belong to the authenticated practice");
    }
  } },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ["name", "email", "role", "practice"] }
  },
  fields: {
    name: (0, import_fields95.text)({ access: { update: canUpdateOwnPassword }, validation: { isRequired: true } }),
    email: (0, import_fields95.text)({
      isIndexed: "unique",
      access: { update: canUpdateOwnPassword },
      validation: { isRequired: true },
      hooks: { resolveInput: ({ resolvedData, fieldKey }) => typeof resolvedData[fieldKey] === "string" ? resolvedData[fieldKey].trim().toLowerCase() : resolvedData[fieldKey] }
    }),
    password: (0, import_fields95.password)({
      access: {
        read: import_access98.denyAll,
        update: canUpdateOwnPassword
      },
      validation: { isRequired: true }
    }),
    phone: (0, import_fields95.text)({ access: { update: canUpdateOwnPassword } }),
    role: (0, import_fields95.relationship)({
      ref: "Role.assignedTo",
      access: { create: activeListPermissions.canManagePeople, update: () => false }
    }),
    practice: (0, import_fields95.relationship)({ ref: "Practice.users", access: { create: activeListPermissions.canManagePeople, update: activeListPermissions.canManagePeople } }),
    locations: (0, import_fields95.relationship)({ ref: "Location.staff", many: true, access: { create: activeListPermissions.canManagePeople, update: activeListPermissions.canManagePeople } }),
    memberships: (0, import_fields95.relationship)({ ref: "PracticeMembership.user", many: true, access: { create: () => false, update: () => false } }),
    providerProfile: (0, import_fields95.relationship)({ ref: "Provider.user", access: { create: () => false, update: () => false } }),
    clientProfile: (0, import_fields95.relationship)({ ref: "Client.user", access: { create: () => false, update: () => false } }),
    formSubmissions: (0, import_fields95.relationship)({ ref: "FormSubmission.client", many: true, access: { create: () => false, update: () => false } }),
    clientPackages: (0, import_fields95.relationship)({ ref: "ClientPackage.client", many: true, access: { create: () => false, update: () => false } }),
    clientMemberships: (0, import_fields95.relationship)({ ref: "ClientMembership.client", many: true, access: { create: () => false, update: () => false } }),
    purchasedGiftCards: (0, import_fields95.relationship)({ ref: "GiftCard.purchasedBy", many: true, access: { create: () => false, update: () => false } }),
    clientPointsRecords: (0, import_fields95.relationship)({ ref: "ClientPoints.client", many: true, access: { create: () => false, update: () => false } }),
    referralsMade: (0, import_fields95.relationship)({ ref: "Referral.referrer", many: true, access: { create: () => false, update: () => false } }),
    referralsReceived: (0, import_fields95.relationship)({ ref: "Referral.referred", many: true, access: { create: () => false, update: () => false } }),
    messageLogs: (0, import_fields95.relationship)({ ref: "MessageLog.recipient", many: true, access: { create: () => false, update: () => false } }),
    onboardingStatus: (0, import_fields95.select)({
      access: { update: activeListPermissions.canManageOnboarding },
      type: "enum",
      options: [
        { label: "Not Started", value: "not_started" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "Dismissed", value: "dismissed" }
      ],
      defaultValue: "not_started",
      validation: { isRequired: true }
    }),
    status: (0, import_fields95.select)({
      access: { update: canUpdateOwnPassword },
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Disabled", value: "disabled" }
      ],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Vendor.ts
var import_core95 = require("@keystone-6/core");
var import_fields96 = require("@keystone-6/core/fields");
var Vendor = (0, import_core95.list)({
  hooks: { validateInput: validateTenantInput },
  access: { operation: { query: permissions.canManageInventory, create: activeListPermissions.canManageInventory, update: activeListPermissions.canManageInventory, delete: activeListPermissions.canManageInventory }, filter: { query: tenantFilter, update: tenantFilter, delete: tenantFilter } },
  fields: {
    practice: (0, import_fields96.relationship)({ ref: "Practice" }),
    name: (0, import_fields96.text)({ validation: { isRequired: true } }),
    email: (0, import_fields96.text)(),
    phone: (0, import_fields96.text)(),
    isActive: (0, import_fields96.checkbox)({ defaultValue: true }),
    purchaseOrders: (0, import_fields96.relationship)({ ref: "PurchaseOrder.vendor", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/WaitlistEntry.ts
var import_core96 = require("@keystone-6/core");
var import_fields97 = require("@keystone-6/core/fields");
var WaitlistEntry = (0, import_core96.list)({
  access: {
    operation: {
      query: permissions.canSchedule,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: tenantFilter }
  },
  ui: {
    listView: {
      initialColumns: ["client", "service", "isActive", "dateRangeStart", "dateRangeEnd"]
    }
  },
  fields: {
    practice: (0, import_fields97.relationship)({ ref: "Practice" }),
    // Client requesting the appointment
    client: (0, import_fields97.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Client waiting for an appointment"
      }
    }),
    guestName: (0, import_fields97.text)({
      ui: { description: "Walk-in name when no client account is connected" }
    }),
    guestPhone: (0, import_fields97.text)({
      ui: { description: "Walk-in contact number when no client account is connected" }
    }),
    // Service they want to book
    service: (0, import_fields97.relationship)({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "Service the client wants to book"
      }
    }),
    // Preferred providers (many-to-many)
    preferredProviders: (0, import_fields97.relationship)({
      ref: "Provider.waitlistEntries",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["user", "tier"],
        description: "Providers the client would prefer"
      }
    }),
    // Preferred days of the week
    preferredDays: (0, import_fields97.json)({
      ui: {
        description: 'Preferred days of week as JSON array, e.g., ["monday", "wednesday", "friday"]'
      }
    }),
    // Preferred time range
    preferredTimeRange: (0, import_fields97.text)({
      ui: {
        description: 'Preferred time range, e.g., "9:00-12:00" or "morning" or "afternoon"'
      }
    }),
    // Date range the client is available
    dateRangeStart: (0, import_fields97.timestamp)({
      ui: {
        description: "Start of date range the client is available"
      }
    }),
    dateRangeEnd: (0, import_fields97.timestamp)({
      ui: {
        description: "End of date range the client is available"
      }
    }),
    // Workflow state
    status: (0, import_fields97.select)({
      type: "string",
      defaultValue: "active",
      validation: { isRequired: true },
      options: [
        { label: "Active", value: "active" },
        { label: "Notified", value: "notified" },
        { label: "Converted", value: "converted" },
        { label: "Removed", value: "removed" }
      ]
    }),
    isActive: (0, import_fields97.checkbox)({
      defaultValue: true,
      ui: {
        description: "Compatibility flag maintained by the waitlist workflow"
      }
    }),
    requestKey: (0, import_fields97.text)({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Idempotency key used to join the waitlist"
      }
    }),
    // When the client was notified of availability
    notifiedAt: (0, import_fields97.timestamp)({
      ui: {
        description: "When the client was notified that a slot became available"
      }
    }),
    transitionedAt: (0, import_fields97.timestamp)({
      ui: {
        description: "When the latest controlled transition occurred"
      }
    }),
    transitionReason: (0, import_fields97.text)({
      ui: {
        displayMode: "textarea",
        description: "Reason recorded by the latest controlled transition"
      }
    }),
    convertedAppointment: (0, import_fields97.relationship)({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Appointment created from this waitlist entry"
      }
    }),
    // Notes
    notes: (0, import_fields97.text)({
      ui: {
        displayMode: "textarea",
        description: "Additional notes or special requests"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/WebhookInbox.ts
var import_core97 = require("@keystone-6/core");
var import_fields98 = require("@keystone-6/core/fields");
var WebhookInbox = (0, import_core97.list)({
  access: { operation: { query: permissions.canManageIntegrations, create: () => false, update: () => false, delete: () => false }, filter: { query: tenantFilter } },
  fields: {
    practice: (0, import_fields98.relationship)({ ref: "Practice" }),
    providerCode: (0, import_fields98.text)({ validation: { isRequired: true } }),
    providerEventId: (0, import_fields98.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    signatureVerifiedAt: (0, import_fields98.timestamp)({ validation: { isRequired: true } }),
    receivedAt: (0, import_fields98.timestamp)({ validation: { isRequired: true } }),
    payload: (0, import_fields98.json)(),
    status: (0, import_fields98.select)({ type: "enum", options: [
      { label: "Received", value: "received" },
      { label: "Processed", value: "processed" },
      { label: "Rejected", value: "rejected" },
      { label: "Failed", value: "failed" }
    ], defaultValue: "received", validation: { isRequired: true } }),
    processedAt: (0, import_fields98.timestamp)(),
    error: (0, import_fields98.text)(),
    ...trackingFields
  }
});

// features/keystone/models/WidgetConfiguration.ts
var import_core98 = require("@keystone-6/core");
var import_fields99 = require("@keystone-6/core/fields");
var WidgetConfiguration = (0, import_core98.list)({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: permissions.canManagePractice,
      create: activeListPermissions.canManagePractice,
      update: activeListPermissions.canManagePractice,
      delete: activeListPermissions.canManagePractice
    },
    filter: { query: tenantFilter, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false }
  },
  ui: {
    listView: {
      initialColumns: ["name", "primaryColor", "showServices", "showProviders"]
    }
  },
  fields: {
    practice: (0, import_fields99.relationship)({ ref: "Practice" }),
    // Widget name/identifier
    name: (0, import_fields99.text)({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Unique name for this widget configuration"
      }
    }),
    // Branding colors
    primaryColor: (0, import_fields99.text)({
      defaultValue: "#000000",
      ui: {
        description: "Primary brand color in hex format (e.g., #FF5733)"
      }
    }),
    secondaryColor: (0, import_fields99.text)({
      defaultValue: "#FFFFFF",
      ui: {
        description: "Secondary brand color in hex format (e.g., #333333)"
      }
    }),
    // Logo
    logoUrl: (0, import_fields99.text)({
      ui: {
        description: "URL to the medspa logo for the widget"
      }
    }),
    // Display options
    showServices: (0, import_fields99.checkbox)({
      defaultValue: true,
      ui: {
        description: "Show service selection in the booking widget"
      }
    }),
    showProviders: (0, import_fields99.checkbox)({
      defaultValue: true,
      ui: {
        description: "Show provider selection in the booking widget"
      }
    }),
    // Custom styling
    customCSS: (0, import_fields99.text)({
      ui: {
        displayMode: "textarea",
        description: "Custom CSS to override widget styles"
      }
    }),
    // Embed code (generated)
    embedCode: (0, import_fields99.text)({
      ui: {
        displayMode: "textarea",
        description: "Generated embed code for external websites"
      }
    }),
    // Additional settings
    buttonText: (0, import_fields99.text)({
      defaultValue: "Book Now",
      ui: {
        description: "Text displayed on the booking button"
      }
    }),
    welcomeMessage: (0, import_fields99.text)({
      ui: {
        displayMode: "textarea",
        description: "Welcome message displayed in the widget"
      }
    }),
    // Widget dimensions
    width: (0, import_fields99.text)({
      defaultValue: "100%",
      ui: {
        description: "Widget width (e.g., 400px, 100%)"
      }
    }),
    height: (0, import_fields99.text)({
      defaultValue: "600px",
      ui: {
        description: "Widget height (e.g., 600px, auto)"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/index.ts
var models = {
  AdministrationLot,
  Appointment,
  AppointmentLineItem,
  AppointmentResourceReservation,
  AppointmentSupervisorReservation,
  AssetAccessEvent,
  AuditEvent,
  BreakGlassEvent,
  Client,
  ClientAsset,
  ClientMembership,
  ClientPackageAdjustment,
  ClinicalAuthorityEvent,
  ClinicalOrder,
  ClinicalOrderAction,
  ConsentAction,
  ConsentRecord,
  ConsentTemplateVersion,
  ContraindicationDecision,
  ContraindicationFinding,
  ClientNote,
  ClientPackage,
  ClientPackageUsage,
  ClientPoints,
  Commission,
  Consultation,
  DomainEvent,
  FollowUpAction,
  FollowUpTask,
  FormSubmission,
  FormTemplate,
  GiftCard,
  GiftCardTransaction,
  GoodsReceipt,
  GoodsReceiptLine,
  Incident,
  IncidentAction,
  LegalHold,
  IntakeForm,
  IntakeReviewAction,
  InventoryLot,
  InventoryMovement,
  Location,
  LoyaltyProgram,
  MedSpaImage,
  MedSpaTransaction,
  MedSpaTransactionLineItem,
  Membership,
  MembershipAgreement,
  MembershipLedgerEntry,
  MessageLog,
  MessageTemplate,
  OutboxEvent,
  Payment,
  PaymentProvider,
  PaymentSession,
  PaymentWebhookEvent,
  PatientRightsAction,
  PatientRightsRequest,
  PhotoConsent,
  PhotoConsentAction,
  Practice,
  PracticeMembership,
  Product,
  ProductSale,
  Provider,
  ProviderAuthorization,
  ProviderCredential,
  ProviderSchedule,
  PurchaseOrder,
  PurchaseOrderLine,
  RecallAction,
  RecallCase,
  RecallExposure,
  Referral,
  Refund,
  RetentionPolicy,
  Resource,
  ResourceScheduleBlock,
  DeviceReadinessEvent,
  Review,
  Role,
  Service,
  ServiceCategory,
  ServicePackage,
  ServiceVariant,
  StaffInvitation,
  StockMovement,
  StorefrontSetting,
  TreatmentAdministration,
  TreatmentPlan,
  TreatmentPlanItem,
  TreatmentSession,
  User,
  Vendor,
  WaitlistEntry,
  WebhookInbox,
  WidgetConfiguration
};
for (const [listKey, model] of Object.entries(models)) {
  model.graphql = { ...model.graphql, maxTake: Math.min(model.graphql?.maxTake ?? GRAPHQL_MAX_TAKE, GRAPHQL_MAX_TAKE) };
  const access = model.access;
  if (!access || typeof access === "function" || !access.operation) continue;
  const create = typeof access.operation === "function" ? access.operation : access.operation.create;
  const remove = typeof access.operation === "function" ? access.operation : access.operation.delete;
  const update = typeof access.operation === "function" ? access.operation : access.operation.update;
  const practice = model.fields.practice;
  if (practice) {
    model.fields.practice = (data) => {
      const field2 = practice(data);
      return { ...field2, ui: { ...field2.ui, createView: { ...field2.ui?.createView, fieldMode: "hidden" }, itemView: { ...field2.ui?.itemView, fieldMode: "read" } } };
    };
    const resolveInput = model.hooks?.resolveInput;
    model.hooks = { ...model.hooks, resolveInput: async (args) => {
      let resolvedData = args.resolvedData;
      if (typeof resolveInput === "function") resolvedData = await resolveInput(args);
      else if (args.operation === "create" && resolveInput?.create) resolvedData = await resolveInput.create({ ...args, operation: "create" });
      else if (args.operation === "update" && resolveInput?.update) resolvedData = await resolveInput.update({ ...args, operation: "update" });
      return resolveTenantPractice({ ...args, resolvedData });
    } };
  }
  const original = model.ui;
  model.ui = {
    ...original,
    itemView: { ...original?.itemView, defaultFieldMode: async (args) => {
      const originalMode = original?.itemView?.defaultFieldMode;
      const mode = typeof originalMode === "function" ? await originalMode(args) : originalMode || "edit";
      if (mode !== "edit") return mode;
      return (typeof update === "function" ? await update({ ...args, listKey, operation: "update" }) : update !== false) ? "edit" : "read";
    } },
    hideCreate: async (args) => {
      if (typeof original?.hideCreate === "function" ? await original.hideCreate(args) : original?.hideCreate) return true;
      return typeof create === "function" ? !await create({ ...args, listKey, operation: "create" }) : create === false;
    },
    hideDelete: async (args) => {
      if (typeof original?.hideDelete === "function" ? await original.hideDelete(args) : original?.hideDelete) return true;
      return typeof remove === "function" ? !await remove({ ...args, listKey, operation: "delete" }) : remove === false;
    }
  };
}

// features/keystone/mutations/index.ts
var import_core132 = require("@keystone-6/core");

// features/keystone/mutations/redirectToInit.ts
async function redirectToInit(root, args, context) {
  const userCount = await context.sudo().query.User.count({});
  if (userCount === 0) {
    return true;
  }
  return false;
}
var redirectToInit_default = redirectToInit;

// features/keystone/mutations/processPayment.ts
var import_core99 = require("@keystone-6/core");

// features/keystone/payment-lifecycle.ts
var transitions = {
  pending: ["requires_action", "authorized", "completed", "failed", "cancelled"],
  requires_action: ["authorized", "completed", "failed", "cancelled"],
  authorized: ["completed", "failed", "cancelled"],
  completed: ["partially_refunded", "refunded"],
  partially_refunded: ["partially_refunded", "refunded"],
  failed: [],
  cancelled: [],
  refunded: []
};
function canTransitionPayment(from, to) {
  return from === to || transitions[from].includes(to);
}
function assertPaymentTransition(from, to) {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Invalid payment transition: ${from} -> ${to}`);
  }
}
function paymentRecordStatus(status) {
  if (status === "requires_action" || status === "authorized") return "processing";
  if (status === "partially_refunded") return "partially_refunded";
  if (status === "refunded") return "refunded";
  if (status === "completed") return "completed";
  if (status === "failed" || status === "cancelled") return "failed";
  return "pending";
}

// features/integrations/payment/index.ts
var adapters = {
  manual: async () => (await Promise.resolve().then(() => (init_manual(), manual_exports))).manualPaymentAdapter,
  stripe: async () => (await Promise.resolve().then(() => (init_stripe(), stripe_exports))).stripePaymentAdapter
};
async function getPaymentAdapter(provider) {
  const loader = adapters[provider.adapter];
  if (!loader) throw new Error(`Unsupported payment adapter: ${provider.adapter}`);
  return loader();
}

// features/keystone/utils/paymentProviderAdapter.ts
async function createProviderPaymentSession(input) {
  return (await getPaymentAdapter(input.provider)).createSession(input);
}
async function confirmProviderPayment(input) {
  return (await getPaymentAdapter(input.provider)).confirm(input);
}
async function refundProviderPayment(input) {
  return (await getPaymentAdapter(input.provider)).refund(input);
}
function paymentProviderFromRecord(record) {
  if (record.adapter !== "manual" && record.adapter !== "stripe") {
    throw new Error(`Unsupported payment adapter: ${record.adapter}`);
  }
  return {
    code: record.code,
    adapter: record.adapter,
    config: record.config && typeof record.config === "object" ? record.config : {}
  };
}

// features/keystone/mutations/processPayment.ts
var TAX_RATE = Number.parseFloat(process.env.TAX_RATE || "0.08");
function operator(context) {
  return permissions.canManageFinance({ session: context.session });
}
function denied(extra = {}) {
  return { success: false, error: "You must be an authorized medspa operator", ...extra };
}
async function paymentTransaction(context, lockKeys, work) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await context.transaction(async (transactionContext) => {
        for (const key of [...new Set(lockKeys)].sort()) {
          await transactionContext.prisma.$executeRawUnsafe(
            "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            "medspa-payment-lifecycle",
            key
          );
        }
        return work(transactionContext.sudo());
      }, {
        maxWait: 5e3,
        timeout: 3e4,
        isolationLevel: "Serializable"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = error?.code === "P2034" || error?.extensions?.prisma?.code === "P2034" || /write conflict|deadlock|please retry your transaction/i.test(message);
      if (!retryable || attempt === 3) throw error;
    }
  }
  throw new Error("Payment transaction retry exhausted");
}
var SAFE_PAYMENT_ERRORS = /* @__PURE__ */ new Set([
  "Appointment not found",
  "Appointment is not eligible for payment",
  "Appointment already has a payment",
  "Appointment has no payable line items",
  "Payment provider is unavailable",
  "Payment session not found",
  "Provider has not completed the payment",
  "Invalid refund amount",
  "Completed payment not found",
  "No tip to distribute",
  "Idempotency key is invalid",
  "Idempotency key was already used for another operation"
]);
function safeError(error) {
  console.error("Payment workflow failed:", error);
  if (error instanceof Error && (error.message.startsWith("Invalid payment transition") || SAFE_PAYMENT_ERRORS.has(error.message))) {
    return error.message;
  }
  return "Payment operation failed";
}
async function loadSession(sudo, sessionId) {
  return sudo.query.PaymentSession.findOne({
    where: { id: sessionId },
    query: `
      id amount currency status providerReference idempotencyKey data
      provider { id code adapter config isInstalled }
      payment { id status totalAmount refundedAmount appointment { id } }
      appointment { id status client { user { email } } }
    `
  });
}
var processPayment = import_core99.graphql.field({
  type: import_core99.graphql.object()({
    name: "ProcessPaymentResult",
    fields: {
      success: import_core99.graphql.field({ type: import_core99.graphql.nonNull(import_core99.graphql.Boolean) }),
      paymentId: import_core99.graphql.field({ type: import_core99.graphql.String }),
      paymentSessionId: import_core99.graphql.field({ type: import_core99.graphql.String }),
      error: import_core99.graphql.field({ type: import_core99.graphql.String }),
      clientSecret: import_core99.graphql.field({ type: import_core99.graphql.String }),
      status: import_core99.graphql.field({ type: import_core99.graphql.String })
    }
  }),
  args: {
    appointmentId: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.ID) }),
    paymentMethod: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.String) }),
    providerCode: import_core99.graphql.arg({ type: import_core99.graphql.String }),
    idempotencyKey: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.String) }),
    tipAmount: import_core99.graphql.arg({ type: import_core99.graphql.Int }),
    discountAmount: import_core99.graphql.arg({ type: import_core99.graphql.Int })
  },
  async resolve(source, args, context) {
    if (!operator(context)) return { success: false, paymentId: null, paymentSessionId: null, error: "You must be an authorized medspa operator", clientSecret: null, status: null };
    return { success: false, paymentId: null, paymentSessionId: null, error: "Use controlled appointment checkout", clientSecret: null, status: null };
  }
});
var confirmPayment = import_core99.graphql.field({
  type: import_core99.graphql.object()({
    name: "ConfirmPaymentResult",
    fields: { success: import_core99.graphql.field({ type: import_core99.graphql.nonNull(import_core99.graphql.Boolean) }), error: import_core99.graphql.field({ type: import_core99.graphql.String }), status: import_core99.graphql.field({ type: import_core99.graphql.String }) }
  }),
  args: { paymentSessionId: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.ID) }) },
  async resolve(source, { paymentSessionId }, context) {
    try {
      requireActorPractice(context, permissions.canManageFinance);
      await assertPracticeRecord(context, "PaymentSession", paymentSessionId);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Payment session not found", status: null };
    }
    try {
      return await paymentTransaction(context, [`session:${paymentSessionId}`], async (sudo) => {
        const session = await loadSession(sudo, paymentSessionId);
        if (!session?.provider || !session.providerReference || !session.payment) throw new Error("Payment session not found");
        const initialData = session.data && typeof session.data === "object" ? session.data : {};
        if (initialData.purpose !== "appointment_deposit") throw new Error("Use the controlled settlement or reversal workflow");
        if (session.status === "completed") return { success: true, error: null, status: "completed" };
        if (!session.appointment?.status || !["pending", "confirmed"].includes(session.appointment.status)) throw new Error("Cancelled or completed appointments cannot be revived by a late deposit confirmation");
        assertPaymentTransition(session.status, "completed");
        const result2 = await confirmProviderPayment({ provider: paymentProviderFromRecord(session.provider), providerReference: session.providerReference, amount: session.amount, idempotencyKey: `${session.idempotencyKey}:confirm` });
        assertPaymentTransition(session.status, result2.status);
        if (result2.status !== "completed") throw new Error("Provider has not completed the payment");
        const now2 = (/* @__PURE__ */ new Date()).toISOString();
        const sessionData = session.data && typeof session.data === "object" ? session.data : {};
        await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: "completed", completedAt: now2, data: { ...sessionData, ...result2.data || {} } }, query: "id" });
        await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: "completed", processedAt: now2 }, query: "id" });
        if (session.appointment?.id) {
          await sudo.query.Appointment.updateOne({
            where: { id: session.appointment.id },
            data: sessionData.purpose === "appointment_deposit" ? { depositPaid: true, ...session.appointment.status === "pending" ? { status: "confirmed", confirmedAt: now2 } : {} } : { status: "completed" },
            query: "id"
          });
        }
        return { success: true, error: null, status: "completed" };
      });
    } catch (error) {
      return { success: false, error: safeError(error), status: null };
    }
  }
});
var refundPayment = import_core99.graphql.field({
  type: import_core99.graphql.object()({
    name: "RefundPaymentResult",
    fields: { success: import_core99.graphql.field({ type: import_core99.graphql.nonNull(import_core99.graphql.Boolean) }), refundId: import_core99.graphql.field({ type: import_core99.graphql.String }), error: import_core99.graphql.field({ type: import_core99.graphql.String }), status: import_core99.graphql.field({ type: import_core99.graphql.String }) }
  }),
  args: { paymentSessionId: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.ID) }), amount: import_core99.graphql.arg({ type: import_core99.graphql.Int }), reason: import_core99.graphql.arg({ type: import_core99.graphql.String }) },
  async resolve(source, { paymentSessionId, amount, reason }, context) {
    try {
      requireActorPractice(context, permissions.canManageFinance);
      await assertPracticeRecord(context, "PaymentSession", paymentSessionId);
    } catch (error) {
      return { success: false, refundId: null, error: error instanceof Error ? error.message : "Payment session not found", status: null };
    }
    try {
      return await paymentTransaction(context, [`session:${paymentSessionId}`], async (sudo) => {
        const session = await loadSession(sudo, paymentSessionId);
        if (!session?.provider || !session.providerReference || !session.payment) throw new Error("Payment session not found");
        const initialData = session.data && typeof session.data === "object" ? session.data : {};
        if (initialData.purpose !== "appointment_deposit") throw new Error("Use the controlled settlement reversal workflow");
        if (session.provider.adapter !== "manual") throw new Error("Processor refunds require a durable outbox and webhook reconciliation workflow");
        const alreadyRefunded = Number(session.payment.refundedAmount || 0);
        const refundCents = amount ?? session.amount - alreadyRefunded;
        const cumulativeRefund = alreadyRefunded + refundCents;
        if (refundCents <= 0 || cumulativeRefund > session.amount) throw new Error("Invalid refund amount");
        const target = cumulativeRefund < session.amount ? "partially_refunded" : "refunded";
        assertPaymentTransition(session.status, target);
        const result2 = await refundProviderPayment({ provider: paymentProviderFromRecord(session.provider), providerReference: session.providerReference, amount: refundCents, idempotencyKey: `${session.idempotencyKey}:refund:${refundCents}` });
        const now2 = (/* @__PURE__ */ new Date()).toISOString();
        const sessionData = session.data && typeof session.data === "object" ? session.data : {};
        await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: target, refundedAt: now2, data: { ...sessionData, ...result2.data || {} } }, query: "id" });
        await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: paymentRecordStatus(target), refundedAmount: cumulativeRefund, refundReason: reason || "", refundedAt: now2 }, query: "id" });
        if (sessionData.purpose === "appointment_deposit" && target === "refunded" && session.appointment?.id) {
          await sudo.query.Appointment.updateOne({ where: { id: session.appointment.id }, data: { depositPaid: false }, query: "id" });
        }
        return { success: true, refundId: typeof result2.data?.refundId === "string" ? result2.data.refundId : null, error: null, status: target };
      });
    } catch (error) {
      return { success: false, refundId: null, error: safeError(error), status: null };
    }
  }
});
var reverseAppointmentSettlement = import_core99.graphql.field({
  type: import_core99.graphql.object()({
    name: "ReverseAppointmentSettlementResult",
    fields: { success: import_core99.graphql.field({ type: import_core99.graphql.nonNull(import_core99.graphql.Boolean) }), refundId: import_core99.graphql.field({ type: import_core99.graphql.ID }), error: import_core99.graphql.field({ type: import_core99.graphql.String }), status: import_core99.graphql.field({ type: import_core99.graphql.String }) }
  }),
  args: { paymentSessionId: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.ID) }), amount: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.Int) }), reason: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.String) }), idempotencyKey: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.String) }) },
  async resolve(_source, args, context) {
    let actor;
    try {
      actor = requireActorPractice(context, permissions.canManageFinance);
      await assertPracticeRecord(context, "PaymentSession", args.paymentSessionId);
    } catch (error) {
      return { success: false, refundId: null, error: error instanceof Error ? error.message : "Payment session not found", status: null };
    }
    if (!Number.isInteger(args.amount) || args.amount < 1 || args.reason.trim().length < 1 || args.reason.length > 1e3 || args.idempotencyKey.trim().length < 12 || args.idempotencyKey.length > 200) return { success: false, refundId: null, error: "Settlement reversal evidence is invalid", status: null };
    return { success: false, refundId: null, error: "Settlement reversal is disabled until refund, commission, package, membership, retail-custody, and client-balance projections reconcile atomically", status: null };
    try {
      return await paymentTransaction(context, [`session:${args.paymentSessionId}`, `reversal:${args.idempotencyKey}`], async (sudo) => {
        const existing = (await sudo.query.Refund.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id status payment { id }" }))[0];
        const session = await loadSession(sudo, args.paymentSessionId);
        const data = session?.data && typeof session.data === "object" ? session.data : {};
        if (!session?.payment || session.provider?.adapter !== "manual" || data.purpose !== "controlled_checkout") throw new Error("Settlement reversal is unavailable for this payment");
        if (existing) {
          if (existing.payment?.id !== session.payment.id) throw new Error("Idempotency key was already used for another operation");
          return { success: true, refundId: existing.id, error: null, status: existing.status };
        }
        const threshold = Number(process.env.REFUND_MANAGER_APPROVAL_THRESHOLD_MINOR);
        if (!Number.isInteger(threshold) || threshold < 0) throw new Error("Refund approval threshold is not configured");
        if (args.amount > threshold && !permissions.canManagePractice({ session: context.session })) throw new Error("Practice-manager approval is required for this reversal");
        const alreadyRefunded = Number(session.payment.refundedAmount || 0), cumulative = alreadyRefunded + args.amount;
        if (cumulative > Number(session.payment.totalAmount || 0)) throw new Error("Invalid refund amount");
        const target = cumulative < Number(session.payment.totalAmount || 0) ? "partially_refunded" : "refunded";
        assertPaymentTransition(session.status, target);
        const now2 = (/* @__PURE__ */ new Date()).toISOString();
        const refund = await sudo.query.Refund.createOne({ data: { practice: { connect: { id: actor.practiceId } }, payment: { connect: { id: session.payment.id } }, amountMinor: args.amount, currencyCode: session.currency.toUpperCase(), reason: args.reason.trim(), idempotencyKey: args.idempotencyKey, providerReference: session.providerReference || "", status: "completed", processedAt: now2, data: { method: "operator_recorded_cash", actorId: actor.actorId } }, query: "id status" });
        await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: target, refundedAt: now2, data: { ...data, lastSettlementReversalId: refund.id } }, query: "id" });
        await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: paymentRecordStatus(target), refundedAmount: cumulative, refundReason: args.reason.trim(), refundedAt: now2 }, query: "id" });
        return { success: true, refundId: refund.id, error: null, status: target };
      });
    } catch (error) {
      return { success: false, refundId: null, error: safeError(error), status: null };
    }
  }
});
var distributeTip = import_core99.graphql.field({
  type: import_core99.graphql.object()({ name: "DistributeTipResult", fields: { success: import_core99.graphql.field({ type: import_core99.graphql.nonNull(import_core99.graphql.Boolean) }), error: import_core99.graphql.field({ type: import_core99.graphql.String }) } }),
  args: { paymentId: import_core99.graphql.arg({ type: import_core99.graphql.nonNull(import_core99.graphql.ID) }) },
  async resolve(source, { paymentId }, context) {
    if (!operator(context)) return denied();
    return { success: false, error: "Tip distribution requires an append-only payroll allocation workflow" };
  }
});
var paymentMutations = { processPayment, confirmPayment, refundPayment, reverseAppointmentSettlement, distributeTip };

// features/keystone/mutations/purchaseGiftCard.ts
var import_node_crypto3 = require("node:crypto");
var import_core100 = require("@keystone-6/core");

// features/keystone/aggregateIdempotencyKey.ts
function aggregateIdempotencyKey(scope, key) {
  if (typeof scope !== "string" || !scope.trim() || typeof key !== "string" || !key.trim()) {
    throw new Error("A nonempty scoped idempotency key is required");
  }
  return `${scope}:${key}`;
}

// features/keystone/lib/mail.ts
var import_nodemailer = require("nodemailer");
function getBaseUrlForEmails() {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  console.warn("SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.");
  return "";
}
function hasSmtpConfiguration() {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}
var transport = (0, import_nodemailer.createTransport)({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
function passwordResetEmail({ url }) {
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const buttonBackgroundColor = "#346df1";
  const buttonBorderColor = "#346df1";
  const buttonTextColor = "#ffffff";
  return `
    <body style="background: ${backgroundColor};">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: ${mainBackgroundColor}; max-width: 600px; margin: auto; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            Please click below to reset your password
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 5px;" bgcolor="${buttonBackgroundColor}"><a href="${url}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonTextColor}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${buttonBorderColor}; display: inline-block; font-weight: bold;">Reset Password</a></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            If you did not request this email you can safely ignore it.
          </td>
        </tr>
      </table>
    </body>
  `;
}
async function sendPasswordResetEmail(resetToken, to, baseUrl) {
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  const info = await transport.sendMail({
    to,
    from: process.env.SMTP_FROM,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}/dashboard/reset?token=${resetToken}`
    })
  });
  if (process.env.MAIL_USER?.includes("ethereal.email")) {
    console.log(`\u{1F4E7} Message Sent!  Preview it at ${(0, import_nodemailer.getTestMessageUrl)(info)}`);
  }
}
function appointmentRequestReceiptEmail(params) {
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const primaryColor = "#8b5cf6";
  const borderColor = "#e5e7eb";
  return `
    <body style="background: ${backgroundColor}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: ${backgroundColor}; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: ${mainBackgroundColor}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 2px solid ${primaryColor};">
                  <h1 style="margin: 0; font-size: 28px; color: ${primaryColor}; font-weight: bold;">Appointment request received</h1>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 30px 40px 20px 40px;">
                  <p style="margin: 0; font-size: 16px; color: ${textColor}; line-height: 1.6;">
                    Hi ${params.clientName},
                  </p>
                  <p style="margin: 15px 0 0 0; font-size: 16px; color: ${textColor}; line-height: 1.6;">
                    We received your pending request. This receipt does not confirm availability, candidacy, credentials, clinical authorization, safety, outcomes, or payment readiness.
                  </p>
                </td>
              </tr>

              <!-- Appointment Details -->
              <tr>
                <td style="padding: 20px 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f8f9fa; border-radius: 8px; border: 1px solid ${borderColor};">
                    <tr>
                      <td style="padding: 25px;">
                        <h2 style="margin: 0 0 20px 0; font-size: 18px; color: ${textColor}; font-weight: 600;">Requested details</h2>

                        <table width="100%" border="0" cellspacing="0" cellpadding="8">
                          <tr>
                            <td style="font-size: 14px; color: #6b7280; width: 120px;">Service:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${params.serviceName}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #6b7280;">Provider:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${params.providerName}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #6b7280;">Date:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${params.appointmentDate}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #6b7280;">Time:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${params.appointmentTime}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #6b7280;">Duration:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${params.duration} minutes</td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Important Info -->
              <tr>
                <td style="padding: 20px 40px;">
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                      <strong>No appointment has been confirmed.</strong> The operator must review the request before communicating any next step.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; border-top: 1px solid ${borderColor}; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    Keep this email only as a receipt of the submitted request.
                  </p>
                  <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af;">
                    Demo request workflow | ${process.env.SMTP_STORE_LINK || "No public site URL configured"}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  `;
}
async function sendAppointmentRequestReceipt(params) {
  if (!hasSmtpConfiguration()) return;
  try {
    const info = await transport.sendMail({
      to: params.to,
      from: process.env.SMTP_FROM,
      subject: `Appointment request received - ${params.appointmentDate} at ${params.appointmentTime}`,
      html: appointmentRequestReceiptEmail(params)
    });
    if (process.env.SMTP_USER?.includes("ethereal.email")) {
      console.log(`\u{1F4E7} Appointment request receipt sent. Preview: ${(0, import_nodemailer.getTestMessageUrl)(info)}`);
    }
  } catch (error) {
    console.error("Failed to send appointment request receipt:", error);
    throw error;
  }
}
function giftCardEmail(params) {
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const primaryColor = "#8b5cf6";
  return `
    <body style="background: ${backgroundColor}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: ${backgroundColor}; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: ${mainBackgroundColor}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

              <!-- Header -->
              <tr>
                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, ${primaryColor}, #a78bfa); border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0; font-size: 32px; color: #ffffff; font-weight: bold;">You've Received a Gift Card!</h1>
                  <p style="margin: 10px 0 0 0; font-size: 18px; color: #f3e8ff;">From ${params.senderName}</p>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 30px 40px 20px 40px;">
                  <p style="margin: 0; font-size: 16px; color: ${textColor}; line-height: 1.6;">
                    Hi ${params.recipientName},
                  </p>
                  ${params.message ? `
                    <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-left: 4px solid ${primaryColor}; border-radius: 4px;">
                      <p style="margin: 0; font-size: 15px; color: ${textColor}; font-style: italic; line-height: 1.6;">
                        "${params.message}"
                      </p>
                    </div>
                  ` : ""}
                </td>
              </tr>

              <!-- Gift Card Amount -->
              <tr>
                <td style="padding: 20px 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #faf5ff, #f3e8ff); border-radius: 8px; border: 2px solid ${primaryColor};">
                    <tr>
                      <td style="padding: 30px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Gift Card Value</p>
                        <p style="margin: 10px 0 20px 0; font-size: 48px; color: ${primaryColor}; font-weight: bold;">$${params.amount.toFixed(2)}</p>
                        <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Gift Card Code</p>
                        <p style="margin: 10px 0 0 0; font-size: 24px; color: ${textColor}; font-weight: bold; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                          ${params.code}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Redemption Instructions -->
              <tr>
                <td style="padding: 20px 40px 40px 40px;">
                  <h3 style="margin: 0 0 15px 0; font-size: 18px; color: ${textColor};">How to Use Your Gift Card</h3>
                  <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: ${textColor}; line-height: 1.8;">
                    <li>Book an appointment online or call us</li>
                    <li>Provide your gift card code during checkout</li>
                    <li>Enjoy your medspa experience!</li>
                  </ol>
                  <div style="margin-top: 20px; text-align: center;">
                    <a href="${process.env.SMTP_STORE_LINK}/book" style="display: inline-block; padding: 15px 30px; background: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Book Your Appointment
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.6;">
                    This gift card never expires and can be used for any service.<br/>
                    Questions? Contact us at ${process.env.SMTP_FROM}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  `;
}
async function sendGiftCardEmail(params) {
  try {
    const info = await transport.sendMail({
      to: params.to,
      from: process.env.SMTP_FROM,
      subject: `You've Received a $${params.amount} Gift Card from ${params.senderName}!`,
      html: giftCardEmail(params)
    });
    if (process.env.SMTP_USER?.includes("ethereal.email")) {
      console.log(`\u{1F4E7} Gift card email sent! Preview: ${(0, import_nodemailer.getTestMessageUrl)(info)}`);
    }
  } catch (error) {
    console.error("Failed to send gift card email:", error);
    throw error;
  }
}

// features/keystone/mutations/serializableWorkflow.ts
function retryableTransactionError(error) {
  const value = error;
  const message = error instanceof Error ? error.message : String(error);
  return value?.code === "P2034" || value?.extensions?.prisma?.code === "P2034" || /write conflict|deadlock|please retry your transaction/i.test(message);
}
async function serializableWorkflow(context, namespace, lockKeys, work) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await context.transaction(async (transactionContext) => {
        if (context.session?.itemId && context.session.data.practice?.id) {
          await transactionContext.prisma.$queryRawUnsafe('SELECT "id" FROM "User" WHERE "id" = $1 FOR SHARE', context.session.itemId);
          await transactionContext.prisma.$queryRawUnsafe('SELECT r."id" FROM "Role" r JOIN "User" u ON u."role" = r."id" WHERE u."id" = $1 FOR SHARE OF r', context.session.itemId);
          await transactionContext.prisma.$queryRawUnsafe('SELECT "id" FROM "PracticeMembership" WHERE "user" = $1 AND "practice" = $2 FOR SHARE', context.session.itemId, context.session.data.practice.id);
          await assertActiveActor(transactionContext);
        }
        for (const key of [...new Set(lockKeys)].sort()) {
          await transactionContext.prisma.$executeRawUnsafe(
            "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            namespace,
            key
          );
        }
        return work(transactionContext);
      }, {
        maxWait: 5e3,
        timeout: 3e4,
        isolationLevel: "Serializable"
      });
    } catch (error) {
      if (!retryableTransactionError(error) || attempt === 3) throw error;
    }
  }
  throw new Error("Serializable workflow retry exhausted");
}

// features/keystone/mutations/purchaseGiftCard.ts
function giftCardCode(idempotencyKey) {
  const compact = (0, import_node_crypto3.createHash)("sha256").update(idempotencyKey).digest("hex").slice(0, 12).toUpperCase();
  return compact.match(/.{1,4}/g).join("-");
}
function validKey(value) {
  return value.trim().length >= 12 && value.length <= 200;
}
function giftCardPurchasingEnabled() {
  return false;
}
function safeError2(error) {
  const message = error instanceof Error ? error.message : "Gift-card payment operation failed";
  if (/^(Gift card|Payment|Provider|Purchaser|Idempotency|Invalid payment transition)/.test(message)) return message;
  console.error("Gift-card payment workflow failed:", error);
  return "Gift-card payment operation failed";
}
async function defaultProvider(sudo, practiceId5, providerCode) {
  const providers = await sudo.query.PaymentProvider.findMany({
    where: providerCode ? { practice: { id: { equals: practiceId5 } }, code: { equals: providerCode }, isInstalled: { equals: true } } : { practice: { id: { equals: practiceId5 } }, isInstalled: { equals: true }, isDefault: { equals: true } },
    take: 1,
    query: "id code adapter config"
  });
  if (!providers[0]) throw new Error("Payment provider is unavailable");
  return providers[0];
}
async function purchaseGiftCardTransaction(context, args) {
  const denied18 = { success: false, giftCardId: null, paymentSessionId: null, clientSecret: null };
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
    await assertActiveActor(context);
  } catch (error) {
    return { ...denied18, error: error instanceof Error ? error.message : "Authorized finance access is required" };
  }
  if (!Number.isInteger(args.amount) || args.amount < 2500 || args.amount > 5e4) return { ...denied18, error: "Gift card amount must be between $25 and $500" };
  if (!validKey(args.idempotencyKey)) return { ...denied18, error: "Idempotency key is invalid" };
  const purchaserEmail = args.purchaserEmail.trim().toLowerCase();
  const recipientEmail = (args.recipientEmail || purchaserEmail).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return { ...denied18, error: "Gift card email is invalid" };
  if (args.purchaserName.trim().length > 120 || (args.recipientName?.length || 0) > 120 || (args.message?.length || 0) > 2e3) return { ...denied18, error: "Gift card details are too long" };
  if (!giftCardPurchasingEnabled()) return { ...denied18, error: "Gift-card purchasing is disabled until the settled tender and liability ledger is implemented" };
  const scopedPurchaseKey = aggregateIdempotencyKey(actor.practiceId, `gift-card:${args.idempotencyKey}`);
  try {
    return await serializableWorkflow(context, "medspa-gift-card", [`purchase:${scopedPurchaseKey}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.PaymentSession.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedPurchaseKey } },
        take: 1,
        query: "id amount data"
      }))[0];
      if (existing) {
        const data = existing.data && typeof existing.data === "object" ? existing.data : {};
        if (data.purpose !== "gift_card" || existing.amount !== args.amount) throw new Error("Idempotency key was already used for another operation");
        return { success: true, giftCardId: data.giftCardId || null, paymentSessionId: existing.id, clientSecret: data.clientSecret || null, error: null };
      }
      const purchaser = (await sudo.query.User.findMany({ where: { email: { equals: purchaserEmail }, practice: { id: { equals: actor.practiceId } } }, take: 1, query: "id" }))[0];
      if (!purchaser) throw new Error("Purchaser must have an authenticated client account");
      const provider = await defaultProvider(sudo, actor.practiceId, args.providerCode);
      const adapter = await createProviderPaymentSession({
        provider: paymentProviderFromRecord(provider),
        amount: args.amount,
        currency: "usd",
        idempotencyKey: scopedPurchaseKey,
        metadata: { purpose: "gift_card", purchaserId: purchaser.id }
      });
      const completed = adapter.status === "completed";
      const giftCard = await sudo.query.GiftCard.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } },
          code: giftCardCode(scopedPurchaseKey),
          initialValue: args.amount,
          currentBalance: args.amount,
          recipientEmail,
          recipientName: args.recipientName?.trim() || args.purchaserName.trim(),
          message: args.message?.trim() || "",
          isActive: completed,
          purchasedBy: { connect: { id: purchaser.id } }
        },
        query: "id"
      });
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      const session = await sudo.query.PaymentSession.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } },
          provider: { connect: { id: provider.id } },
          idempotencyKey: scopedPurchaseKey,
          amount: args.amount,
          currency: "usd",
          status: adapter.status,
          providerReference: adapter.providerReference,
          completedAt: completed ? now2 : void 0,
          data: { ...adapter.data || {}, purpose: "gift_card", clientSecret: adapter.clientSecret || null, giftCardId: giftCard.id }
        },
        query: "id"
      });
      const payment = await sudo.query.Payment.createOne({
        data: {
          idempotencyKey: aggregateIdempotencyKey(scopedPurchaseKey, "payment"),
          practice: { connect: { id: actor.practiceId } },
          subtotal: args.amount,
          tax: 0,
          tip: 0,
          discount: 0,
          totalAmount: args.amount,
          paymentMethod: "credit_card",
          status: paymentRecordStatus(adapter.status),
          session: { connect: { id: session.id } },
          processedBy: { connect: { id: context.session.itemId } },
          processedAt: completed ? now2 : void 0,
          receiptEmail: purchaserEmail,
          notes: `Gift-card purchase ${giftCard.id}`
        },
        query: "id"
      });
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { payment: { connect: { id: payment.id } } }, query: "id" });
      if (completed) {
        await sudo.query.GiftCardTransaction.createOne({
          data: { practice: { connect: { id: actor.practiceId } }, giftCard: { connect: { id: giftCard.id } }, type: "purchase", amount: args.amount, idempotencyKey: `${scopedPurchaseKey}:purchase`, notes: `provider:${provider.code}` },
          query: "id"
        });
      }
      return { success: true, giftCardId: giftCard.id, paymentSessionId: session.id, clientSecret: adapter.clientSecret || null, error: null };
    });
  } catch (error) {
    return { ...denied18, error: safeError2(error) };
  }
}
var purchaseGiftCard = import_core100.graphql.field({
  type: import_core100.graphql.object()({
    name: "PurchaseGiftCardResult",
    fields: {
      success: import_core100.graphql.field({ type: import_core100.graphql.nonNull(import_core100.graphql.Boolean) }),
      giftCardId: import_core100.graphql.field({ type: import_core100.graphql.String }),
      paymentSessionId: import_core100.graphql.field({ type: import_core100.graphql.String }),
      clientSecret: import_core100.graphql.field({ type: import_core100.graphql.String }),
      error: import_core100.graphql.field({ type: import_core100.graphql.String })
    }
  }),
  args: {
    amount: import_core100.graphql.arg({ type: import_core100.graphql.nonNull(import_core100.graphql.Int) }),
    recipientEmail: import_core100.graphql.arg({ type: import_core100.graphql.String }),
    recipientName: import_core100.graphql.arg({ type: import_core100.graphql.String }),
    message: import_core100.graphql.arg({ type: import_core100.graphql.String }),
    purchaserEmail: import_core100.graphql.arg({ type: import_core100.graphql.nonNull(import_core100.graphql.String) }),
    purchaserName: import_core100.graphql.arg({ type: import_core100.graphql.nonNull(import_core100.graphql.String) }),
    providerCode: import_core100.graphql.arg({ type: import_core100.graphql.String }),
    idempotencyKey: import_core100.graphql.arg({ type: import_core100.graphql.nonNull(import_core100.graphql.String) })
  },
  resolve(_source, args, context) {
    return purchaseGiftCardTransaction(context, args);
  }
});
async function confirmGiftCardPurchaseTransaction(context, paymentSessionId) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance);
    await assertPracticeRecord(context, "PaymentSession", paymentSessionId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Payment session not found", code: null };
  }
  try {
    const result2 = await serializableWorkflow(context, "medspa-gift-card", [`session:${paymentSessionId}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const session = await sudo.query.PaymentSession.findOne({
        where: { id: paymentSessionId },
        query: "id status providerReference idempotencyKey amount data payment { id } provider { code adapter config }"
      });
      if (!session?.provider || !session.providerReference || !session.payment) throw new Error("Payment session not found");
      const data = session.data && typeof session.data === "object" ? session.data : {};
      if (data.purpose !== "gift_card" || !data.giftCardId) throw new Error("Gift card session is invalid");
      const giftCard = await sudo.query.GiftCard.findOne({ where: { id: data.giftCardId }, query: "id code initialValue recipientEmail recipientName isActive" });
      if (!giftCard) throw new Error("Gift card not found");
      if (session.status === "completed" && giftCard.isActive) return { code: giftCard.code, email: null };
      assertPaymentTransition(session.status, "completed");
      const providerResult = await confirmProviderPayment({
        provider: paymentProviderFromRecord(session.provider),
        providerReference: session.providerReference,
        amount: session.amount,
        idempotencyKey: `${session.idempotencyKey}:confirm`
      });
      assertPaymentTransition(session.status, providerResult.status);
      if (providerResult.status !== "completed") throw new Error("Provider has not completed the payment");
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { status: "completed", completedAt: now2, data: { ...data, ...providerResult.data || {} } }, query: "id" });
      await sudo.query.Payment.updateOne({ where: { id: session.payment.id }, data: { status: "completed", processedAt: now2 }, query: "id" });
      await sudo.query.GiftCard.updateOne({ where: { id: giftCard.id }, data: { isActive: true }, query: "id" });
      const existingPurchase = (await sudo.query.GiftCardTransaction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: `${session.idempotencyKey}:purchase` } }, take: 1, query: "id" }))[0];
      if (!existingPurchase) {
        await sudo.query.GiftCardTransaction.createOne({
          data: { practice: { connect: { id: actor.practiceId } }, giftCard: { connect: { id: giftCard.id } }, type: "purchase", amount: giftCard.initialValue, idempotencyKey: `${session.idempotencyKey}:purchase`, notes: `provider:${session.provider.code}` },
          query: "id"
        });
      }
      return {
        code: giftCard.code,
        email: giftCard.recipientEmail ? { to: giftCard.recipientEmail, recipientName: giftCard.recipientName || "There", amount: giftCard.initialValue / 100, code: giftCard.code || "" } : null
      };
    });
    if (result2.email && process.env.NODE_ENV !== "test") {
      try {
        await sendGiftCardEmail({ ...result2.email, senderName: "A client" });
      } catch (error) {
        console.error("Gift card email failed:", error);
      }
    }
    return { success: true, error: null, code: result2.code };
  } catch (error) {
    return { success: false, error: safeError2(error), code: null };
  }
}
var confirmGiftCardPurchase = import_core100.graphql.field({
  type: import_core100.graphql.object()({
    name: "ConfirmGiftCardPurchaseResult",
    fields: { success: import_core100.graphql.field({ type: import_core100.graphql.nonNull(import_core100.graphql.Boolean) }), error: import_core100.graphql.field({ type: import_core100.graphql.String }), code: import_core100.graphql.field({ type: import_core100.graphql.String }) }
  }),
  args: { paymentSessionId: import_core100.graphql.arg({ type: import_core100.graphql.nonNull(import_core100.graphql.ID) }) },
  resolve(_source, { paymentSessionId }, context) {
    return confirmGiftCardPurchaseTransaction(context, paymentSessionId);
  }
});
async function applyGiftCardBalanceTransaction(context, args) {
  const denied18 = { success: false, giftCardId: null, transactionId: null, currentBalance: null };
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance);
    await assertPracticeRecord(context, "GiftCard", args.giftCardId);
    if (args.appointmentId) await assertPracticeRecord(context, "Appointment", args.appointmentId);
  } catch (error) {
    return { ...denied18, error: error instanceof Error ? error.message : "Gift card not found" };
  }
  if (!(/* @__PURE__ */ new Set(["redemption", "refund"])).has(args.action)) return { ...denied18, error: "Gift card action is invalid" };
  if (!Number.isInteger(args.amount) || args.amount <= 0 || args.amount > 1e7) return { ...denied18, error: "Gift card amount must be positive integer cents" };
  if (!validKey(args.idempotencyKey)) return { ...denied18, error: "Idempotency key is invalid" };
  if ((args.reason?.length || 0) > 1e3) return { ...denied18, error: "Gift card reason is too long" };
  try {
    return await serializableWorkflow(context, "medspa-gift-card", [`card:${args.giftCardId}`, `balance:${args.idempotencyKey}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.GiftCardTransaction.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } },
        take: 1,
        query: "id type amount giftCard { id currentBalance } appointment { id }"
      }))[0];
      if (existing) {
        if (existing.giftCard?.id !== args.giftCardId || existing.type !== args.action || Math.abs(existing.amount) !== args.amount || (existing.appointment?.id || null) !== (args.appointmentId || null)) {
          throw new Error("Idempotency key was already used for another gift card operation");
        }
        return { success: true, giftCardId: args.giftCardId, transactionId: existing.id, currentBalance: existing.giftCard.currentBalance, error: null };
      }
      const giftCard = await sudo.query.GiftCard.findOne({ where: { id: args.giftCardId }, query: "id initialValue currentBalance isActive expiresAt" });
      if (!giftCard) throw new Error("Gift card not found");
      if (giftCard.expiresAt && new Date(giftCard.expiresAt).getTime() <= Date.now()) throw new Error("Gift card has expired");
      if (args.action === "redemption" && (!giftCard.isActive || giftCard.currentBalance < args.amount)) throw new Error("Gift card has insufficient available balance");
      if (args.action === "refund" && giftCard.currentBalance + args.amount > giftCard.initialValue) throw new Error("Gift card refund exceeds its original value");
      if (args.appointmentId) {
        const appointment = await sudo.query.Appointment.findOne({ where: { id: args.appointmentId }, query: "id status" });
        if (!appointment) throw new Error("Gift card appointment not found");
      }
      const currentBalance = args.action === "redemption" ? giftCard.currentBalance - args.amount : giftCard.currentBalance + args.amount;
      const transaction = await sudo.query.GiftCardTransaction.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } },
          giftCard: { connect: { id: giftCard.id } },
          type: args.action,
          amount: args.action === "redemption" ? -args.amount : args.amount,
          appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : void 0,
          idempotencyKey: args.idempotencyKey,
          notes: args.reason?.trim() || ""
        },
        query: "id"
      });
      await sudo.query.GiftCard.updateOne({ where: { id: giftCard.id }, data: { currentBalance, isActive: currentBalance > 0 }, query: "id" });
      return { success: true, giftCardId: giftCard.id, transactionId: transaction.id, currentBalance, error: null };
    });
  } catch (error) {
    return { ...denied18, error: safeError2(error) };
  }
}
var applyGiftCardBalance = import_core100.graphql.field({
  type: import_core100.graphql.object()({
    name: "ApplyGiftCardBalanceResult",
    fields: {
      success: import_core100.graphql.field({ type: import_core100.graphql.nonNull(import_core100.graphql.Boolean) }),
      giftCardId: import_core100.graphql.field({ type: import_core100.graphql.ID }),
      transactionId: import_core100.graphql.field({ type: import_core100.graphql.ID }),
      currentBalance: import_core100.graphql.field({ type: import_core100.graphql.Int }),
      error: import_core100.graphql.field({ type: import_core100.graphql.String })
    }
  }),
  args: {
    giftCardId: import_core100.graphql.arg({ type: import_core100.graphql.nonNull(import_core100.graphql.ID) }),
    action: import_core100.graphql.arg({ type: import_core100.graphql.nonNull(import_core100.graphql.String) }),
    amount: import_core100.graphql.arg({ type: import_core100.graphql.nonNull(import_core100.graphql.Int) }),
    appointmentId: import_core100.graphql.arg({ type: import_core100.graphql.ID }),
    reason: import_core100.graphql.arg({ type: import_core100.graphql.String }),
    idempotencyKey: import_core100.graphql.arg({ type: import_core100.graphql.nonNull(import_core100.graphql.String) })
  },
  resolve(_source, args, context) {
    return applyGiftCardBalanceTransaction(context, args);
  }
});
var giftCardMutations = { purchaseGiftCard, confirmGiftCardPurchase, applyGiftCardBalance };

// features/keystone/mutations/bookAppointment.ts
var import_core101 = require("@keystone-6/core");

// features/keystone/serviceSnapshot.ts
function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function nonnegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("Service snapshot price must be nonnegative integer cents");
  return parsed;
}
function canonicalImagePath(value) {
  if (typeof value !== "string") return "";
  const path = value.trim();
  return path.startsWith("/images/") && !path.includes("..") ? path : "";
}
function captureServiceSnapshot(service) {
  const serviceTitle = typeof service.name === "string" ? service.name.trim() : "";
  if (!serviceTitle || serviceTitle.length > 300) throw new Error("Service snapshot title is invalid");
  const serviceImagePath = canonicalImagePath(service.image?.imagePath) || canonicalImagePath(service.image?.image?.url);
  return {
    serviceTitle,
    serviceImagePath,
    duration: positiveInteger(service.baseDuration ?? service.duration, 60),
    price: nonnegativeInteger(service.price ?? service.basePrice ?? 0)
  };
}

// features/keystone/clinicalAuthority.ts
async function evaluateProviderAuthority(sudo, input) {
  if (Number.isNaN(input.at.getTime())) throw new Error("Authority evaluation time is invalid");
  const [provider, location, service] = await Promise.all([
    sudo.query.Provider.findOne({ where: { id: input.providerId }, query: "id status isActive practice { id } locations { id }" }),
    sudo.query.Location.findOne({ where: { id: input.locationId }, query: "id state isActive practice { id }" }),
    sudo.query.Service.findOne({ where: { id: input.serviceId }, query: "id status staffAuthorizationRequired practice { id }" })
  ]);
  if (!provider || provider.status !== "active" || provider.isActive !== true || !location || location.isActive !== true || !service || service.status !== "active") throw new Error("Configured provider authority is unavailable");
  const practiceId5 = provider.practice?.id;
  if (!practiceId5 || location.practice?.id !== practiceId5 || service.practice?.id !== practiceId5 || !provider.locations?.some((item) => item.id === location.id)) throw new Error("Configured provider authority is unavailable");
  const authorizations = await sudo.query.ProviderAuthorization.findMany({
    where: { provider: { id: { equals: provider.id } }, service: { id: { equals: service.id } }, location: { id: { equals: location.id } }, status: { equals: "active" }, effectiveFrom: { lte: input.at.toISOString() } },
    take: 20,
    query: "id effectiveFrom effectiveTo supervisionRequired supervisionMode policyVersion authorityEvidenceHash requiredSupervisor { id status } credential { id status effectiveFrom expiresAt primarySourceVerified scopeEvidenceHash jurisdiction }"
  });
  if (authorizations.some((item) => !Number.isFinite(Date.parse(item.effectiveFrom)) || new Date(item.effectiveFrom) > input.at || item.effectiveTo && !Number.isFinite(Date.parse(item.effectiveTo)))) throw new Error("Provider authority validity interval is invalid");
  const effectiveAuthorizations = authorizations.filter((item) => !item.effectiveTo || new Date(item.effectiveTo) > input.at);
  if (effectiveAuthorizations.length !== 1) throw new Error(effectiveAuthorizations.length ? "Provider authority configuration is ambiguous" : "No effective provider authorization is configured");
  const authorization = effectiveAuthorizations[0];
  if (!authorization?.credential) throw new Error("No effective provider authorization is configured");
  const credential = authorization.credential;
  const jurisdictionMatches = credential.jurisdiction === "*" || credential.jurisdiction?.toLowerCase() === location.state?.toLowerCase();
  if (credential.status !== "verified" || credential.primarySourceVerified !== true || !jurisdictionMatches || !Number.isFinite(Date.parse(credential.effectiveFrom)) || !Number.isFinite(Date.parse(credential.expiresAt)) || new Date(credential.effectiveFrom) > input.at || new Date(credential.expiresAt) <= input.at) throw new Error("Provider credential is not effective for this service, location, and time");
  const requiredSupervisorId = authorization.requiredSupervisor?.id || null;
  const evaluatedSupervisorId = input.supervisorId || (input.stage === "scheduling" ? requiredSupervisorId : null);
  if (authorization.supervisionRequired) {
    if (!requiredSupervisorId || evaluatedSupervisorId !== requiredSupervisorId || authorization.requiredSupervisor.status !== "active") throw new Error("Required clinical supervision is unavailable");
    const supervisorCredentials = await sudo.query.ProviderCredential.findMany({
      where: { provider: { id: { equals: requiredSupervisorId } }, status: { equals: "verified" }, effectiveFrom: { lte: input.at.toISOString() }, expiresAt: { gt: input.at.toISOString() }, primarySourceVerified: { equals: true } },
      take: 5,
      query: "id jurisdiction scopeEvidenceHash"
    });
    if (!supervisorCredentials.some((item) => item.jurisdiction === "*" || item.jurisdiction?.toLowerCase() === location.state?.toLowerCase())) throw new Error("Required supervisor credential is unavailable");
  }
  const evidence = {
    stage: input.stage,
    practiceId: practiceId5,
    providerId: provider.id,
    serviceId: service.id,
    locationId: location.id,
    authorizationId: authorization.id,
    credentialId: credential.id,
    supervisorId: requiredSupervisorId,
    policyVersion: authorization.policyVersion,
    authorityEvidenceHash: authorization.authorityEvidenceHash,
    credentialEvidenceHash: credential.scopeEvidenceHash,
    decidedAt: input.at.toISOString()
  };
  return { ...evidence, evidenceHash: evidenceHash(evidence) };
}
async function recordAuthorityDecision(context, decision, links, idempotencyKey) {
  return context.sudo().query.ClinicalAuthorityEvent.createOne({
    data: {
      practice: { connect: { id: decision.practiceId } },
      location: { connect: { id: decision.locationId } },
      provider: { connect: { id: decision.providerId } },
      supervisor: decision.supervisorId ? { connect: { id: decision.supervisorId } } : void 0,
      credential: { connect: { id: decision.credentialId } },
      authorization: { connect: { id: decision.authorizationId } },
      service: { connect: { id: decision.serviceId } },
      client: links.clientId ? { connect: { id: links.clientId } } : void 0,
      appointment: links.appointmentId ? { connect: { id: links.appointmentId } } : void 0,
      treatmentSession: links.treatmentSessionId ? { connect: { id: links.treatmentSessionId } } : void 0,
      stage: decision.stage,
      decision: "allowed",
      reason: "Configured authority predicates satisfied",
      policyVersion: decision.policyVersion,
      evidence: decision,
      evidenceHash: decision.evidenceHash,
      decidedAt: decision.decidedAt,
      idempotencyKey
    },
    query: "id evidenceHash"
  });
}

// features/keystone/scheduling/capacity.ts
function overlapsInstantInterval(leftStart, leftEnd, rightStart, rightEnd) {
  const start = new Date(String(leftStart)).getTime();
  const end = new Date(String(leftEnd)).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start < rightEnd.getTime() && end > rightStart.getTime();
}
function retainedBuffer(value, fallback) {
  if (value === void 0 || value === null) return fallback;
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Math.max(fallback, Number(value)) : Number.POSITIVE_INFINITY;
}
function hasAppointmentConflict(appointments, start, end, bufferMinutes) {
  return appointments.some((appointment) => {
    const appointmentStart2 = new Date(appointment.startTime).getTime();
    const appointmentEnd = appointment.endTime ? new Date(appointment.endTime).getTime() : appointmentStart2 + Number(appointment.duration || 0) * 6e4;
    return Number.isFinite(appointmentStart2) && Number.isFinite(appointmentEnd) && appointmentStart2 < end.getTime() && appointmentEnd + retainedBuffer(appointment.metadata?.capacityBufferMinutes, bufferMinutes) * 6e4 > start.getTime();
  });
}
function hasReservationConflict(reservations, ownerId, start, end, relation) {
  return reservations.some((reservation) => reservation[relation]?.id === ownerId && overlapsInstantInterval(reservation.startsAt, reservation.endsAt, start, end));
}
function hasResourceCapacity({
  resourceId,
  capacity,
  start,
  end,
  reservations,
  appointments,
  blocks,
  bufferMinutes
}) {
  const resourceCapacity = Number(capacity);
  if (!Number.isSafeInteger(resourceCapacity) || resourceCapacity < 1) return false;
  if (blocks.some((block) => block.resource?.id === resourceId && overlapsInstantInterval(block.startsAt, block.endsAt, start, end))) return false;
  const resourceReservations = reservations.filter((reservation) => reservation.resource?.id === resourceId);
  if (resourceReservations.some((reservation) => !Number.isFinite(retainedBuffer(reservation.assignmentEvidence?.cleanupBufferMinutes, bufferMinutes)))) return false;
  const segmentedPairs = new Set(resourceReservations.map((reservation) => `${reservation.appointment?.id}:${resourceId}`));
  const segmentUnits = resourceReservations.filter((reservation) => overlapsInstantInterval(reservation.startsAt, new Date(new Date(reservation.endsAt).getTime() + retainedBuffer(reservation.assignmentEvidence?.cleanupBufferMinutes, bufferMinutes) * 6e4), start, end)).reduce((sum, reservation) => {
    const units = Number(reservation.units);
    return Number.isSafeInteger(units) && units >= 1 ? sum + units : Number.POSITIVE_INFINITY;
  }, 0);
  const legacyUnits = appointments.filter((appointment) => {
    const assigned = appointment.resource?.id === resourceId || appointment.room?.id === resourceId || appointment.device?.id === resourceId;
    if (!assigned || segmentedPairs.has(`${appointment.id}:${resourceId}`)) return false;
    const appointmentStart2 = new Date(appointment.startTime).getTime();
    const appointmentEnd = appointment.endTime ? new Date(appointment.endTime).getTime() : appointmentStart2 + Number(appointment.duration || 0) * 6e4;
    return Number.isFinite(appointmentStart2) && Number.isFinite(appointmentEnd) && appointmentStart2 < end.getTime() && appointmentEnd + retainedBuffer(appointment.metadata?.capacityBufferMinutes, bufferMinutes) * 6e4 > start.getTime();
  }).length;
  return segmentUnits + legacyUnits < resourceCapacity;
}

// features/keystone/scheduling/availability.ts
var SLOT_INTERVAL_MINUTES = 30;
var BOOKING_BUFFER_MINUTES = 15;
var ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed", "in_progress"];
function assertDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Availability date is invalid");
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Availability date is invalid");
  return value;
}
function timeToMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error("Schedule time must use HH:MM");
  return Number(match[1]) * 60 + Number(match[2]);
}
function timeLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(mins).padStart(2, "0")} ${period}`;
}
function validTimeZone(value) {
  const timezone = typeof value === "string" && value.trim() ? value.trim() : "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(/* @__PURE__ */ new Date());
    return timezone;
  } catch {
    throw new Error("MedSpa timezone is invalid");
  }
}
function wallParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short"
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value || "0";
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    weekday: weekdays[value("weekday")] ?? 0
  };
}
function zonedDateKey(date, timezone) {
  const parts = wallParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
function nextDateKey(dateKey2) {
  const date = /* @__PURE__ */ new Date(`${dateKey2}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
function zonedDateTimeToUtc(dateKey2, minutes, timezone) {
  assertDateKey(dateKey2);
  const [year, month, day] = dateKey2.split("-").map(Number);
  const desiredHour = Math.floor(minutes / 60);
  const desiredMinute = minutes % 60;
  const desiredWall = Date.UTC(year, month - 1, day, desiredHour, desiredMinute, 0, 0);
  let guess = desiredWall;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = wallParts(new Date(guess), timezone);
    const actualWall = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0, 0);
    const correction = desiredWall - actualWall;
    guess += correction;
    if (correction === 0) break;
  }
  const result2 = new Date(guess);
  const verified = wallParts(result2, timezone);
  if (verified.year !== year || verified.month !== month || verified.day !== day || verified.hour !== desiredHour || verified.minute !== desiredMinute) {
    throw new Error("Selected local time does not exist in the medspa timezone");
  }
  return result2;
}
function zonedDayWindow(dateKey2, timezone) {
  return {
    start: zonedDateTimeToUtc(dateKey2, 0, timezone),
    end: zonedDateTimeToUtc(nextDateKey(dateKey2), 0, timezone)
  };
}
function scheduleDateKey(schedule) {
  if (schedule.localDate && /^\d{4}-\d{2}-\d{2}$/.test(schedule.localDate)) return schedule.localDate;
  if (!schedule.date) return null;
  const date = new Date(schedule.date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
function withinEffectiveRange(schedule, dateKey2) {
  const from = schedule.effectiveFrom ? new Date(schedule.effectiveFrom).toISOString().slice(0, 10) : null;
  const to = schedule.effectiveTo ? new Date(schedule.effectiveTo).toISOString().slice(0, 10) : null;
  return (!from || dateKey2 >= from) && (!to || dateKey2 <= to);
}
function overlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}
function interval(schedule) {
  return { start: timeToMinutes(schedule.startTime), end: timeToMinutes(schedule.endTime) };
}
async function getRuntimeLocation(sudo, locationId, practiceId5, publicOnly = false) {
  const selection = "id timezone isActive practice { id isActive storefrontSetting { isPublished primaryLocation { id } } }";
  const usable = (location) => location?.isActive === true && (!practiceId5 || location.practice?.id === practiceId5) && (!publicOnly || location.practice?.isActive === true && location.practice?.storefrontSetting?.isPublished === true && location.practice.storefrontSetting.primaryLocation?.id === location.id);
  if (locationId) {
    const location = await sudo.query.Location.findOne({ where: { id: locationId }, query: selection });
    if (!usable(location)) throw new Error("Location is unavailable");
    return { locationId: location.id, timezone: validTimeZone(location.timezone) };
  }
  const locations = await sudo.query.Location.findMany({
    where: {
      isActive: { equals: true },
      practice: practiceId5 ? { id: { equals: practiceId5 } } : void 0
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    query: selection
  });
  const usableLocations = locations.filter(usable);
  if (usableLocations.length !== 1) throw new Error(usableLocations.length ? "Choose a medspa location" : "No active medspa location is configured");
  return { locationId: usableLocations[0].id, timezone: validTimeZone(usableLocations[0].timezone) };
}
async function computeProviderAvailability({
  sudo,
  providerId,
  date,
  serviceDuration,
  serviceIds = [],
  locationId: requestedLocationId,
  publicOnly = false,
  excludeAppointmentId
}) {
  const dateKey2 = assertDateKey(date);
  if (!Number.isInteger(serviceDuration) || serviceDuration < 1 || serviceDuration > 8 * 60) throw new Error("Service duration is invalid");
  const provider = await sudo.query.Provider.findOne({
    where: { id: providerId },
    query: "id status isActive isPublic practice { id } user { name } locations { id }"
  });
  if (!provider || provider.status !== "active" || provider.isActive !== true || publicOnly && provider.isPublic !== true) throw new Error("Provider is unavailable");
  if (!provider.practice?.id) throw new Error("Provider practice is unavailable");
  const { locationId, timezone } = await getRuntimeLocation(sudo, requestedLocationId, provider.practice.id, publicOnly);
  const localNoon = zonedDateTimeToUtc(dateKey2, 12 * 60, timezone);
  const requestedWeekday = wallParts(localNoon, timezone).weekday;
  if (!provider.locations?.some((location) => location.id === locationId)) throw new Error("Provider is not assigned to this location");
  const schedules = await sudo.query.ProviderSchedule.findMany({
    where: {
      practice: { id: { equals: provider.practice.id } },
      provider: { id: { equals: providerId } },
      location: { id: { equals: locationId } }
    },
    take: 1001,
    query: "id type dayOfWeek localDate date startTime endTime isAvailable isPublic breakStart breakEnd effectiveFrom effectiveTo reason"
  });
  const exact = schedules.filter((schedule) => scheduleDateKey(schedule) === dateKey2);
  const oneTimeAvailable = exact.filter((schedule) => schedule.type === "one_time" && schedule.isAvailable && (!publicOnly || schedule.isPublic === true));
  const recurring = schedules.filter((schedule) => schedule.type === "recurring" && schedule.isAvailable && schedule.dayOfWeek === requestedWeekday && withinEffectiveRange(schedule, dateKey2) && (!publicOnly || schedule.isPublic === true));
  const availability = oneTimeAvailable.length ? oneTimeAvailable : recurring;
  const blocks = exact.filter((schedule) => schedule.type === "time_off" || schedule.type === "one_time" && !schedule.isAvailable);
  const { start: dayStart, end: dayEnd } = zonedDayWindow(dateKey2, timezone);
  const previousCapacityWindow = new Date(dayStart.getTime() - 2 * 864e5);
  const appointments = await sudo.query.Appointment.findMany({
    where: {
      NOT: excludeAppointmentId ? { id: { equals: excludeAppointmentId } } : void 0,
      provider: { id: { equals: providerId } },
      startTime: { gte: previousCapacityWindow.toISOString(), lt: dayEnd.toISOString() },
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] }
    },
    take: 1001,
    query: "id startTime endTime duration metadata location { id }"
  });
  const primarySupervisorReservations = await sudo.query.AppointmentSupervisorReservation.findMany({ where: { NOT: excludeAppointmentId ? { appointment: { id: { equals: excludeAppointmentId } } } : void 0, supervisor: { id: { equals: providerId } }, startsAt: { lt: dayEnd.toISOString() }, endsAt: { gt: previousCapacityWindow.toISOString() }, status: { equals: "reserved" } }, take: 1001, query: "id startsAt endsAt supervisor { id }" });
  if (primarySupervisorReservations.length > 1e3) throw new Error("Staff reservation history exceeds the safe verification bound");
  const resourceAppointments = await sudo.query.Appointment.findMany({
    where: {
      NOT: excludeAppointmentId ? { id: { equals: excludeAppointmentId } } : void 0,
      location: { id: { equals: locationId } },
      startTime: { gte: previousCapacityWindow.toISOString(), lt: dayEnd.toISOString() },
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] }
    },
    take: 1001,
    query: "id startTime endTime duration metadata resource { id } room { id } device { id }"
  });
  const resourceReservations = await sudo.query.AppointmentResourceReservation.findMany({
    where: { NOT: excludeAppointmentId ? { appointment: { id: { equals: excludeAppointmentId } } } : void 0, location: { id: { equals: locationId } }, startsAt: { lt: dayEnd.toISOString() }, endsAt: { gt: previousCapacityWindow.toISOString() }, status: { in: ["reserved", "in_use"] } },
    take: 1001,
    query: "id startsAt endsAt units assignmentEvidence resource { id } appointment { id }"
  });
  const resourceScheduleBlocks = await sudo.query.ResourceScheduleBlock.findMany({
    where: { location: { id: { equals: locationId } }, startsAt: { lt: dayEnd.toISOString() }, endsAt: { gt: dayStart.toISOString() } },
    take: 1001,
    query: "id startsAt endsAt resource { id }"
  });
  const services = serviceIds.length ? await sudo.query.Service.findMany({
    where: {
      id: { in: [...new Set(serviceIds)] },
      status: { equals: "active" },
      isPublic: publicOnly ? { equals: true } : void 0,
      practice: { id: { equals: provider.practice.id } }
    },
    query: "id staffAuthorizationRequired cleanupBufferMinutes requiredResources { id name type capacity isActive isPublic readinessStatus maintenanceDueAt calibrationDueAt practice { id } location { id } }"
  }) : [];
  if (serviceIds.length && services.length !== new Set(serviceIds).size) throw new Error("A selected service is unavailable");
  if (services.some((service) => (service.requiredResources || []).some((resource) => resource.isActive !== true || publicOnly && resource.isPublic !== true))) {
    throw new Error("A selected service has no active public request resource");
  }
  const authorityDecisions = [];
  for (const service of services.filter((item) => item.staffAuthorizationRequired !== false)) authorityDecisions.push(await evaluateProviderAuthority(sudo, {
    providerId,
    serviceId: service.id,
    locationId,
    at: localNoon,
    stage: "scheduling"
  }));
  const supervisorIds = [...new Set(authorityDecisions.map((decision) => decision.supervisorId).filter(Boolean))];
  const resourceRequirements = services.flatMap((service) => service.requiredResources || []);
  if (resourceRequirements.some((resource) => !resource?.id || resource.practice?.id !== provider.practice.id || resource.location?.id !== locationId)) {
    throw new Error("Selected service has no resource configured at this location");
  }
  const requiredResources = resourceRequirements.filter((resource, index, all) => all.findIndex((candidate) => candidate.id === resource.id) === index);
  if (services.some((service) => service.requiredResources?.length) && requiredResources.length === 0) throw new Error("Selected service has no resource configured at this location");
  if (requiredResources.some((resource) => ["device", "equipment"].includes(resource.type) && resource.readinessStatus !== "available")) throw new Error("A required device is not released and ready");
  const supervisorAppointments = supervisorIds.length ? await sudo.query.Appointment.findMany({
    where: { NOT: excludeAppointmentId ? { id: { equals: excludeAppointmentId } } : void 0, provider: { id: { in: supervisorIds } }, startTime: { gte: previousCapacityWindow.toISOString(), lt: dayEnd.toISOString() }, status: { in: [...ACTIVE_APPOINTMENT_STATUSES] } },
    take: 1001,
    query: "id startTime endTime duration metadata provider { id }"
  }) : [];
  const supervisorReservations = supervisorIds.length ? await sudo.query.AppointmentSupervisorReservation.findMany({
    where: { NOT: excludeAppointmentId ? { appointment: { id: { equals: excludeAppointmentId } } } : void 0, supervisor: { id: { in: supervisorIds } }, startsAt: { lt: dayEnd.toISOString() }, endsAt: { gt: new Date(dayStart.getTime() - 864e5).toISOString() }, status: { equals: "reserved" } },
    take: 1001,
    query: "id startsAt endsAt supervisor { id }"
  }) : [];
  const supervisorSchedules = supervisorIds.length ? await sudo.query.ProviderSchedule.findMany({
    where: { practice: { id: { equals: provider.practice.id } }, provider: { id: { in: supervisorIds } }, location: { id: { equals: locationId } } },
    take: 1001,
    query: "id provider { id } type dayOfWeek localDate date startTime endTime isAvailable isPublic reason effectiveFrom effectiveTo"
  }) : [];
  if (schedules.length > 1e3 || appointments.length > 1e3 || resourceAppointments.length > 1e3 || resourceReservations.length > 1e3 || resourceScheduleBlocks.length > 1e3 || supervisorAppointments.length > 1e3 || supervisorReservations.length > 1e3 || supervisorSchedules.length > 1e3) throw new Error("Availability data exceeds the safe verification bound");
  const cleanupBufferMinutes = Math.max(BOOKING_BUFFER_MINUTES, ...services.map((service) => Math.max(0, Number(service.cleanupBufferMinutes) || 0)));
  const candidateMinutes = /* @__PURE__ */ new Map();
  for (const schedule of availability) {
    const range = interval(schedule);
    if (range.end <= range.start) continue;
    for (let minutes = range.start; minutes + serviceDuration <= range.end; minutes += SLOT_INTERVAL_MINUTES) {
      if (minutes + serviceDuration + cleanupBufferMinutes <= range.end && !candidateMinutes.has(minutes)) candidateMinutes.set(minutes, schedule);
    }
  }
  const slots = [];
  for (const [slotStart, schedule] of [...candidateMinutes.entries()].sort(([a], [b]) => a - b)) {
    const serviceEnd = slotStart + serviceDuration;
    const reservedEnd = serviceEnd + cleanupBufferMinutes;
    const slotStartAt = zonedDateTimeToUtc(dateKey2, slotStart, timezone);
    const slotReservedEndAt = new Date(slotStartAt.getTime() + (serviceDuration + cleanupBufferMinutes) * 6e4);
    const breakStart = schedule.breakStart ? timeToMinutes(schedule.breakStart) : null;
    const breakEnd = schedule.breakEnd ? timeToMinutes(schedule.breakEnd) : null;
    const duringBreak = breakStart !== null && breakEnd !== null && overlap(slotStart, reservedEnd, breakStart, breakEnd);
    const blockedSchedule = blocks.find((block) => {
      const range = interval(block);
      return overlap(slotStart, reservedEnd, range.start, range.end);
    });
    const appointmentConflict = hasAppointmentConflict(appointments, slotStartAt, slotReservedEndAt, BOOKING_BUFFER_MINUTES) || hasReservationConflict(primarySupervisorReservations, providerId, slotStartAt, slotReservedEndAt, "supervisor");
    const selectedResources = requiredResources.filter((resource) => (!["device", "equipment"].includes(resource.type) || [resource.maintenanceDueAt, resource.calibrationDueAt].every((due) => !due || Number.isFinite(Date.parse(due)) && Date.parse(due) > slotReservedEndAt.getTime())) && hasResourceCapacity({
      resourceId: resource.id,
      capacity: Number(resource.capacity || 1),
      start: slotStartAt,
      end: slotReservedEndAt,
      reservations: resourceReservations,
      appointments: resourceAppointments,
      blocks: resourceScheduleBlocks,
      bufferMinutes: BOOKING_BUFFER_MINUTES
    }));
    const resourceBlocked = selectedResources.length !== requiredResources.length;
    const supervisorBlocked = supervisorIds.some((supervisorId) => {
      const schedulesForSupervisor = supervisorSchedules.filter((schedule2) => schedule2.provider?.id === supervisorId);
      const hasCoverage = schedulesForSupervisor.some((schedule2) => schedule2.isAvailable && (!publicOnly || schedule2.isPublic === true) && (schedule2.type === "one_time" && scheduleDateKey(schedule2) === dateKey2 || schedule2.type === "recurring" && schedule2.dayOfWeek === requestedWeekday && withinEffectiveRange(schedule2, dateKey2)) && slotStart >= interval(schedule2).start && reservedEnd <= interval(schedule2).end);
      const blockedByTimeOff = schedulesForSupervisor.some((schedule2) => (schedule2.type === "time_off" || schedule2.type === "one_time" && !schedule2.isAvailable) && scheduleDateKey(schedule2) === dateKey2 && overlap(slotStart, reservedEnd, interval(schedule2).start, interval(schedule2).end));
      const conflict = hasAppointmentConflict(supervisorAppointments.filter((appointment) => appointment.provider?.id === supervisorId), slotStartAt, slotReservedEndAt, BOOKING_BUFFER_MINUTES);
      const reservationConflict = hasReservationConflict(supervisorReservations, supervisorId, slotStartAt, slotReservedEndAt, "supervisor");
      return !hasCoverage || blockedByTimeOff || conflict || reservationConflict;
    });
    const blockedReason = blockedSchedule ? publicOnly ? "Provider unavailable" : blockedSchedule.reason?.trim() || "Provider unavailable" : (duringBreak ? "Break time" : null) || (appointmentConflict ? "Selected provider already has an appointment at that time" : null) || (supervisorBlocked ? "Required clinical supervisor is unavailable at that time" : null) || (resourceBlocked ? "A required room, device, or equipment resource is unavailable at that time" : null);
    const primary = selectedResources[0] || null;
    slots.push({
      time: timeLabel(slotStart),
      startTime: zonedDateTimeToUtc(dateKey2, slotStart, timezone).toISOString(),
      available: !blockedReason,
      resourceId: primary?.id || null,
      resourceName: primary?.name || null,
      resourceIds: selectedResources.map((resource) => resource.id),
      roomId: selectedResources.find((resource) => resource.type === "room")?.id || null,
      deviceId: selectedResources.find((resource) => resource.type === "device")?.id || null,
      supervisorIds,
      blockedReason
    });
  }
  return {
    providerId,
    providerName: provider.user?.name || "MedSpa provider",
    date: dateKey2,
    timezone,
    locationId,
    supervisorIds,
    slots
  };
}

// features/keystone/mutations/clinicalExecutionReadiness.ts
function instant(value) {
  if (!(value instanceof Date) && typeof value !== "string") return NaN;
  return new Date(value).getTime();
}
function covers(start, end, reservationStart, reservationEnd) {
  const requestedStart = instant(start);
  const requestedEnd = instant(end);
  const left = instant(reservationStart);
  const right = instant(reservationEnd);
  return Number.isFinite(requestedStart) && Number.isFinite(requestedEnd) && requestedEnd > requestedStart && Number.isFinite(left) && Number.isFinite(right) && right > left && left <= requestedStart && right >= requestedEnd;
}
function validScope(scope) {
  return [scope.practiceId, scope.locationId, scope.appointmentId, scope.serviceId, scope.providerId].every((value) => typeof value === "string" && value.trim().length > 0);
}
function reservationCovers(reservations, scope, start, end) {
  if (!validScope(scope) || !scope.resourceId?.trim()) return false;
  return reservations.some((reservation) => {
    const assignment = reservation.assignmentEvidence;
    return reservation.status === "reserved" && reservation.practice?.id === scope.practiceId && reservation.location?.id === scope.locationId && reservation.appointment?.id === scope.appointmentId && reservation.resource?.id === scope.resourceId && reservation.purpose === scope.purpose && typeof reservation.segmentKey === "string" && reservation.segmentKey.trim().length > 0 && assignment !== null && typeof assignment === "object" && !Array.isArray(assignment) && assignment.segmentKey === reservation.segmentKey && assignment.serviceId === scope.serviceId && assignment.providerId === scope.providerId && (assignment.supervisorId || null) === (scope.supervisorId || null) && covers(start, end, reservation.startsAt, reservation.endsAt);
  });
}
function supervisorReservationCovers(reservations, scope, start, end) {
  if (!validScope(scope) || !scope.supervisorId?.trim()) return false;
  return reservations.some((reservation) => reservation.status === "reserved" && reservation.practice?.id === scope.practiceId && reservation.location?.id === scope.locationId && reservation.appointment?.id === scope.appointmentId && reservation.service?.id === scope.serviceId && reservation.supervisor?.id === scope.supervisorId && covers(start, end, reservation.startsAt, reservation.endsAt));
}
async function loadRequiredIntakeManifest(sudo, practiceId5, service) {
  if (service.requiresIntakeReview !== true) return [];
  const categoryId = service.category?.id;
  if (!categoryId) throw new Error("A versioned required-intake category is unavailable");
  const templates = await sudo.query.FormTemplate.findMany({
    where: { practice: { id: { equals: practiceId5 } }, isActive: { equals: true }, requiredForCategories: { some: { id: { equals: categoryId } } } },
    take: 101,
    query: "id version isActive requiredForCategories { id }"
  });
  if (templates.length > 100) throw new Error("Required intake templates exceed the safe verification bound");
  if (!templates.length) throw new Error("No active versioned intake templates are configured for this service");
  if (templates.some((template) => !template.id || !Number.isInteger(template.version) || template.version < 1 || template.isActive !== true || !template.requiredForCategories?.some((category) => category.id === categoryId))) throw new Error("Required intake template manifest is invalid");
  return templates.map((template) => ({ id: template.id, version: template.version })).sort((a, b) => a.id.localeCompare(b.id));
}
async function assertCurrentIntakeEvidence(sudo, input) {
  const maxAgeDays = Number(process.env.MEDSPA_INTAKE_MAX_AGE_DAYS);
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 1 || !input.clientUserId || !input.requiredForms.length) throw new Error("Current reviewed intake policy is unavailable");
  const templateIds = input.requiredForms.map((form) => form.id);
  const templates = await sudo.query.FormTemplate.findMany({
    where: { practice: { id: { equals: input.practiceId } }, id: { in: templateIds } },
    take: 101,
    query: "id version isActive requiredForCategories { id }"
  });
  if (templates.length > 100 || templates.length !== input.requiredForms.length) throw new Error("Versioned required-intake templates are unavailable");
  for (const expected of input.requiredForms) {
    const template = templates.find((candidate) => candidate.id === expected.id);
    if (!template || template.isActive !== true || !Number.isInteger(template.version) || template.version !== expected.version || !template.requiredForCategories?.some((category) => category.id === input.categoryId)) {
      throw new Error("Required intake template changed after the clinical order was issued");
    }
  }
  const submissions = await sudo.query.FormSubmission.findMany({
    where: {
      practice: { id: { equals: input.practiceId } },
      client: { id: { equals: input.clientUserId } },
      appointment: { id: { equals: input.appointmentId } },
      template: { id: { in: templateIds } }
    },
    take: 1001,
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    query: "id status templateVersion submittedAt reviewedAt evidenceHash template { id } reviewActions(orderBy: { occurredAt: desc }, take: 1) { disposition evidenceHash occurredAt }"
  });
  if (submissions.length > 1e3) throw new Error("Intake review evidence exceeds the safe verification bound");
  const latestByTemplate = /* @__PURE__ */ new Map();
  for (const submission of submissions) {
    const templateId = submission.template?.id;
    if (templateId && !latestByTemplate.has(templateId)) latestByTemplate.set(templateId, submission);
  }
  const maxAgeMs = maxAgeDays * 864e5;
  for (const expected of input.requiredForms) {
    const submission = latestByTemplate.get(expected.id);
    const reviewedAt = submission?.reviewedAt ? new Date(submission.reviewedAt).getTime() : NaN;
    const submittedAt = submission?.submittedAt ? new Date(submission.submittedAt).getTime() : NaN;
    if (!submission || submission.status !== "reviewed" || submission.templateVersion !== expected.version || !submission.evidenceHash || !Number.isFinite(reviewedAt) || !Number.isFinite(submittedAt) || reviewedAt < submittedAt || reviewedAt > Date.now() || reviewedAt < Date.now() - maxAgeMs || submission.reviewActions?.[0]?.disposition !== "reviewed" || !submission.reviewActions[0].evidenceHash) {
      throw new Error("Current reviewed evidence for every required intake version is required");
    }
  }
}
async function assertCurrentClinicalStartReadiness(sudo, session, order, consent, startsAt, endsAt) {
  if (session.plan?.practice?.id !== session.practice?.id || session.plan?.client?.id !== session.client?.id || order.practice?.id !== session.practice?.id || consent.practice?.id !== session.practice?.id || order.location?.id !== session.location?.id || order.plan?.id !== session.plan?.id || order.supersededBy?.id || consent.supersededBy?.id || order.authorizedPerformer?.id && order.authorizedPerformer.id !== session.provider?.id || (order.requiredSupervisor?.id || null) !== (session.supervisor?.id || null) || order.consultation?.practice?.id !== session.practice?.id || order.consultation?.location?.id !== session.location?.id || order.consultation?.staffDecisionRecorded !== true || !Number.isFinite(instant(order.consultation?.signedAt)) || instant(order.consultation.signedAt) > startsAt.getTime() || !/^[a-f0-9]{64}$/.test(order.consultation?.evidenceHash || "") || !order.consultation?.contraindicationReviewHash || !order.consultation?.contraindicationProtocolVersion || !/^[a-f0-9]{64}$/.test(order.evidenceHash || "") || !/^[a-f0-9]{64}$/.test(consent.evidenceHash || "")) throw new Error("Current human-signed order, consent, plan and provider scope are required to start");
  const service = await sudo.query.Service.findOne({ where: { id: session.service?.id || "" }, query: "id status practice { id } category { id } requiresConsultation requiresIntakeReview staffAuthorizationRequired requiresLotTraceability cleanupBufferMinutes clinicalProducts { id }" });
  const accepted = order.instructionSnapshot?.serviceRequirements;
  if (!service || !accepted || service.status !== "active" || service.practice?.id !== session.practice?.id || service.id !== accepted.serviceId || (service.category?.id || null) !== accepted.categoryId || service.requiresConsultation !== accepted.requiresConsultation || service.requiresIntakeReview !== accepted.requiresIntakeReview || service.staffAuthorizationRequired !== accepted.staffAuthorizationRequired || service.requiresLotTraceability !== accepted.requiresLotTraceability || Math.max(0, Number(service.cleanupBufferMinutes) || 0) !== accepted.cleanupBufferMinutes || JSON.stringify((service.clinicalProducts || []).map((product) => product.id).sort()) !== JSON.stringify(accepted.clinicalProductIds)) throw new Error("Current clinical service requirements changed after the human order");
  const manifest = await loadRequiredIntakeManifest(sudo, session.practice.id, service);
  if (JSON.stringify(manifest) !== JSON.stringify(accepted.requiredIntakeForms)) throw new Error("Current intake versions changed after the human order");
  return assertClinicalReadiness(sudo, session, order, consent, startsAt, endsAt, "start");
}
async function assertCurrentClinicalExecutionReadiness(sudo, session, order, consent, startsAt, endsAt) {
  return assertClinicalReadiness(sudo, session, order, consent, startsAt, endsAt, "administration");
}
async function assertClinicalReadiness(sudo, session, order, consent, startsAt, endsAt, phase) {
  if (!session.appointment?.id || !session.client?.id || !session.service?.id || !session.provider?.id) {
    throw new Error("Treatment-session links are incomplete");
  }
  if (!(phase === "start" ? ["planned", "ready"].includes(session.status) : session.status === "in_progress") || session.plan?.status !== "active") {
    throw new Error("Treatment session or plan is no longer executable");
  }
  if (!Number.isFinite(instant(startsAt)) || !Number.isFinite(instant(endsAt)) || instant(endsAt) <= instant(startsAt) || !Number.isFinite(instant(order.validFrom)) || !Number.isFinite(instant(order.validUntil)) || instant(order.validFrom) > instant(startsAt) || instant(order.validUntil) <= instant(endsAt) || !Number.isFinite(instant(consent.signedAt)) || consent.effectiveUntil && (!Number.isFinite(instant(consent.effectiveUntil)) || instant(consent.effectiveUntil) <= instant(endsAt))) throw new Error("Order and consent must be effective for the full treatment interval");
  const bookedPlan = session.appointment.metadata?.planBooking;
  if (bookedPlan) {
    const currentPlan = await sudo.query.TreatmentPlan.findOne({ where: { id: bookedPlan.planId }, query: "id status revision evidenceHash practice { id } client { id } consultation { id evidenceHash supersededBy { id } } items { id service { id } status }" });
    if (!currentPlan || currentPlan.practice?.id !== session.practice?.id || currentPlan.status !== "active" || currentPlan.id !== session.plan?.id || currentPlan.revision !== bookedPlan.planRevision || currentPlan.evidenceHash !== bookedPlan.planHash || currentPlan.client?.id !== session.client?.id || bookedPlan.providerId !== session.provider?.id || bookedPlan.serviceId !== session.service?.id || !currentPlan.items?.some((item) => item.id === bookedPlan.itemId && item.service?.id === session.service.id && ["planned", "in_progress"].includes(item.status)) || currentPlan.consultation?.id !== order.consultation?.id || currentPlan.consultation?.evidenceHash !== bookedPlan.consultationHash || currentPlan.consultation?.supersededBy?.id) throw new Error("Exact approved plan, item, and consultation version no longer authorize this booked encounter");
  }
  const serviceRequirements = order.instructionSnapshot?.serviceRequirements;
  if (!serviceRequirements || serviceRequirements.snapshotVersion !== 1 || serviceRequirements.serviceId !== session.service.id || order.status !== "active" || new Date(order.validFrom) > startsAt || new Date(order.validUntil) <= startsAt || order.protocolVersion === "" || order.client?.id !== session.client.id || order.service?.id !== session.service.id || order.consultation?.status !== "completed" || order.consultation?.candidacyDecision !== "candidate" || order.consultation?.supersededBy?.id || order.consultation?.client?.id !== session.client.id || order.consultation?.service?.id !== session.service.id) {
    throw new Error("Current active clinical order and matching candidate consultation are required");
  }
  if (consent.status !== "effective" || new Date(consent.signedAt) > startsAt || consent.effectiveUntil && new Date(consent.effectiveUntil) <= startsAt || consent.client?.id !== session.client.id || consent.appointment?.id !== session.appointment.id || consent.service?.id !== session.service.id) {
    throw new Error("Current matching treatment consent is required");
  }
  if (new Date(session.appointment.startTime) > startsAt || new Date(session.appointment.endTime) < endsAt) {
    throw new Error("Treatment interval is outside the appointment window");
  }
  if (serviceRequirements.requiresIntakeReview === true) {
    await assertCurrentIntakeEvidence(sudo, {
      practiceId: session.practice.id,
      clientUserId: session.client.user?.id,
      appointmentId: session.appointment.id,
      categoryId: serviceRequirements.categoryId,
      requiredForms: serviceRequirements.requiredIntakeForms || []
    });
  }
  const consultationId = order.consultation.id;
  const findings = await sudo.query.ContraindicationFinding.findMany({
    where: {
      practice: { id: { equals: session.practice.id } },
      consultation: { id: { equals: consultationId } },
      severity: { in: ["hard_stop", "clinician_review"] }
    },
    take: 101,
    orderBy: { detectedAt: "desc" },
    query: "id severity decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt evidenceHash }"
  });
  if (findings.length > 100) throw new Error("Contraindication review exceeds the safe verification bound");
  const unresolved = findings.some((finding) => {
    const decision = finding.decisions?.[0];
    return !decision || decision.disposition !== "cleared_with_rationale" || !/^[a-f0-9]{64}$/.test(decision.evidenceHash || "") || decision.expiresAt && (!Number.isFinite(instant(decision.expiresAt)) || instant(decision.expiresAt) <= endsAt.getTime());
  });
  if (unresolved) throw new Error("Current contraindication review blocks treatment execution");
}
async function assertResourceIntervalReady(sudo, resourceId, startsAt, endsAt) {
  const blocks = await sudo.query.ResourceScheduleBlock.findMany({
    where: {
      resource: { id: { equals: resourceId } },
      startsAt: { lt: endsAt.toISOString() },
      endsAt: { gt: startsAt.toISOString() }
    },
    take: 51,
    query: "id startsAt endsAt"
  });
  if (blocks.length) throw new Error("A required treatment resource has an overlapping maintenance or unavailable block");
  if (blocks.length > 50) throw new Error("Resource availability exceeds the safe verification bound");
}

// features/keystone/mutations/treatmentPlanApproval.ts
var PLAN_APPROVAL_ACTION = "treatment_plan.approved.v1";
function normalizedPlanApproval(args) {
  if (!validIdempotencyKey(args.idempotencyKey) || !args.title?.trim() || args.title.length > 200 || args.goals.length > 4e3 || !/^[a-f0-9]{64}$/.test(args.expectedConsultationHash || "") || !Array.isArray(args.items) || !args.items.length || args.items.length > 50) throw new Error("Treatment-plan evidence and reviewed consultation hash are required");
  const items = args.items.map((value) => {
    if (!value?.serviceId || !Number.isSafeInteger(value.plannedSessions) || value.plannedSessions < 1 || value.plannedSessions > 2147483647 || typeof value.intervalNotes !== "string" || value.intervalNotes.length > 1e3) throw new Error("Planned service, session count, and interval notes are invalid");
    return { serviceId: String(value.serviceId), plannedSessions: value.plannedSessions, intervalNotes: value.intervalNotes.trim() };
  });
  if (new Set(items.map((item) => item.serviceId)).size !== items.length) throw new Error("Each service may appear only once in a plan");
  const date = (value) => value ? new Date(value).toISOString() : null;
  const startsAt = date(args.startsAt), endsAt = date(args.endsAt);
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error("Plan end must follow plan start");
  return { clientId: args.clientId, consultationId: args.consultationId, providerId: args.providerId, title: args.title.trim(), goals: args.goals.trim(), startsAt, endsAt, items, supersedesId: args.supersedesId || null, expectedConsultationHash: args.expectedConsultationHash };
}
async function loadPlanApprovalReceipt(sudo, practiceId5, planId) {
  const events = await sudo.query.AuditEvent.findMany({
    where: { practice: { id: { equals: practiceId5 } }, action: { equals: PLAN_APPROVAL_ACTION }, resourceType: { equals: "TreatmentPlan" }, resourceId: { equals: planId } },
    take: 2,
    query: "id evidence evidenceHash actor { id }"
  });
  if (events.length !== 1) throw new Error("Plan has no unambiguous versioned approval receipt; review and supersede legacy evidence");
  const receipt = events[0].evidence;
  if (receipt?.version !== 1 || receipt.practiceId !== practiceId5 || receipt.planId !== planId || evidenceHash(receipt) !== events[0].evidenceHash || receipt.actorId !== events[0].actor?.id) throw new Error("Plan approval receipt is invalid");
  return { receipt, evidenceHash: events[0].evidenceHash };
}
async function approveTreatmentPlanTransaction(context, args) {
  try {
    const actor = requireActorPractice(context, permissions.canManageClinical);
    const input = normalizedPlanApproval(args);
    const requestHash = evidenceHash({ version: 1, practiceId: actor.practiceId, actorId: actor.actorId, input });
    return await serializableWorkflow(context, "medspa-treatment-plan", [`client:${input.clientId}`, `idempotency:${actor.practiceId}:${args.idempotencyKey}`], async (tx) => {
      await assertActiveActor(tx);
      const sudo = tx.sudo();
      const client = await assertPracticeRecord(tx, "Client", input.clientId, "id practice { id } user { id status practice { id } }");
      const provider = await assertPracticeRecord(tx, "Provider", input.providerId, "id status isActive practice { id } user { id status } locations { id }");
      if (client.user?.status !== "active" || client.user.practice?.id !== actor.practiceId || provider.user?.id !== actor.actorId || provider.user.status !== "active" || provider.status !== "active" || provider.isActive !== true) throw new Error("Current patient and approving provider authority are required");
      const existing = await sudo.query.TreatmentPlan.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 2, query: "id evidenceHash client { id }" });
      if (existing.length > 1) throw new Error("Plan request identity is ambiguous");
      if (existing[0]) {
        const prior = await loadPlanApprovalReceipt(sudo, actor.practiceId, existing[0].id);
        await assertPlanStaffMembership(sudo, actor.practiceId, actor.actorId, prior.receipt.locationId);
        const replayLocation = await assertPracticeRecord(tx, "Location", prior.receipt.locationId, "id isActive practice { id }");
        if (replayLocation.isActive !== true || !provider.locations?.some((value) => value.id === replayLocation.id)) throw new Error("Approving location assignment is no longer active");
        if (prior.receipt.requestHash !== requestHash || prior.evidenceHash !== existing[0].evidenceHash || existing[0].client?.id !== input.clientId) throw new Error("Plan key was already used with different evidence");
        return { success: true, recordId: existing[0].id, evidenceHash: existing[0].evidenceHash, error: null };
      }
      const consultation = await assertPracticeRecord(tx, "Consultation", input.consultationId, "id practice { id } location { id } client { id } provider { id } service { id } appointment { id } status candidacyDecision staffDecisionRecorded signedAt evidenceHash revision contraindicationProtocolVersion contraindicationReviewHash supersededBy { id }");
      if (consultation.evidenceHash !== input.expectedConsultationHash || consultation.client?.id !== input.clientId || consultation.provider?.id !== provider.id || consultation.status !== "completed" || consultation.candidacyDecision !== "candidate" || consultation.staffDecisionRecorded !== true || !consultation.signedAt || consultation.supersededBy?.id || !consultation.contraindicationProtocolVersion || !consultation.contraindicationReviewHash) throw new Error("Current matching human-reviewed candidate consultation is required");
      const location = await assertPracticeRecord(tx, "Location", consultation.location?.id || "", "id isActive practice { id }");
      if (location.isActive !== true || !provider.locations?.some((value) => value.id === location.id)) throw new Error("Approving provider location assignment is unavailable");
      await assertPlanStaffMembership(sudo, actor.practiceId, actor.actorId, location.id);
      const findings = await sudo.query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: actor.practiceId } }, consultation: { id: { equals: consultation.id } }, severity: { in: ["hard_stop", "clinician_review"] } }, take: 101, query: "id decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt evidenceHash }" });
      if (findings.length > 100 || findings.some((finding) => finding.decisions?.[0]?.disposition !== "cleared_with_rationale" || !finding.decisions[0].evidenceHash || !finding.decisions[0].expiresAt || !Number.isFinite(Date.parse(finding.decisions[0].expiresAt)) || Date.parse(finding.decisions[0].expiresAt) <= Date.now())) throw new Error("Current human contraindication decisions are required");
      const acceptedItems = [];
      for (const item of input.items) {
        if (item.serviceId !== consultation.service?.id) throw new Error("Each planned service requires its matching consultation");
        const service = await assertPracticeRecord(tx, "Service", item.serviceId, "id name status baseDuration basePrice depositAmount cleanupBufferMinutes requiresConsultation requiresIntakeReview staffAuthorizationRequired requiresLotTraceability category { id } requiredResources { id } practice { id }");
        if (service.status !== "active" || !Number.isSafeInteger(service.baseDuration) || service.baseDuration < 1 || !Number.isSafeInteger(service.basePrice) || service.basePrice < 0) throw new Error("Canonical service duration and price are unavailable");
        const forms = await loadRequiredIntakeManifest(sudo, actor.practiceId, service);
        if (forms.length) {
          if (!consultation.appointment?.id) throw new Error("Appointment-specific reviewed intake is required");
          await assertCurrentIntakeEvidence(sudo, { practiceId: actor.practiceId, clientUserId: client.user.id, appointmentId: consultation.appointment.id, categoryId: service.category.id, requiredForms: forms });
        }
        const authority2 = service.staffAuthorizationRequired !== false ? await evaluateProviderAuthority(sudo, { providerId: provider.id, serviceId: service.id, locationId: location.id, at: /* @__PURE__ */ new Date(), stage: "scheduling" }) : null;
        acceptedItems.push({ ...item, serviceTitle: service.name, duration: service.baseDuration, price: service.basePrice, requirementsHash: planServiceRequirementsHash(service), requiredIntakeForms: forms, authorityHash: authority2?.evidenceHash || null });
      }
      const priorPlan = input.supersedesId ? await assertPracticeRecord(tx, "TreatmentPlan", input.supersedesId, "id status revision client { id } supersededBy { id } practice { id }") : null;
      if (priorPlan && (priorPlan.status !== "active" || priorPlan.client?.id !== input.clientId || priorPlan.supersededBy?.id)) throw new Error("Treatment-plan supersession is invalid");
      const signedAt = (/* @__PURE__ */ new Date()).toISOString();
      const revision = priorPlan ? Number(priorPlan.revision) + 1 : 1;
      if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Plan revision is invalid");
      const plan = await sudo.query.TreatmentPlan.createOne({ data: { practice: { connect: { id: actor.practiceId } }, client: { connect: { id: input.clientId } }, consultation: { connect: { id: consultation.id } }, createdBy: { connect: { id: provider.id } }, status: "active", title: input.title, goals: input.goals, startsAt: input.startsAt || void 0, endsAt: input.endsAt || void 0, signedAt, revision, idempotencyKey: args.idempotencyKey, supersedes: priorPlan ? { connect: { id: priorPlan.id } } : void 0 }, query: "id" });
      const items = [];
      for (const item of acceptedItems) {
        const row2 = await sudo.query.TreatmentPlanItem.createOne({ data: { plan: { connect: { id: plan.id } }, service: { connect: { id: item.serviceId } }, serviceTitle: item.serviceTitle, plannedSessions: item.plannedSessions, completedSessions: 0, intervalNotes: item.intervalNotes, status: "planned" }, query: "id" });
        items.push({ ...item, itemId: row2.id });
      }
      const receipt = { version: 1, planId: plan.id, practiceId: actor.practiceId, actorId: actor.actorId, clientId: client.id, clientUserId: client.user.id, providerId: provider.id, locationId: location.id, consultationId: consultation.id, consultationHash: consultation.evidenceHash, consultationRevision: consultation.revision, requestHash, revision, signedAt, input, items };
      const hash = evidenceHash(receipt);
      await sudo.query.TreatmentPlan.updateOne({ where: { id: plan.id }, data: { evidenceHash: hash }, query: "id" });
      if (priorPlan) await sudo.query.TreatmentPlan.updateOne({ where: { id: priorPlan.id }, data: { status: "cancelled" }, query: "id" });
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: location.id } }, actor: { connect: { id: actor.actorId } }, action: PLAN_APPROVAL_ACTION, resourceType: "TreatmentPlan", resourceId: plan.id, correlationId: args.idempotencyKey, evidence: bounded(receipt), evidenceHash: hash, occurredAt: signedAt }, query: "id" });
      return { success: true, recordId: plan.id, evidenceHash: hash, error: null };
    });
  } catch (error) {
    return { success: false, recordId: null, evidenceHash: null, error: error instanceof Error ? error.message : "Treatment plan failed" };
  }
}
async function assertPlanStaffMembership(sudo, practiceId5, userId, locationId) {
  const memberships = await sudo.query.PracticeMembership.findMany({ where: { practice: { id: { equals: practiceId5 } }, user: { id: { equals: userId } } }, take: 2, query: "id status locations { id }" });
  if (memberships.length !== 1 || memberships[0].status !== "active" || !memberships[0].locations?.some((value) => value.id === locationId)) throw new Error("An unambiguous active staff membership assigned to this location is required");
}
function planServiceRequirementsHash(service) {
  return evidenceHash({ serviceId: service.id, duration: service.baseDuration, cleanupBufferMinutes: service.cleanupBufferMinutes || 0, requiredResourceIds: (service.requiredResources || []).map((value) => value.id).sort(), categoryId: service.category?.id || null, requiresConsultation: service.requiresConsultation === true, requiresIntakeReview: service.requiresIntakeReview === true, staffAuthorizationRequired: service.staffAuthorizationRequired !== false, requiresLotTraceability: service.requiresLotTraceability === true });
}

// features/keystone/mutations/planBookingEvidence.ts
async function loadPlanBookingEvidence(context, input, selection) {
  if (!input.planId || !input.planItemId || !input.planClientId || !/^[a-f0-9]{64}$/.test(input.expectedPlanHash || "")) throw new Error("Exact approved plan, item, patient, and version are required");
  const plan = await assertPracticeRecord(context, "TreatmentPlan", input.planId, "id status revision signedAt evidenceHash practice { id } consultation { id } client { id } createdBy { id } startsAt endsAt supersededBy { id } items { id status service { id } plannedSessions completedSessions serviceTitle intervalNotes }");
  const { receipt, evidenceHash: hash } = await loadPlanApprovalReceipt(context.sudo(), selection.practiceId, plan.id);
  const item = plan.items?.find((value) => value.id === input.planItemId);
  const accepted = receipt.items?.find((value) => value.itemId === input.planItemId);
  const client = await assertPracticeRecord(context, "Client", input.planClientId, "id practice { id } user { id status name email phone practice { id } }");
  if (!item || !accepted || hash !== input.expectedPlanHash || plan.evidenceHash !== hash || receipt.revision !== plan.revision || receipt.signedAt !== new Date(plan.signedAt || "").toISOString() || plan.client?.id !== client.id || receipt.clientId !== client.id || receipt.clientUserId !== client.user?.id || client.user?.status !== "active" || client.user.practice?.id !== selection.practiceId || plan.createdBy?.id !== receipt.providerId || plan.consultation?.id !== receipt.consultationId || receipt.locationId !== selection.locationId || receipt.providerId !== selection.providerId || selection.serviceIds.length !== 1 || selection.serviceIds[0] !== accepted.serviceId || item.service?.id !== accepted.serviceId || item.plannedSessions !== accepted.plannedSessions || item.serviceTitle !== accepted.serviceTitle || item.intervalNotes !== accepted.intervalNotes) throw new Error("Patient, provider, plan item, or approved version changed");
  const provider = await assertPracticeRecord(context, "Provider", receipt.providerId, "id status isActive practice { id } user { id status practice { id } } locations { id }");
  if (provider.status !== "active" || provider.isActive !== true || provider.user?.id !== receipt.actorId || provider.user.status !== "active" || provider.user.practice?.id !== selection.practiceId || !provider.locations?.some((value) => value.id === selection.locationId)) throw new Error("Approving provider identity or location assignment is no longer active");
  for (const userId of [.../* @__PURE__ */ new Set([context.session.itemId, provider.user.id])]) await assertPlanStaffMembership(context.sudo(), selection.practiceId, userId, selection.locationId);
  return { plan, receipt, accepted, item, client, hash };
}
async function assertNewPlanBooking(context, binding, service, start, end, excludeAppointmentId) {
  const { plan, receipt, accepted, item } = binding;
  if (plan.status !== "active" || plan.supersededBy?.id || item.status !== "planned" || plan.startsAt && Date.parse(plan.startsAt) > start.getTime() || plan.endsAt && Date.parse(plan.endsAt) < end.getTime()) throw new Error("Plan item is not currently bookable for this interval");
  if (planServiceRequirementsHash(service) !== accepted.requirementsHash) throw new Error("Service requirements changed; review a superseding plan before booking");
  const consultation = await assertPracticeRecord(context, "Consultation", receipt.consultationId, "id practice { id } client { id } provider { id } service { id } status candidacyDecision staffDecisionRecorded signedAt evidenceHash revision appointment { id } supersededBy { id }");
  if (consultation.evidenceHash !== receipt.consultationHash || consultation.revision !== receipt.consultationRevision || consultation.client?.id !== receipt.clientId || consultation.provider?.id !== receipt.providerId || consultation.service?.id !== accepted.serviceId || consultation.status !== "completed" || consultation.candidacyDecision !== "candidate" || consultation.staffDecisionRecorded !== true || !consultation.signedAt || consultation.supersededBy?.id) throw new Error("Consultation approval is no longer current");
  const forms = await loadRequiredIntakeManifest(context.sudo(), receipt.practiceId, service);
  if (JSON.stringify(forms) !== JSON.stringify(accepted.requiredIntakeForms)) throw new Error("Required intake versions changed since plan approval");
  if (forms.length) await assertCurrentIntakeEvidence(context.sudo(), { practiceId: receipt.practiceId, clientUserId: receipt.clientUserId, appointmentId: consultation.appointment?.id || "", categoryId: service.category?.id || "", requiredForms: forms });
  const findings = await context.sudo().query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: receipt.practiceId } }, consultation: { id: { equals: consultation.id } }, severity: { in: ["hard_stop", "clinician_review"] } }, take: 101, query: "id decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt evidenceHash }" });
  if (findings.length > 100 || findings.some((value) => value.decisions?.[0]?.disposition !== "cleared_with_rationale" || !value.decisions[0].evidenceHash || !Number.isFinite(Date.parse(value.decisions[0].expiresAt)) || Date.parse(value.decisions[0].expiresAt) <= Date.now())) throw new Error("Current human contraindication decisions are required");
  if (!Number.isSafeInteger(item.completedSessions) || item.completedSessions < 0) throw new Error("Documented session balance is invalid");
  let claims = 0;
  for (let skip = 0; ; skip += 1e3) {
    const page = await context.sudo().query.Appointment.findMany({ where: { practice: { id: { equals: receipt.practiceId } }, client: { id: { equals: receipt.clientId } } }, skip, take: 1e3, orderBy: { id: "asc" }, query: "id status metadata" });
    claims += page.filter((value) => value.id !== excludeAppointmentId && !["cancelled", "no_show"].includes(value.status) && value.metadata?.planBooking?.planId === plan.id && value.metadata.planBooking.itemId === item.id).length;
    if (claims >= accepted.plannedSessions || item.completedSessions >= accepted.plannedSessions) throw new Error("All approved sessions are already booked or completed");
    if (page.length < 1e3) break;
  }
}
async function assertApprovedPlanClinicalAppointment(context, planId, appointmentId, serviceId, providerId) {
  const plan = await assertPracticeRecord(context, "TreatmentPlan", planId, "id practice { id } consultation { id }");
  const receipts = await context.sudo().query.AuditEvent.findMany({ where: { practice: { id: { equals: plan.practice.id } }, action: { equals: "treatment_plan.approved.v1" }, resourceType: { equals: "TreatmentPlan" }, resourceId: { equals: planId } }, take: 1, query: "id" });
  const appointment = await assertPracticeRecord(context, "Appointment", appointmentId, "id metadata client { id } practice { id } location { id } provider { id }");
  const booking = appointment.metadata?.planBooking;
  if (!booking && !receipts.length) return;
  if (!booking || booking.planId !== planId || booking.serviceId !== serviceId || booking.providerId !== providerId || appointment.provider?.id !== providerId || booking.clientId !== appointment.client?.id) throw new Error("Clinical preparation requires the exact appointment-owned approved plan item");
  await loadPlanBookingEvidence(context, { planId, planItemId: booking.itemId, planClientId: booking.clientId, expectedPlanHash: booking.planHash }, { practiceId: plan.practice.id, providerId, locationId: appointment.location.id, serviceIds: [serviceId] });
}
function planBookingSnapshot(binding) {
  return { version: 1, planId: binding.plan.id, itemId: binding.item.id, planHash: binding.hash, planRevision: binding.plan.revision, consultationId: binding.receipt.consultationId, consultationHash: binding.receipt.consultationHash, clientId: binding.client.id, providerId: binding.receipt.providerId, locationId: binding.receipt.locationId, serviceId: binding.accepted.serviceId, serviceTitle: binding.accepted.serviceTitle, price: binding.accepted.price, duration: binding.accepted.duration };
}

// features/keystone/mutations/bookAppointment.ts
var BookAppointmentResult = import_core101.graphql.object()({
  name: "BookAppointmentResult",
  fields: {
    success: import_core101.graphql.field({ type: import_core101.graphql.nonNull(import_core101.graphql.Boolean) }),
    appointmentId: import_core101.graphql.field({ type: import_core101.graphql.ID }),
    error: import_core101.graphql.field({ type: import_core101.graphql.String })
  }
});
function guestPassword() {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
async function resolveAuthorizedClient(sudo, input, sessionUserId, isOperator = false, practiceId5) {
  if (!sessionUserId && !isOperator) return null;
  let user = sessionUserId ? await sudo.query.User.findOne({ where: { id: sessionUserId }, query: "id name email phone status practice { id }" }) : (await sudo.query.User.findMany({ where: { email: { equals: input.email }, practice: practiceId5 ? { id: { equals: practiceId5 } } : void 0 }, take: 1, query: "id name email phone practice { id }" }))[0];
  if (sessionUserId && user?.status !== "active") throw new Error("The signed-in account is unavailable");
  if (sessionUserId && (!practiceId5 || user?.practice?.id !== practiceId5)) throw new Error("Signed-in account does not belong to this practice");
  if (sessionUserId && user?.email?.toLowerCase() !== input.email) {
    throw new Error("Use the email address on your signed-in account");
  }
  if (!user && isOperator) {
    user = await sudo.query.User.createOne({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || "",
        password: guestPassword(),
        practice: practiceId5 ? { connect: { id: practiceId5 } } : void 0
      },
      query: "id name email phone"
    });
  }
  if (!user) throw new Error("Signed-in client account could not be found");
  const existingClients = await sudo.query.Client.findMany({
    where: { user: { id: { equals: user.id } }, practice: practiceId5 ? { id: { equals: practiceId5 } } : void 0 },
    take: 1,
    query: "id user { id name email phone }"
  });
  if (existingClients[0]) return existingClients[0];
  return sudo.query.Client.createOne({
    data: {
      user: { connect: { id: user.id } },
      practice: practiceId5 ? { connect: { id: practiceId5 } } : void 0,
      firstVisit: (/* @__PURE__ */ new Date()).toISOString(),
      totalVisits: 0,
      lifetimeValue: 0
    },
    query: "id user { id name email phone }"
  });
}
async function lockBookingCapacity(context, providerId, services, supervisorIds = []) {
  const keys = [
    `provider:${providerId}`,
    ...supervisorIds.map((id) => `provider:${id}`),
    ...services.flatMap((service) => service.requiredResources || []).map((resource) => `resource:${resource.id}`)
  ];
  for (const key of [...new Set(keys)].sort()) {
    await context.prisma.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
      "medspa-appointment-capacity",
      key
    );
  }
  const devices = services.flatMap((service) => service.requiredResources || []).filter((resource) => ["device", "equipment"].includes(resource.type));
  for (const namespace of ["medspa-device-readiness", "medspa-incident", "medspa-recall", "medspa-resource", "medspa-resource-reservation"]) {
    const keys2 = ["medspa-resource", "medspa-resource-reservation"].includes(namespace) ? services.flatMap((service) => service.requiredResources || []).map((resource) => `resource:${resource.id}`) : devices.map((resource) => `device:${resource.id}`);
    for (const key of [...new Set(keys2)].sort()) await context.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", namespace, key);
  }
}
async function loadServices(sudo, serviceIds, publicOnly, trustedPracticeId) {
  const services = await sudo.query.Service.findMany({
    where: {
      id: { in: serviceIds },
      ...trustedPracticeId ? { practice: { id: { equals: trustedPracticeId } } } : {},
      ...publicOnly ? { status: { equals: "active" }, isPublic: { equals: true }, practice: { ...trustedPracticeId ? { id: { equals: trustedPracticeId } } : {}, isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } } } : {}
    },
    query: `
      id
      name
      status
      isPublic
      staffAuthorizationRequired
      requiresConsultation
      requiresIntakeReview
      requiresLotTraceability
      cleanupBufferMinutes
      category { id }
      baseDuration
      basePrice
      price
      depositAmount
      practice { id isActive storefrontSetting { isPublished primaryLocation { id isActive } } }
      image { imagePath image { url } }
      requiredResources {
        id
        name
        capacity
        type
        practice { id }
        isActive
        isPublic
      }
    `
  });
  if (services.length !== new Set(serviceIds).size) {
    throw new Error("One or more selected services could not be found");
  }
  const inactiveService = services.find((service) => service.status !== "active" || publicOnly && service.isPublic !== true);
  if (inactiveService) {
    throw new Error("Selected service is unavailable");
  }
  const practiceIds = new Set(services.map((service) => service.practice?.id).filter(Boolean));
  if (practiceIds.size !== 1) throw new Error("Selected services do not share one practice");
  for (const service of services) {
    if (!service.practice?.isActive || publicOnly && (!service.practice.storefrontSetting?.isPublished || service.practice.storefrontSetting.primaryLocation?.isActive !== true)) throw new Error("Storefront is unavailable");
    if ((service.requiredResources || []).some((resource) => resource.isActive !== true || publicOnly && resource.isPublic !== true)) {
      throw new Error(`${service.name || "Selected service"} has no active public request resource`);
    }
  }
  return services;
}
var bookAppointment = import_core101.graphql.field({
  type: BookAppointmentResult,
  args: {
    rescheduleAppointmentId: import_core101.graphql.arg({ type: import_core101.graphql.ID }),
    expectedAppointmentRevision: import_core101.graphql.arg({ type: import_core101.graphql.Int }),
    rescheduleReason: import_core101.graphql.arg({ type: import_core101.graphql.String }),
    planId: import_core101.graphql.arg({ type: import_core101.graphql.ID }),
    planItemId: import_core101.graphql.arg({ type: import_core101.graphql.ID }),
    planClientId: import_core101.graphql.arg({ type: import_core101.graphql.ID }),
    expectedPlanHash: import_core101.graphql.arg({ type: import_core101.graphql.String }),
    expectedResourceIds: import_core101.graphql.arg({ type: import_core101.graphql.list(import_core101.graphql.nonNull(import_core101.graphql.ID)) }),
    expectedSupervisorIds: import_core101.graphql.arg({ type: import_core101.graphql.list(import_core101.graphql.nonNull(import_core101.graphql.ID)) }),
    serviceIds: import_core101.graphql.arg({ type: import_core101.graphql.nonNull(import_core101.graphql.list(import_core101.graphql.nonNull(import_core101.graphql.ID))) }),
    providerId: import_core101.graphql.arg({ type: import_core101.graphql.nonNull(import_core101.graphql.ID) }),
    locationId: import_core101.graphql.arg({ type: import_core101.graphql.ID }),
    startTime: import_core101.graphql.arg({ type: import_core101.graphql.nonNull(import_core101.graphql.String) }),
    clientName: import_core101.graphql.arg({ type: import_core101.graphql.nonNull(import_core101.graphql.String) }),
    clientEmail: import_core101.graphql.arg({ type: import_core101.graphql.nonNull(import_core101.graphql.String) }),
    clientPhone: import_core101.graphql.arg({ type: import_core101.graphql.String }),
    clientNotes: import_core101.graphql.arg({ type: import_core101.graphql.String }),
    idempotencyKey: import_core101.graphql.arg({ type: import_core101.graphql.nonNull(import_core101.graphql.String) })
  },
  resolve(_source, args, context) {
    return bookAppointmentTransaction(context, args);
  }
});
async function bookAppointmentTransaction(context, args) {
  const serviceIds = Array.from(new Set(args.serviceIds.filter(Boolean)));
  const clientName = args.clientName.trim();
  const clientEmail = args.clientEmail.trim().toLowerCase();
  const clientPhone = args.clientPhone?.trim() || "";
  const start = new Date(args.startTime);
  const idempotencyKey = args.idempotencyKey.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return { success: false, appointmentId: null, error: "A valid booking request key is required" };
  }
  if (serviceIds.length === 0) {
    return { success: false, appointmentId: null, error: "Choose at least one service" };
  }
  if (serviceIds.length > 10) {
    return { success: false, appointmentId: null, error: "Too many services were selected" };
  }
  if (!clientName || clientName.length > 120) {
    return { success: false, appointmentId: null, error: "Client name is required" };
  }
  if (!clientEmail || clientEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return { success: false, appointmentId: null, error: "A valid email address is required" };
  }
  if (clientPhone.length > 40 || (args.clientNotes?.length || 0) > 2e3) {
    return { success: false, appointmentId: null, error: "Booking contact details are too long" };
  }
  if (Number.isNaN(start.getTime())) {
    return { success: false, appointmentId: null, error: "Appointment start time is invalid" };
  }
  try {
    const schedulingSession = permissions.canSchedule({ session: context.session });
    const publicOnly = !schedulingSession;
    const booking = await serializableWorkflow(context, "medspa-booking", [], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const operator2 = schedulingSession ? { ...requireActorPractice(transactionContext, permissions.canSchedule), ...await assertActiveActor(transactionContext) } : null;
      const services = await loadServices(sudo, serviceIds, publicOnly, operator2?.practiceId || transactionContext.session?.data.practice?.id);
      const duration = services.reduce((sum, service) => sum + Number(service.baseDuration || 0), 0) || 60;
      const end = new Date(start.getTime() + duration * 6e4);
      const practiceIds = [...new Set(services.map((service) => service.practice?.id).filter(Boolean))];
      if (practiceIds.length !== 1) throw new Error("Booking scope is unavailable");
      const bookingPracticeId = practiceIds[0];
      if (operator2 && operator2.practiceId !== bookingPracticeId) throw new Error("Scheduling authority does not cover this practice");
      const restrictedServices = services.filter((service) => service.staffAuthorizationRequired !== false || service.requiresConsultation || service.requiresIntakeReview || service.requiresLotTraceability);
      if (new Set(restrictedServices.map((service) => service.id)).size > 1) throw new Error("Book each restricted service separately until service-specific encounter evidence is supported");
      const location = await getRuntimeLocation(sudo, args.locationId, bookingPracticeId, publicOnly);
      const hasPlan = Boolean(args.planId || args.planItemId || args.planClientId || args.expectedPlanHash);
      if (hasPlan && !operator2) throw new Error("Approved-plan booking requires scheduling authority");
      const binding = hasPlan ? await loadPlanBookingEvidence(transactionContext, args, { practiceId: bookingPracticeId, providerId: args.providerId, locationId: location.locationId, serviceIds }) : null;
      if (binding && (binding.client.user?.email?.toLowerCase() !== clientEmail || binding.client.user?.name !== clientName)) throw new Error("Booking patient contact identity changed; refresh the original patient");
      const bookingRequestHash = evidenceHash({ practiceId: bookingPracticeId, serviceIds, providerId: args.providerId, locationId: location.locationId, startTime: start.toISOString(), clientName, clientEmail, clientPhone, clientNotes: args.clientNotes?.trim() || "", ...binding ? { rescheduleAppointmentId: args.rescheduleAppointmentId || null, expectedAppointmentRevision: args.expectedAppointmentRevision || null, rescheduleReason: args.rescheduleReason?.trim() || "", actorId: operator2.actorId, planBooking: planBookingSnapshot(binding), expectedResourceIds: [...args.expectedResourceIds || []].sort(), expectedSupervisorIds: [...args.expectedSupervisorIds || []].sort() } : {} });
      const scopedIdempotencyKey = aggregateIdempotencyKey(`booking:${bookingPracticeId}`, idempotencyKey);
      await transactionContext.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", "medspa-booking-idempotency", scopedIdempotencyKey);
      if (args.rescheduleAppointmentId && !binding) throw new Error("Only an exact approved-plan appointment can use this reschedule workflow");
      const correctionReceipts = await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: bookingPracticeId } }, resourceType: { equals: "Appointment" }, action: { equals: "treatment_plan.rescheduled.v1" }, correlationId: { equals: idempotencyKey } }, take: 2, query: "resourceId evidence evidenceHash" });
      if (correctionReceipts.length) {
        const evidence = correctionReceipts[0].evidence;
        if (correctionReceipts.length !== 1 || correctionReceipts[0].resourceId !== args.rescheduleAppointmentId || evidence?.requestHash !== bookingRequestHash || correctionReceipts[0].evidenceHash !== evidenceHash(evidence)) throw new Error("Reschedule key was already used with different evidence");
        return { appointmentId: correctionReceipts[0].resourceId, duration, services, providerName: "", created: false };
      }
      const prior = (await sudo.query.Appointment.findMany({ where: { idempotencyKey: { equals: scopedIdempotencyKey }, practice: { id: { equals: bookingPracticeId } } }, take: 1, query: "id metadata duration" }))[0];
      if (prior) {
        if (prior.metadata?.bookingRequestHash !== bookingRequestHash) throw new Error("Booking request key was already used with different details");
        return { appointmentId: prior.id, duration: prior.duration || 0, services, providerName: "", created: false };
      }
      if (start.getTime() < Date.now() || start.getTime() > Date.now() + 366 * 24 * 60 * 6e4) throw new Error("Appointment start time is invalid");
      let moving = null;
      if (args.rescheduleAppointmentId) {
        for (const namespace of ["medspa-appointment-transition", "medspa-resource-reservation"]) await transactionContext.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", namespace, `appointment:${args.rescheduleAppointmentId}`);
        moving = await sudo.query.Appointment.findOne({ where: { id: args.rescheduleAppointmentId }, query: "id practice { id } client { id } provider { id } location { id } status revision startTime endTime metadata payment { id } transaction { id } treatmentSessionsCount consentsCount resourceReservations { id status } supervisorReservations { id status }" });
        if (!moving || moving.practice?.id !== bookingPracticeId || moving.client?.id !== binding.client.id || moving.provider?.id !== args.providerId || moving.location?.id !== location.locationId || evidenceHash(moving.metadata?.planBooking) !== evidenceHash(planBookingSnapshot(binding)) || !["pending", "confirmed"].includes(moving.status) || moving.revision !== args.expectedAppointmentRevision || !args.rescheduleReason?.trim() || args.rescheduleReason.length > 1e3) throw new Error("Current appointment version and reschedule reason are required");
        if (moving.payment?.id || moving.transaction?.id || moving.treatmentSessionsCount || moving.consentsCount) throw new Error("Documented clinical or financial evidence requires a separate reviewed correction workflow; this appointment cannot be silently rescheduled");
      }
      if (binding) {
        await transactionContext.prisma.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", "medspa-treatment-plan", `client:${binding.client.id}`);
        await assertNewPlanBooking(transactionContext, binding, services[0], start, end, moving?.id);
      }
      const authorityDecisions = [];
      for (const service of services.filter((item) => item.staffAuthorizationRequired !== false)) authorityDecisions.push(await evaluateProviderAuthority(sudo, { providerId: args.providerId, serviceId: service.id, locationId: location.locationId, at: start, stage: "scheduling" }));
      if (binding) {
        for (const decision of authorityDecisions) if (decision.supervisorId) {
          const supervisor = await sudo.query.Provider.findOne({ where: { id: decision.supervisorId }, query: "id status isActive practice { id } user { id status practice { id } }" });
          if (!supervisor || supervisor.practice?.id !== bookingPracticeId || supervisor.status !== "active" || supervisor.isActive !== true || supervisor.user?.status !== "active" || supervisor.user.practice?.id !== bookingPracticeId) throw new Error("Required supervisor identity is no longer active");
          await assertPlanStaffMembership(sudo, bookingPracticeId, supervisor.user.id, location.locationId);
        }
      }
      await lockBookingCapacity(transactionContext, args.providerId, services, authorityDecisions.map((decision) => decision.supervisorId).filter(Boolean));
      const availability = await computeProviderAvailability({
        sudo,
        providerId: args.providerId,
        date: zonedDateKey(start, location.timezone),
        serviceDuration: duration,
        serviceIds,
        locationId: location.locationId,
        publicOnly,
        excludeAppointmentId: moving?.id
      });
      const selectedSlot = availability.slots.find((slot) => new Date(slot.startTime).getTime() === start.getTime());
      if (!selectedSlot?.available) {
        throw new Error(selectedSlot?.blockedReason || "Selected time is outside the provider's schedule");
      }
      if (binding && (!args.expectedResourceIds || !args.expectedSupervisorIds || JSON.stringify([...args.expectedResourceIds].sort()) !== JSON.stringify([...selectedSlot.resourceIds].sort()) || JSON.stringify([...args.expectedSupervisorIds].sort()) !== JSON.stringify([...selectedSlot.supervisorIds].sort()))) throw new Error("Reviewed resource or supervisor assignment changed; reselect availability with a new request key");
      const providerName = availability.providerName;
      const resourceId = selectedSlot.resourceId;
      if (JSON.stringify([...new Set(authorityDecisions.map((decision) => decision.supervisorId).filter(Boolean))].sort()) !== JSON.stringify([...selectedSlot.supervisorIds].sort())) throw new Error("Supervisor authority changed across the selected interval");
      const cleanupBufferMinutes = Math.max(15, ...services.map((service) => Number(service.cleanupBufferMinutes || 0)));
      const reservedEnd = new Date(end.getTime() + cleanupBufferMinutes * 6e4);
      for (const decision of authorityDecisions) {
        const throughEnd = await evaluateProviderAuthority(sudo, { providerId: args.providerId, serviceId: decision.serviceId, locationId: location.locationId, at: end, stage: "scheduling" });
        if (throughEnd.authorizationId !== decision.authorizationId || throughEnd.credentialId !== decision.credentialId || throughEnd.supervisorId !== decision.supervisorId || throughEnd.policyVersion !== decision.policyVersion) throw new Error("Provider authority does not cover the exact appointment interval");
      }
      const practiceId5 = practiceIds[0];
      if (!practiceId5 || authorityDecisions.some((decision) => decision.practiceId !== practiceId5)) throw new Error("Booking scope is unavailable");
      const client = binding?.client || await resolveAuthorizedClient(
        sudo,
        { name: clientName, email: clientEmail, phone: clientPhone },
        operator2 ? void 0 : context.session?.itemId,
        Boolean(operator2),
        practiceId5
      );
      if (moving) {
        for (const row2 of moving.resourceReservations.filter((value) => ["reserved", "in_use"].includes(value.status))) await sudo.query.AppointmentResourceReservation.updateOne({ where: { id: row2.id }, data: { status: "superseded" }, query: "id" });
        for (const row2 of moving.supervisorReservations.filter((value) => value.status === "reserved")) await sudo.query.AppointmentSupervisorReservation.updateOne({ where: { id: row2.id }, data: { status: "superseded" }, query: "id" });
      }
      const appointment = moving ? await sudo.query.Appointment.updateOne({ where: { id: moving.id }, data: { startTime: start.toISOString(), endTime: end.toISOString(), revision: moving.revision + 1, resource: resourceId ? { connect: { id: resourceId } } : { disconnect: true }, room: selectedSlot.roomId ? { connect: { id: selectedSlot.roomId } } : { disconnect: true }, device: selectedSlot.deviceId ? { connect: { id: selectedSlot.deviceId } } : { disconnect: true }, metadata: { ...moving.metadata, capacityBufferMinutes: cleanupBufferMinutes } }, query: "id" }) : await sudo.query.Appointment.createOne({
        data: {
          practice: { connect: { id: practiceId5 } },
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration,
          status: "pending",
          depositAmount: services.reduce((sum, service) => sum + Number(service.depositAmount || 0), 0),
          depositPaid: false,
          location: availability.locationId ? { connect: { id: availability.locationId } } : void 0,
          client: client ? { connect: { id: client.id } } : void 0,
          provider: { connect: { id: args.providerId } },
          resource: resourceId ? { connect: { id: resourceId } } : void 0,
          room: selectedSlot.roomId ? { connect: { id: selectedSlot.roomId } } : void 0,
          device: selectedSlot.deviceId ? { connect: { id: selectedSlot.deviceId } } : void 0,
          services: { connect: serviceIds.map((id) => ({ id })) },
          clientNotes: args.clientNotes?.trim() || "",
          idempotencyKey: scopedIdempotencyKey,
          metadata: {
            source: binding ? "approved_plan_booking" : "storefront_booking",
            ...binding ? { planBooking: planBookingSnapshot(binding) } : {},
            bookingRequestHash,
            capacityBufferMinutes: cleanupBufferMinutes,
            guest: client ? null : { name: clientName, email: clientEmail, phone: clientPhone }
          }
        },
        query: "id"
      });
      const requestBoundaryEvidenceHash = authorityDecisions.length ? authorityDecisions.map((decision) => decision.evidenceHash).join(":") : evidenceHash({ appointmentId: appointment.id, practiceId: practiceId5, providerId: args.providerId, serviceIds, stage: "non_clinical_demo_request" });
      const selectedResources = services.flatMap((service) => service.requiredResources || []).filter((resource, index, all) => selectedSlot.resourceIds.includes(resource.id) && all.findIndex((candidate) => candidate.id === resource.id) === index);
      for (const resource of selectedResources) {
        await sudo.query.AppointmentResourceReservation.createOne({ data: {
          practice: { connect: { id: practiceId5 } },
          location: { connect: { id: availability.locationId } },
          appointment: { connect: { id: appointment.id } },
          resource: { connect: { id: resource.id } },
          segmentKey: "booking",
          purpose: resource.type === "room" ? "room" : resource.type === "device" ? "device" : "equipment",
          units: 1,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          status: "reserved",
          revision: 1,
          assignmentEvidence: { segmentKey: "booking", serviceId: serviceIds.length === 1 ? serviceIds[0] : null, providerId: args.providerId, supervisorId: selectedSlot.supervisorIds.length === 1 ? selectedSlot.supervisorIds[0] : null, cleanupBufferMinutes, authorityEvidenceHashes: authorityDecisions.map((decision) => decision.evidenceHash), requestBoundary: authorityDecisions.length ? "clinical_authority_evaluated" : "non_clinical_demo_request", resourceReadinessChecked: true },
          evidenceHash: requestBoundaryEvidenceHash,
          idempotencyKey: `booking:${appointment.id}:${idempotencyKey}:resource:${resource.id}`
        }, query: "id" });
      }
      for (const supervisorId of [...new Set(authorityDecisions.map((decision) => decision.supervisorId).filter(Boolean))]) {
        const supervisorEvidenceHash = authorityDecisions.filter((decision) => decision.supervisorId === supervisorId).map((decision) => decision.evidenceHash).join(":");
        await sudo.query.AppointmentSupervisorReservation.createOne({ data: { practice: { connect: { id: practiceId5 } }, location: { connect: { id: availability.locationId } }, appointment: { connect: { id: appointment.id } }, supervisor: { connect: { id: supervisorId } }, service: serviceIds.length === 1 ? { connect: { id: serviceIds[0] } } : void 0, startsAt: start.toISOString(), endsAt: reservedEnd.toISOString(), status: "reserved", evidenceHash: supervisorEvidenceHash, idempotencyKey: `booking:${appointment.id}:${idempotencyKey}:supervisor:${supervisorId}` }, query: "id" });
      }
      for (const [index, decision] of authorityDecisions.entries()) await recordAuthorityDecision(transactionContext, decision, { clientId: client?.id, appointmentId: appointment.id }, `booking:${appointment.id}:${idempotencyKey}:authority:${index}`);
      for (const service of moving ? [] : services) {
        const snapshot2 = binding ? { serviceTitle: binding.accepted.serviceTitle, duration: binding.accepted.duration, price: binding.accepted.price, serviceImagePath: null } : captureServiceSnapshot(service);
        await sudo.query.AppointmentLineItem.createOne({
          data: {
            appointment: { connect: { id: appointment.id } },
            service: { connect: { id: service.id } },
            staff: { connect: { id: args.providerId } },
            serviceTitle: snapshot2.serviceTitle,
            serviceImagePath: snapshot2.serviceImagePath,
            duration: snapshot2.duration,
            price: snapshot2.price,
            quantity: 1,
            notes: args.clientNotes?.trim() || "",
            metadata: {
              snapshotType: binding ? "approved_plan_booking" : "booking_request",
              ...binding ? { planBooking: planBookingSnapshot(binding) } : {},
              snapshotVersion: 1,
              serviceId: service.id,
              serviceName: snapshot2.serviceTitle,
              serviceImagePath: snapshot2.serviceImagePath,
              serviceBasePrice: service.basePrice,
              servicePrice: snapshot2.price,
              requestedStartTime: start.toISOString(),
              requirements: {
                snapshotVersion: 1,
                serviceId: service.id,
                requiresConsultation: service.requiresConsultation === true,
                requiresIntakeReview: service.requiresIntakeReview === true,
                staffAuthorizationRequired: service.staffAuthorizationRequired !== false,
                requiresLotTraceability: service.requiresLotTraceability === true
              }
            }
          },
          query: "id"
        });
      }
      if (binding) {
        const evidence = { ...moving ? { priorStartTime: moving.startTime, priorEndTime: moving.endTime, fromRevision: moving.revision, toRevision: moving.revision + 1, reason: args.rescheduleReason.trim() } : {}, requestHash: bookingRequestHash, appointmentId: appointment.id, planBooking: planBookingSnapshot(binding), actorId: operator2.actorId, startTime: start.toISOString(), endTime: end.toISOString(), resourceIds: selectedSlot.resourceIds, supervisorIds: selectedSlot.supervisorIds };
        await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: practiceId5 } }, location: { connect: { id: availability.locationId } }, actor: { connect: { id: operator2.actorId } }, action: moving ? "treatment_plan.rescheduled.v1" : "treatment_plan.booked.v1", resourceType: "Appointment", resourceId: appointment.id, correlationId: idempotencyKey, evidence: bounded(evidence), evidenceHash: evidenceHash(evidence), occurredAt: (/* @__PURE__ */ new Date()).toISOString() }, query: "id" });
      }
      return { appointmentId: appointment.id, duration, services, providerName, created: !moving };
    });
    if (booking.created && !args.planId) try {
      const dateStr = start.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const timeStr = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      await sendAppointmentRequestReceipt({
        to: clientEmail,
        clientName,
        serviceName: booking.services.map((service) => service.name).join(", "),
        providerName: booking.providerName,
        appointmentDate: dateStr,
        appointmentTime: timeStr,
        duration: booking.duration
      });
    } catch (emailError) {
      console.error("Failed to send appointment request receipt:", emailError);
    }
    return { success: true, appointmentId: booking.appointmentId, error: null };
  } catch (error) {
    return {
      success: false,
      appointmentId: null,
      error: error instanceof Error ? error.message : "Unable to book appointment"
    };
  }
}

// features/keystone/extendGraphqlSchema/checkAvailability.ts
var import_core102 = require("@keystone-6/core");
var TimeSlot = import_core102.graphql.object()({
  name: "TimeSlot",
  fields: {
    time: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.String) }),
    startTime: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.String) }),
    available: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.Boolean) }),
    resourceId: import_core102.graphql.field({ type: import_core102.graphql.String }),
    resourceName: import_core102.graphql.field({ type: import_core102.graphql.String }),
    resourceIds: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.list(import_core102.graphql.nonNull(import_core102.graphql.ID))) }),
    roomId: import_core102.graphql.field({ type: import_core102.graphql.ID }),
    deviceId: import_core102.graphql.field({ type: import_core102.graphql.ID }),
    supervisorIds: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.list(import_core102.graphql.nonNull(import_core102.graphql.ID))) }),
    blockedReason: import_core102.graphql.field({ type: import_core102.graphql.String })
  }
});
var AvailabilityResult = import_core102.graphql.object()({
  name: "AvailabilityResult",
  fields: {
    providerId: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.ID) }),
    providerName: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.String) }),
    date: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.String) }),
    timezone: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.String) }),
    locationId: import_core102.graphql.field({ type: import_core102.graphql.ID }),
    supervisorIds: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.list(import_core102.graphql.nonNull(import_core102.graphql.ID))) }),
    slots: import_core102.graphql.field({ type: import_core102.graphql.nonNull(import_core102.graphql.list(import_core102.graphql.nonNull(TimeSlot))) })
  }
});
var checkAvailability = import_core102.graphql.field({
  type: AvailabilityResult,
  args: {
    providerId: import_core102.graphql.arg({ type: import_core102.graphql.nonNull(import_core102.graphql.ID) }),
    date: import_core102.graphql.arg({ type: import_core102.graphql.nonNull(import_core102.graphql.String) }),
    serviceDuration: import_core102.graphql.arg({ type: import_core102.graphql.nonNull(import_core102.graphql.Int) }),
    serviceId: import_core102.graphql.arg({ type: import_core102.graphql.ID }),
    locationId: import_core102.graphql.arg({ type: import_core102.graphql.ID })
  },
  async resolve(_source, args, context) {
    const sudo = context.sudo();
    const schedulingActor = permissions.canSchedule({ session: context.session }) ? requireActorPractice(context, permissions.canSchedule, "Scheduling authority is required") : null;
    if (schedulingActor) {
      const fresh = await assertActiveActor(context);
      if (fresh.role?.canSchedule !== true || fresh.practiceId !== schedulingActor.practiceId) throw new Error("Scheduling authority is no longer active");
      await assertPracticeRecord(context, "Provider", args.providerId);
      if (args.locationId) await assertPracticeRecord(context, "Location", args.locationId);
    }
    const publicOnly = !schedulingActor;
    if (publicOnly && !args.serviceId) throw new Error("A published service is required");
    let duration = args.serviceDuration;
    if (args.serviceId) {
      if (schedulingActor) await assertPracticeRecord(context, "Service", args.serviceId);
      const service = await sudo.query.Service.findOne({
        where: { id: args.serviceId },
        query: "id status isPublic baseDuration practice { id isActive storefrontSetting { isPublished primaryLocation { id isActive } } }"
      });
      if (!service || service.status !== "active" || publicOnly && (service.isPublic !== true || service.practice?.isActive !== true || service.practice?.storefrontSetting?.isPublished !== true || service.practice?.storefrontSetting?.primaryLocation?.isActive !== true)) throw new Error("Service is unavailable");
      if (schedulingActor && service.practice?.id !== schedulingActor.practiceId) throw new Error("Service is outside the authenticated practice");
      duration = Number(service.baseDuration || duration);
    }
    return computeProviderAvailability({
      sudo,
      providerId: args.providerId,
      date: args.date,
      serviceDuration: duration,
      serviceIds: args.serviceId ? [args.serviceId] : [],
      locationId: args.locationId,
      publicOnly
    });
  }
});
var availabilityExtension = import_core102.graphql.extend(() => ({
  query: { checkAvailability }
}));

// features/keystone/extendGraphqlSchema/calculateCommission.ts
var import_core103 = require("@keystone-6/core");
var ServiceCommission = import_core103.graphql.object()({ name: "ServiceCommission", fields: { serviceName: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.String) }), revenue: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.Float) }), commission: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.Float) }) } });
var AppointmentCommission = import_core103.graphql.object()({ name: "AppointmentCommission", fields: { appointmentId: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.ID) }), date: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.String) }), clientName: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.String) }), services: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.list(import_core103.graphql.nonNull(ServiceCommission))) }), totalRevenue: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.Float) }), totalCommission: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.Float) }) } });
var CommissionResult = import_core103.graphql.object()({ name: "CommissionResult", fields: { providerId: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.ID) }), providerName: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.String) }), startDate: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.String) }), endDate: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.String) }), commissionRate: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.Float) }), appointments: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.list(import_core103.graphql.nonNull(AppointmentCommission))) }), totalServiceRevenue: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.Float) }), totalServiceCommission: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.Float) }), appointmentCount: import_core103.graphql.field({ type: import_core103.graphql.nonNull(import_core103.graphql.Int) }) } });
var calculateCommission = import_core103.graphql.field({ type: CommissionResult, args: { providerId: import_core103.graphql.arg({ type: import_core103.graphql.nonNull(import_core103.graphql.ID) }), startDate: import_core103.graphql.arg({ type: import_core103.graphql.nonNull(import_core103.graphql.String) }), endDate: import_core103.graphql.arg({ type: import_core103.graphql.nonNull(import_core103.graphql.String) }) }, async resolve(_source, args, context) {
  const actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
  await assertActiveActor(context);
  const provider = await assertPracticeRecord(context, "Provider", args.providerId, "id practice { id } user { name }");
  const start = /* @__PURE__ */ new Date(`${args.startDate}T00:00:00.000Z`), end = /* @__PURE__ */ new Date(`${args.endDate}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) throw new Error("Commission date range is invalid");
  const rows = await context.sudo().query.Commission.findMany({ where: { practice: { id: { equals: actor.practiceId } }, provider: { id: { equals: provider.id } }, createdAt: { gte: start.toISOString(), lte: end.toISOString() } }, take: 1e3, orderBy: { createdAt: "asc" }, query: "id saleAmount commissionRate commissionAmount createdAt service { name } payment { appointment { id startTime client { user { name } } } }" });
  const groups = /* @__PURE__ */ new Map();
  for (const item of rows) {
    const appointment = item.payment?.appointment;
    const id = appointment?.id || `unlinked:${item.id}`;
    const current = groups.get(id) || { appointmentId: id, date: appointment?.startTime || item.createdAt, clientName: appointment?.client?.user?.name || "Client omitted", services: [], totalRevenue: 0, totalCommission: 0 };
    current.services.push({ serviceName: item.service?.name || "Settled service", revenue: Number(item.saleAmount || 0) / 100, commission: Number(item.commissionAmount || 0) / 100 });
    current.totalRevenue += Number(item.saleAmount || 0) / 100;
    current.totalCommission += Number(item.commissionAmount || 0) / 100;
    groups.set(id, current);
  }
  const appointments = [...groups.values()];
  const revenue = rows.reduce((sum, item) => sum + Number(item.saleAmount || 0), 0) / 100;
  const commission = rows.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0) / 100;
  return { providerId: provider.id, providerName: provider.user?.name || "Provider", startDate: args.startDate, endDate: args.endDate, commissionRate: revenue ? commission / revenue : 0, appointments, totalServiceRevenue: revenue, totalServiceCommission: commission, appointmentCount: appointments.length };
} });

// features/keystone/extendGraphqlSchema/storefrontProviders.ts
var import_core104 = require("@keystone-6/core");
var StorefrontProviderUser = import_core104.graphql.object()({
  name: "StorefrontProviderUser",
  fields: {
    id: import_core104.graphql.field({ type: import_core104.graphql.nonNull(import_core104.graphql.ID) }),
    name: import_core104.graphql.field({ type: import_core104.graphql.nonNull(import_core104.graphql.String) })
  }
});
var StorefrontProviderImage = import_core104.graphql.object()({
  name: "StorefrontProviderImage",
  fields: { url: import_core104.graphql.field({ type: import_core104.graphql.nonNull(import_core104.graphql.String) }) }
});
var StorefrontProviderPhoto = import_core104.graphql.object()({
  name: "StorefrontProviderPhoto",
  fields: {
    image: import_core104.graphql.field({ type: StorefrontProviderImage }),
    imagePath: import_core104.graphql.field({ type: import_core104.graphql.String }),
    altText: import_core104.graphql.field({ type: import_core104.graphql.String })
  }
});
var StorefrontSpecialization = import_core104.graphql.object()({
  name: "StorefrontSpecialization",
  fields: {
    id: import_core104.graphql.field({ type: import_core104.graphql.nonNull(import_core104.graphql.ID) }),
    name: import_core104.graphql.field({ type: import_core104.graphql.nonNull(import_core104.graphql.String) })
  }
});
var StorefrontProvider = import_core104.graphql.object()({
  name: "StorefrontProvider",
  fields: {
    id: import_core104.graphql.field({ type: import_core104.graphql.nonNull(import_core104.graphql.ID) }),
    user: import_core104.graphql.field({ type: StorefrontProviderUser }),
    isActive: import_core104.graphql.field({ type: import_core104.graphql.nonNull(import_core104.graphql.Boolean) }),
    photo: import_core104.graphql.field({ type: StorefrontProviderPhoto }),
    specializations: import_core104.graphql.field({
      type: import_core104.graphql.nonNull(import_core104.graphql.list(import_core104.graphql.nonNull(StorefrontSpecialization)))
    })
  }
});
var PUBLIC_PROVIDER_SELECTION = `
  id
  user { id name }
  isActive
  photo { image { url } imagePath altText }
  specializations(where: { status: { equals: active }, isPublic: { equals: true } }, take: 50, orderBy: { name: asc }) { id name }
`;
async function activePractice(context, practiceSlug) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/.test(practiceSlug)) return null;
  const practice = (await context.sudo().query.Practice.findMany({
    where: { slug: { equals: practiceSlug }, isActive: { equals: true } },
    take: 1,
    query: "id storefrontSetting { id isPublished primaryLocation { id isActive practice { id } } }"
  }))[0] || null;
  if (!practice?.storefrontSetting?.isPublished || practice.storefrontSetting.primaryLocation?.isActive !== true || practice.storefrontSetting.primaryLocation?.practice?.id !== practice.id) return null;
  return practice;
}
var storefrontProviders = import_core104.graphql.field({
  type: import_core104.graphql.nonNull(import_core104.graphql.list(import_core104.graphql.nonNull(StorefrontProvider))),
  args: {
    practiceSlug: import_core104.graphql.arg({ type: import_core104.graphql.nonNull(import_core104.graphql.String) }),
    serviceId: import_core104.graphql.arg({ type: import_core104.graphql.ID }),
    take: import_core104.graphql.arg({ type: import_core104.graphql.Int })
  },
  async resolve(_source, args, context) {
    const practice = await activePractice(context, args.practiceSlug);
    if (!practice) return [];
    const take = args.take && args.take > 0 ? Math.min(args.take, 50) : 50;
    const where = {
      practice: { id: { equals: practice.id } },
      status: { equals: "active" },
      isActive: { equals: true },
      isPublic: { equals: true }
    };
    if (args.serviceId) where.specializations = { some: { id: { equals: args.serviceId }, status: { equals: "active" }, isPublic: { equals: true } } };
    return context.sudo().query.Provider.findMany({
      where,
      take,
      orderBy: { id: "asc" },
      query: PUBLIC_PROVIDER_SELECTION
    });
  }
});
var storefrontProvider = import_core104.graphql.field({
  type: StorefrontProvider,
  args: {
    id: import_core104.graphql.arg({ type: import_core104.graphql.nonNull(import_core104.graphql.ID) }),
    practiceSlug: import_core104.graphql.arg({ type: import_core104.graphql.nonNull(import_core104.graphql.String) })
  },
  async resolve(_source, args, context) {
    const practice = await activePractice(context, args.practiceSlug);
    if (!practice) return null;
    return (await context.sudo().query.Provider.findMany({
      where: {
        id: { equals: args.id },
        practice: { id: { equals: practice.id } },
        status: { equals: "active" },
        isActive: { equals: true },
        isPublic: { equals: true }
      },
      take: 1,
      query: PUBLIC_PROVIDER_SELECTION
    }))[0] || null;
  }
});

// features/keystone/extendGraphqlSchema/storefrontSettings.ts
var import_core105 = require("@keystone-6/core");

// features/keystone/localRuntime.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_child_process = require("node:child_process");
function localRuntimeDescriptor() {
  const file = process.env.MEDSPA_LOCAL_RUNTIME_FILE;
  if (!file) return null;
  const root = (0, import_node_fs.realpathSync)(process.cwd());
  const expected = (0, import_node_path.resolve)(root, ".runtime/medspa-goal/owner.json");
  if (file !== expected || (0, import_node_fs.realpathSync)(file) !== expected) throw new Error("Invalid local runtime descriptor path");
  const stat = (0, import_node_fs.statSync)(file);
  if ((stat.mode & 511) !== 384 || stat.uid !== process.getuid?.()) throw new Error("Local runtime descriptor must be private and owned");
  const d = JSON.parse((0, import_node_fs.readFileSync)(file, "utf8"));
  if (d.root !== root || d.datadir !== (0, import_node_path.resolve)(root, ".runtime/medspa-goal/pgdata") || !/^medspa_goal_[a-f0-9]{12}$/.test(d.role) || d.db !== d.role || !Number.isInteger(d.port) || d.port < 1 || d.port > 65535) throw new Error("Invalid owned runtime identity");
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.port !== String(d.port) || url.username !== d.role || url.pathname !== `/${d.db}`) throw new Error("Local runtime database target mismatch");
  for (const key of Object.keys(process.env)) {
    if (/^(S3_|AWS_|SMTP_|MAIL_|STRIPE_|PAYPAL_|OPENAI_|OPENROUTER_|ANTHROPIC_|PAYMENT_ADAPTER_)/.test(key) && process.env[key]) throw new Error("External integration configuration is forbidden in the owned offline runtime");
  }
  const pidLines = (0, import_node_fs.readFileSync)((0, import_node_path.resolve)(d.datadir, "postmaster.pid"), "utf8").split("\n");
  const pid = Number(pidLines[0]);
  if (!Number.isInteger(pid) || pid < 1 || pidLines[1] !== d.datadir || Number(pidLines[3]) !== d.port) throw new Error("Owned PostgreSQL process identity mismatch");
  const command = (0, import_node_child_process.execFileSync)("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).trim();
  if (!command.endsWith(`/postgres -D ${d.datadir}`)) throw new Error("Owned PostgreSQL datadir process mismatch");
  process.kill(pid, 0);
  return d;
}
async function assertOwnedLocalDatabase(prisma) {
  const d = localRuntimeDescriptor();
  if (!d) return false;
  const rows = await prisma.$queryRawUnsafe(`SELECT current_database() AS db, current_user AS role, current_setting('data_directory') AS datadir, inet_server_port() AS port, (SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()) AS owner`);
  const r = rows[0];
  if (!r || r.db !== d.db || r.role !== d.role || r.owner !== d.role || r.datadir !== d.datadir || r.port !== d.port) throw new Error("Actual local server/role/database owner mismatch");
  const images = (0, import_node_path.resolve)(d.root, ".runtime/medspa-goal/public-images");
  (0, import_node_fs.mkdirSync)(images, { recursive: true, mode: 448 });
  if ((0, import_node_fs.realpathSync)(images) !== images || !(0, import_node_fs.statSync)(images).isDirectory() || (0, import_node_fs.statSync)(images).uid !== process.getuid?.()) throw new Error("Unsafe local image storage");
  return true;
}

// features/keystone/extendGraphqlSchema/storefrontSettings.ts
var PRACTICE_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;
var TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
var DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
var UNPUBLISHED_TEXT = /\b(?:configure|placeholder)\b/i;
function boundedText(value, max) {
  if (typeof value !== "string") return null;
  const text93 = value.trim();
  if (!text93 || text93.length > max || /[\u0000-\u001f\u007f]/.test(text93) || UNPUBLISHED_TEXT.test(text93)) return null;
  return text93;
}
function publicPhone(value, fictionalDemo) {
  const phone = boundedText(value, 40);
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const reservedFictionalNumber = /^1?[2-9]\d{2}55501\d{2}$/.test(digits);
  if (reservedFictionalNumber) return fictionalDemo ? phone : null;
  return /555/.test(digits) ? null : phone;
}
function publicEmail(value, fictionalDemo) {
  const email = boundedText(value, 254);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (/\.example$/i.test(email)) return fictionalDemo ? email : null;
  return /\.(?:invalid|test)$/i.test(email) ? null : email;
}
function publicZipCode(value) {
  const zipCode = boundedText(value, 24);
  if (!zipCode || /^0+(?:-0+)?$/.test(zipCode)) return null;
  return zipCode;
}
function publicHours(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value;
  const hours = {};
  for (const day of DAYS) {
    const entry = source[day];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const closed = entry.closed === true;
    const open = typeof entry.open === "string" && TIME.test(entry.open) ? entry.open : null;
    const close = typeof entry.close === "string" && TIME.test(entry.close) ? entry.close : null;
    if (closed || open && close) hours[day] = { open, close, closed };
  }
  return Object.keys(hours).length ? hours : null;
}
var StorefrontPublicLocation = import_core105.graphql.object()({
  name: "StorefrontPublicLocation",
  fields: {
    id: import_core105.graphql.field({ type: import_core105.graphql.nonNull(import_core105.graphql.ID) }),
    name: import_core105.graphql.field({ type: import_core105.graphql.String }),
    address: import_core105.graphql.field({ type: import_core105.graphql.String }),
    city: import_core105.graphql.field({ type: import_core105.graphql.String }),
    state: import_core105.graphql.field({ type: import_core105.graphql.String }),
    zipCode: import_core105.graphql.field({ type: import_core105.graphql.String }),
    phone: import_core105.graphql.field({ type: import_core105.graphql.String }),
    email: import_core105.graphql.field({ type: import_core105.graphql.String }),
    hours: import_core105.graphql.field({ type: import_core105.graphql.JSON }),
    timezone: import_core105.graphql.field({ type: import_core105.graphql.String })
  }
});
var StorefrontPublicSettings = import_core105.graphql.object()({
  name: "StorefrontPublicSettings",
  fields: {
    configured: import_core105.graphql.field({ type: import_core105.graphql.nonNull(import_core105.graphql.Boolean) }),
    displayName: import_core105.graphql.field({ type: import_core105.graphql.String }),
    accentHue: import_core105.graphql.field({ type: import_core105.graphql.Int }),
    logoSvg: import_core105.graphql.field({ type: import_core105.graphql.String }),
    logoHue: import_core105.graphql.field({ type: import_core105.graphql.Int }),
    catalogNames: import_core105.graphql.field({ type: import_core105.graphql.nonNull(import_core105.graphql.list(import_core105.graphql.nonNull(import_core105.graphql.String))) }),
    serviceCount: import_core105.graphql.field({ type: import_core105.graphql.nonNull(import_core105.graphql.Int) }),
    primaryLocation: import_core105.graphql.field({ type: StorefrontPublicLocation })
  }
});
var unconfigured = () => ({
  configured: false,
  displayName: null,
  accentHue: null,
  logoSvg: null,
  logoHue: null,
  catalogNames: [],
  serviceCount: 0,
  primaryLocation: null
});
var publicStorefrontSettings = import_core105.graphql.field({
  type: import_core105.graphql.nonNull(StorefrontPublicSettings),
  args: { practiceSlug: import_core105.graphql.arg({ type: import_core105.graphql.nonNull(import_core105.graphql.String) }) },
  async resolve(_source, args, context) {
    if (!PRACTICE_SLUG.test(args.practiceSlug)) return unconfigured();
    const sudo = context.sudo();
    const practice = (await sudo.query.Practice.findMany({
      where: { slug: { equals: args.practiceSlug }, isActive: { equals: true } },
      take: 1,
      query: "id isDemo"
    }))[0];
    if (!practice) return unconfigured();
    const fictionalDemo = practice.isDemo === true;
    if (fictionalDemo && !await assertOwnedLocalDatabase(context.prisma)) return unconfigured();
    const setting = (await sudo.query.StorefrontSetting.findMany({
      where: { practice: { id: { equals: practice.id } }, isPublished: { equals: true } },
      take: 1,
      query: `id displayName accentHue logoSvg logoHue primaryLocation {
        id name address city state zipCode phone email hours timezone isActive practice { id }
      }`
    }))[0];
    const displayName = boundedText(setting?.displayName, 80);
    const hue = setting?.accentHue;
    const location = setting?.primaryLocation;
    if (!setting || !displayName || !Number.isInteger(hue) || hue < 0 || hue > 360 || !location || location.isActive !== true || location.practice?.id !== practice.id) return unconfigured();
    const [catalog, serviceCount] = await Promise.all([
      sudo.query.Service.findMany({
        where: { practice: { id: { equals: practice.id } }, status: { equals: "active" }, isPublic: { equals: true } },
        take: 6,
        orderBy: { name: "asc" },
        query: "id name"
      }),
      sudo.query.Service.count({
        where: { practice: { id: { equals: practice.id } }, status: { equals: "active" }, isPublic: { equals: true } }
      })
    ]);
    return {
      configured: true,
      displayName,
      accentHue: hue,
      logoSvg: publicLogoSvg(setting.logoSvg),
      logoHue: validLogoHue(setting.logoHue) ? setting.logoHue : 0,
      catalogNames: catalog.map((item) => boundedText(item.name, 120)).filter((name) => Boolean(name)),
      serviceCount,
      primaryLocation: {
        id: location.id,
        name: boundedText(location.name, 120),
        address: boundedText(location.address, 200),
        city: boundedText(location.city, 100),
        state: boundedText(location.state, 100),
        zipCode: publicZipCode(location.zipCode),
        phone: publicPhone(location.phone, fictionalDemo),
        email: publicEmail(location.email, fictionalDemo),
        hours: publicHours(location.hours),
        timezone: boundedText(location.timezone, 100)
      }
    };
  }
});

// features/keystone/extendGraphqlSchema/medspaPlanJourney.ts
var import_core106 = require("@keystone-6/core");
async function loadMedspaPlanJourney(context, consultationId, pages = {}) {
  const offsets = [pages.planPage ?? 0, pages.appointmentPage ?? 0, pages.historyPage ?? 0];
  if (offsets.some((value) => !Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(value * 20))) throw new Error("Invalid history page");
  const [planPage, appointmentPage, historyPage] = offsets;
  const actor = requireActorPractice(context, permissions.canManageClinical);
  const fresh = await assertActiveActor(context);
  const header = await assertPracticeRecord(context, "Consultation", consultationId, "id practice { id } location { id }");
  await assertPlanStaffMembership(context.sudo(), actor.practiceId, actor.actorId, header.location?.id || "");
  const consultation = await assertPracticeRecord(context, "Consultation", consultationId, "id status candidacyDecision evidenceHash revision staffDecisionRecorded signedAt supersededBy { id } practice { id } provider { id user { id } } location { id } service { id name } client { id user { name email phone } }");
  if (consultation.location?.id !== header.location?.id) throw new Error("Current clinical location scope changed");
  const patient = await assertPracticeRecord(context, "Client", consultation.client?.id || "", "id practice { id } user { id status name email phone practice { id } }");
  if (patient.user?.status !== "active" || patient.user.practice?.id !== actor.practiceId) throw new Error("Current patient practice authority is unavailable");
  const sudo = context.sudo();
  const planRows = await sudo.query.TreatmentPlan.findMany({ where: { practice: { id: { equals: actor.practiceId } }, consultation: { id: { equals: consultation.id } } }, orderBy: [{ revision: "desc" }, { id: "desc" }], skip: planPage * 20, take: 21, query: "id title status revision evidenceHash signedAt items(take: 51) { id serviceTitle service { id } plannedSessions completedSessions }" });
  const plans = planRows.slice(0, 20);
  if (plans.some((plan) => plan.items.length > 50)) throw new Error("Plan history exceeds the safe detail bound; use a paginated clinical history view");
  const projectedPlans = [];
  for (const plan of plans) {
    let receipt = null;
    if (plan.evidenceHash) {
      const receipts = await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, action: { equals: "treatment_plan.approved.v1" }, resourceType: { equals: "TreatmentPlan" }, resourceId: { equals: plan.id } }, take: 2, query: "id" });
      if (receipts.length) receipt = (await loadPlanApprovalReceipt(sudo, actor.practiceId, plan.id)).receipt;
    }
    projectedPlans.push({ id: plan.id, title: plan.title, status: plan.status, revision: plan.revision, evidenceHash: plan.evidenceHash, signedAt: plan.signedAt ? new Date(plan.signedAt).toISOString() : null, receiptAvailable: Boolean(receipt), items: plan.items.map((item) => {
      const accepted = receipt?.items.find((value) => value.itemId === item.id);
      return { id: item.id, serviceId: item.service?.id || "", title: item.serviceTitle, plannedSessions: item.plannedSessions, completedSessions: item.completedSessions, price: accepted?.price ?? null, duration: accepted?.duration ?? null };
    }) });
  }
  const rows = await sudo.query.Appointment.findMany({ where: { practice: { id: { equals: actor.practiceId } }, client: { id: { equals: consultation.client.id } } }, skip: appointmentPage * 20, take: 21, orderBy: { startTime: "desc" }, query: "id status revision startTime endTime metadata payment { id } transaction { id } consentsCount treatmentSessionsCount resourceReservations(where: { status: { in: [reserved, in_use] } }, take: 101) { resource { id } } supervisorReservations(where: { status: { equals: reserved } }, take: 101) { supervisor { id } }" });
  if (rows.some((value) => value.resourceReservations.length > 100 || value.supervisorReservations.length > 100)) throw new Error("Appointment detail history exceeds the safe bound");
  const planIds = new Set(plans.map((plan) => plan.id));
  const appointments = rows.slice(0, 20).filter((value) => value.metadata?.planBooking?.consultationId === consultation.id).map((value) => {
    const binding = value.metadata.planBooking;
    return { id: value.id, planId: binding.planId, itemId: binding.itemId, status: value.status, revision: value.revision, startTime: new Date(value.startTime).toISOString(), endTime: value.endTime ? new Date(value.endTime).toISOString() : null, price: binding.price, resourceIds: value.resourceReservations.map((row2) => row2.resource.id), supervisorIds: value.supervisorReservations.map((row2) => row2.supervisor.id), correctable: ["pending", "confirmed"].includes(value.status) && !value.payment?.id && !value.transaction?.id && !value.consentsCount && !value.treatmentSessionsCount };
  });
  const history = planIds.size ? await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, OR: [{ resourceType: { equals: "TreatmentPlan" }, resourceId: { in: [...planIds] } }, { resourceType: { equals: "Appointment" }, resourceId: { in: appointments.map((value) => value.id) } }], action: { startsWith: "treatment_plan." } }, skip: historyPage * 20, take: 21, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], query: "id action resourceId occurredAt evidenceHash correlationId" }) : [];
  return { consultation: { id: consultation.id, clientId: consultation.client.id, clientName: patient.user?.name || "", clientEmail: patient.user?.email || "", clientPhone: patient.user?.phone || "", providerId: consultation.provider?.id || "", locationId: consultation.location?.id || "", serviceId: consultation.service?.id || "", serviceName: consultation.service?.name || "", status: consultation.status, candidacyDecision: consultation.candidacyDecision, evidenceHash: consultation.evidenceHash, revision: consultation.revision, superseded: Boolean(consultation.supersededBy?.id), canApprove: consultation.provider?.user?.id === actor.actorId && consultation.status === "completed" && consultation.candidacyDecision === "candidate" && consultation.staffDecisionRecorded === true && Boolean(consultation.signedAt) && !consultation.supersededBy?.id }, canSchedule: fresh.role.canSchedule === true, pages: { plans: planPage, appointments: appointmentPage, history: historyPage, morePlans: planRows.length > 20, moreAppointments: rows.length > 20, moreHistory: history.length > 20 }, plans: projectedPlans, appointments, history: history.slice(0, 20).map((value) => ({ id: value.id, action: value.action, resourceId: value.resourceId, occurredAt: new Date(value.occurredAt).toISOString(), evidenceHash: value.evidenceHash, correlationId: value.correlationId })) };
}
async function loadMedspaConsultationQueue(context, input) {
  const actor = requireActorPractice(context, permissions.canManageClinical);
  await assertActiveActor(context);
  const page = input.page ?? 0;
  const search = input.search?.trim() || "";
  if (!Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(page * 20) || search.length > 100) throw new Error("Invalid queue page or search");
  const memberships = await context.sudo().query.PracticeMembership.findMany({ where: { practice: { id: { equals: actor.practiceId } }, user: { id: { equals: actor.actorId } } }, take: 2, query: "id status locations(take: 101) { id isActive practice { id } }" });
  if (memberships.length !== 1 || memberships[0].status !== "active" || !memberships[0].locations?.length || memberships[0].locations.length > 100 || memberships[0].locations.some((location) => location.practice?.id !== actor.practiceId || location.isActive !== true)) throw new Error("Current clinical membership and location authority are unavailable");
  const items = await context.sudo().query.Consultation.findMany({ where: { location: { id: { in: memberships[0].locations.map((location) => location.id) } }, client: { practice: { id: { equals: actor.practiceId } }, user: { practice: { id: { equals: actor.practiceId } }, status: { equals: "active" } } }, practice: { id: { equals: actor.practiceId } }, ...search ? { service: { name: { contains: search, mode: "insensitive" } } } : {} }, skip: page * 20, take: 21, orderBy: [{ signedAt: "desc" }, { id: "desc" }], query: "id status candidacyDecision client { user { name } } service { name }" });
  return { page, hasMore: items.length > 20, items: items.slice(0, 20).map((value) => ({ id: value.id, status: value.status, candidacyDecision: value.candidacyDecision, clientName: value.client?.user?.name || "Client", serviceName: value.service?.name || "Service" })) };
}
async function assertAppointmentClinicalHeader(context, appointmentId) {
  const actor = requireActorPractice(context, permissions.canManageClinical);
  await assertActiveActor(context);
  const header = await assertPracticeRecord(context, "Appointment", appointmentId, "id practice { id } location { id }");
  await assertPlanStaffMembership(context.sudo(), actor.practiceId, actor.actorId, header.location?.id || "");
  const location = await context.sudo().query.Location.findOne({ where: { id: header.location.id }, query: "id isActive practice { id }" });
  if (!location || location.practice?.id !== actor.practiceId || location.isActive !== true) throw new Error("Current clinical location scope is unavailable");
  return { appointmentId: header.id, actorId: actor.actorId, practiceId: actor.practiceId, locationId: location.id };
}
var medspaAppointmentClinicalHeader = import_core106.graphql.field({ type: import_core106.graphql.JSON, args: { appointmentId: import_core106.graphql.arg({ type: import_core106.graphql.nonNull(import_core106.graphql.ID) }) }, resolve(_source, args, context) {
  return assertAppointmentClinicalHeader(context, args.appointmentId);
} });
var medspaPlanJourney = import_core106.graphql.field({ type: import_core106.graphql.JSON, args: { consultationId: import_core106.graphql.arg({ type: import_core106.graphql.nonNull(import_core106.graphql.ID) }), planPage: import_core106.graphql.arg({ type: import_core106.graphql.Int }), appointmentPage: import_core106.graphql.arg({ type: import_core106.graphql.Int }), historyPage: import_core106.graphql.arg({ type: import_core106.graphql.Int }) }, resolve(_source, args, context) {
  return loadMedspaPlanJourney(context, args.consultationId, args);
} });
var medspaConsultationQueue = import_core106.graphql.field({ type: import_core106.graphql.JSON, args: { page: import_core106.graphql.arg({ type: import_core106.graphql.Int }), search: import_core106.graphql.arg({ type: import_core106.graphql.String }) }, resolve(_source, args, context) {
  return loadMedspaConsultationQueue(context, args);
} });

// features/keystone/extendGraphqlSchema/appointmentSchedule.ts
var import_core108 = require("@keystone-6/core");

// features/keystone/mutations/appointmentWorkflows.ts
var import_core107 = require("@keystone-6/core");
var transitions2 = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["in_progress", "cancelled", "no_show"],
  in_progress: ["cancelled"]
};
function appointmentTransitionRequestHash(args, actorId) {
  return evidenceHash({ appointmentId: args.appointmentId, status: args.status, reason: args.reason?.trim() || "", expectedRevision: args.expectedRevision, actorId, ...args.expectedScope ? { expectedScope: args.expectedScope } : {} });
}
function assertExpectedSchedulingScope(expected, actual) {
  if (expected != null && evidenceHash(expected) !== evidenceHash(actual)) throw new Error("Original scheduling actor, purpose or parent scope changed");
}
async function loadAppointmentTransitionReceipt(sudo, args, scope, planBooking) {
  if (!args.idempotencyKey || !validIdempotencyKey(args.idempotencyKey)) throw new Error("A stable appointment transition key is required");
  const rows = await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: scope.practiceId } }, resourceType: { equals: "Appointment" }, action: { in: ["treatment_plan.transitioned.v1", "appointment.transitioned.v1"] }, correlationId: { equals: args.idempotencyKey } }, take: 2, query: "id practice { id } actor { id } resourceId correlationId evidence evidenceHash" });
  if (!rows.length) return null;
  const row2 = rows[0];
  const receipt = row2.evidence;
  if (rows.length !== 1 || !receipt || Array.isArray(receipt) || row2.practice?.id !== scope.practiceId || row2.actor?.id !== scope.actorId || row2.resourceId !== scope.appointmentId || row2.correlationId !== args.idempotencyKey || evidenceHash(receipt) !== row2.evidenceHash || receipt.requestHash !== appointmentTransitionRequestHash(args, scope.actorId) || receipt.actorId !== scope.actorId || receipt.toStatus !== args.status || receipt.fromRevision !== args.expectedRevision || !Number.isSafeInteger(receipt.fromRevision) || Number(receipt.toRevision) !== Number(receipt.fromRevision) + 1 || (receipt.scope ? evidenceHash(receipt.scope) !== evidenceHash(scope) : evidenceHash(receipt.planBooking) !== evidenceHash(planBooking))) throw new Error("Original transition receipt is ambiguous or does not match this command and authority");
  return { version: 1, scope, idempotencyKey: args.idempotencyKey, requestHash: String(receipt.requestHash), receiptId: row2.id, evidenceHash: row2.evidenceHash, fromRevision: Number(receipt.fromRevision), toRevision: Number(receipt.toRevision), status: String(receipt.toStatus) };
}
function errorMessage(error) {
  return error instanceof Error ? error.message : "Appointment workflow failed";
}
async function transitionAppointmentTransaction(context, args) {
  const reason = args.reason?.trim() || "";
  if (!context.session?.itemId) return { success: false, appointmentId: null, status: null, error: "You must be signed in" };
  if (!(args.status in { confirmed: 1, in_progress: 1, cancelled: 1, no_show: 1 })) {
    return { success: false, appointmentId: null, status: null, error: "Unsupported appointment transition" };
  }
  if (reason.length > 1e3) return { success: false, appointmentId: null, status: null, error: "Transition reason is too long" };
  if (args.status === "cancelled" && !reason) return { success: false, appointmentId: null, status: null, error: "A cancellation reason is required" };
  try {
    return await serializableWorkflow(context, "medspa-appointment-transition", [`appointment:${args.appointmentId}`, `idempotency:${context.session.data.practice?.id}:${args.idempotencyKey || args.appointmentId}`], async (transactionContext) => {
      const authority2 = await assertAppointmentSchedulingAuthority(transactionContext, args.appointmentId, { cancellationOnly: args.status === "cancelled", purpose: args.expectedScope?.purpose });
      assertExpectedSchedulingScope(args.expectedScope, authority2.scope);
      const sudo = transactionContext.sudo();
      const appointment = await sudo.query.Appointment.findOne({
        where: { id: args.appointmentId },
        query: "id practice { id } revision status metadata consentsCount treatmentSessionsCount client { id user { id } } payment { id status refundedAmount totalAmount } transaction { id } resourceReservations(where: { status: { in: [reserved, in_use] } }) { id } supervisorReservations(where: { status: { equals: reserved } }) { id }"
      });
      if (!appointment || appointment.practice?.id !== authority2.scope.practiceId || appointment.client?.id !== authority2.scope.clientId) throw new Error("Appointment not found");
      const planBooking = appointment.metadata?.planBooking;
      const requestHash = appointmentTransitionRequestHash(args, authority2.scope.actorId);
      const receipted = authority2.scope.purpose === "scheduler" || Boolean(planBooking || args.idempotencyKey || args.expectedScope || args.expectedRevision != null);
      if (receipted) {
        if (!Number.isSafeInteger(args.expectedRevision) || Number(args.expectedRevision) < 1) throw new Error("An original appointment revision is required");
        if (!args.idempotencyKey || !validIdempotencyKey(args.idempotencyKey)) throw new Error("A stable appointment transition key is required");
        const receipt2 = await loadAppointmentTransitionReceipt(sudo, args, authority2.scope, planBooking);
        if (receipt2) return { success: true, appointmentId: appointment.id, status: receipt2.status, receipt: receipt2, error: null };
        if (appointment.revision !== args.expectedRevision) throw new Error("Appointment version changed; review the current state");
      }
      if (["cancelled", "no_show"].includes(args.status) && (appointment.payment?.id || appointment.transaction?.id || appointment.treatmentSessionsCount || appointment.consentsCount)) throw new Error("Documented clinical or financial evidence requires a reviewed correction workflow before cancellation");
      if (appointment.status === args.status) {
        if (receipted) throw new Error("This state is already recorded; read back history rather than create an unreceipted new command");
        return { success: true, appointmentId: appointment.id, status: appointment.status, error: null };
      }
      if (!(transitions2[appointment.status || ""] || []).includes(args.status)) {
        throw new Error(`Cannot transition appointment from ${appointment.status || "unknown"} to ${args.status}`);
      }
      if (args.status === "in_progress" && appointment.transaction?.id) throw new Error("Checked-out appointments cannot be restarted");
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      const metadata = appointment.metadata && typeof appointment.metadata === "object" ? appointment.metadata : {};
      const history = Array.isArray(metadata.transitionHistory) ? metadata.transitionHistory.slice(-49) : [];
      const data = {
        status: args.status,
        revision: Number(appointment.revision || 1) + 1,
        metadata: {
          ...metadata,
          transitionHistory: [...history, {
            from: appointment.status,
            to: args.status,
            reason: reason || null,
            actorId: context.session.itemId,
            at: now2
          }]
        }
      };
      if (args.status === "confirmed") data.confirmedAt = now2;
      if (args.status === "cancelled") {
        data.cancelledAt = now2;
        data.cancellationReason = reason;
      }
      await sudo.query.Appointment.updateOne({ where: { id: appointment.id }, data, query: "id" });
      if (["cancelled", "no_show"].includes(args.status)) {
        for (const reservation of appointment.resourceReservations || []) await sudo.query.AppointmentResourceReservation.updateOne({ where: { id: reservation.id }, data: { status: "cancelled" }, query: "id" });
        for (const reservation of appointment.supervisorReservations || []) await sudo.query.AppointmentSupervisorReservation.updateOne({ where: { id: reservation.id }, data: { status: "cancelled" }, query: "id" });
      }
      let receipt = null;
      if (receipted) {
        const evidence = { version: 2, requestHash, scope: authority2.scope, membershipId: authority2.membershipId, delegation: authority2.delegation, planBooking: planBooking || null, fromStatus: appointment.status, toStatus: args.status, fromRevision: appointment.revision, toRevision: Number(appointment.revision || 1) + 1, actorId: authority2.scope.actorId, reason, occurredAt: now2 };
        const hash = evidenceHash(evidence);
        const event = await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: appointment.practice.id } }, location: { connect: { id: authority2.scope.locationId } }, actor: { connect: { id: authority2.scope.actorId } }, action: planBooking ? "treatment_plan.transitioned.v1" : "appointment.transitioned.v1", resourceType: "Appointment", resourceId: appointment.id, correlationId: args.idempotencyKey, evidence: bounded(evidence), evidenceHash: hash, occurredAt: now2 }, query: "id" });
        receipt = { version: 1, scope: authority2.scope, idempotencyKey: args.idempotencyKey, requestHash, receiptId: event.id, evidenceHash: hash, fromRevision: appointment.revision, toRevision: evidence.toRevision, status: args.status };
      }
      return { success: true, appointmentId: appointment.id, status: args.status, receipt, error: null };
    });
  } catch (error) {
    return { success: false, appointmentId: null, status: null, error: errorMessage(error) };
  }
}
var transitionResult = import_core107.graphql.object()({
  name: "TransitionAppointmentResult",
  fields: {
    success: import_core107.graphql.field({ type: import_core107.graphql.nonNull(import_core107.graphql.Boolean) }),
    appointmentId: import_core107.graphql.field({ type: import_core107.graphql.ID }),
    status: import_core107.graphql.field({ type: import_core107.graphql.String }),
    error: import_core107.graphql.field({ type: import_core107.graphql.String }),
    receipt: import_core107.graphql.field({ type: import_core107.graphql.JSON })
  }
});
var transitionAppointment = import_core107.graphql.field({
  type: transitionResult,
  args: {
    appointmentId: import_core107.graphql.arg({ type: import_core107.graphql.nonNull(import_core107.graphql.ID) }),
    expectedRevision: import_core107.graphql.arg({ type: import_core107.graphql.Int }),
    idempotencyKey: import_core107.graphql.arg({ type: import_core107.graphql.String }),
    expectedScope: import_core107.graphql.arg({ type: import_core107.graphql.JSON }),
    status: import_core107.graphql.arg({ type: import_core107.graphql.nonNull(import_core107.graphql.String) }),
    reason: import_core107.graphql.arg({ type: import_core107.graphql.String })
  },
  resolve(_source, args, context) {
    return transitionAppointmentTransaction(context, args);
  }
});
function depositCollectionEnabled() {
  return false;
}
async function processAppointmentDepositTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
    await assertPracticeRecord(context, "Appointment", args.appointmentId);
  } catch (error) {
    return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: error instanceof Error ? error.message : "Appointment not found" };
  }
  if (!args.idempotencyKey?.trim() || args.idempotencyKey.length < 12 || args.idempotencyKey.length > 200) {
    return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: "Idempotency key is invalid" };
  }
  if (!(/* @__PURE__ */ new Set(["credit_card", "debit_card", "cash", "apple_pay", "google_pay"])).has(args.paymentMethod)) {
    return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: "Payment method is invalid" };
  }
  if (!depositCollectionEnabled()) return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: "Deposit collection is disabled until multi-payment allocation and cancellation reconciliation are implemented" };
  try {
    return await serializableWorkflow(context, "medspa-appointment-deposit", [
      `appointment:${args.appointmentId}`,
      `idempotency:${actor.practiceId}:${args.idempotencyKey}`
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const scopedDepositKey = aggregateIdempotencyKey(actor.practiceId, `deposit:${args.idempotencyKey}`);
      const existing = (await sudo.query.PaymentSession.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedDepositKey } },
        take: 1,
        query: "id amount status data appointment { id } payment { id }"
      }))[0];
      if (existing) {
        const data = existing.data && typeof existing.data === "object" ? existing.data : {};
        if (existing.appointment?.id !== args.appointmentId || data.purpose !== "appointment_deposit") {
          throw new Error("Idempotency key was already used for another operation");
        }
        return { success: true, appointmentId: args.appointmentId, paymentId: existing.payment?.id || null, paymentSessionId: existing.id, status: existing.status, error: null };
      }
      const appointment = await sudo.query.Appointment.findOne({
        where: { id: args.appointmentId },
        query: "id status depositAmount depositPaid practice { id } client { user { email } }"
      });
      if (!appointment) throw new Error("Appointment not found");
      if (!(/* @__PURE__ */ new Set(["pending", "confirmed"])).has(appointment.status || "")) throw new Error("Appointment is not eligible for a deposit");
      if (appointment.depositPaid) throw new Error("Appointment deposit is already paid");
      const amount = Number(appointment.depositAmount || 0);
      if (!Number.isInteger(amount) || amount <= 0) throw new Error("Appointment does not require a deposit");
      const providers = await sudo.query.PaymentProvider.findMany({
        where: args.providerCode ? { practice: { id: { equals: actor.practiceId } }, code: { equals: args.providerCode }, isInstalled: { equals: true } } : { practice: { id: { equals: actor.practiceId } }, isInstalled: { equals: true }, isDefault: { equals: true } },
        take: 1,
        query: "id code adapter config"
      });
      const provider = providers[0];
      if (!provider) throw new Error("Payment provider is unavailable");
      const result2 = await createProviderPaymentSession({
        provider: paymentProviderFromRecord(provider),
        amount,
        currency: "usd",
        idempotencyKey: scopedDepositKey,
        metadata: { purpose: "appointment_deposit", appointmentId: appointment.id, operatorId: context.session.itemId }
      });
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      const session = await sudo.query.PaymentSession.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } },
          appointment: { connect: { id: appointment.id } },
          provider: { connect: { id: provider.id } },
          idempotencyKey: scopedDepositKey,
          amount,
          currency: "usd",
          status: result2.status,
          providerReference: result2.providerReference,
          completedAt: result2.status === "completed" ? now2 : void 0,
          data: { ...result2.data || {}, purpose: "appointment_deposit", clientSecret: result2.clientSecret || null }
        },
        query: "id"
      });
      const payment = await sudo.query.Payment.createOne({
        data: {
          idempotencyKey: aggregateIdempotencyKey(scopedDepositKey, "payment"),
          practice: { connect: { id: actor.practiceId } },
          appointment: { connect: { id: appointment.id } },
          subtotal: amount,
          tax: 0,
          tip: 0,
          discount: 0,
          totalAmount: amount,
          paymentMethod: args.paymentMethod,
          status: paymentRecordStatus(result2.status),
          session: { connect: { id: session.id } },
          processedBy: { connect: { id: context.session.itemId } },
          processedAt: result2.status === "completed" ? now2 : void 0,
          receiptEmail: appointment.client?.user?.email || "",
          notes: `Appointment deposit for ${appointment.id}`
        },
        query: "id"
      });
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { payment: { connect: { id: payment.id } } }, query: "id" });
      if (result2.status === "completed") {
        await sudo.query.Appointment.updateOne({
          where: { id: appointment.id },
          data: { depositPaid: true, ...appointment.status === "pending" ? { status: "confirmed", confirmedAt: now2 } : {} },
          query: "id"
        });
      }
      return { success: true, appointmentId: appointment.id, paymentId: payment.id, paymentSessionId: session.id, status: result2.status, error: null };
    });
  } catch (error) {
    return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: errorMessage(error) };
  }
}
var depositResult = import_core107.graphql.object()({
  name: "ProcessAppointmentDepositResult",
  fields: {
    success: import_core107.graphql.field({ type: import_core107.graphql.nonNull(import_core107.graphql.Boolean) }),
    appointmentId: import_core107.graphql.field({ type: import_core107.graphql.ID }),
    paymentId: import_core107.graphql.field({ type: import_core107.graphql.ID }),
    paymentSessionId: import_core107.graphql.field({ type: import_core107.graphql.ID }),
    status: import_core107.graphql.field({ type: import_core107.graphql.String }),
    error: import_core107.graphql.field({ type: import_core107.graphql.String })
  }
});
var processAppointmentDeposit = import_core107.graphql.field({
  type: depositResult,
  args: {
    appointmentId: import_core107.graphql.arg({ type: import_core107.graphql.nonNull(import_core107.graphql.ID) }),
    paymentMethod: import_core107.graphql.arg({ type: import_core107.graphql.nonNull(import_core107.graphql.String) }),
    providerCode: import_core107.graphql.arg({ type: import_core107.graphql.String }),
    idempotencyKey: import_core107.graphql.arg({ type: import_core107.graphql.nonNull(import_core107.graphql.String) })
  },
  resolve(_source, args, context) {
    return processAppointmentDepositTransaction(context, args);
  }
});

// features/keystone/extendGraphqlSchema/appointmentSchedule.ts
async function loadAppointmentSchedule(context, appointmentId, original, purpose) {
  if (purpose != null && !["scheduler", "customer_cancel"].includes(purpose)) throw new Error("Unsupported scheduling purpose");
  if (original && original.appointmentId !== appointmentId) throw new Error("Original appointment intent does not match");
  const authority2 = await assertAppointmentSchedulingAuthority(context, appointmentId, { cancellationOnly: !original || original.status === "cancelled", purpose: original?.expectedScope?.purpose || purpose || void 0 });
  assertExpectedSchedulingScope(original?.expectedScope, authority2.scope);
  const row2 = await context.sudo().query.Appointment.findOne({ where: { id: appointmentId }, query: "id practice { id } location { id timezone } client { id } revision status startTime endTime metadata consentsCount treatmentSessionsCount payment { id } transaction { id }" });
  if (!row2 || row2.practice?.id !== authority2.scope.practiceId || row2.location?.id !== authority2.scope.locationId || row2.client?.id !== authority2.scope.clientId) throw new Error("Appointment scheduling access is unavailable");
  const binding = row2.metadata?.planBooking;
  const receipt = original ? await loadAppointmentTransitionReceipt(context.sudo(), original, authority2.scope, binding) : null;
  const simpleCorrectionAllowed = ["pending", "confirmed"].includes(row2.status) && !row2.consentsCount && !row2.treatmentSessionsCount && !row2.payment?.id && !row2.transaction?.id;
  const allowedTransitions = [];
  if (authority2.scope.purpose === "scheduler" && row2.status === "pending") allowedTransitions.push("confirmed");
  if (authority2.scope.purpose === "scheduler" && row2.status === "confirmed" && !row2.transaction?.id) allowedTransitions.push("in_progress");
  if (simpleCorrectionAllowed) {
    allowedTransitions.push("cancelled");
    if (authority2.scope.purpose === "scheduler") allowedTransitions.push("no_show");
  }
  return { scope: authority2.scope, timezone: row2.location?.timezone || "UTC", revision: row2.revision, status: row2.status, startTime: new Date(row2.startTime).toISOString(), endTime: row2.endTime ? new Date(row2.endTime).toISOString() : null, simpleCorrectionAllowed, allowedTransitions, receipt };
}
var medspaAppointmentSchedule = import_core108.graphql.field({ type: import_core108.graphql.JSON, args: { appointmentId: import_core108.graphql.arg({ type: import_core108.graphql.nonNull(import_core108.graphql.ID) }), original: import_core108.graphql.arg({ type: import_core108.graphql.JSON }), purpose: import_core108.graphql.arg({ type: import_core108.graphql.String }) }, resolve(_source, args, context) {
  return loadAppointmentSchedule(context, args.appointmentId, args.original, args.purpose);
} });

// features/keystone/extendGraphqlSchema/medspaOperationsWorkspace.ts
var import_core109 = require("@keystone-6/core");
var sections = ["clients", "catalog", "benefits", "inventory", "engagement", "administration", "reports", "integrations"];
var definitions = {
  clients: { title: "Client care", description: "Owned client relationships and due follow-up; no intake, notes, photos, or payment detail." },
  catalog: { title: "Services & catalog", description: "Practice-scoped bookability, resources, and configured clinical prerequisites." },
  benefits: { title: "Memberships, packages & gift cards", description: "Practice-scoped commercial liabilities and current program state." },
  inventory: { title: "Inventory & custody", description: "Practice-scoped lot custody, quarantine, expiry, and immutable movements." },
  engagement: { title: "Waitlist & communications", description: "Practice-scoped scheduling and delivery exceptions." },
  administration: { title: "Authority & resources", description: "Practice-scoped locations, credential exceptions, and device readiness." },
  reports: { title: "Bounded operations", description: "Settled commercial records and workload counts; no treatment-outcome claims." },
  integrations: { title: "Integrations & delivery", description: "Practice-scoped provider readiness and event exceptions without secrets or payloads." }
};
var metricType = import_core109.graphql.object()({ name: "MedSpaWorkspaceMetric", fields: { label: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.String) }), value: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.Int) }), format: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.String) }) } });
var recordType = import_core109.graphql.object()({ name: "MedSpaWorkspaceRecord", fields: { id: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.ID) }), title: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.String) }), subtitle: import_core109.graphql.field({ type: import_core109.graphql.String }), status: import_core109.graphql.field({ type: import_core109.graphql.String }), detail: import_core109.graphql.field({ type: import_core109.graphql.String }), amount: import_core109.graphql.field({ type: import_core109.graphql.Int }), metric: import_core109.graphql.field({ type: import_core109.graphql.Int }), occurredAt: import_core109.graphql.field({ type: import_core109.graphql.String }), href: import_core109.graphql.field({ type: import_core109.graphql.String }), action: import_core109.graphql.field({ type: import_core109.graphql.String }) } });
var resultType = import_core109.graphql.object()({ name: "MedSpaOperationsWorkspace", fields: { section: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.String) }), title: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.String) }), description: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.String) }), attentionCount: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.Int) }), metrics: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.list(import_core109.graphql.nonNull(metricType))) }), records: import_core109.graphql.field({ type: import_core109.graphql.nonNull(import_core109.graphql.list(import_core109.graphql.nonNull(recordType))) }) } });
var count = (label, value) => ({ label, value, format: "count" });
var money = (label, value) => ({ label, value: Math.round(value), format: "money" });
var occurred = (value) => value ? new Date(value).toISOString() : null;
var scoped = (practiceId5, extra) => extra ? { AND: [{ practice: { id: { equals: practiceId5 } } }, extra] } : { practice: { id: { equals: practiceId5 } } };
var row = (item) => ({ subtitle: null, status: null, detail: null, amount: null, metric: null, occurredAt: null, href: null, action: null, ...item });
async function load(section, sudo, practiceId5) {
  if (section === "clients") {
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const [items, total, followups] = await Promise.all([
      sudo.query.Client.findMany({ where: scoped(practiceId5), take: 50, orderBy: { updatedAt: "desc" }, query: "id totalVisits lifetimeValue updatedAt user { name } preferredProvider { user { name } }" }),
      sudo.query.Client.count({ where: scoped(practiceId5) }),
      sudo.query.FollowUpTask.count({ where: scoped(practiceId5, { status: { in: ["open", "in_progress"] }, dueAt: { lte: now2 } }) })
    ]);
    return { metrics: [count("Clients in practice", total), count("Follow-ups due now", followups), money("Lifetime value \u2014 sample of latest 50 clients", items.reduce((sum, item) => sum + Number(item.lifetimeValue || 0), 0))], records: items.map((item) => row({ id: item.id, title: item.user?.name || "Unnamed client", subtitle: item.preferredProvider?.user?.name || "No preferred provider", status: "Care relationship", metric: item.totalVisits || 0, amount: item.lifetimeValue || 0, occurredAt: occurred(item.updatedAt) })), attentionCount: followups };
  }
  if (section === "catalog") {
    const items = await sudo.query.Service.findMany({ where: scoped(practiceId5), take: 50, orderBy: { name: "asc" }, query: "id name status baseDuration price staffAuthorizationRequired requiresConsultation requiresIntakeReview requiredResources { id }" });
    return { metrics: [count("Services shown (max 50)", items.length), count("Restricted in sample", items.filter((x) => x.staffAuthorizationRequired).length), count("Missing resources in sample", items.filter((x) => !x.requiredResources?.length).length)], records: items.map((item) => row({ id: item.id, title: item.name, status: item.status, detail: `${item.baseDuration || 0} min \xB7 ${item.requiredResources?.length || 0} required resources`, amount: item.price || 0, metric: item.requiredResources?.length || 0 })), attentionCount: items.filter((x) => x.status !== "active" || !x.requiredResources?.length).length };
  }
  if (section === "benefits") {
    const [memberships, packages, cards] = await Promise.all([
      sudo.query.ClientMembership.findMany({ where: scoped(practiceId5), take: 50, orderBy: { updatedAt: "desc" }, query: "id status nextBillingDate client { name } membership { name } agreementsCount ledgerEntriesCount" }),
      sudo.query.ClientPackage.findMany({ where: scoped(practiceId5), take: 50, query: "id status totalValue usedValue client { name } package { name }" }),
      sudo.query.GiftCard.findMany({ where: scoped(practiceId5), take: 50, query: "id isActive currentBalance createdAt" })
    ]);
    const records = [...memberships.map((item) => row({ id: `membership:${item.id}`, title: item.membership?.name || "Membership", subtitle: item.client?.name || null, status: item.status, detail: `${item.agreementsCount || 0} agreements \xB7 ${item.ledgerEntriesCount || 0} ledger entries`, occurredAt: occurred(item.nextBillingDate) })), ...packages.map((item) => row({ id: `package:${item.id}`, title: item.package?.name || "Package", subtitle: item.client?.name || null, status: item.status, amount: Math.max(0, (item.totalValue || 0) - (item.usedValue || 0)) })), ...cards.map((item) => row({ id: `gift:${item.id}`, title: "Gift card", status: item.isActive ? "active" : "inactive", amount: item.currentBalance || 0, occurredAt: occurred(item.createdAt) }))];
    return { metrics: [count("Memberships shown (max 50)", memberships.length), count("Packages shown (max 50)", packages.length), money("Gift liability \u2014 first 50 cards", cards.reduce((sum, item) => sum + Number(item.currentBalance || 0), 0))], records, attentionCount: memberships.filter((x) => !x.agreementsCount).length };
  }
  if (section === "inventory") {
    const [lots, products, locations] = await Promise.all([
      sudo.query.InventoryLot.findMany({ where: scoped(practiceId5), take: 50, orderBy: { expiresAt: "asc" }, query: "id lotNumber status remainingQuantity expiresAt product { name } location { name }" }),
      sudo.query.Product.findMany({ where: scoped(practiceId5, { isActive: { equals: true } }), take: 50, orderBy: { name: "asc" }, query: "id name sku quantity" }),
      sudo.query.Location.findMany({ where: scoped(practiceId5, { isActive: { equals: true } }), take: 50, orderBy: { name: "asc" }, query: "id name" })
    ]);
    const lotRows = lots.map((item) => row({ id: `lot:${item.id}`, title: item.product?.name || "Inventory lot", subtitle: `${item.lotNumber} \xB7 ${item.location?.name || "Unscoped"}`, status: item.status, detail: item.expiresAt ? `Expires ${new Date(item.expiresAt).toISOString().slice(0, 10)}` : "No expiry configured", metric: item.remainingQuantity || 0 }));
    const productRows = products.map((item) => row({ id: `product:${item.id}`, title: item.name || "Retail product", subtitle: item.sku || "No SKU", status: "active", detail: "Aggregate on-hand across locations \xB7 location availability is checked on write", metric: item.quantity || 0, action: "adjust_inventory" }));
    const locationRows = locations.map((item) => row({ id: `location:${item.id}`, title: item.name || "Stock location", status: "active" }));
    return {
      metrics: [count("Lots shown (max 50)", lots.length), count("Quarantined / recalled shown", lots.filter((x) => ["quarantined", "recalled"].includes(x.status)).length), count("Expiring within 30 days shown", lots.filter((x) => x.expiresAt && new Date(x.expiresAt) <= new Date(Date.now() + 30 * 864e5)).length)],
      records: [...locationRows, ...productRows, ...lotRows],
      attentionCount: lots.filter((x) => ["quarantined", "recalled", "expired"].includes(x.status)).length
    };
  }
  if (section === "engagement") {
    const [waitlist, failed2] = await Promise.all([sudo.query.WaitlistEntry.findMany({ where: scoped(practiceId5, { status: { in: ["active", "notified"] } }), take: 50, orderBy: { createdAt: "asc" }, query: "id guestName status createdAt service { name } client { name }" }), sudo.query.MessageLog.count({ where: scoped(practiceId5, { status: { equals: "failed" } }) })]);
    return { metrics: [count("Open waitlist", waitlist.length), count("Delivery failures", failed2)], records: waitlist.map((item) => row({ id: item.id, title: item.client?.name || item.guestName || "Waitlist client", subtitle: item.service?.name || null, status: item.status, occurredAt: occurred(item.createdAt), action: item.status === "active" ? "notify_waitlist" : null })), attentionCount: waitlist.length + failed2 };
  }
  if (section === "administration") {
    const [credentials, resources, locations] = await Promise.all([sudo.query.ProviderCredential.findMany({ where: scoped(practiceId5), take: 50, orderBy: { expiresAt: "asc" }, query: "id licenseType status expiresAt provider { user { name } }" }), sudo.query.Resource.findMany({ where: scoped(practiceId5), take: 50, query: "id name type readinessStatus maintenanceDueAt location { name }" }), sudo.query.Location.count({ where: scoped(practiceId5, { isActive: { equals: true } }) })]);
    const records = [...credentials.map((item) => row({ id: `credential:${item.id}`, title: item.provider?.user?.name || "Provider credential", subtitle: item.licenseType, status: item.status, detail: item.expiresAt ? `Expires ${new Date(item.expiresAt).toISOString().slice(0, 10)}` : null, occurredAt: occurred(item.expiresAt) })), ...resources.map((item) => row({ id: `resource:${item.id}`, title: item.name, subtitle: `${item.type} \xB7 ${item.location?.name || "Unscoped"}`, status: item.readinessStatus, occurredAt: occurred(item.maintenanceDueAt) }))];
    return { metrics: [count("Active locations", locations), count("Credentials", credentials.length), count("Resources", resources.length)], records, attentionCount: credentials.filter((x) => x.status !== "verified" || new Date(x.expiresAt) <= new Date(Date.now() + 30 * 864e5)).length + resources.filter((x) => x.readinessStatus !== "available").length };
  }
  if (section === "reports") {
    const [payments, incidents, rights, commissions, payoutCount] = await Promise.all([
      sudo.query.Payment.findMany({ where: scoped(practiceId5, { status: { in: ["completed", "partially_refunded", "refunded"] } }), take: 500, query: "id totalAmount refundedAmount processedAt status" }),
      sudo.query.Incident.count({ where: scoped(practiceId5, { status: { in: ["open", "under_review"] } }) }),
      sudo.query.PatientRightsRequest.count({ where: scoped(practiceId5, { status: { notIn: ["closed", "fulfilled"] } }) }),
      sudo.query.Commission.findMany({ where: scoped(practiceId5, { isPaid: { equals: false } }), take: 500, query: "id commissionAmount isPaid" }),
      sudo.query.Commission.count({ where: scoped(practiceId5, { isPaid: { equals: true } }) })
    ]);
    const net = payments.reduce((sum, item) => sum + Number(item.totalAmount || 0) - Number(item.refundedAmount || 0), 0);
    const commissionLiability = commissions.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
    return { metrics: [money("Net settled revenue \u2014 max 500 payments", net), money("Unpaid commission liability \u2014 max 500", commissionLiability), count("Paid commission records", payoutCount), count("Open incidents", incidents), count("Rights requests open", rights)], records: payments.slice(0, 50).map((item) => row({ id: item.id, title: "Settled payment", status: item.status, amount: Number(item.totalAmount || 0) - Number(item.refundedAmount || 0), occurredAt: occurred(item.processedAt) })), attentionCount: incidents + rights };
  }
  const [providers, pending, failed, webhooks] = await Promise.all([
    sudo.query.PaymentProvider.findMany({ where: scoped(practiceId5), take: 20, query: "id name code adapter isInstalled isDefault" }),
    sudo.query.DomainEvent.count({ where: scoped(practiceId5, { status: { equals: "pending" } }) }),
    sudo.query.DomainEvent.count({ where: scoped(practiceId5, { status: { equals: "dead_letter" } }) }),
    sudo.query.PaymentWebhookEvent.findMany({ where: scoped(practiceId5), take: 100, orderBy: { processedAt: "desc" }, query: "id status" })
  ]);
  const webhookAttention = webhooks.filter((item) => item.status !== "processed").length;
  return { metrics: [count("Providers installed (max 20)", providers.filter((x) => x.isInstalled).length), count("Events pending", pending), count("Events failed", failed), count("Webhook attention (max 100)", webhookAttention)], records: providers.map((item) => row({ id: item.id, title: item.name, subtitle: `${item.adapter} \xB7 ${item.code}`, status: item.isInstalled ? item.isDefault ? "installed_default" : "installed" : "not_installed", detail: "Secrets and payloads omitted" })), attentionCount: providers.filter((x) => !x.isInstalled).length + pending + failed + webhookAttention };
}
var sectionCapability = {
  clients: permissions.canReadClients,
  catalog: permissions.canManagePractice,
  benefits: permissions.canManageFinance,
  inventory: permissions.canManageInventory,
  engagement: ({ session }) => permissions.canSchedule({ session }) || permissions.canManageCommunications({ session }),
  administration: permissions.canManagePractice,
  reports: permissions.canViewReports,
  integrations: permissions.canManageIntegrations
};
var medspaOperationsWorkspace = import_core109.graphql.field({
  type: resultType,
  args: { section: import_core109.graphql.arg({ type: import_core109.graphql.nonNull(import_core109.graphql.String) }) },
  async resolve(_source, { section }, context) {
    if (!sections.includes(section)) throw new Error("Unsupported medspa operations workspace");
    const key = section;
    const actor = requireActorPractice(context, sectionCapability[key], "This workspace section is not authorized");
    await assertActiveActor(context);
    const data = await load(key, context.sudo(), actor.practiceId);
    return { section: key, ...definitions[key], ...data };
  }
});

// features/keystone/extendGraphqlSchema/clientPortal.ts
var import_core110 = require("@keystone-6/core");
var clientPortal = import_core110.graphql.field({
  type: import_core110.graphql.JSON,
  async resolve(_source, _args, context) {
    if (!context.session?.itemId) return { authenticated: false, client: null, appointments: [], benefits: [], treatmentPlans: [], followUps: [], photoConsents: [], rightsRequests: [], releasedAssets: [] };
    const actor = await assertActiveActor(context);
    const clients = await context.query.Client.findMany({ where: { user: { id: { equals: actor.actorId } }, practice: { id: { equals: actor.practiceId } } }, take: 1, query: "id totalVisits user { name email }" });
    const client = clients[0];
    if (!client) return { authenticated: true, client: null, appointments: [], benefits: [], treatmentPlans: [], followUps: [], photoConsents: [], rightsRequests: [], releasedAssets: [] };
    const appointments = await context.query.Appointment.findMany({ where: { practice: { id: { equals: actor.practiceId } }, client: { id: { equals: client.id } } }, take: 100, orderBy: { startTime: "desc" }, query: `id startTime endTime duration status bookedAt confirmedAt cancelledAt cancellationReason clientNotes
      location { name timezone } provider { user { name } title } lineItems { id serviceTitle serviceImagePath duration price quantity }
      consultation { id status candidacyDecision reviewedAt signedAt }
      treatmentSessions(where: { status: { in: [completed, stopped] } }) { id serviceTitle status startedAt completedAt signedAt }
      consents { id status signedAt effectiveUntil service { name } templateVersion { version language } }
      administrations { id status startedAt completedAt immediateOutcome aftercareSnapshot service { name } performer { user { name } } }
      payment { id subtotal tax tip discount totalAmount refundedAmount paymentMethod status processedAt refundedAt }
      transaction { id status paymentStatus completedAt lineItems { id itemType quantity unitPrice discount metadata } }
    ` });
    const sudo = context.sudo();
    const [packages, memberships, rights, assets, plans, followUps, photoConsents] = await Promise.all([
      context.query.ClientPackage.findMany({ where: { client: { id: { equals: actor.actorId } } }, take: 100, query: "id status purchasedAt expiresAt totalValue usedValue remainingValue package { name } usageHistory { id valueUsed usedAt service { name } }" }),
      context.query.ClientMembership.findMany({ where: { client: { id: { equals: actor.actorId } } }, take: 100, query: "id status startDate nextBillingDate pausedUntil membership { name monthlyPrice }" }),
      sudo.query.PatientRightsRequest.findMany({ where: { practice: { id: { equals: actor.practiceId } }, client: { id: { equals: client.id } } }, take: 100, orderBy: { requestedAt: "desc" }, query: "id type status requestedAt dueAt completedAt" }),
      sudo.query.ClientAsset.findMany({ where: { practice: { id: { equals: actor.practiceId } }, client: { id: { equals: client.id } }, releasedToClient: { equals: true }, status: { equals: "ready" } }, take: 100, query: "id category purpose contentType byteSize readyAt accessClass retentionClass retainUntil" }),
      sudo.query.TreatmentPlan.findMany({ where: { practice: { id: { equals: actor.practiceId } }, client: { id: { equals: client.id } }, portalVisible: { equals: true } }, take: 100, query: "id title goals status startsAt endsAt items { serviceTitle plannedSessions completedSessions status }" }),
      sudo.query.FollowUpTask.findMany({ where: { practice: { id: { equals: actor.practiceId } }, client: { id: { equals: client.id } } }, take: 100, orderBy: { dueAt: "desc" }, query: "id dueAt title instructions status completedAt actions(orderBy: { occurredAt: desc }, take: 20) { action redFlag occurredAt }" }),
      sudo.query.PhotoConsent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, client: { id: { equals: client.id } } }, take: 100, orderBy: { effectiveFrom: "desc" }, query: "id purpose status mediaScope audienceScope effectiveFrom effectiveUntil actions(orderBy: { occurredAt: desc }) { action reason scope occurredAt }" })
    ]);
    return { authenticated: true, client, appointments: appointments.map((appointment) => ({ ...appointment, transaction: appointment.transaction ? { id: appointment.transaction.id, status: appointment.transaction.status, paymentStatus: appointment.transaction.paymentStatus, completedAt: appointment.transaction.completedAt, lineItems: appointment.transaction.lineItems.map((line) => ({ id: line.id, itemType: line.itemType, quantity: line.quantity, unitPrice: line.unitPrice, discount: line.discount, title: line.metadata?.title || null })) } : null })), benefits: { packages, memberships }, treatmentPlans: plans, followUps, photoConsents, rightsRequests: rights, releasedAssets: assets };
  }
});

// features/keystone/mutations/runMedSpaOnboarding.ts
var import_node_crypto4 = require("node:crypto");
var import_core112 = require("@keystone-6/core");

// features/platform/onboarding/lib/seed.json
var seed_default = {
  medspaInfo: {
    key: "juniper-vale-demo-med-spa",
    name: "Juniper Vale Med Spa \u2014 Demo",
    address: "400 Juniper Avenue, Suite 210",
    city: "Brooklyn",
    state: "NY",
    zipCode: "11201",
    phone: "+1 (212) 555-0147",
    email: "hello@juniper-vale.example",
    timezone: "America/New_York",
    hours: {
      monday: { closed: true },
      tuesday: { open: "10:00", close: "17:00", closed: false },
      wednesday: { open: "10:00", close: "17:00", closed: false },
      thursday: { open: "10:00", close: "17:00", closed: false },
      friday: { open: "10:00", close: "16:00", closed: false },
      saturday: { open: "10:00", close: "14:00", closed: false },
      sunday: { closed: true }
    }
  },
  resources: [
    {
      key: "demo-consultation-room",
      name: "Consultation room",
      type: "room",
      capacity: 1,
      isActive: true,
      isPublic: true,
      readinessStatus: "available",
      notes: "Fictional room used only to exercise the demo consultation-request schedule. It is not represented as a clinical treatment environment."
    },
    {
      key: "treatment-room-placeholder",
      name: "Treatment Room \u2014 Configuration Required",
      type: "room",
      capacity: 1,
      isActive: false,
      isPublic: false,
      readinessStatus: "acceptance_testing",
      notes: "Private inactive placeholder. Readiness, emergency requirements, and clinical release remain unconfigured."
    },
    {
      key: "energy-device-placeholder",
      name: "Energy Device \u2014 Configuration Required",
      type: "device",
      capacity: 1,
      isActive: false,
      isPublic: false,
      readinessStatus: "acceptance_testing",
      notes: "Private inactive placeholder. No device identity, registration, training, maintenance, calibration, or clinical release is claimed."
    }
  ],
  categories: [
    {
      key: "consultations",
      name: "Consultations",
      slug: "demo-services",
      description: "Appointment planning.",
      displayOrder: 10,
      icon: "clipboard"
    },
    {
      key: "medical-aesthetics",
      name: "Medical Aesthetics",
      slug: "medical-aesthetics",
      description: "Inactive placeholders requiring approved jurisdiction, credential, protocol, consent, product, and resource packs.",
      displayOrder: 20,
      icon: "shield"
    }
  ],
  services: [
    {
      key: "medical-aesthetics-consultation",
      name: "Consultation request",
      category: "Consultations",
      description: "Scheduling and service information.",
      baseDuration: 45,
      price: 0,
      basePrice: 0,
      depositRequired: false,
      depositAmount: 0,
      status: "active",
      staffAuthorizationRequired: false,
      requiresConsultation: false,
      requiresIntakeReview: false,
      requiresLotTraceability: false,
      requiredResources: [
        "demo-consultation-room"
      ],
      isPublic: true
    },
    {
      key: "injectable-treatment-placeholder",
      name: "Injectable Treatment \u2014 Configuration Required",
      category: "Medical Aesthetics",
      description: "Inactive until approved products, patient-specific order, consent, credential, supervision, protocol, and lot custody are configured.",
      baseDuration: 60,
      price: 1,
      basePrice: 1,
      depositRequired: false,
      depositAmount: 0,
      status: "inactive",
      staffAuthorizationRequired: true,
      requiresConsultation: true,
      requiresIntakeReview: true,
      requiresLotTraceability: true,
      requiredResources: [
        "treatment-room-placeholder"
      ],
      isPublic: false
    },
    {
      key: "energy-treatment-placeholder",
      name: "Energy Treatment \u2014 Configuration Required",
      category: "Medical Aesthetics",
      description: "Inactive until device identity, intended use, facility rules, training, maintenance, clinical authority, protocol, and consent are configured.",
      baseDuration: 60,
      price: 1,
      basePrice: 1,
      depositRequired: false,
      depositAmount: 0,
      status: "inactive",
      staffAuthorizationRequired: true,
      requiresConsultation: true,
      requiresIntakeReview: true,
      requiresLotTraceability: false,
      requiredResources: [
        "treatment-room-placeholder",
        "energy-device-placeholder"
      ],
      isPublic: false
    }
  ],
  providers: [
    {
      key: "avery-rowan-demo-coordinator",
      name: "Avery Rowan",
      email: "avery.rowan@juniper-vale-demo.example",
      phone: "+1 (212) 555-0162",
      role: "assistant",
      tier: "junior",
      title: "Scheduling coordinator",
      bio: "Appointment planning.",
      baseCommissionRate: 0,
      status: "active",
      isActive: true,
      isPublic: true,
      specializations: [
        "medical-aesthetics-consultation"
      ]
    }
  ],
  scheduleBlocks: [
    {
      key: "avery-demo-consultation-hours",
      provider: "avery-rowan-demo-coordinator",
      daysOfWeek: [2, 3, 4],
      startTime: "10:00",
      endTime: "14:00",
      breakStart: "12:00",
      breakEnd: "12:30",
      isAvailable: true,
      isPublic: true
    }
  ],
  clients: [],
  intakeForms: [
    {
      key: "medical-history-intake",
      name: "Medical History Intake",
      requiredForServices: [],
      fields: [
        {
          id: "goals",
          type: "textarea",
          label: "Goals and concerns",
          required: true
        },
        {
          id: "conditions",
          type: "textarea",
          label: "Medical conditions",
          required: true
        },
        {
          id: "medications",
          type: "textarea",
          label: "Medications and supplements",
          required: true
        },
        {
          id: "allergies",
          type: "textarea",
          label: "Allergies and prior reactions",
          required: true
        },
        {
          id: "priorProcedures",
          type: "textarea",
          label: "Prior procedures",
          required: false
        }
      ]
    }
  ],
  formTemplates: [
    {
      key: "medical-history-intake-v1",
      name: "Medical History Intake v1",
      type: "clinical_intake",
      description: "Versioned intake only; it is not treatment consent or a clinical decision.",
      fields: [
        {
          id: "historyAcknowledgement",
          type: "checkbox",
          label: "I confirm this history is complete to the best of my knowledge",
          required: true
        }
      ]
    }
  ],
  memberships: [],
  packages: [],
  products: [],
  messageTemplates: [
    {
      key: "appointment-reminder",
      name: "Appointment Reminder",
      type: "reminder",
      content: "Demo reminder template: a recorded appointment status does not establish treatment eligibility or clinical authorization.",
      variables: [
        "appointmentDate"
      ]
    }
  ],
  appointments: [],
  gallery: [],
  paymentProviders: [
    {
      key: "manual-cash",
      name: "Manual Cash \u2014 Enable After Policy Review",
      code: "pp_manual_cash",
      adapter: "manual",
      isInstalled: false,
      isDefault: false,
      config: {
        purpose: "operator-recorded cash only"
      }
    },
    {
      key: "stripe",
      name: "Stripe \u2014 Configuration Required",
      code: "pp_stripe",
      adapter: "stripe",
      isInstalled: false,
      isDefault: false,
      config: {}
    }
  ],
  storefront: {
    displayName: "Juniper Vale Med Spa",
    accentHue: 214,
    isPublished: true
  }
};

// features/keystone/mutations/inventoryWorkflows.ts
var import_core111 = require("@keystone-6/core");
var denied2 = { success: false, movementId: null, balanceAfter: null };
function validKey2(value) {
  return value.trim().length >= 12 && value.length <= 200;
}
async function recordInventoryMovement(context, input) {
  if (!Number.isInteger(input.delta) || input.delta === 0 || Math.abs(input.delta) > 1e6) {
    return { ...denied2, error: "Inventory delta must be a non-zero integer" };
  }
  if (!validKey2(input.idempotencyKey)) return { ...denied2, error: "Inventory idempotency key is invalid" };
  const reason = input.reason.trim();
  if (!reason || reason.length > 500) return { ...denied2, error: "Inventory reason is required" };
  const sudo = context.sudo();
  const existing = (await sudo.query.InventoryMovement.findMany({
    where: { practice: { id: { equals: input.practiceId } }, idempotencyKey: { equals: input.idempotencyKey } },
    take: 1,
    query: "id type delta balanceAfter reason practice { id } product { id } location { id } appointment { id }"
  }))[0];
  if (existing) {
    if (existing.practice?.id !== input.practiceId || existing.product?.id !== input.productId || existing.location?.id !== input.locationId || existing.delta !== input.delta || existing.type !== input.type || existing.reason !== input.reason.trim() || (existing.appointment?.id || null) !== (input.appointmentId || null)) {
      return { ...denied2, error: "Inventory idempotency key was reused for another movement" };
    }
    return { success: true, movementId: existing.id, balanceAfter: existing.balanceAfter, error: null };
  }
  const [product, location, latestMovements] = await Promise.all([
    sudo.query.Product.findOne({ where: { id: input.productId }, query: "id quantity isActive practice { id }" }),
    sudo.query.Location.findOne({ where: { id: input.locationId }, query: "id isActive practice { id }" }),
    sudo.query.InventoryMovement.findMany({
      where: { product: { id: { equals: input.productId } }, location: { id: { equals: input.locationId } } },
      orderBy: { createdAt: "desc" },
      take: 1,
      query: "id balanceAfter"
    })
  ]);
  if (!product || product.isActive === false || product.practice?.id !== input.practiceId) return { ...denied2, error: "Product is unavailable" };
  if (!location || location.isActive === false || location.practice?.id !== input.practiceId) return { ...denied2, error: "Location is unavailable" };
  const balanceBefore = Number(latestMovements[0]?.balanceAfter || 0);
  const balanceAfter = balanceBefore + input.delta;
  if (balanceAfter < 0) return { ...denied2, error: "Location inventory cannot fall below zero" };
  const aggregateQuantity = Number(product.quantity || 0) + input.delta;
  if (aggregateQuantity < 0) return { ...denied2, error: "Aggregate inventory cannot fall below zero" };
  await sudo.query.Product.updateOne({ where: { id: product.id }, data: { quantity: aggregateQuantity }, query: "id" });
  const movement = await sudo.query.InventoryMovement.createOne({
    data: {
      practice: { connect: { id: input.practiceId } },
      type: input.type,
      delta: input.delta,
      balanceBefore,
      balanceAfter,
      reason,
      idempotencyKey: input.idempotencyKey,
      product: { connect: { id: product.id } },
      location: { connect: { id: location.id } },
      appointment: input.appointmentId ? { connect: { id: input.appointmentId } } : void 0,
      metadata: input.metadata || {}
    },
    query: "id"
  });
  return { success: true, movementId: movement.id, balanceAfter, error: null };
}
async function adjustMedSpaInventoryTransaction(context, input) {
  if (!permissions.canManageInventory({ session: context.session }) || !context.session?.data?.practice?.id) {
    return { ...denied2, error: "You must be an authorized inventory operator with a practice" };
  }
  try {
    return await serializableWorkflow(context, "medspa-inventory", [
      `product:${input.productId}`,
      `location:${input.locationId}`,
      `idempotency:${input.idempotencyKey}`
    ], (transactionContext) => recordInventoryMovement(transactionContext, {
      ...input,
      practiceId: context.session.data.practice.id,
      type: input.delta > 0 ? "receive" : "adjustment"
    }));
  } catch (error) {
    return { ...denied2, error: error instanceof Error ? error.message : "Inventory adjustment failed" };
  }
}
var resultType2 = import_core111.graphql.object()({
  name: "MedSpaInventoryResult",
  fields: {
    success: import_core111.graphql.field({ type: import_core111.graphql.nonNull(import_core111.graphql.Boolean) }),
    movementId: import_core111.graphql.field({ type: import_core111.graphql.ID }),
    balanceAfter: import_core111.graphql.field({ type: import_core111.graphql.Int }),
    error: import_core111.graphql.field({ type: import_core111.graphql.String })
  }
});
var adjustMedSpaInventory = import_core111.graphql.field({
  type: resultType2,
  args: {
    productId: import_core111.graphql.arg({ type: import_core111.graphql.nonNull(import_core111.graphql.ID) }),
    locationId: import_core111.graphql.arg({ type: import_core111.graphql.nonNull(import_core111.graphql.ID) }),
    delta: import_core111.graphql.arg({ type: import_core111.graphql.nonNull(import_core111.graphql.Int) }),
    reason: import_core111.graphql.arg({ type: import_core111.graphql.nonNull(import_core111.graphql.String) }),
    idempotencyKey: import_core111.graphql.arg({ type: import_core111.graphql.nonNull(import_core111.graphql.String) })
  },
  resolve(_source, args, context) {
    return adjustMedSpaInventoryTransaction(context, args);
  }
});

// features/keystone/onboardingImageScope.ts
var ONBOARDING_IMAGE_LOOKUP_LIMIT = 500;
var ONBOARDING_IMAGE_LOOKUP_TAKE = ONBOARDING_IMAGE_LOOKUP_LIMIT + 1;
function requirePracticeId(practiceId5) {
  if (typeof practiceId5 !== "string" || !practiceId5.trim()) {
    throw new Error("Onboarding image lookup requires an established practice scope");
  }
  return practiceId5;
}
function validateCandidates(candidateIds) {
  if (candidateIds.length > ONBOARDING_IMAGE_LOOKUP_LIMIT) {
    throw new Error("Onboarding image candidate set exceeded its safe bound");
  }
  const ids = /* @__PURE__ */ new Set();
  for (const id of candidateIds) {
    if (typeof id !== "string" || !id || ids.has(id)) {
      throw new Error("Onboarding image candidate set is malformed");
    }
    ids.add(id);
  }
  return ids;
}
async function loadScopedOnboardingImageIds(practiceId5, findMany) {
  const scopedPracticeId = requirePracticeId(practiceId5);
  const rows = await findMany({
    where: { practice: { id: { equals: scopedPracticeId } } },
    take: ONBOARDING_IMAGE_LOOKUP_TAKE,
    orderBy: { id: "asc" },
    query: "id practice { id }"
  });
  if (!Array.isArray(rows)) throw new Error("Onboarding image lookup returned an invalid result");
  if (rows.length > ONBOARDING_IMAGE_LOOKUP_LIMIT) {
    return { status: "overflow", limit: ONBOARDING_IMAGE_LOOKUP_LIMIT };
  }
  const ids = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row2 of rows) {
    if (!row2 || typeof row2 !== "object" || Array.isArray(row2)) {
      throw new Error("Onboarding image lookup returned a malformed row");
    }
    const image2 = row2;
    if (typeof image2.id !== "string" || !image2.id || seen.has(image2.id) || image2.practice?.id !== scopedPracticeId) {
      throw new Error("Onboarding image lookup returned a row outside its practice scope");
    }
    seen.add(image2.id);
    ids.push(image2.id);
  }
  return { status: "ready", ids };
}
async function findScopedImage(practiceId5, candidateIds, findMany, predicate) {
  const scopedPracticeId = requirePracticeId(practiceId5);
  const candidateSet = validateCandidates(candidateIds);
  if (!candidateSet.size) return { status: "missing" };
  const rows = await findMany({
    where: {
      id: { in: [...candidateSet] },
      practiceId: scopedPracticeId,
      ...predicate
    },
    take: 2,
    orderBy: { id: "asc" },
    select: { id: true, practiceId: true }
  });
  if (!Array.isArray(rows)) throw new Error("Onboarding image identity lookup returned an invalid result");
  if (rows.length > 1) return { status: "ambiguous" };
  if (!rows.length) return { status: "missing" };
  const row2 = rows[0];
  if (!row2 || typeof row2.id !== "string" || !candidateSet.has(row2.id) || row2.practiceId !== scopedPracticeId) {
    throw new Error("Onboarding image identity lookup escaped its practice scope");
  }
  return { status: "found", id: row2.id };
}
async function resolveScopedOnboardingImage(practiceId5, candidateIds, seedKey, imagePath, findMany) {
  const scopedPracticeId = requirePracticeId(practiceId5);
  if (typeof imagePath !== "string" || !imagePath) {
    throw new Error("Onboarding image path is invalid");
  }
  if (seedKey !== null && (typeof seedKey !== "string" || !seedKey.trim() || seedKey.length > 256)) {
    throw new Error("Onboarding image seed key is invalid or exceeds the safe bound");
  }
  if (seedKey) {
    const seeded = await findScopedImage(
      scopedPracticeId,
      candidateIds,
      findMany,
      { metadata: { path: ["seedKey"], equals: seedKey } }
    );
    if (seeded.status !== "missing") return seeded;
  }
  const samePath = await findScopedImage(
    scopedPracticeId,
    candidateIds,
    findMany,
    { imagePath }
  );
  if (samePath.status === "found" && seedKey) return { status: "path-conflict" };
  return samePath;
}

// features/keystone/onboardingTenantIntegrity.ts
var PRACTICE_OWNED_ONBOARDING_LISTS = [
  "Appointment",
  "Location",
  "Resource",
  "ServiceCategory",
  "MedSpaImage",
  "Service",
  "StorefrontSetting",
  "Provider",
  "ProviderSchedule",
  "PracticeMembership",
  "Client",
  "IntakeForm",
  "FormTemplate",
  "Membership",
  "ServicePackage",
  "Product",
  "MessageTemplate",
  "PaymentProvider",
  "User"
];
var practiceOwnedLists = new Set(PRACTICE_OWNED_ONBOARDING_LISTS);
function hasAuthoritativeOnboardingPractice(list99) {
  return practiceOwnedLists.has(list99);
}
function selectionWithPractice(query) {
  return /\bpractice\s*\{/.test(query) ? query : `${query} practice { id }`;
}
async function guardedOnboardingPracticeCreate({
  list: list99,
  practiceId: practiceId5,
  data,
  query,
  create
}) {
  if (typeof practiceId5 !== "string" || !practiceId5.trim()) {
    throw new Error(`Onboarding cannot create ${list99} without an established practice`);
  }
  if (!practiceOwnedLists.has(list99)) {
    throw new Error(`Onboarding cannot create ${list99}: authoritative direct practice ownership is not configured`);
  }
  if (Object.prototype.hasOwnProperty.call(data, "practice")) {
    const relation = data.practice;
    const requestedPracticeId = relation?.connect?.id;
    const relationKeys = relation && typeof relation === "object" ? Object.keys(relation) : [];
    if (requestedPracticeId !== practiceId5 || relationKeys.length !== 1 || relationKeys[0] !== "connect") {
      throw new Error(`Onboarding ${list99} create cannot change practice ownership`);
    }
  }
  const created = await create({
    data: { ...data, practice: { connect: { id: practiceId5 } } },
    query: selectionWithPractice(query)
  });
  const result2 = created;
  if (!result2 || typeof result2.id !== "string" || !result2.id || result2.practice?.id !== practiceId5) {
    throw new Error(`Onboarding ${list99} create did not retain its practice ownership`);
  }
  return created;
}
async function guardedOnboardingPracticeUpdate({
  list: list99,
  id,
  practiceId: practiceId5,
  data,
  query,
  read,
  update
}) {
  if (typeof practiceId5 !== "string" || !practiceId5.trim()) {
    throw new Error(`Onboarding cannot update ${list99} without an established practice`);
  }
  if (!practiceOwnedLists.has(list99)) {
    throw new Error(`Onboarding cannot update ${list99}: authoritative direct practice ownership is not configured`);
  }
  if (typeof id !== "string" || !id) {
    throw new Error(`Onboarding cannot update ${list99} with a missing record identity`);
  }
  const rows = await read({
    where: {
      AND: [
        { id: { equals: id } },
        { practice: { id: { equals: practiceId5 } } }
      ]
    },
    take: 2,
    query: "id practice { id }"
  });
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Onboarding ${list99} update target is stale, missing, or outside the established practice`);
  }
  const current = rows[0];
  if (!current || current.id !== id || current.practice?.id !== practiceId5) {
    throw new Error(`Onboarding ${list99} update target failed its practice recheck`);
  }
  if (Object.prototype.hasOwnProperty.call(data, "practice")) {
    const requestedPracticeId = data.practice?.connect?.id;
    if (requestedPracticeId !== practiceId5 || data.practice?.disconnect) {
      throw new Error(`Onboarding ${list99} update cannot change practice ownership`);
    }
  }
  const selection = /\bpractice\s*\{/.test(query) ? query : `${query} practice { id }`;
  const updated = await update({
    where: { id },
    data: { ...data, practice: { connect: { id: practiceId5 } } },
    query: selection
  });
  const result2 = updated;
  if (!result2 || result2.id !== id || result2.practice?.id !== practiceId5) {
    throw new Error(`Onboarding ${list99} update did not retain its practice ownership`);
  }
  return updated;
}
function assertOnboardingLocationPractice(location, practiceId5, expectedLocationId) {
  if (typeof practiceId5 !== "string" || !practiceId5.trim()) {
    throw new Error("Onboarding primary location check requires an established practice");
  }
  if (!location || typeof location !== "object" || Array.isArray(location)) {
    throw new Error("Onboarding primary location is missing or outside the established practice");
  }
  const candidate = location;
  if (typeof candidate.id !== "string" || !candidate.id || expectedLocationId && candidate.id !== expectedLocationId || candidate.practice?.id !== practiceId5) {
    throw new Error("Onboarding primary location is stale or outside the established practice");
  }
}

// features/keystone/mutations/runMedSpaOnboarding.ts
var REQUIRED_ARRAYS = [
  "resources",
  "categories",
  "services",
  "providers",
  "scheduleBlocks",
  "clients",
  "intakeForms",
  "formTemplates",
  "memberships",
  "packages",
  "products",
  "messageTemplates",
  "appointments",
  "gallery",
  "paymentProviders"
];
function validateSeed(input, isolatedLocal) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("MedSpa seed must be an object");
  const seed = input;
  if (!seed.medspaInfo || typeof seed.medspaInfo !== "object" || Array.isArray(seed.medspaInfo)) {
    throw new Error("MedSpa seed requires medspaInfo");
  }
  if (!seed.storefront || typeof seed.storefront !== "object" || Array.isArray(seed.storefront)) {
    throw new Error("MedSpa seed requires storefront settings");
  }
  if (!isolatedLocal || !/\b(?:demo|mock)\b/i.test(String(seed.medspaInfo.name || "")) || !String(seed.storefront.displayName || "").trim()) {
    throw new Error("Onboarding practice and storefront identities must be clearly marked demo or mock");
  }
  if (!Number.isInteger(seed.storefront.accentHue) || seed.storefront.accentHue < 0 || seed.storefront.accentHue > 360 || seed.storefront.isPublished !== true) {
    throw new Error("Onboarding storefront settings must publish a valid demo hue");
  }
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(seed[key])) throw new Error(`MedSpa seed requires ${key}`);
    if (seed[key].length > 500) throw new Error(`MedSpa seed ${key} exceeds the 500-item limit`);
  }
  const imagePaths = [
    ...seed.services.map((item) => item.imagePath),
    ...seed.providers.map((item) => item.imagePath),
    ...seed.gallery.map((item) => item.imagePath)
  ].filter(Boolean);
  if (imagePaths.some((value) => typeof value !== "string" || !/^\/images\/[a-z0-9_./-]+$/i.test(value) || value.includes(".."))) {
    throw new Error("MedSpa seed image paths must be canonical relative /images/ paths");
  }
  const resourceTypes = /* @__PURE__ */ new Set(["room", "device", "equipment", "station", "other"]);
  if (seed.resources.some((item) => !resourceTypes.has(item.type))) throw new Error("MedSpa seed contains an unsupported resource type");
  if (!/\b(?:demo|mock|fictional)\b/i.test(`${seed.medspaInfo.name || ""} ${seed.medspaInfo.address || ""}`) || !/^\+?1?[\s().-]*[2-9]\d{2}[\s().-]*555[\s.-]*01\d{2}$/.test(String(seed.medspaInfo.phone || "")) || !/@[a-z0-9.-]+\.example$/i.test(String(seed.medspaInfo.email || ""))) {
    throw new Error("Onboarding location and contact must be unmistakably fictional demo data");
  }
  const resourcesByKey = new Map(seed.resources.map((item) => [item.key, item]));
  for (const resource of seed.resources) {
    if (typeof resource.isPublic !== "boolean" || resource.isPublic && resource.isActive !== true) {
      throw new Error(`Resource ${resource.name || "unknown"} must be explicitly public and active or remain private`);
    }
  }
  if (seed.appointments.length) throw new Error("Onboarding cannot manufacture appointment or treatment evidence");
  for (const service of seed.services) {
    if (!Number.isInteger(service.price) || service.price < 0 || !Number.isInteger(service.basePrice) || service.basePrice < 0) {
      throw new Error(`Service ${service.name || "unknown"} prices must be non-negative integer cents`);
    }
    if (typeof service.isPublic !== "boolean" || service.isPublic !== (service.status === "active")) {
      throw new Error(`Service ${service.name || "unknown"} must publish only when active`);
    }
    if (service.isPublic && (!isolatedLocal || service.price !== 0 || service.basePrice !== 0 || Number(service.depositAmount || 0) !== 0 || service.staffAuthorizationRequired !== false || service.requiresConsultation !== false || service.requiresIntakeReview !== false || service.requiresLotTraceability !== false)) {
      throw new Error(`Public onboarding service ${service.name || "unknown"} must be a non-clinical demo request`);
    }
    for (const resourceKey of service.requiredResources || []) {
      const resource = resourcesByKey.get(resourceKey);
      if (service.isPublic && (!resource || resource.isActive !== true || resource.isPublic !== true)) {
        throw new Error(`Public onboarding service ${service.name || "unknown"} requires an active explicitly public resource`);
      }
    }
  }
  if (!seed.services.some((service) => service.status === "active" && service.isPublic === true)) {
    throw new Error("Onboarding requires at least one active mock public service");
  }
  const servicesByKey = new Map(seed.services.map((item) => [item.key, item]));
  const providersByKey = new Map(seed.providers.map((item) => [item.key, item]));
  for (const provider of seed.providers) {
    if (typeof provider.isPublic !== "boolean" || provider.isPublic && (provider.status !== "active" || provider.isActive !== true || provider.role !== "assistant" || !isolatedLocal)) {
      throw new Error(`Public onboarding provider ${provider.name || "unknown"} must be active, explicitly public, fictional demo support personnel`);
    }
    for (const serviceKey of provider.specializations || []) {
      const service = servicesByKey.get(serviceKey);
      if (provider.isPublic && (!service || service.status !== "active" || service.isPublic !== true)) {
        throw new Error(`Public onboarding provider ${provider.name || "unknown"} may reference only active explicitly public services`);
      }
    }
  }
  for (const block of seed.scheduleBlocks) {
    const provider = providersByKey.get(block.provider);
    if (typeof block.isPublic !== "boolean" || block.isPublic && (block.isAvailable !== true || !provider || provider.isPublic !== true)) {
      throw new Error(`Public onboarding schedule ${block.key || "unknown"} must be available and belong to explicitly public demo personnel`);
    }
  }
  if (seed.products.some((item) => item.trackLots !== false && Number(item.quantity || 0) > 0)) {
    throw new Error("Tracked inventory must enter through controlled lot receiving");
  }
  for (const [section, fields] of Object.entries({
    memberships: ["monthlyPrice"],
    packages: ["totalPrice", "savingsAmount"],
    products: ["price", "cost"]
  })) {
    for (const item of seed[section]) {
      for (const field2 of fields) {
        if (item[field2] != null && !Number.isInteger(item[field2])) {
          throw new Error(`${section}.${field2} must be integer cents`);
        }
      }
    }
  }
  return seed;
}
function appointmentStart(item) {
  const start = /* @__PURE__ */ new Date();
  start.setDate(start.getDate() + (item.dayOffset || 1));
  const [hours, minutes] = (item.time || "10:00").split(":").map(Number);
  start.setHours(hours, minutes, 0, 0);
  return start;
}
async function runMedSpaOnboardingTransaction(context, seedInput = seed_default, failurePoint) {
  const userId = context.session?.itemId;
  if (!userId || context.session?.data?.role?.canManageOnboarding !== true) throw new Error("You do not have permission to run medspa onboarding");
  const actor = await context.sudo().query.User.findOne({ where: { id: userId }, query: "id status practice { id } role { id canManageOnboarding practice { id } assignedTo { id practice { id } } }" });
  if (!actor || actor.status !== "active" || actor.role?.canManageOnboarding !== true) throw new Error("You do not have permission to run medspa onboarding");
  if (actor.practice?.id && context.session?.data.practice?.id !== actor.practice.id) throw new Error("Authenticated practice scope is stale");
  if (actor.role?.practice?.id && actor.role.practice.id !== actor.practice?.id) throw new Error("Role and user practice scopes do not match");
  if (actor.practice?.id && !actor.role?.practice?.id && actor.role.assignedTo.some((user) => user.practice?.id !== actor.practice.id)) throw new Error("Legacy role spans multiple practice scopes");
  if (!actor.practice?.id && (actor.role?.practice?.id || actor.role?.assignedTo?.length !== 1 || actor.role.assignedTo[0]?.id !== actor.id)) {
    throw new Error("The one-time onboarding role is not an isolated bootstrap role");
  }
  const isolatedLocal = await assertOwnedLocalDatabase(context.prisma);
  const seed = validateSeed(seedInput, isolatedLocal);
  return context.transaction(async (transactionContext) => {
    await transactionContext.prisma.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      "openfront-medspa-onboarding"
    );
    await transactionContext.prisma.$queryRawUnsafe('SELECT "id" FROM "User" WHERE "id" = $1 FOR SHARE', userId);
    await transactionContext.prisma.$queryRawUnsafe('SELECT "id" FROM "Role" WHERE "id" = $1 FOR SHARE', actor.role.id);
    const currentActor = await transactionContext.sudo().query.User.findOne({ where: { id: userId }, query: "id status role { id canManageOnboarding }" });
    if (currentActor?.status !== "active" || currentActor.role?.id !== actor.role.id || currentActor.role.canManageOnboarding !== true) throw new Error("Current onboarding authority is required");
    let sudo = transactionContext.sudo();
    let created = 0;
    let reused = 0;
    let onboardingPracticeId = actor.practice?.id || null;
    const findOne = async (list99, where, query = "id") => {
      if (list99 !== "Practice" && (!onboardingPracticeId || !hasAuthoritativeOnboardingPractice(list99))) {
        throw new Error(`Onboarding cannot query ${list99} without authoritative practice ownership`);
      }
      const scopedWhere = list99 !== "Practice" ? { AND: [where, { practice: { id: { equals: onboardingPracticeId } } }] } : where;
      const rows = await sudo.query[list99].findMany({ where: scopedWhere, take: 1, query });
      return rows[0] || null;
    };
    const createOne = async (list99, data, query = "id") => {
      if (list99 === "Practice") {
        throw new Error("Practice creation is restricted to the isolated onboarding bootstrap branch");
      }
      const record = await guardedOnboardingPracticeCreate({
        list: list99,
        practiceId: onboardingPracticeId,
        data,
        query,
        create: (args) => sudo.query[list99].createOne(args)
      });
      created += 1;
      return record;
    };
    const updateOne = async (list99, id, data, query = "id") => {
      if (list99 === "Practice") {
        if (!onboardingPracticeId || id !== onboardingPracticeId) {
          throw new Error("Onboarding Practice update must match the established practice identity");
        }
        const existing = await sudo.query.Practice.findOne({ where: { id }, query: "id" });
        if (!existing || existing.id !== onboardingPracticeId) {
          throw new Error("Onboarding Practice update target is stale or missing");
        }
        const updated2 = await sudo.query.Practice.updateOne({ where: { id }, data, query });
        if (!updated2 || updated2.id !== onboardingPracticeId) {
          throw new Error("Onboarding Practice update did not retain its established identity");
        }
        reused += 1;
        return updated2;
      }
      const updated = await guardedOnboardingPracticeUpdate({
        list: list99,
        id,
        practiceId: onboardingPracticeId,
        data,
        query,
        read: (args) => sudo.query[list99].findMany(args),
        update: (args) => sudo.query[list99].updateOne(args)
      });
      reused += 1;
      return updated;
    };
    const medspa = seed.medspaInfo;
    const practiceSlug = medspa.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let practice;
    if (onboardingPracticeId) {
      practice = await sudo.query.Practice.findOne({ where: { id: onboardingPracticeId }, query: "id slug name isDemo" });
      if (!practice?.isDemo) throw new Error("Fictional setup cannot overwrite a non-demo practice");
      if (!practice) throw new Error("Authenticated practice not found");
      if (practice.name !== medspa.name) practice = await updateOne("Practice", practice.id, { name: medspa.name }, "id slug name");
      if (!actor.role.practice?.id) await sudo.query.Role.updateOne({ where: { id: actor.role.id }, data: { practice: { connect: { id: practice.id } } }, query: "id" });
    } else {
      const collision = await sudo.query.Practice.findMany({ where: { slug: { equals: practiceSlug } }, take: 1, query: "id" });
      if (collision.length) throw new Error("Practice slug is already in use");
      practice = await sudo.query.Practice.createOne({
        data: { name: medspa.name, slug: practiceSlug, currencyCode: "USD", isActive: true, isDemo: true },
        query: "id slug name"
      });
      if (!practice || typeof practice.id !== "string" || practice.name !== medspa.name || practice.slug !== practiceSlug) {
        throw new Error("Isolated onboarding bootstrap did not create the expected Practice identity");
      }
      created += 1;
      onboardingPracticeId = practice.id;
      await transactionContext.prisma.user.update({ where: { id: userId }, data: { practiceId: practice.id } });
      await transactionContext.prisma.role.update({ where: { id: actor.role.id }, data: { practiceId: practice.id } });
      const scopedSession = { ...context.session, data: { ...context.session.data, practice: { id: practice.id } } };
      sudo = transactionContext.withSession(scopedSession).sudo();
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: practice.id } }, actor: { connect: { id: userId } }, action: "practice.bootstrap.completed", resourceType: "Practice", resourceId: practice.id, correlationId: `onboarding:${practice.id}`, evidence: { roleId: actor.role.id }, evidenceHash: (0, import_node_crypto4.createHash)("sha256").update(`${userId}:${actor.role.id}:${practice.id}`).digest("hex"), occurredAt: (/* @__PURE__ */ new Date()).toISOString() }, query: "id" });
    }
    const locationData = {
      name: seed.storefront.displayName.trim(),
      address: medspa.address,
      city: medspa.city,
      state: medspa.state,
      zipCode: medspa.zipCode,
      phone: medspa.phone,
      email: medspa.email,
      timezone: medspa.timezone,
      hours: medspa.hours,
      isActive: true
    };
    const priorStorefront = await findOne("StorefrontSetting", {}, "id primaryLocation { id }");
    let existingLocation = null;
    if (priorStorefront?.primaryLocation?.id) {
      const priorLocationId = priorStorefront.primaryLocation.id;
      existingLocation = await findOne(
        "Location",
        { id: { equals: priorLocationId } },
        "id practice { id }"
      );
      assertOnboardingLocationPractice(existingLocation, onboardingPracticeId, priorLocationId);
    } else {
      existingLocation = await findOne("Location", { name: { equals: medspa.name } }, "id practice { id }");
      if (existingLocation) assertOnboardingLocationPractice(existingLocation, onboardingPracticeId);
    }
    const location = existingLocation ? await updateOne("Location", existingLocation.id, locationData, "id practice { id }") : await createOne("Location", locationData, "id practice { id }");
    assertOnboardingLocationPractice(location, onboardingPracticeId);
    const ownerMembership = await findOne("PracticeMembership", { user: { id: { equals: userId } } }, "id status locations { id }");
    if (ownerMembership && ownerMembership.status !== "active") throw new Error("Owner membership requires an explicit reviewed access change");
    if (!ownerMembership) {
      const currentOwner = await sudo.query.User.findOne({ where: { id: userId }, query: "id role { canManagePractice }" });
      if (!currentOwner?.role?.canManagePractice) throw new Error("Current practice-owner authority is required to establish membership");
      await createOne("PracticeMembership", { user: { connect: { id: userId } }, locations: { connect: [{ id: location.id }] }, status: "active" });
    }
    const resourceIds = {};
    for (const item of seed.resources) {
      const data = {
        name: item.name,
        type: item.type || "station",
        capacity: item.capacity || 1,
        isActive: item.isActive ?? true,
        isPublic: item.isPublic === true,
        readinessStatus: item.readinessStatus || "acceptance_testing",
        notes: item.notes || "",
        metadata: { ...item.metadata || {}, seedKey: item.key, source: "onboarding" },
        location: { connect: { id: location.id } }
      };
      const existing = await findOne("Resource", { name: { equals: item.name } });
      const record = existing ? await updateOne("Resource", existing.id, data) : await createOne("Resource", data);
      resourceIds[item.key] = record.id;
    }
    if (failurePoint === "resources") throw new Error("Injected onboarding failure after resources");
    const categoryIds = {};
    for (const item of seed.categories) {
      const data = {
        name: item.name,
        description: item.description || "",
        slug: item.slug,
        displayOrder: item.displayOrder || 0,
        sortOrder: item.displayOrder || 0,
        isVisible: true,
        icon: item.icon || ""
      };
      const existing = await findOne("ServiceCategory", { slug: { equals: item.slug } });
      const record = existing ? await updateOne("ServiceCategory", existing.id, data) : await createOne("ServiceCategory", data);
      categoryIds[item.key] = record.id;
      categoryIds[item.name] = record.id;
    }
    let onboardingImageIds = null;
    const getOnboardingImageIds = async (practiceId5) => {
      if (onboardingImageIds) return onboardingImageIds;
      const lookup = await loadScopedOnboardingImageIds(
        practiceId5,
        (args) => sudo.query.MedSpaImage.findMany(args)
      );
      if (lookup.status === "overflow") {
        throw new Error(`Practice image inventory exceeds the safe onboarding lookup limit of ${lookup.limit}`);
      }
      onboardingImageIds = lookup.ids;
      return onboardingImageIds;
    };
    const imageByPath = async (imagePath, altText, metadata) => {
      const imagePracticeId = onboardingPracticeId;
      if (!imagePracticeId) throw new Error("Onboarding image writes require an established practice");
      if (Object.prototype.hasOwnProperty.call(metadata, "seedKey") && (typeof metadata.seedKey !== "string" || !metadata.seedKey.trim())) {
        throw new Error("Onboarding image seed key is malformed");
      }
      const seedKey = typeof metadata.seedKey === "string" ? metadata.seedKey : null;
      const candidateIds = await getOnboardingImageIds(imagePracticeId);
      const lookup = await resolveScopedOnboardingImage(
        imagePracticeId,
        candidateIds,
        seedKey,
        imagePath,
        (args) => transactionContext.prisma.medSpaImage.findMany(args)
      );
      if (lookup.status === "ambiguous") {
        throw new Error("Onboarding image identity is ambiguous within this practice");
      }
      if (lookup.status === "path-conflict") {
        throw new Error("Onboarding image path is already owned by a different or malformed image identity");
      }
      if (lookup.status === "missing" && candidateIds.length >= ONBOARDING_IMAGE_LOOKUP_LIMIT) {
        throw new Error(`Practice image inventory reached the safe onboarding lookup limit of ${ONBOARDING_IMAGE_LOOKUP_LIMIT}`);
      }
      const data = {
        practice: { connect: { id: imagePracticeId } },
        imagePath,
        altText,
        metadata: { ...metadata, source: "onboarding" }
      };
      const query = "id practice { id } imagePath";
      const record = lookup.status === "found" ? await updateOne("MedSpaImage", lookup.id, data, query) : await createOne("MedSpaImage", data, query);
      if (!record || typeof record.id !== "string" || record.practice?.id !== imagePracticeId) {
        throw new Error("Onboarding image write did not retain the established practice scope");
      }
      if (lookup.status === "missing") candidateIds.push(record.id);
      return record;
    };
    const serviceIds = {};
    const serviceRecords = {};
    for (const item of seed.services) {
      const image2 = item.imagePath ? await imageByPath(item.imagePath, item.name, { seedKey: `service-image:${item.key}`, placement: "service" }) : null;
      const resourceConnections = (item.requiredResources || []).map((key) => resourceIds[key]).filter(Boolean).map((id) => ({ id }));
      const data = {
        name: item.name,
        description: item.description || "",
        baseDuration: item.baseDuration,
        price: item.price,
        basePrice: item.basePrice,
        depositRequired: item.depositRequired ?? false,
        depositAmount: item.depositAmount || 0,
        status: item.status || "inactive",
        isPublic: item.isPublic === true,
        staffAuthorizationRequired: item.staffAuthorizationRequired ?? true,
        requiresConsultation: item.requiresConsultation ?? true,
        requiresIntakeReview: item.requiresIntakeReview ?? true,
        requiresLotTraceability: item.requiresLotTraceability ?? true,
        metadata: { ...item.metadata || {}, seedKey: item.key, source: "onboarding" },
        category: categoryIds[item.category] ? { connect: { id: categoryIds[item.category] } } : void 0,
        requiredResources: { connect: resourceConnections },
        image: image2 ? { connect: { id: image2.id } } : void 0
      };
      const existing = await findOne("Service", { name: { equals: item.name } });
      const record = existing ? await updateOne("Service", existing.id, data, "id name price basePrice baseDuration image { imagePath image { url } }") : await createOne("Service", data, "id name price basePrice baseDuration image { imagePath image { url } }");
      serviceIds[item.key] = record.id;
      serviceRecords[item.key] = record;
    }
    const storefrontData = {
      practice: { connect: { id: practice.id } },
      displayName: seed.storefront.displayName.trim(),
      primaryLocation: { connect: { id: location.id } },
      accentHue: seed.storefront.accentHue,
      logoSvg: DEFAULT_LOGO_SVG,
      logoHue: 0,
      isPublished: true
    };
    const existingStorefront = await findOne("StorefrontSetting", {}, "id revision displayName accentHue isPublished primaryLocation { id }");
    if (existingStorefront) {
      const unchanged = existingStorefront.displayName === storefrontData.displayName && existingStorefront.accentHue === storefrontData.accentHue && existingStorefront.isPublished === true && existingStorefront.primaryLocation?.id === location.id;
      if (unchanged) reused += 1;
      else await updateOne("StorefrontSetting", existingStorefront.id, {
        ...storefrontData,
        revision: existingStorefront.revision + 1
      });
    } else {
      await createOne("StorefrontSetting", { ...storefrontData, revision: 1 });
    }
    if (failurePoint === "services") throw new Error("Injected onboarding failure after services");
    const userIds = {};
    const ensureUser = async (person) => {
      const existing = await findOne("User", { email: { equals: person.email } }, "id name email");
      if (existing) {
        reused += 1;
        userIds[person.key] = existing.id;
        return existing;
      }
      const user = await createOne("User", {
        name: person.name,
        email: person.email,
        phone: person.phone || "",
        password: `seed_${crypto.randomUUID()}_${crypto.randomUUID()}`
      }, "id name email");
      userIds[person.key] = user.id;
      return user;
    };
    const providerIds = {};
    for (const item of seed.providers) {
      const user = await ensureUser(item);
      const image2 = item.imagePath ? await imageByPath(item.imagePath, item.name, { seedKey: `provider-image:${item.key}`, placement: "provider" }) : null;
      const specializations = (item.specializations || []).map((key) => serviceIds[key]).filter(Boolean).map((id) => ({ id }));
      const data = {
        user: { connect: { id: user.id } },
        role: item.role || "assistant",
        tier: item.tier || "junior",
        title: item.title || "",
        bio: item.bio || "",
        baseCommissionRate: item.baseCommissionRate ?? 0,
        commissionRate: item.baseCommissionRate ?? 0,
        status: item.status || "inactive",
        isActive: item.isActive === true,
        isPublic: item.isPublic === true,
        photo: image2 ? { connect: { id: image2.id } } : void 0,
        specializations: { connect: specializations },
        locations: { connect: [{ id: location.id }] }
      };
      const existing = await findOne("Provider", { user: { id: { equals: user.id } } });
      const record = existing ? await updateOne("Provider", existing.id, data) : await createOne("Provider", data);
      providerIds[item.key] = record.id;
    }
    for (const block of seed.scheduleBlocks) {
      const providerId = providerIds[block.provider];
      for (const dayOfWeek of block.daysOfWeek || []) {
        const where = {
          provider: { id: { equals: providerId } },
          location: { id: { equals: location.id } },
          dayOfWeek: { equals: dayOfWeek },
          startTime: { equals: block.startTime },
          endTime: { equals: block.endTime },
          type: { equals: "recurring" }
        };
        const existing = await findOne("ProviderSchedule", where);
        const data = {
          type: "recurring",
          dayOfWeek,
          startTime: block.startTime,
          endTime: block.endTime,
          breakStart: block.breakStart || "",
          breakEnd: block.breakEnd || "",
          isAvailable: block.isAvailable ?? true,
          isPublic: block.isPublic === true,
          provider: { connect: { id: providerId } },
          location: { connect: { id: location.id } },
          idempotencyKey: `onboarding:schedule:${block.provider}:${dayOfWeek}:${block.startTime}-${block.endTime}`
        };
        if (existing) await updateOne("ProviderSchedule", existing.id, data);
        else await createOne("ProviderSchedule", data);
      }
    }
    const clientIds = {};
    for (const item of seed.clients) {
      const user = await ensureUser(item);
      const data = {
        user: { connect: { id: user.id } },
        homeLocation: { connect: { id: location.id } },
        preferredProvider: item.preferredProvider && providerIds[item.preferredProvider] ? { connect: { id: providerIds[item.preferredProvider] } } : void 0,
        operationalNotes: item.operationalNotes || item.notes || "",
        marketingConsent: item.marketingConsent ?? false,
        totalVisits: 0,
        lifetimeValue: 0
      };
      const existing = await findOne("Client", { user: { id: { equals: user.id } } });
      const record = existing ? await updateOne("Client", existing.id, data) : await createOne("Client", data);
      clientIds[item.key] = record.id;
    }
    if (failurePoint === "people") throw new Error("Injected onboarding failure after people");
    for (const item of seed.intakeForms) {
      const services = (item.requiredForServices || []).map((key) => serviceIds[key]).filter(Boolean).map((id) => ({ id }));
      const data = { name: item.name, fields: item.fields, isActive: true, requiredForServices: { connect: services } };
      const existing = await findOne("IntakeForm", { name: { equals: item.name } });
      if (existing) await updateOne("IntakeForm", existing.id, data);
      else await createOne("IntakeForm", data);
    }
    for (const item of seed.formTemplates) {
      const data = { name: item.name, type: item.type, description: item.description || "", fields: item.fields, isActive: true };
      const existing = await findOne("FormTemplate", { name: { equals: item.name } });
      if (existing) await updateOne("FormTemplate", existing.id, data);
      else await createOne("FormTemplate", data);
    }
    for (const item of seed.memberships) {
      const services = (item.includedServices || []).map((key) => serviceIds[key]).filter(Boolean).map((id) => ({ id }));
      const data = { name: item.name, description: item.description || "", monthlyPrice: item.monthlyPrice, discountPercent: item.discountPercent, isActive: true, includedServices: { connect: services } };
      const existing = await findOne("Membership", { name: { equals: item.name } });
      if (existing) await updateOne("Membership", existing.id, data);
      else await createOne("Membership", data);
    }
    for (const item of seed.packages) {
      const services = (item.services || []).map((key) => serviceIds[key] || Object.entries(serviceRecords).find(([, service]) => service.name === key)?.[1]?.id).filter(Boolean).map((id) => ({ id }));
      const data = { name: item.name, description: item.description || "", totalPrice: item.totalPrice, savingsAmount: item.savingsAmount, validDays: item.validDays, isActive: true, services: { connect: services } };
      const existing = await findOne("ServicePackage", { name: { equals: item.name } });
      if (existing) await updateOne("ServicePackage", existing.id, data);
      else await createOne("ServicePackage", data);
    }
    for (const item of seed.products) {
      const data = { name: item.name, sku: item.sku, price: item.price, cost: item.cost, quantity: item.quantity, reorderPoint: item.reorderPoint, category: item.category, description: item.description || "", trackLots: item.trackLots !== false, isActive: item.isActive ?? false };
      const existing = await findOne("Product", { sku: { equals: item.sku } });
      if (existing) {
        const { quantity: _seedQuantity, ...catalogData } = data;
        await updateOne("Product", existing.id, catalogData);
      } else {
        const openingQuantity = Math.max(0, Number(item.quantity || 0));
        const product = await createOne("Product", { ...data, quantity: 0 });
        if (openingQuantity > 0) {
          const movement = await recordInventoryMovement(transactionContext, {
            productId: product.id,
            locationId: location.id,
            practiceId: practice.id,
            type: "receive",
            delta: openingQuantity,
            reason: "Opening inventory received during medspa onboarding",
            idempotencyKey: `onboarding:inventory:${item.key}:${location.id}`,
            metadata: { source: "onboarding", seedKey: item.key }
          });
          if (!movement.success) throw new Error(movement.error || "Unable to establish opening inventory");
        }
      }
    }
    for (const item of seed.messageTemplates) {
      const data = { name: item.name, type: item.type, content: item.content, variables: item.variables, isActive: true };
      const existing = await findOne("MessageTemplate", { name: { equals: item.name } });
      if (existing) await updateOne("MessageTemplate", existing.id, data);
      else await createOne("MessageTemplate", data);
    }
    for (const item of seed.gallery) {
      await imageByPath(item.imagePath, item.title, {
        seedKey: `gallery:${item.key}`,
        placement: "gallery",
        title: item.title,
        caption: item.caption,
        serviceId: item.service ? serviceIds[item.service] : null
      });
    }
    const existingAppointments = await sudo.query.Appointment.findMany({ take: 500, query: "id metadata" });
    for (const item of seed.appointments) {
      const existing = existingAppointments.find((appointment) => appointment.metadata?.seedKey === item.key);
      if (existing) {
        reused += 1;
        continue;
      }
      const services = (item.services || []).map((key) => serviceRecords[key]).filter(Boolean);
      const duration = services.reduce((sum, service) => sum + Number(service.baseDuration || 0), 0) || 60;
      const start = appointmentStart(item);
      const end = new Date(start.getTime() + duration * 6e4);
      await createOne("Appointment", {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration,
        status: item.status || "confirmed",
        depositPaid: item.depositPaid ?? false,
        metadata: { seedKey: item.key, source: "onboarding" },
        notes: item.notes || "",
        location: { connect: { id: location.id } },
        client: clientIds[item.client] ? { connect: { id: clientIds[item.client] } } : void 0,
        provider: providerIds[item.provider] ? { connect: { id: providerIds[item.provider] } } : void 0,
        services: { connect: services.map((service) => ({ id: service.id })) },
        lineItems: { create: services.map((service) => {
          const snapshot2 = captureServiceSnapshot(service);
          return {
            service: { connect: { id: service.id } },
            staff: providerIds[item.provider] ? { connect: { id: providerIds[item.provider] } } : void 0,
            serviceTitle: snapshot2.serviceTitle,
            serviceImagePath: snapshot2.serviceImagePath,
            duration: snapshot2.duration,
            price: snapshot2.price,
            quantity: 1,
            notes: item.notes || "",
            metadata: {
              seedKey: `${item.key}:${service.id}`,
              source: "onboarding",
              snapshotVersion: 1,
              serviceName: snapshot2.serviceTitle,
              serviceImagePath: snapshot2.serviceImagePath
            }
          };
        }) }
      });
    }
    if (failurePoint === "appointments") throw new Error("Injected onboarding failure after appointments");
    for (const item of seed.paymentProviders) {
      const providerCode = `pp_${practiceSlug}_${String(item.code).replace(/^pp_/, "")}`;
      const data = {
        name: item.name,
        code: providerCode,
        adapter: item.adapter,
        isInstalled: item.isInstalled ?? false,
        isDefault: item.isDefault ?? false,
        config: item.config || {}
      };
      const existing = await findOne("PaymentProvider", { code: { equals: providerCode } });
      if (existing) await updateOne("PaymentProvider", existing.id, data);
      else await createOne("PaymentProvider", data);
    }
    if (!onboardingPracticeId) throw new Error("Onboarding completion requires an established practice");
    const completionActors = await sudo.query.User.findMany({
      where: {
        AND: [
          { id: { equals: userId } },
          { practice: { id: { equals: onboardingPracticeId } } }
        ]
      },
      take: 2,
      query: "id practice { id }"
    });
    if (completionActors.length !== 1 || completionActors[0]?.practice?.id !== onboardingPracticeId) {
      throw new Error("Onboarding completion actor is stale or outside the established practice");
    }
    const completedActor = await sudo.query.User.updateOne({
      where: { id: userId },
      data: { onboardingStatus: "completed" },
      query: "id practice { id }"
    });
    if (!completedActor || completedActor.id !== userId || completedActor.practice?.id !== onboardingPracticeId) {
      throw new Error("Onboarding completion did not retain the established practice scope");
    }
    return { success: true, completed: true, created, reused, locationId: location.id, error: null };
  }, { maxWait: 5e3, timeout: 12e4, isolationLevel: "Serializable" });
}
var resultType3 = import_core112.graphql.object()({
  name: "RunMedSpaOnboardingResult",
  fields: {
    success: import_core112.graphql.field({ type: import_core112.graphql.nonNull(import_core112.graphql.Boolean) }),
    completed: import_core112.graphql.field({ type: import_core112.graphql.nonNull(import_core112.graphql.Boolean) }),
    created: import_core112.graphql.field({ type: import_core112.graphql.nonNull(import_core112.graphql.Int) }),
    reused: import_core112.graphql.field({ type: import_core112.graphql.nonNull(import_core112.graphql.Int) }),
    locationId: import_core112.graphql.field({ type: import_core112.graphql.ID }),
    error: import_core112.graphql.field({ type: import_core112.graphql.String })
  }
});
var runMedSpaOnboarding = import_core112.graphql.field({
  type: resultType3,
  args: { seed: import_core112.graphql.arg({ type: import_core112.graphql.JSON }) },
  async resolve(_source, { seed }, context) {
    return runMedSpaOnboardingTransaction(context, seed ?? seed_default);
  }
});

// features/keystone/mutations/completeAppointmentCheckout.ts
var import_core113 = require("@keystone-6/core");
function configuredTaxRate() {
  const rate = Number(process.env.TAX_RATE);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error("TAX_RATE must be explicitly configured between 0 and 1");
  return rate;
}
function parseRetail(input) {
  if (!Array.isArray(input)) return [];
  if (input.length > 50) throw new Error("Too many retail items");
  const quantities = /* @__PURE__ */ new Map();
  for (const item of input) {
    const productId = String(item?.productId || "");
    const quantity = Number(item?.quantity || 0);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > 1e3) continue;
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}
async function completeAppointmentCheckoutTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
    await assertPracticeRecord(context, "Appointment", args.appointmentId);
  } catch (error) {
    return { success: false, transactionId: null, paymentId: null, error: error instanceof Error ? error.message : "Appointment not found" };
  }
  if (!args.idempotencyKey?.trim() || args.idempotencyKey.length < 12) {
    return { success: false, transactionId: null, paymentId: null, error: "A valid idempotency key is required" };
  }
  let retail;
  try {
    retail = parseRetail(args.retailItems);
    if (args.paymentMethod !== "cash") throw new Error("Controlled checkout currently supports operator-recorded cash only");
    if (args.discountAmount > 0 && (!permissions.canManagePractice({ session: context.session }) || !args.discountReason?.trim() || args.discountReason.length > 1e3)) throw new Error("Discretionary discounts require current practice-manager authority and a reason");
    if (!Number.isInteger(args.tipAmount) || !Number.isInteger(args.discountAmount) || args.tipAmount < 0 || args.discountAmount < 0 || args.tipAmount > 1e7 || args.discountAmount > 1e7) {
      throw new Error("Checkout amounts must be nonnegative integer cents");
    }
  } catch (error) {
    return { success: false, transactionId: null, paymentId: null, error: error instanceof Error ? error.message : "Invalid checkout input" };
  }
  const scopedCheckoutKey = aggregateIdempotencyKey(actor.practiceId, `checkout:${evidenceHash(args.idempotencyKey)}`);
  const checkoutRequestHash = evidenceHash({ practiceId: actor.practiceId, appointmentId: args.appointmentId, paymentMethod: args.paymentMethod, tipAmount: args.tipAmount, discountAmount: args.discountAmount, discountReason: args.discountReason?.trim() || null, retail, clientPackageId: args.clientPackageId || null, clientMembershipId: args.clientMembershipId || null });
  try {
    return await serializableWorkflow(context, "medspa-domain-resource", [
      `appointment:${args.appointmentId}`,
      scopedCheckoutKey,
      ...args.clientPackageId ? [`package:${args.clientPackageId}`] : [],
      ...args.clientMembershipId ? [`membership:${args.clientMembershipId}`] : [],
      ...retail.map((item) => `product:${item.productId}`)
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.PaymentSession.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedCheckoutKey } },
        take: 1,
        query: "id data payment { id appointment { id transaction { id } } }"
      }))[0];
      if (existing?.payment?.id) {
        if (existing.payment.appointment?.id !== args.appointmentId || existing.data?.checkoutRequestHash !== checkoutRequestHash) throw new Error("Idempotency key was already used for another checkout request");
        return { success: true, transactionId: existing.payment.appointment?.transaction?.id || null, paymentId: existing.payment.id, error: null };
      }
      const appointment = await sudo.query.Appointment.findOne({
        where: { id: args.appointmentId },
        query: `
          id status depositAmount depositPaid payment { id } transaction { id } practice { id } location { id name isActive }
          client { id lifetimeValue totalVisits user { id email } }
          provider { id baseCommissionRate user { id } }
          consultation { id status staffDecisionRecorded service { id } }
          treatmentSessions { id status staffAuthorizationConfirmed service { id } order { id } consent { id } administrations { id status evidenceHash lotsCount service { id } treatmentSession { id } consent { id } order { id } } }
          lineItems {
            id serviceTitle serviceImagePath price quantity duration metadata
            service { id }
            staff { id baseCommissionRate }
          }
        `
      });
      if (!appointment) throw new Error("Appointment not found");
      const checkoutLocationId = appointment.location?.id && appointment.location.isActive !== false ? appointment.location.id : (await getRuntimeLocation(sudo)).locationId;
      if (!appointment.location?.id && checkoutLocationId) {
        await sudo.query.Appointment.updateOne({ where: { id: appointment.id }, data: { location: { connect: { id: checkoutLocationId } } }, query: "id" });
      }
      if (!checkoutLocationId) throw new Error("Appointment location is unavailable");
      if (!["confirmed", "in_progress"].includes(appointment.status || "")) throw new Error("Appointment is not eligible for checkout");
      if (appointment.payment?.id || appointment.transaction?.id) throw new Error("Appointment is already checked out");
      if (!appointment.lineItems.length) throw new Error("Appointment has no payable line items");
      const requirementsByLine = appointment.lineItems.map((line) => {
        const requirements = line.metadata?.requirements;
        if (!requirements || requirements.snapshotVersion !== 1 || !requirements.serviceId || requirements.serviceId !== line.service?.id) {
          throw new Error("Immutable service requirement snapshot is missing or inconsistent; checkout is blocked");
        }
        return { line, requirements };
      });
      const restrictedLines = requirementsByLine.filter(({ requirements }) => requirements.staffAuthorizationRequired === true || requirements.requiresConsultation === true || requirements.requiresIntakeReview === true || requirements.requiresLotTraceability === true);
      if (restrictedLines.length) {
        if (appointment.consultation?.status !== "completed" || appointment.consultation.staffDecisionRecorded !== true) throw new Error("Clinical services require a completed authorized consultation before checkout");
        for (const { line, requirements } of restrictedLines) {
          const serviceId = requirements.serviceId;
          if (appointment.consultation.service?.id !== serviceId) throw new Error("Each restricted service requires matching consultation evidence");
          const completedAuthorizedSessions = appointment.treatmentSessions?.filter((session2) => session2.service?.id === serviceId && session2.status === "completed" && session2.staffAuthorizationConfirmed === true && session2.administrations?.some((administration) => administration.service?.id === serviceId && administration.status === "completed" && administration.evidenceHash && administration.treatmentSession?.id === session2.id && administration.order?.id === session2.order?.id && administration.consent?.id === session2.consent?.id)) || [];
          if (completedAuthorizedSessions.length < Number(line.quantity || 1)) throw new Error("Each restricted service requires matching completed treatment evidence before checkout");
        }
      }
      const products = retail.length ? await sudo.query.Product.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, id: { in: retail.map((item) => item.productId) }, isActive: { equals: true } },
        query: "id name sku price quantity trackLots image { imagePath image { url } }"
      }) : [];
      const retailLines = retail.map((requested) => {
        const product = products.find((item) => item.id === requested.productId);
        if (!product || (product.quantity || 0) < requested.quantity) throw new Error("Retail product is unavailable");
        return { ...requested, product, unitPrice: product.price || 0 };
      });
      const lineAmounts = new Map(appointment.lineItems.map((item) => [item.id, Math.max(0, Number(item.price || 0) * Number(item.quantity || 1))]));
      const serviceSubtotal = [...lineAmounts.values()].reduce((sum, amount) => sum + amount, 0);
      const retailSubtotal = retailLines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const membershipDiscountByLine = /* @__PURE__ */ new Map();
      let membershipDiscount = 0;
      if (args.clientMembershipId && appointment.client?.user?.id) {
        const membership = (await sudo.query.ClientMembership.findMany({
          where: { id: { equals: args.clientMembershipId }, practice: { id: { equals: actor.practiceId } } },
          take: 1,
          query: "id status pausedUntil client { id } agreements(orderBy: { acceptedAt: desc }, take: 1) { id effectiveUntil termsHash evidenceHash benefitSnapshot }"
        }))[0];
        const paused = membership?.pausedUntil && new Date(membership.pausedUntil).getTime() > Date.now();
        if (!membership || membership.status !== "active" || paused || membership.client?.id !== appointment.client.user.id) throw new Error("Membership is not available for this client");
        const agreement = membership.agreements?.[0];
        if (!agreement || !agreement.evidenceHash || !agreement.termsHash || agreement.effectiveUntil && new Date(agreement.effectiveUntil) <= /* @__PURE__ */ new Date()) throw new Error("Membership agreement is not effective");
        const benefits = agreement.benefitSnapshot && typeof agreement.benefitSnapshot === "object" ? agreement.benefitSnapshot : {};
        const includedServiceIds = Array.isArray(benefits.includedServiceIds) ? benefits.includedServiceIds.filter((id) => typeof id === "string") : [];
        const discountPercent = Number(benefits.discountPercent);
        if (!includedServiceIds.length || !Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) throw new Error("Immutable membership benefit evidence is unavailable");
        const included = new Set(includedServiceIds);
        const eligibleLines = appointment.lineItems.filter((line) => included.has(line.service?.id));
        if (!eligibleLines.length) throw new Error("Membership does not cover any service line in this appointment");
        for (const line of eligibleLines) {
          const amount = lineAmounts.get(line.id) || 0;
          const lineDiscount = Math.min(amount, Math.round(amount * discountPercent / 100));
          membershipDiscountByLine.set(line.id, lineDiscount);
          membershipDiscount += lineDiscount;
        }
      }
      let packageCredit = 0;
      let packageServiceLine = null;
      let clientPackage = null;
      const packageDiscountByLine = /* @__PURE__ */ new Map();
      if (args.clientPackageId && appointment.client?.user?.id) {
        clientPackage = (await sudo.query.ClientPackage.findMany({
          where: { id: { equals: args.clientPackageId }, practice: { id: { equals: actor.practiceId } } },
          take: 1,
          query: "id status expiresAt totalValue usedValue metadata client { id }"
        }))[0];
        if (!clientPackage || clientPackage.status !== "active" || clientPackage.client?.id !== appointment.client.user.id || clientPackage.expiresAt && new Date(clientPackage.expiresAt) <= /* @__PURE__ */ new Date()) throw new Error("Package is unavailable, expired, or assigned to another client");
        const entitlement = clientPackage.metadata?.entitlementSnapshot;
        const packageServiceIds = Array.isArray(entitlement?.serviceIds) ? entitlement.serviceIds.filter((id) => typeof id === "string") : [];
        if (entitlement?.snapshotVersion !== 1 || !packageServiceIds.length) throw new Error("Immutable package entitlement snapshot is unavailable");
        const included = new Set(packageServiceIds);
        packageServiceLine = appointment.lineItems.find((line) => included.has(line.service?.id)) || null;
        if (!packageServiceLine) throw new Error("Package does not cover any service line in this appointment");
        const remaining = Math.max(0, Number(clientPackage.totalValue || 0) - Number(clientPackage.usedValue || 0));
        const eligibleLineRemainder = Math.max(0, (lineAmounts.get(packageServiceLine.id) || 0) - (membershipDiscountByLine.get(packageServiceLine.id) || 0));
        packageCredit = Math.min(remaining, eligibleLineRemainder);
        packageDiscountByLine.set(packageServiceLine.id, packageCredit);
      }
      const manualDiscount = Math.max(0, args.discountAmount || 0);
      const lineDiscounts = /* @__PURE__ */ new Map();
      const lineDiscountComponents = /* @__PURE__ */ new Map();
      let remainingManualDiscount = manualDiscount;
      for (const line of appointment.lineItems) {
        const amount = lineAmounts.get(line.id) || 0;
        const membership = membershipDiscountByLine.get(line.id) || 0;
        const packageAmount = packageDiscountByLine.get(line.id) || 0;
        const manual = Math.min(Math.max(0, amount - membership - packageAmount), remainingManualDiscount);
        remainingManualDiscount -= manual;
        lineDiscounts.set(line.id, manual + membership + packageAmount);
        lineDiscountComponents.set(line.id, { manual, membership, package: packageAmount });
      }
      if (remainingManualDiscount > 0) throw new Error("Discounts and benefits cannot exceed eligible service-line value");
      const discount = manualDiscount + membershipDiscount + packageCredit;
      const subtotal = serviceSubtotal + retailSubtotal;
      const taxable = Math.max(0, subtotal - discount);
      if (discount > serviceSubtotal) throw new Error("Discounts and benefits cannot exceed the service subtotal");
      const tax = Math.round(taxable * configuredTaxRate());
      const tip = Math.max(0, args.tipAmount || 0);
      if (appointment.depositPaid) throw new Error("Deposit allocation is unavailable until payment-allocation reconciliation is implemented");
      const depositCredit = 0;
      const total = Math.max(0, taxable + tax + tip - depositCredit);
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      const transaction = await sudo.query.MedSpaTransaction.createOne({
        data: {
          idempotencyKey: aggregateIdempotencyKey(scopedCheckoutKey, "transaction"),
          practice: { connect: { id: actor.practiceId } },
          type: "appointment",
          location: { connect: { id: checkoutLocationId } },
          client: appointment.client?.id ? { connect: { id: appointment.client.id } } : void 0,
          appointment: { connect: { id: appointment.id } },
          staff: appointment.provider?.id ? { connect: { id: appointment.provider.id } } : void 0,
          tip,
          paymentMethod: packageCredit ? "split" : "cash",
          paymentStatus: "paid",
          status: "completed",
          completedAt: now2,
          metadata: { source: "controlled_checkout", serviceSubtotal, retailSubtotal, discount, discountReason: args.discountReason?.trim() || null, membershipDiscount, packageCredit, discountAllocations: appointment.lineItems.map((line) => ({ lineItemId: line.id, serviceId: line.service?.id || null, ...lineDiscountComponents.get(line.id) || { manual: 0, membership: 0, package: 0 } })), tax, depositCredit, total }
        },
        query: "id"
      });
      for (const item of appointment.lineItems) {
        await sudo.query.MedSpaTransactionLineItem.createOne({
          data: {
            practice: { connect: { id: actor.practiceId } },
            transaction: { connect: { id: transaction.id } },
            itemType: "service",
            service: item.service?.id ? { connect: { id: item.service.id } } : void 0,
            staff: item.staff?.id ? { connect: { id: item.staff.id } } : appointment.provider?.id ? { connect: { id: appointment.provider.id } } : void 0,
            quantity: item.quantity || 1,
            unitPrice: item.price || 0,
            discount: lineDiscounts.get(item.id) || 0,
            commissionRate: item.staff?.baseCommissionRate ?? appointment.provider?.baseCommissionRate ?? 0,
            metadata: { snapshotType: "settled_service", title: item.serviceTitle, imagePath: item.serviceImagePath, duration: item.duration, discountComponents: lineDiscountComponents.get(item.id) || { manual: 0, membership: 0, package: 0 } }
          },
          query: "id"
        });
      }
      for (const item of retailLines) {
        const imagePath = item.product.image?.image?.url || item.product.image?.imagePath || "";
        const transactionLine = await sudo.query.MedSpaTransactionLineItem.createOne({
          data: {
            practice: { connect: { id: actor.practiceId } },
            transaction: { connect: { id: transaction.id } },
            itemType: "product",
            product: { connect: { id: item.product.id } },
            staff: appointment.provider?.id ? { connect: { id: appointment.provider.id } } : void 0,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: 0,
            commissionRate: 0,
            metadata: { snapshotType: "settled_product", title: item.product.name, sku: item.product.sku, imagePath }
          },
          query: "id"
        });
        if (item.product.trackLots) {
          const lots = await sudo.query.InventoryLot.findMany({ where: { practice: { id: { equals: actor.practiceId } }, location: { id: { equals: checkoutLocationId } }, product: { id: { equals: item.product.id } }, status: { equals: "available" }, expiresAt: { gt: now2 }, remainingQuantity: { gt: 0 } }, take: 100, orderBy: { expiresAt: "asc" }, query: "id lotNumber remainingQuantity expiresAt" });
          let required2 = item.quantity;
          for (const lot of lots) {
            if (required2 <= 0) break;
            const used = Math.min(required2, Number(lot.remainingQuantity || 0));
            if (used <= 0) continue;
            const after = Number(lot.remainingQuantity) - used;
            await sudo.query.InventoryLot.updateOne({ where: { id: lot.id }, data: { remainingQuantity: after, status: after === 0 ? "depleted" : "available" }, query: "id" });
            await sudo.query.StockMovement.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: checkoutLocationId } }, lot: { connect: { id: lot.id } }, product: { connect: { id: item.product.id } }, type: "retail_sale", delta: -used, balanceBefore: lot.remainingQuantity, balanceAfter: after, idempotencyKey: `${scopedCheckoutKey}:retail-lot:${item.product.id}:${lot.id}`, reason: `Retail sale ${transaction.id}`, actor: { connect: { id: actor.actorId } }, transactionLine: { connect: { id: transactionLine.id } }, metadata: { appointmentId: appointment.id, lotNumber: lot.lotNumber, expiration: lot.expiresAt } }, query: "id" });
            required2 -= used;
          }
          if (required2 > 0) throw new Error("Released unexpired retail lot inventory is insufficient");
        }
        const movement = await recordInventoryMovement(transactionContext, {
          productId: item.product.id,
          locationId: checkoutLocationId,
          practiceId: actor.practiceId,
          appointmentId: appointment.id,
          type: "sale",
          delta: -item.quantity,
          reason: `Retail sale at appointment checkout ${appointment.id}`,
          idempotencyKey: `${scopedCheckoutKey}:inventory:${item.product.id}`,
          metadata: { source: "controlled_checkout", transactionId: transaction.id, lotTracked: item.product.trackLots === true }
        });
        if (!movement.success) throw new Error(movement.error || "Inventory movement failed");
      }
      const providers = await sudo.query.PaymentProvider.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, adapter: { equals: "manual" }, isInstalled: { equals: true } },
        take: 1,
        query: "id code adapter config"
      });
      const provider = providers[0];
      if (!provider) throw new Error("Operator payment provider is unavailable");
      const providerConfig = paymentProviderFromRecord(provider);
      const initiated = await createProviderPaymentSession({ provider: providerConfig, amount: total, currency: "usd", idempotencyKey: scopedCheckoutKey, metadata: { appointmentId: appointment.id, operatorId: context.session.itemId } });
      const confirmed = await confirmProviderPayment({ provider: providerConfig, providerReference: initiated.providerReference, amount: total, idempotencyKey: `${scopedCheckoutKey}:confirm` });
      if (confirmed.status !== "completed") throw new Error("Operator payment was not completed");
      const session = await sudo.query.PaymentSession.createOne({
        data: { practice: { connect: { id: actor.practiceId } }, appointment: { connect: { id: appointment.id } }, provider: { connect: { id: provider.id } }, idempotencyKey: scopedCheckoutKey, amount: total, currency: "usd", status: "completed", providerReference: initiated.providerReference, completedAt: now2, data: { source: "controlled_checkout", purpose: "controlled_checkout", settlementMethod: "operator_recorded_cash", checkoutRequestHash, discountReason: args.discountReason?.trim() || null, ...initiated.data || {}, ...confirmed.data || {} } },
        query: "id"
      });
      const payment = await sudo.query.Payment.createOne({
        data: { idempotencyKey: aggregateIdempotencyKey(scopedCheckoutKey, "payment"), practice: { connect: { id: actor.practiceId } }, appointment: { connect: { id: appointment.id } }, session: { connect: { id: session.id } }, subtotal, tax, tip, discount, totalAmount: total, paymentMethod: args.paymentMethod, status: "completed", processedAt: now2, processedBy: { connect: { id: context.session.itemId } }, receiptEmail: appointment.client?.user?.email || "", notes: "Recorded by controlled appointment checkout" },
        query: "id"
      });
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { payment: { connect: { id: payment.id } } }, query: "id" });
      if (retailLines.length) {
        await sudo.query.ProductSale.createOne({
          data: { practice: { connect: { id: actor.practiceId } }, appointment: { connect: { id: appointment.id } }, products: retailLines.map((item) => ({ productId: item.product.id, name: item.product.name, sku: item.product.sku, quantity: item.quantity, price: item.unitPrice, subtotal: item.unitPrice * item.quantity })), total: retailSubtotal, soldBy: appointment.provider?.user?.id ? { connect: { id: appointment.provider.user.id } } : void 0 },
          query: "id"
        });
      }
      for (const item of appointment.lineItems) {
        const providerId = item.staff?.id || appointment.provider?.id;
        const rate = item.staff?.baseCommissionRate ?? appointment.provider?.baseCommissionRate ?? 0;
        if (!providerId || !item.service?.id || rate <= 0) continue;
        const grossSaleAmount = (item.price || 0) * (item.quantity || 1);
        const saleAmount = Math.max(0, grossSaleAmount - (lineDiscounts.get(item.id) || 0));
        await sudo.query.Commission.createOne({ data: { practice: { connect: { id: actor.practiceId } }, provider: { connect: { id: providerId } }, service: { connect: { id: item.service.id } }, payment: { connect: { id: payment.id } }, saleAmount, commissionRate: rate, commissionAmount: Math.round(saleAmount * rate), isPaid: false, notes: "Generated by controlled checkout" }, query: "id" });
      }
      if (args.clientMembershipId && membershipDiscount > 0) {
        const membership = (await sudo.query.ClientMembership.findMany({ where: { id: { equals: args.clientMembershipId }, practice: { id: { equals: actor.practiceId } } }, take: 1, query: "id agreements(orderBy: { acceptedAt: desc }, take: 1) { id }" }))[0];
        await sudo.query.MembershipLedgerEntry.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientMembership: { connect: { id: args.clientMembershipId } }, agreement: membership?.agreements?.[0]?.id ? { connect: { id: membership.agreements[0].id } } : void 0, actor: { connect: { id: actor.actorId } }, type: "benefit_use", amountMinor: -membershipDiscount, benefitDelta: -1, reason: "Controlled checkout membership benefit", evidence: { appointmentId: appointment.id, transactionId: transaction.id }, occurredAt: now2, evidenceHash: evidenceHash({ membershipId: args.clientMembershipId, membershipDiscount, transactionId: transaction.id }), idempotencyKey: `${scopedCheckoutKey}:membership-benefit` }, query: "id" });
      }
      if (clientPackage && packageCredit > 0 && packageServiceLine?.service?.id) {
        const usedValue = (clientPackage.usedValue || 0) + packageCredit;
        await sudo.query.ClientPackage.updateOne({ where: { id: clientPackage.id }, data: { usedValue, status: usedValue >= (clientPackage.totalValue || 0) ? "fully-used" : "active" }, query: "id" });
        const usage = await sudo.query.ClientPackageUsage.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientPackage: { connect: { id: clientPackage.id } }, appointment: { connect: { id: appointment.id } }, service: { connect: { id: packageServiceLine.service.id } }, quantityUsed: 1, valueUsed: packageCredit, idempotencyKey: `${scopedCheckoutKey}:package` }, query: "id" });
        await sudo.query.ClientPackageAdjustment.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientPackage: { connect: { id: clientPackage.id } }, usage: { connect: { id: usage.id } }, actor: { connect: { id: actor.actorId } }, type: "consume", valueDelta: -packageCredit, reason: "Controlled checkout package consumption", evidence: { appointmentId: appointment.id, transactionId: transaction.id }, occurredAt: now2, evidenceHash: evidenceHash({ usageId: usage.id, packageCredit, transactionId: transaction.id }), idempotencyKey: `${scopedCheckoutKey}:package-adjustment` }, query: "id" });
      }
      if (appointment.client?.id) {
        await sudo.query.Client.updateOne({ where: { id: appointment.client.id }, data: { lifetimeValue: (appointment.client.lifetimeValue || 0) + total, totalVisits: (appointment.client.totalVisits || 0) + 1, lastVisit: now2 }, query: "id" });
      }
      await sudo.query.Appointment.updateOne({ where: { id: appointment.id }, data: { status: "completed" }, query: "id" });
      return { success: true, transactionId: transaction.id, paymentId: payment.id, error: null };
    });
  } catch (error) {
    console.error("Controlled appointment checkout failed", error);
    return { success: false, transactionId: null, paymentId: null, error: error instanceof Error ? error.message : "Checkout failed" };
  }
}
var resultType4 = import_core113.graphql.object()({
  name: "CompleteAppointmentCheckoutResult",
  fields: {
    success: import_core113.graphql.field({ type: import_core113.graphql.nonNull(import_core113.graphql.Boolean) }),
    transactionId: import_core113.graphql.field({ type: import_core113.graphql.ID }),
    paymentId: import_core113.graphql.field({ type: import_core113.graphql.ID }),
    error: import_core113.graphql.field({ type: import_core113.graphql.String })
  }
});
var completeAppointmentCheckout = import_core113.graphql.field({
  type: resultType4,
  args: {
    appointmentId: import_core113.graphql.arg({ type: import_core113.graphql.nonNull(import_core113.graphql.ID) }),
    paymentMethod: import_core113.graphql.arg({ type: import_core113.graphql.nonNull(import_core113.graphql.String) }),
    tipAmount: import_core113.graphql.arg({ type: import_core113.graphql.nonNull(import_core113.graphql.Int) }),
    discountAmount: import_core113.graphql.arg({ type: import_core113.graphql.nonNull(import_core113.graphql.Int) }),
    discountReason: import_core113.graphql.arg({ type: import_core113.graphql.String }),
    retailItems: import_core113.graphql.arg({ type: import_core113.graphql.JSON }),
    clientPackageId: import_core113.graphql.arg({ type: import_core113.graphql.ID }),
    clientMembershipId: import_core113.graphql.arg({ type: import_core113.graphql.ID }),
    idempotencyKey: import_core113.graphql.arg({ type: import_core113.graphql.nonNull(import_core113.graphql.String) })
  },
  resolve(_source, args, context) {
    return completeAppointmentCheckoutTransaction(context, args);
  }
});

// features/keystone/mutations/packageWorkflows.ts
var import_core114 = require("@keystone-6/core");
async function redeemClientPackageTransaction(context, args) {
  const denied18 = { success: false, clientPackageId: null, usageId: null, usedValue: null, remainingValue: null, status: null };
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
    await Promise.all([assertPracticeRecord(context, "ClientPackage", args.clientPackageId), assertPracticeRecord(context, "Appointment", args.appointmentId), assertPracticeRecord(context, "Service", args.serviceId)]);
  } catch (error) {
    return { ...denied18, error: error instanceof Error ? error.message : "Package record not found" };
  }
  if (!Number.isInteger(args.valueUsed) || args.valueUsed <= 0 || args.valueUsed > 1e7) return { ...denied18, error: "Package usage must be positive integer cents" };
  if (!args.idempotencyKey?.trim() || args.idempotencyKey.length < 12 || args.idempotencyKey.length > 200) return { ...denied18, error: "Idempotency key is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-domain-resource", [
      `appointment:${args.appointmentId}`,
      `package:${args.clientPackageId}`,
      `idempotency:${args.idempotencyKey}`
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.ClientPackageUsage.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } },
        take: 1,
        query: "id valueUsed clientPackage { id totalValue usedValue status } appointment { id } service { id }"
      }))[0];
      if (existing) {
        if (existing.clientPackage?.id !== args.clientPackageId || existing.appointment?.id !== args.appointmentId || existing.service?.id !== args.serviceId || existing.valueUsed !== args.valueUsed) {
          throw new Error("Idempotency key was already used for another package operation");
        }
        return {
          success: true,
          clientPackageId: args.clientPackageId,
          usageId: existing.id,
          usedValue: existing.clientPackage.usedValue,
          remainingValue: Math.max(0, existing.clientPackage.totalValue - existing.clientPackage.usedValue),
          status: existing.clientPackage.status,
          error: null
        };
      }
      const clientPackage = await sudo.query.ClientPackage.findOne({
        where: { id: args.clientPackageId },
        query: "id status totalValue usedValue expiresAt client { id } package { services { id } }"
      });
      const appointment = await sudo.query.Appointment.findOne({
        where: { id: args.appointmentId },
        query: "id status client { user { id } } lineItems { service { id } price quantity }"
      });
      if (!clientPackage || !appointment) throw new Error("Package or appointment not found");
      if (!(/* @__PURE__ */ new Set(["confirmed", "in_progress"])).has(appointment.status || "")) throw new Error("Appointment is not eligible for package usage");
      if (clientPackage.status !== "active") throw new Error("Package is not active");
      if (clientPackage.expiresAt && new Date(clientPackage.expiresAt).getTime() <= Date.now()) throw new Error("Package has expired");
      if (!appointment.client?.user?.id || clientPackage.client?.id !== appointment.client.user.id) throw new Error("Package does not belong to the appointment client");
      if (!clientPackage.package?.services?.some((service) => service.id === args.serviceId)) throw new Error("Package does not cover this service");
      const line = appointment.lineItems.find((item) => item.service?.id === args.serviceId);
      if (!line) throw new Error("Service is not part of the appointment");
      const lineValue = Number(line.price || 0) * Number(line.quantity || 1);
      const remaining = Math.max(0, Number(clientPackage.totalValue || 0) - Number(clientPackage.usedValue || 0));
      if (args.valueUsed > remaining || args.valueUsed > lineValue) throw new Error("Package usage exceeds the available value");
      const usedValue = Number(clientPackage.usedValue || 0) + args.valueUsed;
      const status = usedValue >= Number(clientPackage.totalValue || 0) ? "fully-used" : "active";
      await sudo.query.ClientPackage.updateOne({ where: { id: clientPackage.id }, data: { usedValue, status }, query: "id" });
      const usage = await sudo.query.ClientPackageUsage.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } },
          clientPackage: { connect: { id: clientPackage.id } },
          appointment: { connect: { id: appointment.id } },
          service: { connect: { id: args.serviceId } },
          quantityUsed: 1,
          valueUsed: args.valueUsed,
          idempotencyKey: args.idempotencyKey
        },
        query: "id"
      });
      await sudo.query.ClientPackageAdjustment.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientPackage: { connect: { id: clientPackage.id } }, usage: { connect: { id: usage.id } }, actor: { connect: { id: actor.actorId } }, type: "consume", valueDelta: -args.valueUsed, reason: "Controlled package redemption", evidence: { appointmentId: appointment.id, serviceId: args.serviceId }, occurredAt: (/* @__PURE__ */ new Date()).toISOString(), evidenceHash: evidenceHash({ usageId: usage.id, valueDelta: -args.valueUsed }), idempotencyKey: `${args.idempotencyKey}:adjustment` }, query: "id" });
      return { success: true, clientPackageId: clientPackage.id, usageId: usage.id, usedValue, remainingValue: Math.max(0, Number(clientPackage.totalValue || 0) - usedValue), status, error: null };
    });
  } catch (error) {
    return { ...denied18, error: error instanceof Error ? error.message : "Package usage failed" };
  }
}
async function reverseClientPackageUsageTransaction(context, args) {
  const denied18 = { success: false, clientPackageId: null, usageId: null, usedValue: null, remainingValue: null, status: null };
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance);
    await assertPracticeRecord(context, "ClientPackageUsage", args.usageId);
  } catch (error) {
    return { ...denied18, error: error instanceof Error ? error.message : "Package usage not found" };
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim()) return { ...denied18, error: "Package reversal evidence is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-package-reversal", [`usage:${args.usageId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const usage = await sudo.query.ClientPackageUsage.findOne({ where: { id: args.usageId }, query: "id valueUsed clientPackage { id totalValue usedValue status }" });
      if (!usage?.clientPackage) throw new Error("Package usage not found");
      const existing = await sudo.query.ClientPackageAdjustment.findMany({ where: { usage: { id: { equals: usage.id } }, type: { equals: "reverse" } }, take: 1, query: "id" });
      if (existing.length) throw new Error("Package usage is already reversed");
      const usedValue = Math.max(0, Number(usage.clientPackage.usedValue || 0) - Number(usage.valueUsed || 0));
      await sudo.query.ClientPackage.updateOne({ where: { id: usage.clientPackage.id }, data: { usedValue, status: "active" }, query: "id" });
      await sudo.query.ClientPackageAdjustment.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientPackage: { connect: { id: usage.clientPackage.id } }, usage: { connect: { id: usage.id } }, actor: { connect: { id: actor.actorId } }, type: "reverse", valueDelta: Number(usage.valueUsed || 0), reason: args.reason.trim(), evidence: { reversesUsageId: usage.id }, occurredAt: (/* @__PURE__ */ new Date()).toISOString(), evidenceHash: evidenceHash({ usageId: usage.id, valueDelta: Number(usage.valueUsed || 0), reason: args.reason }), idempotencyKey: args.idempotencyKey }, query: "id" });
      return { success: true, clientPackageId: usage.clientPackage.id, usageId: usage.id, usedValue, remainingValue: Math.max(0, Number(usage.clientPackage.totalValue || 0) - usedValue), status: "active", error: null };
    });
  } catch (error) {
    return { ...denied18, error: error instanceof Error ? error.message : "Package reversal failed" };
  }
}
var resultType5 = import_core114.graphql.object()({
  name: "RedeemClientPackageResult",
  fields: {
    success: import_core114.graphql.field({ type: import_core114.graphql.nonNull(import_core114.graphql.Boolean) }),
    clientPackageId: import_core114.graphql.field({ type: import_core114.graphql.ID }),
    usageId: import_core114.graphql.field({ type: import_core114.graphql.ID }),
    usedValue: import_core114.graphql.field({ type: import_core114.graphql.Int }),
    remainingValue: import_core114.graphql.field({ type: import_core114.graphql.Int }),
    status: import_core114.graphql.field({ type: import_core114.graphql.String }),
    error: import_core114.graphql.field({ type: import_core114.graphql.String })
  }
});
var reverseClientPackageUsage = import_core114.graphql.field({ type: resultType5, args: { usageId: import_core114.graphql.arg({ type: import_core114.graphql.nonNull(import_core114.graphql.ID) }), reason: import_core114.graphql.arg({ type: import_core114.graphql.nonNull(import_core114.graphql.String) }), idempotencyKey: import_core114.graphql.arg({ type: import_core114.graphql.nonNull(import_core114.graphql.String) }) }, resolve(_source, args, context) {
  return reverseClientPackageUsageTransaction(context, args);
} });
var redeemClientPackage = import_core114.graphql.field({
  type: resultType5,
  args: {
    clientPackageId: import_core114.graphql.arg({ type: import_core114.graphql.nonNull(import_core114.graphql.ID) }),
    appointmentId: import_core114.graphql.arg({ type: import_core114.graphql.nonNull(import_core114.graphql.ID) }),
    serviceId: import_core114.graphql.arg({ type: import_core114.graphql.nonNull(import_core114.graphql.ID) }),
    valueUsed: import_core114.graphql.arg({ type: import_core114.graphql.nonNull(import_core114.graphql.Int) }),
    idempotencyKey: import_core114.graphql.arg({ type: import_core114.graphql.nonNull(import_core114.graphql.String) })
  },
  resolve(_source, args, context) {
    return redeemClientPackageTransaction(context, args);
  }
});

// features/keystone/mutations/waitlistWorkflows.ts
var import_core115 = require("@keystone-6/core");
var denied3 = { success: false, waitlistEntryId: null, status: null };
function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Waitlist date range is invalid");
  return date;
}
async function joinWaitlistTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required");
    await Promise.all([assertPracticeRecord(context, "Service", args.serviceId), args.clientId ? assertPracticeRecord(context, "User", args.clientId) : Promise.resolve(null), ...(args.preferredProviderIds || []).map((id) => assertPracticeRecord(context, "Provider", id))]);
  } catch (error) {
    return { ...denied3, error: error instanceof Error ? error.message : "Waitlist scope is unavailable" };
  }
  if (!args.idempotencyKey?.trim() || args.idempotencyKey.length < 12 || args.idempotencyKey.length > 200) return { ...denied3, error: "Idempotency key is invalid" };
  const notes = args.notes?.trim() || "";
  const preferredTimeRange = args.preferredTimeRange?.trim() || "";
  const guestName = args.guestName?.trim() || "";
  const guestPhone = args.guestPhone?.trim() || "";
  if (!args.clientId && !guestName) return { ...denied3, error: "A client or walk-in name is required" };
  if (guestName.length > 120 || guestPhone.length > 40 || notes.length > 2e3 || preferredTimeRange.length > 120) return { ...denied3, error: "Waitlist details are too long" };
  const preferredDays = Array.isArray(args.preferredDays) ? [...new Set(args.preferredDays.map(String))] : [];
  const allowedDays = /* @__PURE__ */ new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
  if (preferredDays.length > 7 || preferredDays.some((day) => !allowedDays.has(day.toLowerCase()))) return { ...denied3, error: "Preferred days are invalid" };
  let start;
  let end;
  try {
    start = parseDate(args.dateRangeStart);
    end = parseDate(args.dateRangeEnd);
    if (start && end && end <= start) throw new Error("Waitlist end date must follow its start date");
    if (end && end.getTime() > Date.now() + 366 * 24 * 60 * 6e4) throw new Error("Waitlist date range is too far in the future");
  } catch (error) {
    return { ...denied3, error: error instanceof Error ? error.message : "Waitlist date range is invalid" };
  }
  const providerIds = [...new Set((args.preferredProviderIds || []).filter(Boolean))];
  if (providerIds.length > 20) return { ...denied3, error: "Too many preferred providers" };
  try {
    return await serializableWorkflow(context, "medspa-waitlist", [
      `client-service:${args.clientId || `${guestName}:${guestPhone}`}:${args.serviceId}`,
      `request:${args.idempotencyKey}`
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.WaitlistEntry.findMany({
        where: { requestKey: { equals: args.idempotencyKey } },
        take: 1,
        query: "id status guestName guestPhone client { id } service { id }"
      }))[0];
      if (existing) {
        if ((existing.client?.id || null) !== (args.clientId || null) || existing.service?.id !== args.serviceId || !args.clientId && (existing.guestName !== guestName || (existing.guestPhone || "") !== guestPhone)) {
          throw new Error("Idempotency key was already used for another waitlist request");
        }
        return { success: true, waitlistEntryId: existing.id, status: existing.status, error: null };
      }
      const [client, service, providers] = await Promise.all([
        args.clientId ? sudo.query.User.findOne({ where: { id: args.clientId }, query: "id" }) : Promise.resolve(null),
        sudo.query.Service.findOne({ where: { id: args.serviceId }, query: "id status" }),
        providerIds.length ? sudo.query.Provider.findMany({ where: { id: { in: providerIds } }, query: "id status isActive" }) : Promise.resolve([])
      ]);
      if (args.clientId && !client || !service || service.status && service.status !== "active") throw new Error("Waitlist client or service is unavailable");
      if (providers.length !== providerIds.length || providers.some((provider) => provider.status === "inactive" || provider.isActive === false)) throw new Error("A preferred provider is unavailable");
      const duplicate = (await sudo.query.WaitlistEntry.findMany({
        where: args.clientId ? { client: { id: { equals: args.clientId } }, service: { id: { equals: args.serviceId } }, isActive: { equals: true } } : { guestName: { equals: guestName }, guestPhone: { equals: guestPhone }, service: { id: { equals: args.serviceId } }, isActive: { equals: true } },
        take: 1,
        query: "id status"
      }))[0];
      if (duplicate) return { success: true, waitlistEntryId: duplicate.id, status: duplicate.status, error: null };
      const entry = await sudo.query.WaitlistEntry.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } },
          client: args.clientId ? { connect: { id: args.clientId } } : void 0,
          guestName,
          guestPhone,
          service: { connect: { id: args.serviceId } },
          preferredProviders: providerIds.length ? { connect: providerIds.map((id) => ({ id })) } : void 0,
          preferredDays,
          preferredTimeRange,
          dateRangeStart: start?.toISOString(),
          dateRangeEnd: end?.toISOString(),
          notes,
          requestKey: args.idempotencyKey,
          status: "active",
          isActive: true
        },
        query: "id status"
      });
      return { success: true, waitlistEntryId: entry.id, status: entry.status, error: null };
    });
  } catch (error) {
    return { ...denied3, error: error instanceof Error ? error.message : "Waitlist request failed" };
  }
}
async function transitionWaitlistEntryTransaction(context, args) {
  try {
    requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required");
    await Promise.all([assertPracticeRecord(context, "WaitlistEntry", args.waitlistEntryId), args.appointmentId ? assertPracticeRecord(context, "Appointment", args.appointmentId) : Promise.resolve(null)]);
  } catch (error) {
    return { ...denied3, error: error instanceof Error ? error.message : "Waitlist entry not found" };
  }
  const targets = { notify: "notified", remove: "removed", reactivate: "active", convert: "converted" };
  const target = targets[args.action];
  if (!target) return { ...denied3, error: "Unsupported waitlist transition" };
  const reason = args.reason?.trim() || "";
  if (reason.length > 1e3) return { ...denied3, error: "Transition reason is too long" };
  if (args.action === "convert" && !args.appointmentId) return { ...denied3, error: "Converted waitlist entries require an appointment" };
  try {
    return await serializableWorkflow(context, "medspa-waitlist", [`entry:${args.waitlistEntryId}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const entry = await sudo.query.WaitlistEntry.findOne({
        where: { id: args.waitlistEntryId },
        query: "id status client { id } service { id } convertedAppointment { id }"
      });
      if (!entry) throw new Error("Waitlist entry not found");
      if (entry.status === target && (target !== "converted" || entry.convertedAppointment?.id === args.appointmentId)) {
        return { success: true, waitlistEntryId: entry.id, status: entry.status, error: null };
      }
      const valid = {
        active: ["notified", "removed"],
        notified: ["active", "converted", "removed"],
        removed: ["active"],
        converted: []
      };
      if (!(valid[entry.status || "active"] || []).includes(target)) throw new Error(`Cannot transition waitlist entry from ${entry.status || "active"} to ${target}`);
      if (target === "converted") {
        const appointment = await sudo.query.Appointment.findOne({
          where: { id: args.appointmentId },
          query: "id client { user { id } } services { id }"
        });
        if (!appointment || appointment.client?.user?.id !== entry.client?.id || !appointment.services.some((service) => service.id === entry.service?.id)) {
          throw new Error("Converted appointment does not match the waitlist entry");
        }
      }
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      await sudo.query.WaitlistEntry.updateOne({
        where: { id: entry.id },
        data: {
          status: target,
          isActive: target === "active" || target === "notified",
          notifiedAt: target === "notified" ? now2 : void 0,
          transitionedAt: now2,
          transitionReason: reason,
          convertedAppointment: target === "converted" ? { connect: { id: args.appointmentId } } : void 0
        },
        query: "id"
      });
      return { success: true, waitlistEntryId: entry.id, status: target, error: null };
    });
  } catch (error) {
    return { ...denied3, error: error instanceof Error ? error.message : "Waitlist transition failed" };
  }
}
var resultType6 = import_core115.graphql.object()({
  name: "WaitlistWorkflowResult",
  fields: {
    success: import_core115.graphql.field({ type: import_core115.graphql.nonNull(import_core115.graphql.Boolean) }),
    waitlistEntryId: import_core115.graphql.field({ type: import_core115.graphql.ID }),
    status: import_core115.graphql.field({ type: import_core115.graphql.String }),
    error: import_core115.graphql.field({ type: import_core115.graphql.String })
  }
});
var joinWaitlist = import_core115.graphql.field({
  type: resultType6,
  args: {
    clientId: import_core115.graphql.arg({ type: import_core115.graphql.ID }),
    guestName: import_core115.graphql.arg({ type: import_core115.graphql.String }),
    guestPhone: import_core115.graphql.arg({ type: import_core115.graphql.String }),
    serviceId: import_core115.graphql.arg({ type: import_core115.graphql.nonNull(import_core115.graphql.ID) }),
    preferredProviderIds: import_core115.graphql.arg({ type: import_core115.graphql.list(import_core115.graphql.nonNull(import_core115.graphql.ID)) }),
    preferredDays: import_core115.graphql.arg({ type: import_core115.graphql.JSON }),
    preferredTimeRange: import_core115.graphql.arg({ type: import_core115.graphql.String }),
    dateRangeStart: import_core115.graphql.arg({ type: import_core115.graphql.String }),
    dateRangeEnd: import_core115.graphql.arg({ type: import_core115.graphql.String }),
    notes: import_core115.graphql.arg({ type: import_core115.graphql.String }),
    idempotencyKey: import_core115.graphql.arg({ type: import_core115.graphql.nonNull(import_core115.graphql.String) })
  },
  resolve(_source, args, context) {
    return joinWaitlistTransaction(context, args);
  }
});
var transitionWaitlistEntry = import_core115.graphql.field({
  type: resultType6,
  args: {
    waitlistEntryId: import_core115.graphql.arg({ type: import_core115.graphql.nonNull(import_core115.graphql.ID) }),
    action: import_core115.graphql.arg({ type: import_core115.graphql.nonNull(import_core115.graphql.String) }),
    appointmentId: import_core115.graphql.arg({ type: import_core115.graphql.ID }),
    reason: import_core115.graphql.arg({ type: import_core115.graphql.String })
  },
  resolve(_source, args, context) {
    return transitionWaitlistEntryTransaction(context, args);
  }
});

// features/keystone/mutations/scheduleWorkflows.ts
var import_core116 = require("@keystone-6/core");
var denied4 = { success: false, scheduleId: null, revision: null };
function dateKey(value, label = "Schedule date") {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} is invalid`);
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label} is invalid`);
  return value;
}
function timestampForDate(value) {
  return value ? `${value}T12:00:00.000Z` : null;
}
function normalize(input) {
  const type = input.type;
  if (!(/* @__PURE__ */ new Set(["recurring", "one_time", "time_off"])).has(type)) throw new Error("Schedule type is invalid");
  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  if (end <= start) throw new Error("Schedule end time must follow start time");
  const breakStart = input.breakStart?.trim() || "";
  const breakEnd = input.breakEnd?.trim() || "";
  if (breakStart && !breakEnd || !breakStart && breakEnd) throw new Error("Schedule break requires both start and end");
  if (breakStart && breakEnd) {
    const breakStartMinutes = timeToMinutes(breakStart);
    const breakEndMinutes = timeToMinutes(breakEnd);
    if (breakStartMinutes < start || breakEndMinutes > end || breakEndMinutes <= breakStartMinutes) throw new Error("Schedule break must fall within working hours");
  }
  const localDate = dateKey(input.localDate);
  const effectiveFrom = dateKey(input.effectiveFrom, "Effective start date");
  const effectiveTo = dateKey(input.effectiveTo, "Effective end date");
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) throw new Error("Effective end date must follow its start date");
  if (type === "recurring" && (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6)) throw new Error("Recurring schedules require a valid day of week");
  if (type !== "recurring" && !localDate) throw new Error("One-time and time-off schedules require a local date");
  if (type === "recurring" && localDate) throw new Error("Recurring schedules cannot have a local date");
  const reason = input.reason?.trim() || "";
  if (reason.length > 1e3) throw new Error("Schedule reason is too long");
  const idempotencyKey = input.idempotencyKey?.trim() || "";
  if (!input.scheduleId && (idempotencyKey.length < 12 || idempotencyKey.length > 200)) throw new Error("A valid idempotency key is required");
  return {
    type,
    dayOfWeek: type === "recurring" ? input.dayOfWeek : null,
    localDate: type === "recurring" ? "" : localDate,
    date: type === "recurring" ? null : timestampForDate(localDate),
    startTime: input.startTime,
    endTime: input.endTime,
    breakStart,
    breakEnd,
    isAvailable: type === "time_off" ? false : input.isAvailable !== false,
    reason,
    effectiveFrom: type === "recurring" ? timestampForDate(effectiveFrom) : null,
    effectiveTo: type === "recurring" ? timestampForDate(effectiveTo) : null,
    idempotencyKey
  };
}
async function upsertProviderScheduleTransaction(context, input) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required");
    await Promise.all([assertPracticeRecord(context, "Provider", input.providerId), assertPracticeRecord(context, "Location", input.locationId), input.scheduleId ? assertPracticeRecord(context, "ProviderSchedule", input.scheduleId) : Promise.resolve(null)]);
  } catch (error) {
    return { ...denied4, error: error instanceof Error ? error.message : "Schedule record not found" };
  }
  let normalized;
  try {
    normalized = normalize(input);
  } catch (error) {
    return { ...denied4, error: error instanceof Error ? error.message : "Schedule input is invalid" };
  }
  try {
    return await serializableWorkflow(context, "medspa-schedule", [
      `provider:${input.providerId}`,
      `location:${input.locationId}`,
      input.scheduleId ? `schedule:${input.scheduleId}` : `idempotency:${normalized.idempotencyKey}`
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const [provider, location] = await Promise.all([
        sudo.query.Provider.findOne({ where: { id: input.providerId }, query: "id status isActive locations { id }" }),
        sudo.query.Location.findOne({ where: { id: input.locationId }, query: "id isActive" })
      ]);
      if (!provider || provider.status === "inactive" || provider.isActive === false) throw new Error("Provider is unavailable");
      if (!location || location.isActive === false) throw new Error("Location is unavailable");
      if (!provider.locations?.some((assigned) => assigned.id === location.id)) throw new Error("Provider is not assigned to this location");
      if (!input.scheduleId) {
        const existing2 = (await sudo.query.ProviderSchedule.findMany({
          where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: normalized.idempotencyKey } },
          take: 1,
          query: "id revision provider { id } location { id } type dayOfWeek localDate startTime endTime"
        }))[0];
        if (existing2) {
          if (existing2.provider?.id !== input.providerId || existing2.location?.id !== input.locationId || existing2.type !== normalized.type || (existing2.dayOfWeek ?? null) !== normalized.dayOfWeek || (existing2.localDate || "") !== normalized.localDate || existing2.startTime !== normalized.startTime || existing2.endTime !== normalized.endTime) {
            throw new Error("Idempotency key was already used for another schedule");
          }
          return { success: true, scheduleId: existing2.id, revision: existing2.revision, error: null };
        }
        const created = await sudo.query.ProviderSchedule.createOne({
          data: {
            ...normalized,
            practice: { connect: { id: actor.practiceId } },
            provider: { connect: { id: input.providerId } },
            location: { connect: { id: input.locationId } },
            revision: 1
          },
          query: "id revision"
        });
        return { success: true, scheduleId: created.id, revision: created.revision, error: null };
      }
      const existing = await sudo.query.ProviderSchedule.findOne({
        where: { id: input.scheduleId },
        query: "id revision idempotencyKey provider { id } location { id }"
      });
      if (!existing || existing.provider?.id !== input.providerId || existing.location?.id !== input.locationId) throw new Error("Schedule not found");
      if (!Number.isInteger(input.expectedRevision) || input.expectedRevision !== existing.revision) throw new Error("Schedule was changed by another operator");
      const revision = existing.revision + 1;
      await sudo.query.ProviderSchedule.updateOne({
        where: { id: existing.id },
        data: { ...normalized, idempotencyKey: existing.idempotencyKey, revision },
        query: "id"
      });
      return { success: true, scheduleId: existing.id, revision, error: null };
    });
  } catch (error) {
    return { ...denied4, error: error instanceof Error ? error.message : "Schedule workflow failed" };
  }
}
async function setProviderScheduleAvailabilityTransaction(context, input) {
  try {
    requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required");
    await assertPracticeRecord(context, "ProviderSchedule", input.scheduleId);
  } catch (error) {
    return { ...denied4, error: error instanceof Error ? error.message : "Schedule record not found" };
  }
  const reason = input.reason?.trim() || "";
  if (reason.length > 1e3) return { ...denied4, error: "Schedule reason is too long" };
  try {
    return await serializableWorkflow(context, "medspa-schedule", [`schedule:${input.scheduleId}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const schedule = await sudo.query.ProviderSchedule.findOne({
        where: { id: input.scheduleId },
        query: "id type revision isAvailable reason"
      });
      if (!schedule) throw new Error("Schedule not found");
      if (schedule.type === "time_off" && input.isAvailable) throw new Error("Time-off entries cannot be restored as availability");
      if (schedule.isAvailable === input.isAvailable && (!reason || schedule.reason === reason)) {
        return { success: true, scheduleId: schedule.id, revision: schedule.revision, error: null };
      }
      if (!Number.isInteger(input.expectedRevision) || input.expectedRevision !== schedule.revision) throw new Error("Schedule was changed by another operator");
      const revision = schedule.revision + 1;
      await sudo.query.ProviderSchedule.updateOne({
        where: { id: schedule.id },
        data: { isAvailable: input.isAvailable, reason: reason || (input.isAvailable ? "" : "Blocked by operator"), revision },
        query: "id"
      });
      return { success: true, scheduleId: schedule.id, revision, error: null };
    });
  } catch (error) {
    return { ...denied4, error: error instanceof Error ? error.message : "Schedule workflow failed" };
  }
}
var resultType7 = import_core116.graphql.object()({
  name: "ProviderScheduleWorkflowResult",
  fields: {
    success: import_core116.graphql.field({ type: import_core116.graphql.nonNull(import_core116.graphql.Boolean) }),
    scheduleId: import_core116.graphql.field({ type: import_core116.graphql.ID }),
    revision: import_core116.graphql.field({ type: import_core116.graphql.Int }),
    error: import_core116.graphql.field({ type: import_core116.graphql.String })
  }
});
var upsertProviderSchedule = import_core116.graphql.field({
  type: resultType7,
  args: {
    scheduleId: import_core116.graphql.arg({ type: import_core116.graphql.ID }),
    providerId: import_core116.graphql.arg({ type: import_core116.graphql.nonNull(import_core116.graphql.ID) }),
    locationId: import_core116.graphql.arg({ type: import_core116.graphql.nonNull(import_core116.graphql.ID) }),
    type: import_core116.graphql.arg({ type: import_core116.graphql.nonNull(import_core116.graphql.String) }),
    dayOfWeek: import_core116.graphql.arg({ type: import_core116.graphql.Int }),
    localDate: import_core116.graphql.arg({ type: import_core116.graphql.String }),
    startTime: import_core116.graphql.arg({ type: import_core116.graphql.nonNull(import_core116.graphql.String) }),
    endTime: import_core116.graphql.arg({ type: import_core116.graphql.nonNull(import_core116.graphql.String) }),
    breakStart: import_core116.graphql.arg({ type: import_core116.graphql.String }),
    breakEnd: import_core116.graphql.arg({ type: import_core116.graphql.String }),
    isAvailable: import_core116.graphql.arg({ type: import_core116.graphql.Boolean }),
    reason: import_core116.graphql.arg({ type: import_core116.graphql.String }),
    effectiveFrom: import_core116.graphql.arg({ type: import_core116.graphql.String }),
    effectiveTo: import_core116.graphql.arg({ type: import_core116.graphql.String }),
    idempotencyKey: import_core116.graphql.arg({ type: import_core116.graphql.String }),
    expectedRevision: import_core116.graphql.arg({ type: import_core116.graphql.Int })
  },
  resolve(_source, args, context) {
    return upsertProviderScheduleTransaction(context, args);
  }
});
var setProviderScheduleAvailability = import_core116.graphql.field({
  type: resultType7,
  args: {
    scheduleId: import_core116.graphql.arg({ type: import_core116.graphql.nonNull(import_core116.graphql.ID) }),
    isAvailable: import_core116.graphql.arg({ type: import_core116.graphql.nonNull(import_core116.graphql.Boolean) }),
    reason: import_core116.graphql.arg({ type: import_core116.graphql.String }),
    expectedRevision: import_core116.graphql.arg({ type: import_core116.graphql.nonNull(import_core116.graphql.Int) })
  },
  resolve(_source, args, context) {
    return setProviderScheduleAvailabilityTransaction(context, args);
  }
});

// features/keystone/mutations/commissionWorkflows.ts
var import_core117 = require("@keystone-6/core");
var denied5 = { success: false, payoutCount: 0, totalAmount: 0 };
async function payoutCommissionsTransaction(context, commissionIds) {
  try {
    requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
  } catch (error) {
    return { ...denied5, error: error instanceof Error ? error.message : "Authorized finance access is required" };
  }
  const ids = [...new Set(commissionIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0 || ids.length > 200) {
    return { ...denied5, error: "Choose between 1 and 200 commissions" };
  }
  try {
    await Promise.all(ids.map((id) => assertPracticeRecord(context, "Commission", id)));
    return await serializableWorkflow(
      context,
      "medspa-commission-payout",
      ids.map((id) => `commission:${id}`),
      async (transactionContext) => {
        const sudo = transactionContext.sudo();
        const commissions = await sudo.query.Commission.findMany({
          where: { id: { in: ids } },
          take: 200,
          query: "id isPaid paidAt commissionAmount provider { id }"
        });
        if (commissions.length !== ids.length) throw new Error("One or more commissions were not found");
        const providerIds = new Set(commissions.map((commission) => commission.provider?.id).filter(Boolean));
        if (providerIds.size !== 1) throw new Error("A payout batch must belong to one provider");
        const paidAt = (/* @__PURE__ */ new Date()).toISOString();
        let payoutCount = 0;
        for (const commission of commissions) {
          if (commission.isPaid) continue;
          await sudo.query.Commission.updateOne({
            where: { id: commission.id },
            data: { isPaid: true, paidAt },
            query: "id"
          });
          payoutCount += 1;
        }
        return {
          success: true,
          payoutCount,
          totalAmount: commissions.reduce((sum, commission) => sum + Number(commission.commissionAmount || 0), 0),
          error: null
        };
      }
    );
  } catch (error) {
    return { ...denied5, error: error instanceof Error ? error.message : "Commission payout failed" };
  }
}
var resultType8 = import_core117.graphql.object()({
  name: "CommissionPayoutResult",
  fields: {
    success: import_core117.graphql.field({ type: import_core117.graphql.nonNull(import_core117.graphql.Boolean) }),
    payoutCount: import_core117.graphql.field({ type: import_core117.graphql.nonNull(import_core117.graphql.Int) }),
    totalAmount: import_core117.graphql.field({ type: import_core117.graphql.nonNull(import_core117.graphql.Int) }),
    error: import_core117.graphql.field({ type: import_core117.graphql.String })
  }
});
var payoutCommissions = import_core117.graphql.field({
  type: resultType8,
  args: {
    commissionIds: import_core117.graphql.arg({ type: import_core117.graphql.nonNull(import_core117.graphql.list(import_core117.graphql.nonNull(import_core117.graphql.ID))) })
  },
  resolve(_source, args, context) {
    return payoutCommissionsTransaction(context, args.commissionIds);
  }
});

// features/keystone/mutations/resourceWorkflows.ts
var import_core118 = require("@keystone-6/core");
var denied6 = { success: false, resourceId: null, revision: null };
async function setResourceAvailabilityTransaction(context, input) {
  try {
    requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required");
    await assertPracticeRecord(context, "Resource", input.resourceId);
  } catch (error) {
    return { ...denied6, error: error instanceof Error ? error.message : "Resource not found" };
  }
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
    return { ...denied6, error: "A valid resource revision is required" };
  }
  try {
    return await serializableWorkflow(context, "medspa-resource", [`resource:${input.resourceId}`], async (transactionContext) => {
      await assertPracticeRecord(transactionContext, "Resource", input.resourceId);
      const sudo = transactionContext.sudo();
      const resource = await sudo.query.Resource.findOne({
        where: { id: input.resourceId },
        query: "id type isActive revision practice { id } location { id isActive practice { id } }"
      });
      if (!resource) throw new Error("Resource not found");
      if (resource.practice?.id !== transactionContext.session.data.practice?.id || resource.location?.practice?.id !== resource.practice?.id || !resource.location?.id || resource.location.isActive === false) throw new Error("Resource location is unavailable");
      if (resource.isActive === input.isActive) {
        return { success: true, resourceId: resource.id, revision: resource.revision, error: null };
      }
      if (input.isActive && ["device", "equipment"].includes(resource.type)) throw new Error("Device activation requires the qualified device-readiness release workflow");
      if (resource.revision !== input.expectedRevision) throw new Error("Resource was changed by another operator");
      if (!input.isActive) {
        const activeAppointments = await sudo.query.Appointment.count({
          where: { practice: { id: { equals: resource.practice.id } }, OR: [{ resource: { id: { equals: resource.id } } }, { room: { id: { equals: resource.id } } }, { device: { id: { equals: resource.id } } }], status: { in: ["pending", "confirmed", "in_progress"] } }
        });
        const activeReservations = await sudo.query.AppointmentResourceReservation.count({ where: { practice: { id: { equals: resource.practice.id } }, resource: { id: { equals: resource.id } }, status: { in: ["reserved", "in_use"] } } });
        if (activeAppointments > 0 || activeReservations > 0) throw new Error("Resource has active appointments and cannot be disabled");
      }
      const revision = resource.revision + 1;
      await sudo.query.Resource.updateOne({
        where: { id: resource.id },
        data: { isActive: input.isActive, revision },
        query: "id"
      });
      return { success: true, resourceId: resource.id, revision, error: null };
    });
  } catch (error) {
    return { ...denied6, error: error instanceof Error ? error.message : "Resource update failed" };
  }
}
var resultType9 = import_core118.graphql.object()({
  name: "ResourceWorkflowResult",
  fields: {
    success: import_core118.graphql.field({ type: import_core118.graphql.nonNull(import_core118.graphql.Boolean) }),
    resourceId: import_core118.graphql.field({ type: import_core118.graphql.ID }),
    revision: import_core118.graphql.field({ type: import_core118.graphql.Int }),
    error: import_core118.graphql.field({ type: import_core118.graphql.String })
  }
});
var setResourceAvailability = import_core118.graphql.field({
  type: resultType9,
  args: {
    resourceId: import_core118.graphql.arg({ type: import_core118.graphql.nonNull(import_core118.graphql.ID) }),
    isActive: import_core118.graphql.arg({ type: import_core118.graphql.nonNull(import_core118.graphql.Boolean) }),
    expectedRevision: import_core118.graphql.arg({ type: import_core118.graphql.nonNull(import_core118.graphql.Int) })
  },
  resolve(_source, args, context) {
    return setResourceAvailabilityTransaction(context, args);
  }
});

// features/keystone/mutations/authorityPackWorkflows.ts
var import_core119 = require("@keystone-6/core");
var denied7 = { success: false, recordId: null, evidenceHash: null };
function authority(context) {
  const actor = requireActorPractice(context, permissions.canManageClinical, "Clinical authority-pack access is required");
  if (!permissions.canManagePractice({ session: context.session })) throw new Error("Practice-owner approval is required for authority packs");
  return actor;
}
function failure(error) {
  return { ...denied7, error: error instanceof Error ? error.message : "Authority-pack workflow failed" };
}
async function registerProviderCredentialTransaction(context, args) {
  let actor;
  try {
    actor = authority(context);
  } catch (error) {
    return failure(error);
  }
  const from = new Date(args.effectiveFrom);
  const expires = new Date(args.expiresAt);
  if (!validIdempotencyKey(args.idempotencyKey) || !args.licenseType.trim() || !args.licenseNumber.trim() || !args.jurisdiction.trim() || !args.verificationSource.trim() || !args.evidenceReference.trim() || !args.protocolVersion.trim() || Number.isNaN(from.getTime()) || Number.isNaN(expires.getTime()) || expires <= from || args.supervisionRequired && !args.supervisorId) return { ...denied7, error: "Credential evidence is incomplete" };
  try {
    const [provider] = await Promise.all([assertPracticeRecord(context, "Provider", args.providerId, "id practice { id } user { id }"), args.locationId ? assertPracticeRecord(context, "Location", args.locationId) : Promise.resolve(null), args.supervisorId ? assertPracticeRecord(context, "Provider", args.supervisorId) : Promise.resolve(null)]);
    if (provider.user?.id === actor.actorId) throw new Error("A provider cannot verify their own credential");
    const evidence = { ...args, scopeEvidenceHash: evidenceHash(args.scopeEvidence), actorId: actor.actorId, recordedAt: (/* @__PURE__ */ new Date()).toISOString() };
    const hash = evidenceHash(evidence);
    return await serializableWorkflow(context, "medspa-provider-credential", [`provider:${args.providerId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.ProviderCredential.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id scopeEvidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.scopeEvidenceHash, error: null };
      const record = await sudo.query.ProviderCredential.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        provider: { connect: { id: args.providerId } },
        location: args.locationId ? { connect: { id: args.locationId } } : void 0,
        licenseType: args.licenseType.trim(),
        licenseNumber: args.licenseNumber.trim(),
        jurisdiction: args.jurisdiction.trim(),
        status: "verified",
        effectiveFrom: from.toISOString(),
        expiresAt: expires.toISOString(),
        verifiedAt: evidence.recordedAt,
        verificationSource: args.verificationSource.trim(),
        primarySourceVerified: true,
        supervisionRequired: args.supervisionRequired,
        supervisor: args.supervisorId ? { connect: { id: args.supervisorId } } : void 0,
        scopeEvidenceHash: evidence.scopeEvidenceHash,
        evidenceReference: args.evidenceReference.trim(),
        protocolVersion: args.protocolVersion.trim(),
        idempotencyKey: args.idempotencyKey
      }, query: "id scopeEvidenceHash" });
      return { success: true, recordId: record.id, evidenceHash: hash, error: null };
    });
  } catch (error) {
    return failure(error);
  }
}
async function configureProviderAuthorizationTransaction(context, args) {
  let actor;
  try {
    actor = authority(context);
  } catch (error) {
    return failure(error);
  }
  const from = new Date(args.effectiveFrom);
  const to = args.effectiveTo ? new Date(args.effectiveTo) : null;
  if (!validIdempotencyKey(args.idempotencyKey) || !args.policyVersion.trim() || !args.evidenceLabel.trim() || !args.evidenceReference.trim() || Number.isNaN(from.getTime()) || to && (Number.isNaN(to.getTime()) || to <= from) || args.supervisionRequired && !args.requiredSupervisorId) return { ...denied7, error: "Provider authorization pack is incomplete" };
  try {
    const [provider, credential, location, _service, supervisor] = await Promise.all([assertPracticeRecord(context, "Provider", args.providerId, "id practice { id } user { id }"), assertPracticeRecord(context, "ProviderCredential", args.credentialId, "id practice { id } status effectiveFrom expiresAt provider { id } location { id }"), assertPracticeRecord(context, "Location", args.locationId), assertPracticeRecord(context, "Service", args.serviceId), args.requiredSupervisorId ? assertPracticeRecord(context, "Provider", args.requiredSupervisorId, "id practice { id } user { id }") : Promise.resolve(null)]);
    if (provider.user?.id === actor.actorId || supervisor?.user?.id === actor.actorId) throw new Error("Authority approval must be independent of performer and required supervisor");
    if (credential.provider?.id !== provider.id || credential.status !== "verified" || new Date(credential.effectiveFrom) > from || new Date(credential.expiresAt) <= from || credential.location?.id && credential.location.id !== location.id) throw new Error("Credential does not authorize this provider, location, and effective time");
    const authorityEvidenceHash = evidenceHash(args.authorityEvidence);
    return await serializableWorkflow(context, "medspa-provider-authorization", [`provider:${args.providerId}`, `service:${args.serviceId}`, `location:${args.locationId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.ProviderAuthorization.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id authorityEvidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.authorityEvidenceHash, error: null };
      const record = await sudo.query.ProviderAuthorization.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        provider: { connect: { id: args.providerId } },
        credential: { connect: { id: args.credentialId } },
        location: { connect: { id: args.locationId } },
        service: { connect: { id: args.serviceId } },
        requiredSupervisor: args.requiredSupervisorId ? { connect: { id: args.requiredSupervisorId } } : void 0,
        status: "active",
        effectiveFrom: from.toISOString(),
        effectiveTo: to ? to.toISOString() : void 0,
        supervisionRequired: args.supervisionRequired,
        supervisionMode: args.supervisionMode || "",
        policyVersion: args.policyVersion.trim(),
        authorityEvidenceHash,
        idempotencyKey: args.idempotencyKey,
        evidenceLabel: args.evidenceLabel.trim(),
        evidenceReference: args.evidenceReference.trim()
      }, query: "id authorityEvidenceHash" });
      return { success: true, recordId: record.id, evidenceHash: record.authorityEvidenceHash, error: null };
    });
  } catch (error) {
    return failure(error);
  }
}
async function publishConsentTemplateTransaction(context, args) {
  let actor;
  try {
    actor = authority(context);
  } catch (error) {
    return failure(error);
  }
  const from = new Date(args.effectiveFrom);
  const until = args.effectiveUntil ? new Date(args.effectiveUntil) : null;
  if (!validIdempotencyKey(args.idempotencyKey) || !args.jurisdiction.trim() || !args.language.trim() || !args.version.trim() || Number.isNaN(from.getTime()) || until && (Number.isNaN(until.getTime()) || until <= from)) return { ...denied7, error: "Consent template pack is incomplete" };
  try {
    const [_service, prior] = await Promise.all([assertPracticeRecord(context, "Service", args.serviceId), args.supersedesId ? assertPracticeRecord(context, "ConsentTemplateVersion", args.supersedesId, "id practice { id } service { id } effectiveFrom effectiveUntil supersededBy { id }") : Promise.resolve(null)]);
    if (prior && (prior.service?.id !== args.serviceId || prior.supersededBy?.id || prior.effectiveUntil && new Date(prior.effectiveUntil) <= from)) throw new Error("Consent-template supersession is invalid");
    const contentHash = evidenceHash(args.content);
    return await serializableWorkflow(context, "medspa-consent-template", [`service:${args.serviceId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.ConsentTemplateVersion.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id contentHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.contentHash, error: null };
      const record = await sudo.query.ConsentTemplateVersion.createOne({ data: { practice: { connect: { id: actor.practiceId } }, service: { connect: { id: args.serviceId } }, jurisdiction: args.jurisdiction.trim(), language: args.language.trim(), version: args.version.trim(), contentSnapshot: bounded(args.content), contentHash, effectiveFrom: from.toISOString(), effectiveUntil: until ? until.toISOString() : void 0, supersedes: args.supersedesId ? { connect: { id: args.supersedesId } } : void 0, idempotencyKey: args.idempotencyKey }, query: "id contentHash" });
      if (prior) await sudo.query.ConsentTemplateVersion.updateOne({ where: { id: prior.id }, data: { effectiveUntil: from.toISOString() }, query: "id" });
      return { success: true, recordId: record.id, evidenceHash: record.contentHash, error: null };
    });
  } catch (error) {
    return failure(error);
  }
}
async function transitionProviderAuthorityTransaction(context, args) {
  if (!(/* @__PURE__ */ new Set(["provider", "credential", "authorization"])).has(args.targetType) || !(/* @__PURE__ */ new Set(["activate", "suspend", "revoke"])).has(args.action)) return { ...denied7, error: "Authority transition is invalid" };
  let actor;
  try {
    actor = authority(context);
    await assertPracticeRecord(context, args.targetType === "provider" ? "Provider" : args.targetType === "credential" ? "ProviderCredential" : "ProviderAuthorization", args.targetId);
  } catch (error) {
    return failure(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || args.reason.length > 1e3) return { ...denied7, error: "Authority transition evidence is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-provider-authority-transition", [`${args.targetType}:${args.targetId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const priorEvent = (await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, correlationId: { equals: args.idempotencyKey }, action: { equals: "provider_authority.transitioned" } }, take: 1, query: "resourceId evidenceHash" }))[0];
      if (priorEvent) return { success: true, recordId: priorEvent.resourceId, evidenceHash: priorEvent.evidenceHash, error: null };
      let fromStatus = "", toStatus = "";
      if (args.targetType === "provider") {
        const provider = await sudo.query.Provider.findOne({ where: { id: args.targetId }, query: "id status user { id } credentials { id status effectiveFrom expiresAt primarySourceVerified } authorizations { id status effectiveFrom effectiveTo }" });
        if (!provider) throw new Error("Provider not found");
        fromStatus = provider.status;
        if (args.action === "activate") {
          if (provider.user?.id === actor.actorId) throw new Error("A provider cannot independently activate their own profile");
          const now2 = /* @__PURE__ */ new Date();
          const credential = provider.credentials.some((item) => item.status === "verified" && item.primarySourceVerified === true && new Date(item.effectiveFrom) <= now2 && new Date(item.expiresAt) > now2);
          const authorization = provider.authorizations.some((item) => item.status === "active" && new Date(item.effectiveFrom) <= now2 && (!item.effectiveTo || new Date(item.effectiveTo) > now2));
          if (!credential || !authorization) throw new Error("Effective credential and service authorization are required");
          toStatus = "active";
        } else {
          toStatus = "inactive";
        }
        const providerStatus = toStatus === "active" ? "active" : "inactive";
        await sudo.query.Provider.updateOne({ where: { id: provider.id }, data: { status: providerStatus, isActive: providerStatus === "active", isPublic: providerStatus === "active" ? void 0 : false }, query: "id" });
      } else if (args.targetType === "credential") {
        const credential = await sudo.query.ProviderCredential.findOne({ where: { id: args.targetId }, query: "id status authorizations { id status }" });
        if (!credential) throw new Error("Credential not found");
        if (args.action === "activate") throw new Error("Credentials require fresh primary-source verification");
        fromStatus = credential.status;
        toStatus = args.action === "revoke" ? "revoked" : "suspended";
        const credentialStatus = args.action === "revoke" ? "revoked" : "suspended";
        await sudo.query.ProviderCredential.updateOne({ where: { id: credential.id }, data: { status: credentialStatus, primarySourceVerified: false }, query: "id" });
        for (const authorization of credential.authorizations || []) if (authorization.status === "active") await sudo.query.ProviderAuthorization.updateOne({ where: { id: authorization.id }, data: { status: "suspended" }, query: "id" });
      } else {
        const authorization = await sudo.query.ProviderAuthorization.findOne({ where: { id: args.targetId }, query: "id status" });
        if (!authorization) throw new Error("Authorization not found");
        if (args.action === "activate") throw new Error("Authorization activation requires a new effective-dated pack");
        fromStatus = authorization.status;
        toStatus = "suspended";
        const authorizationStatus = "suspended";
        await sudo.query.ProviderAuthorization.updateOne({ where: { id: authorization.id }, data: { status: authorizationStatus }, query: "id" });
      }
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString(), hash = evidenceHash({ ...args, fromStatus, toStatus, actorId: actor.actorId, occurredAt });
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action: "provider_authority.transitioned", resourceType: args.targetType, resourceId: args.targetId, correlationId: args.idempotencyKey, evidence: { fromStatus, toStatus, reason: args.reason.trim() }, evidenceHash: hash, occurredAt }, query: "id" });
      return { success: true, recordId: args.targetId, evidenceHash: hash, error: null };
    });
  } catch (error) {
    return failure(error);
  }
}
var resultType10 = import_core119.graphql.object()({ name: "AuthorityPackResult", fields: { success: import_core119.graphql.field({ type: import_core119.graphql.nonNull(import_core119.graphql.Boolean) }), recordId: import_core119.graphql.field({ type: import_core119.graphql.ID }), evidenceHash: import_core119.graphql.field({ type: import_core119.graphql.String }), error: import_core119.graphql.field({ type: import_core119.graphql.String }) } });
var wrap = (fn, args) => import_core119.graphql.field({ type: resultType10, args, resolve(_s, values, context) {
  return fn(context, values);
} });
var registerProviderCredential = wrap(registerProviderCredentialTransaction, { providerId: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.ID) }), locationId: import_core119.graphql.arg({ type: import_core119.graphql.ID }), licenseType: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), licenseNumber: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), jurisdiction: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), effectiveFrom: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), expiresAt: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), verificationSource: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), evidenceReference: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), scopeEvidence: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.JSON) }), supervisionRequired: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.Boolean) }), supervisorId: import_core119.graphql.arg({ type: import_core119.graphql.ID }), protocolVersion: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), idempotencyKey: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }) });
var configureProviderAuthorization = wrap(configureProviderAuthorizationTransaction, { providerId: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.ID) }), credentialId: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.ID) }), locationId: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.ID) }), serviceId: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.ID) }), requiredSupervisorId: import_core119.graphql.arg({ type: import_core119.graphql.ID }), supervisionRequired: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.Boolean) }), supervisionMode: import_core119.graphql.arg({ type: import_core119.graphql.String }), effectiveFrom: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), effectiveTo: import_core119.graphql.arg({ type: import_core119.graphql.String }), policyVersion: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), evidenceLabel: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), evidenceReference: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), authorityEvidence: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.JSON) }), idempotencyKey: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }) });
var transitionProviderAuthority = wrap(transitionProviderAuthorityTransaction, { targetType: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), targetId: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.ID) }), action: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), reason: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), idempotencyKey: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }) });
var publishConsentTemplate = wrap(publishConsentTemplateTransaction, { serviceId: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.ID) }), jurisdiction: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), language: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), version: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), content: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.JSON) }), effectiveFrom: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }), effectiveUntil: import_core119.graphql.arg({ type: import_core119.graphql.String }), supersedesId: import_core119.graphql.arg({ type: import_core119.graphql.ID }), idempotencyKey: import_core119.graphql.arg({ type: import_core119.graphql.nonNull(import_core119.graphql.String) }) });

// features/keystone/mutations/clinicalWorkflows.ts
var import_core120 = require("@keystone-6/core");
var denied8 = { success: false, recordId: null, evidenceHash: null };
var now = () => (/* @__PURE__ */ new Date()).toISOString();
function fail(error, fallback) {
  return { ...denied8, error: error instanceof Error ? error.message : fallback };
}
async function recordConsultationTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical, "Clinical authority is required");
  } catch (error) {
    return fail(error, "Clinical authority is required");
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !(/* @__PURE__ */ new Set(["completed", "needs_follow_up", "closed"])).has(args.status) || !(/* @__PURE__ */ new Set(["candidate", "deferred", "declined", "referred"])).has(args.candidacyDecision) || !args.summary.trim() || !args.protocolVersion.trim() || !args.contraindicationReview || typeof args.contraindicationReview !== "object") return { ...denied8, error: "Consultation evidence is invalid" };
  try {
    bounded(args.history);
    bounded(args.examination);
    bounded(args.goals);
    bounded(args.alternatives);
    bounded(args.contraindicationReview);
    const [_client, _provider, _location, _service, appointment] = await Promise.all([
      assertPracticeRecord(context, "Client", args.clientId),
      assertProviderActor(context, args.providerId, actor.actorId),
      assertPracticeRecord(context, "Location", args.locationId),
      assertPracticeRecord(context, "Service", args.serviceId),
      args.appointmentId ? assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id } location { id } lineItems { service { id } }") : Promise.resolve(null),
      args.supersedesId ? assertPracticeRecord(context, "Consultation", args.supersedesId) : Promise.resolve(null)
    ]);
    if (appointment && (appointment.client?.id !== args.clientId || appointment.location?.id !== args.locationId || !appointment.lineItems?.some((line) => line.service?.id === args.serviceId))) throw new Error("Consultation appointment does not match client, location, and service");
    return await serializableWorkflow(context, "medspa-consultation", [`client:${args.clientId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.Consultation.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      if (args.supersedesId) {
        const prior = await sudo.query.Consultation.findOne({ where: { id: args.supersedesId }, query: "id client { id } supersededBy { id }" });
        if (!prior || prior.client?.id !== args.clientId || prior.supersededBy?.id) throw new Error("Consultation supersession is invalid");
      }
      const signedAt = now();
      const evidence = { ...args, actorId: actor.actorId, practiceId: actor.practiceId, signedAt };
      const hash = evidenceHash(evidence);
      const record = await sudo.query.Consultation.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        location: { connect: { id: args.locationId } },
        client: { connect: { id: args.clientId } },
        appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : void 0,
        provider: { connect: { id: args.providerId } },
        service: { connect: { id: args.serviceId } },
        status: args.status,
        historySnapshot: bounded(args.history),
        examinationSnapshot: bounded(args.examination),
        goalsSnapshot: bounded(args.goals),
        alternativesSnapshot: bounded(args.alternatives),
        summary: args.summary.trim(),
        indication: args.indication.trim(),
        candidacyDecision: args.candidacyDecision,
        staffDecisionRecorded: true,
        reviewedAt: signedAt,
        signedAt,
        protocolVersion: args.protocolVersion.trim(),
        contraindicationProtocolVersion: args.protocolVersion.trim(),
        contraindicationReviewHash: evidenceHash(args.contraindicationReview),
        evidenceHash: hash,
        idempotencyKey: args.idempotencyKey,
        supersedes: args.supersedesId ? { connect: { id: args.supersedesId } } : void 0
      }, query: "id evidenceHash" });
      return { success: true, recordId: record.id, evidenceHash: record.evidenceHash, error: null };
    });
  } catch (error) {
    return fail(error, "Consultation recording failed");
  }
}
async function recordContraindicationFindingTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
  } catch (error) {
    return fail(error, "Clinical authority is required");
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !(/* @__PURE__ */ new Set(["information", "precaution", "clinician_review", "hard_stop"])).has(args.severity) || !args.ruleCode.trim() || !args.ruleVersion.trim()) return { ...denied8, error: "Contraindication evidence is invalid" };
  try {
    await Promise.all([assertPracticeRecord(context, "Consultation", args.consultationId), assertPracticeRecord(context, "Client", args.clientId), assertPracticeRecord(context, "Service", args.serviceId)]);
    return await serializableWorkflow(context, "medspa-contraindication", [`consultation:${args.consultationId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id sourceEvidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.sourceEvidenceHash, error: null };
      const sourceHash = evidenceHash(args.sourceEvidence);
      const record = await sudo.query.ContraindicationFinding.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        consultation: { connect: { id: args.consultationId } },
        client: { connect: { id: args.clientId } },
        service: { connect: { id: args.serviceId } },
        ruleCode: args.ruleCode.trim(),
        ruleVersion: args.ruleVersion.trim(),
        severity: args.severity,
        sourceEvidence: bounded(args.sourceEvidence),
        sourceEvidenceHash: sourceHash,
        detectedAt: now(),
        idempotencyKey: args.idempotencyKey
      }, query: "id sourceEvidenceHash" });
      return { success: true, recordId: record.id, evidenceHash: record.sourceEvidenceHash, error: null };
    });
  } catch (error) {
    return fail(error, "Contraindication recording failed");
  }
}
async function decideContraindicationTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
  } catch (error) {
    return fail(error, "Clinical authority is required");
  }
  const expiresAt = args.expiresAt ? new Date(args.expiresAt) : null;
  if (!validIdempotencyKey(args.idempotencyKey) || !(/* @__PURE__ */ new Set(["cleared_with_rationale", "deferred", "hard_stop", "referred", "reopened"])).has(args.disposition) || !args.rationale.trim() || expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= /* @__PURE__ */ new Date())) return { ...denied8, error: "Contraindication decision is invalid" };
  try {
    const [finding] = await Promise.all([assertPracticeRecord(context, "ContraindicationFinding", args.findingId, "id practice { id } service { id } client { id }"), assertProviderActor(context, args.providerId, actor.actorId)]);
    const evidence = { findingId: args.findingId, providerId: args.providerId, disposition: args.disposition, rationale: args.rationale.trim(), expiresAt: expiresAt?.toISOString() || null, actorId: actor.actorId, decidedAt: now() };
    const hash = evidenceHash(evidence);
    return await serializableWorkflow(context, "medspa-contraindication-decision", [`finding:${args.findingId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await sudo.query.ContraindicationDecision.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash finding { id }" }))[0];
      if (existing) {
        if (existing.finding?.id !== args.findingId) throw new Error("Idempotency key was already used");
        return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      }
      const record = await sudo.query.ContraindicationDecision.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        finding: { connect: { id: args.findingId } },
        decidedBy: { connect: { id: args.providerId } },
        disposition: args.disposition,
        rationale: args.rationale.trim(),
        authorityEvidence: { configuredClinicalDecision: true, serviceId: finding.service?.id },
        evidenceHash: hash,
        decidedAt: evidence.decidedAt,
        expiresAt: expiresAt?.toISOString(),
        idempotencyKey: args.idempotencyKey
      }, query: "id evidenceHash" });
      return { success: true, recordId: record.id, evidenceHash: record.evidenceHash, error: null };
    });
  } catch (error) {
    return fail(error, "Contraindication decision failed");
  }
}
async function createClinicalOrderTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
  } catch (error) {
    return fail(error, "Clinical authority is required");
  }
  const until = new Date(args.validUntil);
  if (!validIdempotencyKey(args.idempotencyKey) || !args.indication.trim() || !args.protocolVersion.trim() || Number.isNaN(until.getTime()) || until <= /* @__PURE__ */ new Date()) return { ...denied8, error: "Clinical order is invalid" };
  try {
    const [consultation, client, _location, service] = await Promise.all([
      assertPracticeRecord(context, "Consultation", args.consultationId, "id practice { id } status candidacyDecision contraindicationProtocolVersion contraindicationReviewHash client { id } appointment { id } service { id } supersededBy { id }"),
      assertPracticeRecord(context, "Client", args.clientId, "id practice { id } user { id }"),
      assertPracticeRecord(context, "Location", args.locationId),
      assertPracticeRecord(context, "Service", args.serviceId, "id practice { id } requiresIntakeReview requiresConsultation staffAuthorizationRequired requiresLotTraceability cleanupBufferMinutes clinicalProducts { id } category { id practice { id } }"),
      assertProviderActor(context, args.orderedById, actor.actorId),
      args.authorizedPerformerId ? assertPracticeRecord(context, "Provider", args.authorizedPerformerId) : Promise.resolve(null),
      args.supervisorId ? assertPracticeRecord(context, "Provider", args.supervisorId) : Promise.resolve(null),
      args.planId ? assertPracticeRecord(context, "TreatmentPlan", args.planId) : Promise.resolve(null),
      args.supersedesId ? assertPracticeRecord(context, "ClinicalOrder", args.supersedesId) : Promise.resolve(null)
    ]);
    const priorOrder = args.supersedesId ? await context.sudo().query.ClinicalOrder.findOne({ where: { id: args.supersedesId }, query: "id status client { id } service { id } supersededBy { id }" }) : null;
    if (priorOrder && (priorOrder.status !== "active" || priorOrder.client?.id !== args.clientId || priorOrder.service?.id !== args.serviceId || priorOrder.supersededBy?.id)) throw new Error("Clinical order supersession is invalid");
    if (consultation.status !== "completed" || consultation.supersededBy?.id || !consultation.contraindicationProtocolVersion || !consultation.contraindicationReviewHash || consultation.candidacyDecision !== "candidate" || consultation.client?.id !== args.clientId || consultation.service?.id !== args.serviceId) throw new Error("A completed candidate consultation is required");
    const requiredIntakeForms = await loadRequiredIntakeManifest(context.sudo(), actor.practiceId, service);
    if (service.requiresIntakeReview === true) {
      if (!consultation.appointment?.id || !client.user?.id || !service.category?.id) throw new Error("Appointment-specific reviewed intake evidence is unavailable");
      await assertCurrentIntakeEvidence(context.sudo(), { practiceId: actor.practiceId, clientUserId: client.user.id, appointmentId: consultation.appointment.id, categoryId: service.category.id, requiredForms: requiredIntakeForms });
    }
    const findings = await context.sudo().query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: actor.practiceId } }, consultation: { id: { equals: args.consultationId } }, severity: { in: ["hard_stop", "clinician_review"] } }, take: 101, query: "id severity decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt }" });
    if (findings.length > 100) throw new Error("Contraindication review exceeds the safe verification bound");
    if (findings.some((finding) => !finding.decisions?.[0] || ["hard_stop", "deferred", "referred", "reopened"].includes(finding.decisions[0].disposition) || finding.decisions[0].expiresAt && new Date(finding.decisions[0].expiresAt) <= /* @__PURE__ */ new Date())) throw new Error("Unresolved contraindication review blocks this order");
    const signedAt = /* @__PURE__ */ new Date();
    const serviceRequirements = {
      snapshotVersion: 1,
      serviceId: args.serviceId,
      categoryId: service.category?.id || null,
      requiredIntakeForms,
      requiresConsultation: service.requiresConsultation === true,
      requiresIntakeReview: service.requiresIntakeReview === true,
      staffAuthorizationRequired: service.staffAuthorizationRequired !== false,
      requiresLotTraceability: service.requiresLotTraceability === true,
      cleanupBufferMinutes: Math.max(0, Number(service.cleanupBufferMinutes) || 0),
      clinicalProductIds: (service.clinicalProducts || []).map((product) => product.id).sort(),
      capturedAt: signedAt.toISOString()
    };
    const scopedOrderKey = `${actor.practiceId}:clinical-order:${args.idempotencyKey}`;
    const orderRequestHash = evidenceHash({ ...args, actorId: actor.actorId, serviceRequirements });
    return await serializableWorkflow(context, "medspa-clinical-order", [`client:${args.clientId}`, `service:${args.serviceId}`, `idempotency:${scopedOrderKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.ClinicalOrder.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedOrderKey } }, take: 1, query: "id evidenceHash instructionSnapshot" }))[0];
      if (existing) {
        if (existing.instructionSnapshot?.requestHash !== orderRequestHash) throw new Error("Idempotency key was reused for a different clinical order request");
        return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      }
      const currentService = await sudo.query.Service.findOne({ where: { id: args.serviceId }, query: "id status practice { id } category { id practice { id } } requiresIntakeReview requiresConsultation staffAuthorizationRequired requiresLotTraceability cleanupBufferMinutes clinicalProducts { id }" });
      if (!currentService || currentService.practice?.id !== actor.practiceId || currentService.status !== "active") throw new Error("Clinical service is no longer active in this practice");
      const currentManifest = await loadRequiredIntakeManifest(sudo, actor.practiceId, currentService);
      const currentProductIds = (currentService.clinicalProducts || []).map((product) => product.id).sort();
      if ((currentService.category?.id || null) !== serviceRequirements.categoryId || JSON.stringify(currentManifest) !== JSON.stringify(requiredIntakeForms) || currentService.requiresIntakeReview !== serviceRequirements.requiresIntakeReview || currentService.requiresConsultation !== serviceRequirements.requiresConsultation || currentService.staffAuthorizationRequired !== serviceRequirements.staffAuthorizationRequired || currentService.requiresLotTraceability !== serviceRequirements.requiresLotTraceability || Math.max(0, Number(currentService.cleanupBufferMinutes) || 0) !== serviceRequirements.cleanupBufferMinutes || JSON.stringify(currentProductIds) !== JSON.stringify(serviceRequirements.clinicalProductIds)) throw new Error("Clinical service requirements changed while this order was being issued");
      if (serviceRequirements.requiresIntakeReview === true) {
        if (!consultation.appointment?.id || !client.user?.id || !serviceRequirements.categoryId) throw new Error("Appointment-specific reviewed intake evidence is unavailable");
        await assertCurrentIntakeEvidence(sudo, { practiceId: actor.practiceId, clientUserId: client.user.id, appointmentId: consultation.appointment.id, categoryId: serviceRequirements.categoryId, requiredForms: requiredIntakeForms });
      }
      const currentConsultation = await sudo.query.Consultation.findOne({ where: { id: args.consultationId }, query: "id status candidacyDecision contraindicationProtocolVersion contraindicationReviewHash client { id } appointment { id } service { id } supersededBy { id }" });
      if (!currentConsultation || currentConsultation.status !== "completed" || currentConsultation.candidacyDecision !== "candidate" || currentConsultation.supersededBy?.id || !currentConsultation.contraindicationProtocolVersion || !currentConsultation.contraindicationReviewHash || currentConsultation.client?.id !== args.clientId || currentConsultation.service?.id !== args.serviceId || currentConsultation.appointment?.id !== consultation.appointment?.id) throw new Error("Current matching candidate consultation is required");
      const currentFindings = await sudo.query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: actor.practiceId } }, consultation: { id: { equals: args.consultationId } }, severity: { in: ["hard_stop", "clinician_review"] } }, take: 101, query: "id decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt }" });
      if (currentFindings.length > 100 || currentFindings.some((finding) => !finding.decisions?.[0] || ["hard_stop", "deferred", "referred", "reopened"].includes(finding.decisions[0].disposition) || finding.decisions[0].expiresAt && new Date(finding.decisions[0].expiresAt) <= /* @__PURE__ */ new Date())) throw new Error("Current contraindication review blocks this order");
      const authority2 = await evaluateProviderAuthority(sudo, { providerId: args.orderedById, serviceId: args.serviceId, locationId: args.locationId, at: signedAt, stage: "order", supervisorId: args.supervisorId });
      const evidence = { ...args, actorId: actor.actorId, signedAt: signedAt.toISOString(), authorityHash: authority2.evidenceHash, serviceRequirements };
      const hash = evidenceHash(evidence);
      const record = await sudo.query.ClinicalOrder.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        location: { connect: { id: args.locationId } },
        client: { connect: { id: args.clientId } },
        consultation: { connect: { id: args.consultationId } },
        plan: args.planId ? { connect: { id: args.planId } } : void 0,
        service: { connect: { id: args.serviceId } },
        orderedBy: { connect: { id: args.orderedById } },
        authorizedPerformer: args.authorizedPerformerId ? { connect: { id: args.authorizedPerformerId } } : void 0,
        requiredSupervisor: args.supervisorId ? { connect: { id: args.supervisorId } } : void 0,
        status: "active",
        instructionSnapshot: { snapshotVersion: 1, instructions: bounded(args.instruction), serviceRequirements, requestHash: orderRequestHash },
        protocolVersion: args.protocolVersion.trim(),
        indication: args.indication.trim(),
        anatomicSite: args.anatomicSite || "",
        doseRange: args.doseRange || "",
        performerConstraints: args.performerConstraints || "",
        supervisionSnapshot: args.supervisorId ? `configured:${args.supervisorId}` : "none configured",
        signedAt: signedAt.toISOString(),
        validFrom: signedAt.toISOString(),
        validUntil: until.toISOString(),
        evidenceHash: hash,
        idempotencyKey: scopedOrderKey,
        supersedes: args.supersedesId ? { connect: { id: args.supersedesId } } : void 0
      }, query: "id evidenceHash" });
      if (priorOrder) {
        const actionHash = evidenceHash({ priorOrderId: priorOrder.id, replacementId: record.id, actorId: actor.actorId, signedAt: signedAt.toISOString() });
        await sudo.query.ClinicalOrderAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, order: { connect: { id: priorOrder.id } }, actor: { connect: { id: args.orderedById } }, action: "revoke", fromStatus: "active", toStatus: "revoked", reason: "Replacement clinical order signed", evidence: { replacementId: record.id }, evidenceHash: actionHash, occurredAt: signedAt.toISOString(), idempotencyKey: `${scopedOrderKey}:supersede` }, query: "id" });
        await sudo.query.ClinicalOrder.updateOne({ where: { id: priorOrder.id }, data: { status: "revoked" }, query: "id" });
      }
      await recordAuthorityDecision(tx, authority2, { clientId: args.clientId }, `${scopedOrderKey}:authority`);
      return { success: true, recordId: record.id, evidenceHash: record.evidenceHash, error: null };
    });
  } catch (error) {
    return fail(error, "Clinical order failed");
  }
}
async function signConsentTransaction(context, args) {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.signerName.trim() || !args.signatureEvidence.trim()) return { ...denied8, error: "Authenticated consent evidence is required" };
  try {
    const [client, appointment, template, _service, presenter, priorConsent] = await Promise.all([
      assertPracticeRecord(context, "Client", args.clientId, "id practice { id } user { id }"),
      assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id } provider { id } location { id }"),
      assertPracticeRecord(context, "ConsentTemplateVersion", args.templateVersionId, "id practice { id } service { id } contentHash effectiveFrom effectiveUntil"),
      assertPracticeRecord(context, "Service", args.serviceId),
      assertPracticeRecord(context, "Provider", args.presentedById, "id practice { id } user { id }"),
      args.supersedesId ? assertPracticeRecord(context, "ConsentRecord", args.supersedesId, "id practice { id } status client { id } service { id } supersededBy { id }") : Promise.resolve(null)
    ]);
    const clinicalActor = permissions.canManageClinical({ session: context.session });
    const owner = client.user?.id === context.session.itemId;
    if (!clinicalActor && !owner) throw new Error("Consent ownership could not be verified");
    if (clinicalActor && presenter.user?.id !== context.session.itemId) throw new Error("The presenting provider must match the authenticated clinical actor");
    if (owner && appointment.provider?.id !== presenter.id) throw new Error("Consent presenter does not match the assigned provider");
    if (appointment.client?.id !== client.id || template.service?.id !== args.serviceId) throw new Error("Consent does not match this appointment and service");
    if (priorConsent && (priorConsent.status !== "effective" || priorConsent.client?.id !== client.id || priorConsent.service?.id !== args.serviceId || priorConsent.supersededBy?.id)) throw new Error("Consent supersession is invalid");
    const signedAt = /* @__PURE__ */ new Date();
    if (!appointment.location?.id) throw new Error("Consent appointment location is unavailable");
    const consentAuthority = await evaluateProviderAuthority(context.sudo(), { providerId: presenter.id, serviceId: args.serviceId, locationId: appointment.location.id, at: signedAt, stage: "consent" });
    if (new Date(template.effectiveFrom) > signedAt || template.effectiveUntil && new Date(template.effectiveUntil) <= signedAt) throw new Error("Consent template is not effective");
    if (args.signerRole !== "self" && !args.representativeAuthority?.trim()) throw new Error("Representative authority evidence is required");
    const evidence = { templateHash: template.contentHash, clientId: client.id, appointmentId: appointment.id, serviceId: args.serviceId, signerName: args.signerName.trim(), signerRole: args.signerRole, representativeAuthority: args.representativeAuthority || null, discussionEvidence: bounded(args.discussionEvidence), signatureEvidenceHash: evidenceHash(args.signatureEvidence), presentedById: args.presentedById, signedAt: signedAt.toISOString() };
    const hash = evidenceHash(evidence);
    return await serializableWorkflow(context, "medspa-consent", [`client:${client.id}`, `service:${args.serviceId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.ConsentRecord.findMany({ where: { practice: { id: { equals: client.practice.id } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      const record = await sudo.query.ConsentRecord.createOne({ data: {
        practice: { connect: { id: client.practice.id } },
        client: { connect: { id: client.id } },
        appointment: { connect: { id: appointment.id } },
        service: { connect: { id: args.serviceId } },
        templateVersion: { connect: { id: template.id } },
        presentedBy: { connect: { id: args.presentedById } },
        status: "effective",
        signerName: args.signerName.trim(),
        signerRole: args.signerRole,
        representativeAuthority: args.representativeAuthority || "",
        interpreter: args.interpreter || "",
        witness: args.witness || "",
        discussionEvidence: bounded(args.discussionEvidence),
        signatureEvidenceHash: evidence.signatureEvidenceHash,
        evidenceHash: hash,
        signedAt: signedAt.toISOString(),
        effectiveUntil: args.effectiveUntil || void 0,
        supersedes: args.supersedesId ? { connect: { id: args.supersedesId } } : void 0,
        idempotencyKey: args.idempotencyKey
      }, query: "id evidenceHash" });
      await recordAuthorityDecision(tx, consentAuthority, { clientId: client.id, appointmentId: appointment.id }, `${args.idempotencyKey}:authority`);
      if (priorConsent) {
        const actionHash = evidenceHash({ priorConsentId: priorConsent.id, replacementId: record.id, actorId: context.session.itemId, signedAt: signedAt.toISOString() });
        await sudo.query.ConsentAction.createOne({ data: { practice: { connect: { id: client.practice.id } }, consent: { connect: { id: priorConsent.id } }, actor: { connect: { id: context.session.itemId } }, action: "supersede", fromStatus: "effective", toStatus: "superseded", reason: "Replacement consent signed", evidence: { replacementId: record.id }, evidenceHash: actionHash, occurredAt: signedAt.toISOString(), idempotencyKey: `${args.idempotencyKey}:supersede` }, query: "id" });
        await sudo.query.ConsentRecord.updateOne({ where: { id: priorConsent.id }, data: { status: "superseded" }, query: "id" });
      }
      return { success: true, recordId: record.id, evidenceHash: record.evidenceHash, error: null };
    });
  } catch (error) {
    return fail(error, "Consent signing failed");
  }
}
async function recordTreatmentAdministrationTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
  } catch (error) {
    return fail(error, "Clinical authority is required");
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !(/* @__PURE__ */ new Set(["completed", "aborted"])).has(args.status) || !args.immediateOutcome.trim() || !Array.isArray(args.lots) || args.lots.length > 25 || !args.protocolVersion.trim()) return { ...denied8, error: "Administration evidence is invalid" };
  try {
    const started = new Date(args.startedAt);
    const completed = new Date(args.completedAt);
    if (Number.isNaN(started.getTime()) || Number.isNaN(completed.getTime()) || completed < started || completed.getTime() > Date.now()) throw new Error("Administration times are invalid");
    const lotInputs = args.lots.map((item, index) => ({ lotId: String(item?.lotId || ""), quantity: Number(item?.quantity), unit: String(item?.unit || ""), anatomicSite: String(item?.anatomicSite || ""), concentration: String(item?.concentration || ""), doseSnapshot: item?.doseSnapshot || {}, wasteQuantity: Number(item?.wasteQuantity || 0), wasteReason: String(item?.wasteReason || ""), index }));
    if (lotInputs.some((item) => !item.lotId || !Number.isInteger(item.quantity) || item.quantity <= 0 || !item.unit || !item.anatomicSite || !Number.isInteger(item.wasteQuantity) || item.wasteQuantity < 0)) throw new Error("Lot administration input is invalid");
    if (new Set(lotInputs.map((item) => item.lotId)).size !== lotInputs.length) throw new Error("Each lot must be entered once per administration until split-site lot allocation is supported");
    return await serializableWorkflow(context, "medspa-administration", [`session:${args.treatmentSessionId}`, ...lotInputs.map((item) => `lot:${item.lotId}`), `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.TreatmentAdministration.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } },
        take: 1,
        query: "id evidenceHash treatmentSession { id }"
      }))[0];
      if (existing) {
        const priorAuthority = (await sudo.query.ClinicalAuthorityEvent.findMany({
          where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: `${args.idempotencyKey}:authority` } },
          take: 1,
          query: "id evidenceHash treatmentSession { id }"
        }))[0];
        const retryHash = priorAuthority?.treatmentSession?.id === args.treatmentSessionId ? evidenceHash({ ...args, actorId: actor.actorId, authorityHash: priorAuthority.evidenceHash, lots: lotInputs }) : null;
        if (existing.treatmentSession?.id !== args.treatmentSessionId || retryHash !== existing.evidenceHash) throw new Error("Administration idempotency key was already used with different evidence");
        return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      }
      const session = await sudo.query.TreatmentSession.findOne({ where: { id: args.treatmentSessionId }, query: `
        id status durationMinutes practice { id } location { id } plan { id status }
        client { id user { id } } provider { id } supervisor { id } service { id requiresIntakeReview requiresLotTraceability }
        appointment { id startTime endTime metadata practice { id } location { id } resourceReservations(where: { status: { equals: reserved } }) { status startsAt endsAt practice { id } location { id } appointment { id } segmentKey purpose assignmentEvidence resource { id } } supervisorReservations(where: { status: { equals: reserved } }) { status startsAt endsAt practice { id } location { id } appointment { id } service { id } supervisor { id } } }
        room { id isActive } device { id readinessStatus maintenanceDueAt calibrationDueAt }
        order { id practice { id } status validFrom validUntil protocolVersion client { id } authorizedPerformer { id } requiredSupervisor { id }
          service { id }
          consultation { id status candidacyDecision supersededBy { id } client { id } service { id } }
          instructionSnapshot
        }
        consent { id practice { id } status signedAt effectiveUntil client { id } appointment { id } service { id } }
      ` });
      if (!session?.order || !session.consent || session.order.id !== args.orderId || session.consent.id !== args.consentId || session.provider?.id !== args.performerId || (session.supervisor?.id || null) !== (args.supervisorId || null) || session.room?.id !== args.roomId || (session.device?.id || null) !== (args.deviceId || null) || session.order.service?.id !== session.service?.id || (session.order.requiredSupervisor?.id || null) !== (args.supervisorId || null) || session.order.authorizedPerformer?.id && session.order.authorizedPerformer.id !== args.performerId) {
        throw new Error("Administration does not match the current prepared treatment session");
      }
      const order = session.order;
      const consent = session.consent;
      await assertProviderActor(tx, args.performerId, actor.actorId);
      await Promise.all([
        assertPracticeRecord(tx, "Resource", args.roomId),
        args.deviceId ? assertPracticeRecord(tx, "Resource", args.deviceId) : Promise.resolve(null),
        args.supervisorId ? assertPracticeRecord(tx, "Provider", args.supervisorId) : Promise.resolve(null),
        ...lotInputs.map((item) => assertPracticeRecord(tx, "InventoryLot", item.lotId))
      ]);
      if (!session.appointment?.location?.id || session.practice?.id !== actor.practiceId || session.appointment.practice?.id !== actor.practiceId || session.location?.id !== session.appointment.location.id) throw new Error("Treatment location is unavailable");
      await assertCurrentClinicalExecutionReadiness(sudo, session, session.order, session.consent, started, completed);
      const reservationScope = { practiceId: session.practice.id, locationId: session.appointment.location.id, appointmentId: session.appointment.id, serviceId: session.service.id, providerId: args.performerId, supervisorId: args.supervisorId || null };
      if (!reservationCovers(session.appointment.resourceReservations || [], { ...reservationScope, resourceId: args.roomId, purpose: "room" }, started, completed) || args.deviceId && !reservationCovers(session.appointment.resourceReservations || [], { ...reservationScope, resourceId: args.deviceId, purpose: "device" }, started, completed)) {
        throw new Error("Treatment resources are not reserved for the full administration interval");
      }
      if (args.supervisorId && !supervisorReservationCovers(session.appointment.supervisorReservations || [], { ...reservationScope, supervisorId: args.supervisorId }, started, completed)) {
        throw new Error("Required supervisor capacity is not reserved for the full administration interval");
      }
      if (session.room.isActive !== true) throw new Error("Treatment room is not active");
      const device = args.deviceId ? await sudo.query.Resource.findOne({ where: { id: args.deviceId }, query: "id practice { id } isActive readinessStatus maintenanceDueAt calibrationDueAt" }) : null;
      if (args.deviceId && (!device || device.practice?.id !== actor.practiceId || device.isActive !== true || device.readinessStatus !== "available" || device.maintenanceDueAt && new Date(device.maintenanceDueAt) <= started || device.calibrationDueAt && new Date(device.calibrationDueAt) <= started)) {
        throw new Error("Device is not released and ready for treatment");
      }
      await assertResourceIntervalReady(sudo, args.roomId, started, completed);
      if (args.deviceId) await assertResourceIntervalReady(sudo, args.deviceId, started, completed);
      if (order.instructionSnapshot?.serviceRequirements?.requiresLotTraceability === true && lotInputs.length === 0) throw new Error("This service requires patient-level lot traceability");
      const authority2 = await evaluateProviderAuthority(sudo, { providerId: args.performerId, serviceId: session.order.service.id, locationId: session.appointment.location.id, at: started, stage: "administration", supervisorId: args.supervisorId });
      const completionAuthority = await evaluateProviderAuthority(sudo, { providerId: args.performerId, serviceId: session.order.service.id, locationId: session.appointment.location.id, at: completed, stage: "completion", supervisorId: args.supervisorId });
      const lots = await sudo.query.InventoryLot.findMany({ where: { id: { in: lotInputs.map((item) => item.lotId) }, practice: { id: { equals: actor.practiceId } } }, take: 25, query: "id lotNumber remainingQuantity expiresAt status location { id } product { id }" });
      for (const item of lotInputs) {
        const lot = lots.find((candidate) => candidate.id === item.lotId);
        if (!lot || lot.location?.id !== session.appointment.location.id || !order.instructionSnapshot?.serviceRequirements?.clinicalProductIds?.includes(lot.product?.id) || lot.status !== "available" || !lot.expiresAt || new Date(lot.expiresAt) <= started || lot.remainingQuantity < item.quantity + item.wasteQuantity) throw new Error("A selected lot is expired, quarantined, recalled, unavailable, or insufficient");
      }
      const evidence = { ...args, actorId: actor.actorId, authorityHash: authority2.evidenceHash, lots: lotInputs };
      const hash = evidenceHash(evidence);
      const administration = await sudo.query.TreatmentAdministration.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        location: { connect: { id: session.appointment.location.id } },
        client: { connect: { id: session.client.id } },
        appointment: { connect: { id: session.appointment.id } },
        treatmentSession: { connect: { id: session.id } },
        order: { connect: { id: order.id } },
        consent: { connect: { id: consent.id } },
        performer: { connect: { id: args.performerId } },
        supervisor: args.supervisorId ? { connect: { id: args.supervisorId } } : void 0,
        service: { connect: { id: order.service.id } },
        room: { connect: { id: args.roomId } },
        device: args.deviceId ? { connect: { id: args.deviceId } } : void 0,
        status: args.status,
        protocolVersion: args.protocolVersion,
        timeOutEvidence: bounded(args.timeOutEvidence),
        anatomicMap: bounded(args.anatomicMap),
        deviceSettings: bounded(args.deviceSettings || {}),
        technique: args.technique || "",
        immediateOutcome: args.immediateOutcome.trim(),
        aftercareSnapshot: bounded(args.aftercare),
        startedAt: started.toISOString(),
        completedAt: completed.toISOString(),
        signedAt: now(),
        evidenceHash: hash,
        idempotencyKey: args.idempotencyKey
      }, query: "id evidenceHash" });
      for (const item of lotInputs) {
        const lot = lots.find((candidate) => candidate.id === item.lotId);
        const consumed = item.quantity + item.wasteQuantity;
        const after = lot.remainingQuantity - consumed;
        await sudo.query.AdministrationLot.createOne({ data: { practice: { connect: { id: actor.practiceId } }, administration: { connect: { id: administration.id } }, lot: { connect: { id: lot.id } }, product: { connect: { id: lot.product.id } }, quantity: String(item.quantity), unit: item.unit, doseSnapshot: item.doseSnapshot, anatomicSite: item.anatomicSite, lotNumberSnapshot: lot.lotNumber, expirationSnapshot: lot.expiresAt, concentration: item.concentration, wasteQuantity: String(item.wasteQuantity), wasteReason: item.wasteReason, evidenceHash: evidenceHash({ administrationId: administration.id, ...item, lotNumber: lot.lotNumber, expiresAt: lot.expiresAt }) }, query: "id" });
        await sudo.query.InventoryLot.updateOne({ where: { id: lot.id }, data: { remainingQuantity: after, status: after === 0 ? "depleted" : "available" }, query: "id" });
        await sudo.query.StockMovement.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: session.appointment.location.id } }, lot: { connect: { id: lot.id } }, product: { connect: { id: lot.product.id } }, type: "consume", delta: -consumed, balanceBefore: lot.remainingQuantity, balanceAfter: after, idempotencyKey: `${actor.practiceId}:${args.idempotencyKey}:lot:${lot.id}`, reason: `Patient administration ${administration.id}`, actor: { connect: { id: actor.actorId } }, treatmentSession: { connect: { id: session.id } }, metadata: { administrationId: administration.id, administeredQuantity: item.quantity, wasteQuantity: item.wasteQuantity } }, query: "id" });
        const inventoryMovement = await recordInventoryMovement(tx, { practiceId: actor.practiceId, productId: lot.product.id, locationId: session.appointment.location.id, type: "adjustment", delta: -consumed, reason: `Patient administration ${administration.id}`, idempotencyKey: `${actor.practiceId}:administration:${args.idempotencyKey}:lot:${lot.id}`, metadata: { treatmentSessionId: session.id, administrationId: administration.id, lotId: lot.id, quantity: item.quantity, waste: item.wasteQuantity } });
        if (!inventoryMovement.success) throw new Error(inventoryMovement.error || "Clinical stock movement failed");
      }
      await sudo.query.TreatmentSession.updateOne({ where: { id: session.id }, data: { status: args.status === "completed" ? "completed" : "stopped", staffAuthorizationConfirmed: true, protocolVersion: args.protocolVersion, timeOutEvidence: bounded(args.timeOutEvidence), signedAt: now(), completedAt: completed.toISOString(), evidenceHash: hash }, query: "id" });
      await recordAuthorityDecision(tx, authority2, { clientId: session.client.id, appointmentId: session.appointment.id, treatmentSessionId: session.id }, `${args.idempotencyKey}:authority`);
      await recordAuthorityDecision(tx, completionAuthority, { clientId: session.client.id, appointmentId: session.appointment.id, treatmentSessionId: session.id }, `${args.idempotencyKey}:completion-authority`);
      return { success: true, recordId: administration.id, evidenceHash: administration.evidenceHash, error: null };
    });
  } catch (error) {
    return fail(error, "Treatment administration failed");
  }
}
async function prepareTreatmentSessionTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
  } catch (error) {
    return fail(error, "Clinical authority is required");
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !Number.isInteger(args.durationMinutes) || args.durationMinutes < 1) return { ...denied8, error: "Treatment-session input is invalid" };
  try {
    const [plan, appointment, order, consent, service] = await Promise.all([assertPracticeRecord(context, "TreatmentPlan", args.planId, "id practice { id } status client { id } items { service { id } status }"), assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id } location { id }"), assertPracticeRecord(context, "ClinicalOrder", args.orderId, "id practice { id } status client { id } service { id } plan { id }"), assertPracticeRecord(context, "ConsentRecord", args.consentId, "id practice { id } client { id } service { id } appointment { id }"), assertPracticeRecord(context, "Service", args.serviceId, "id practice { id } name"), assertProviderActor(context, args.providerId, actor.actorId), assertPracticeRecord(context, "Resource", args.roomId), args.deviceId ? assertPracticeRecord(context, "Resource", args.deviceId) : Promise.resolve(null), args.supervisorId ? assertPracticeRecord(context, "Provider", args.supervisorId) : Promise.resolve(null)]);
    if (plan.status !== "active" || !plan.items?.some((item) => item.service?.id === service.id && item.status === "planned") || order.plan?.id !== plan.id || order.status !== "active" || plan.client?.id !== appointment.client?.id || order.client?.id !== appointment.client?.id || consent.client?.id !== appointment.client?.id || order.service?.id !== service.id || consent.service?.id !== service.id || consent.appointment?.id !== appointment.id) throw new Error("Treatment-session evidence relationships do not match");
    const hash = evidenceHash({ ...args, actorId: actor.actorId, preparedAt: now() });
    return await serializableWorkflow(context, "medspa-treatment-session-prepare", [`appointment:${args.appointmentId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await sudo.query.TreatmentSession.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      await assertApprovedPlanClinicalAppointment(tx, args.planId, args.appointmentId, args.serviceId, args.providerId);
      const session = await sudo.query.TreatmentSession.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: appointment.location.id } }, plan: { connect: { id: plan.id } }, appointment: { connect: { id: appointment.id } }, client: { connect: { id: appointment.client.id } }, provider: { connect: { id: args.providerId } }, supervisor: args.supervisorId ? { connect: { id: args.supervisorId } } : void 0, service: { connect: { id: service.id } }, order: { connect: { id: order.id } }, consent: { connect: { id: consent.id } }, room: { connect: { id: args.roomId } }, device: args.deviceId ? { connect: { id: args.deviceId } } : void 0, serviceTitle: service.name, durationMinutes: args.durationMinutes, status: "planned", staffAuthorizationConfirmed: false, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id evidenceHash" });
      return { success: true, recordId: session.id, evidenceHash: session.evidenceHash, error: null };
    });
  } catch (error) {
    return fail(error, "Treatment-session preparation failed");
  }
}
async function startTreatmentSessionTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
    const scoped2 = await assertPracticeRecord(context, "TreatmentSession", args.treatmentSessionId, "id practice { id } provider { id }");
    await assertProviderActor(context, scoped2.provider.id, actor.actorId);
  } catch (error) {
    return fail(error, "Clinical authority is required");
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.protocolVersion.trim()) return { ...denied8, error: "Treatment-start evidence is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-treatment-start", [`session:${args.treatmentSessionId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const header = await assertPracticeRecord(tx, "TreatmentSession", args.treatmentSessionId, "id practice { id } location { id } provider { id } client { id } plan { id } room { id } device { id } supervisor { id }");
      await assertProviderActor(tx, header.provider?.id || "", actor.actorId);
      await assertPlanStaffMembership(tx.sudo(), actor.practiceId, actor.actorId, header.location?.id || "");
      const patient = await assertPracticeRecord(tx, "Client", header.client?.id || "", "id practice { id } user { id status practice { id } }");
      if (patient.user?.status !== "active" || patient.user?.practice?.id !== actor.practiceId) throw new Error("Current patient practice authority is unavailable");
      const sudo = tx.sudo();
      const requestHash = evidenceHash({ ...args, actorId: actor.actorId, practiceId: actor.practiceId, locationId: header.location.id, providerId: header.provider.id, clientId: header.client.id, planId: header.plan?.id });
      const receipts = await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, action: { equals: "treatment_session.started.v1" }, correlationId: { equals: args.idempotencyKey } }, take: 2, query: "id resourceId actor { id } evidence evidenceHash" });
      if (receipts.length) {
        const evidence2 = receipts[0].evidence;
        if (receipts.length !== 1 || !evidence2 || evidenceHash(evidence2) !== receipts[0].evidenceHash || evidence2.requestHash !== requestHash || receipts[0].resourceId !== args.treatmentSessionId || receipts[0].actor?.id !== actor.actorId || typeof evidence2.resultHash !== "string") throw new Error("Start key was already used with different or unattributable evidence");
        return { success: true, recordId: args.treatmentSessionId, evidenceHash: evidence2.resultHash, error: null };
      }
      const legacy = await sudo.query.ClinicalAuthorityEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: `${args.idempotencyKey}:authority` } }, take: 1, query: "id" });
      if (legacy.length) throw new Error("Legacy start evidence has no original-command receipt; retain it for read-only review");
      const resourceIds = [header.room?.id, header.device?.id].filter((id) => typeof id === "string" && Boolean(id));
      const resources = await Promise.all(resourceIds.map((id) => assertPracticeRecord(tx, "Resource", id, "id type practice { id } location { id }")));
      if (!header.room?.id || resources.some((resource) => resource.location?.id !== header.location.id)) throw new Error("Current treatment resource location scope is unavailable");
      await lockBookingCapacity(tx, header.provider.id, [{ requiredResources: resources }], header.supervisor?.id ? [header.supervisor.id] : []);
      const session = await sudo.query.TreatmentSession.findOne({ where: { id: args.treatmentSessionId }, query: `
      id status durationMinutes practice { id } location { id } plan { id status practice { id } client { id } } client { id user { id } }
      appointment { id startTime endTime metadata practice { id } location { id } resourceReservations(where: { status: { equals: reserved } }) { status startsAt endsAt practice { id } location { id } appointment { id } segmentKey purpose assignmentEvidence resource { id } } supervisorReservations(where: { status: { equals: reserved } }) { status startsAt endsAt practice { id } location { id } appointment { id } service { id } supervisor { id } } }
      provider { id } supervisor { id } service { id requiresIntakeReview requiresLotTraceability }
      order { id status evidenceHash practice { id } location { id } plan { id } validFrom validUntil protocolVersion instructionSnapshot client { id } service { id } supersededBy { id } authorizedPerformer { id } requiredSupervisor { id }
        consultation { id status candidacyDecision staffDecisionRecorded signedAt evidenceHash contraindicationProtocolVersion contraindicationReviewHash practice { id } location { id } supersededBy { id } client { id } service { id } }
      }
      consent { id status evidenceHash practice { id } signedAt effectiveUntil client { id } appointment { id } service { id } supersededBy { id } }
      room { id type isActive practice { id } location { id } } device { id type isActive practice { id } location { id } readinessStatus maintenanceDueAt calibrationDueAt }
    ` });
      if (!session || !["planned", "ready"].includes(session.status) || !session.order || !session.consent || !session.appointment?.location?.id || session.practice?.id !== actor.practiceId || session.appointment.practice?.id !== actor.practiceId || session.location?.id !== session.appointment.location.id || !session.room?.id || session.room.isActive !== true) throw new Error("Treatment session is not startable");
      if (session.provider?.id !== header.provider.id || session.client?.id !== header.client.id || session.plan?.id !== header.plan?.id || session.room?.id !== header.room?.id || (session.device?.id || null) !== (header.device?.id || null) || (session.supervisor?.id || null) !== (header.supervisor?.id || null) || session.room?.type !== "room" || session.room.practice?.id !== actor.practiceId || session.room.location?.id !== header.location.id || session.device && (!["device", "equipment"].includes(session.device.type) || session.device.practice?.id !== actor.practiceId || session.device.location?.id !== header.location.id)) throw new Error("Prepared treatment scope or assignments changed");
      const startedAt = /* @__PURE__ */ new Date();
      const expectedEnd = new Date(startedAt.getTime() + Number(session.durationMinutes) * 6e4);
      await assertCurrentClinicalStartReadiness(sudo, session, session.order, session.consent, startedAt, expectedEnd);
      const reservationScope = { practiceId: session.practice.id, locationId: session.appointment.location.id, appointmentId: session.appointment.id, serviceId: session.service.id, providerId: session.provider.id, supervisorId: session.supervisor?.id || null };
      if (!reservationCovers(session.appointment.resourceReservations || [], { ...reservationScope, resourceId: session.room.id, purpose: "room" }, startedAt, expectedEnd) || session.device?.id && !reservationCovers(session.appointment.resourceReservations || [], { ...reservationScope, resourceId: session.device.id, purpose: "device" }, startedAt, expectedEnd)) throw new Error("Prepared treatment resources are not reserved for the full session interval");
      if (session.supervisor?.id && !supervisorReservationCovers(session.appointment.supervisorReservations || [], { ...reservationScope, supervisorId: session.supervisor.id }, startedAt, expectedEnd)) throw new Error("Required supervisor capacity is not reserved for the full session interval");
      if (session.order.protocolVersion !== args.protocolVersion) throw new Error("Effective treatment protocol is required");
      await assertProviderActor(tx, session.provider.id, actor.actorId);
      await Promise.all([assertPracticeRecord(tx, "Resource", session.room.id), session.device?.id ? assertPracticeRecord(tx, "Resource", session.device.id) : Promise.resolve(null)]);
      if (session.device && (session.device.isActive !== true || session.device.readinessStatus !== "available" || session.device.maintenanceDueAt && (!Number.isFinite(Date.parse(session.device.maintenanceDueAt)) || new Date(session.device.maintenanceDueAt) <= expectedEnd) || session.device.calibrationDueAt && (!Number.isFinite(Date.parse(session.device.calibrationDueAt)) || new Date(session.device.calibrationDueAt) <= expectedEnd))) throw new Error("Device is not ready");
      await assertResourceIntervalReady(sudo, session.room.id, startedAt, expectedEnd);
      if (session.device?.id) await assertResourceIntervalReady(sudo, session.device.id, startedAt, expectedEnd);
      const authorityDecision = await evaluateProviderAuthority(sudo, { providerId: session.provider.id, serviceId: session.service.id, locationId: session.appointment.location.id, at: startedAt, stage: "treatment_start", supervisorId: session.supervisor?.id });
      const endAuthority = await evaluateProviderAuthority(sudo, { providerId: session.provider.id, serviceId: session.service.id, locationId: session.appointment.location.id, at: expectedEnd, stage: "treatment_start", supervisorId: session.supervisor?.id });
      const endAuthorityHash = endAuthority.evidenceHash;
      if (evidenceHash({ ...authorityDecision, decidedAt: null, evidenceHash: null }) !== evidenceHash({ ...endAuthority, decidedAt: null, evidenceHash: null })) throw new Error("Provider authority changes within the prepared treatment interval");
      const hash = evidenceHash({ sessionId: session.id, protocolVersion: args.protocolVersion, timeOutEvidence: bounded(args.timeOutEvidence), authorityHash: authorityDecision.evidenceHash, endAuthorityHash, actorId: actor.actorId, startedAt: startedAt.toISOString() });
      await sudo.query.TreatmentSession.updateOne({ where: { id: session.id }, data: { status: "in_progress", protocolVersion: args.protocolVersion, timeOutEvidence: bounded(args.timeOutEvidence), startedAt: startedAt.toISOString(), evidenceHash: hash, staffAuthorizationConfirmed: true }, query: "id" });
      await recordAuthorityDecision(tx, authorityDecision, { clientId: session.client.id, appointmentId: session.appointment.id, treatmentSessionId: session.id }, `${args.idempotencyKey}:authority`);
      const evidence = { version: 1, requestHash, resultHash: hash, actorId: actor.actorId, practiceId: actor.practiceId, locationId: session.location.id, treatmentSessionId: session.id, orderId: session.order.id, consentId: session.consent.id, planId: session.plan.id, startedAt: startedAt.toISOString() };
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: session.location.id } }, actor: { connect: { id: actor.actorId } }, action: "treatment_session.started.v1", resourceType: "TreatmentSession", resourceId: session.id, correlationId: args.idempotencyKey, evidence: bounded(evidence), evidenceHash: evidenceHash(evidence), occurredAt: startedAt.toISOString() }, query: "id" });
      return { success: true, recordId: session.id, evidenceHash: hash, error: null };
    });
  } catch (error) {
    return fail(error, "Treatment start failed");
  }
}
var resultType11 = import_core120.graphql.object()({ name: "ClinicalWorkflowResult", fields: { success: import_core120.graphql.field({ type: import_core120.graphql.nonNull(import_core120.graphql.Boolean) }), recordId: import_core120.graphql.field({ type: import_core120.graphql.ID }), evidenceHash: import_core120.graphql.field({ type: import_core120.graphql.String }), error: import_core120.graphql.field({ type: import_core120.graphql.String }) } });
var field = (resolve2, args) => import_core120.graphql.field({ type: resultType11, args, resolve(_source, values, context) {
  return resolve2(context, values);
} });
var recordConsultation = field(recordConsultationTransaction, { clientId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), appointmentId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), providerId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), locationId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), serviceId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), status: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), history: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), examination: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), goals: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), alternatives: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), contraindicationReview: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), summary: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), indication: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), candidacyDecision: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), protocolVersion: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), supersedesId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), idempotencyKey: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }) });
var recordContraindicationFinding = field(recordContraindicationFindingTransaction, { consultationId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), clientId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), serviceId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), ruleCode: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), ruleVersion: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), severity: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), sourceEvidence: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), idempotencyKey: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }) });
var decideContraindication = field(decideContraindicationTransaction, { findingId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), providerId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), disposition: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), rationale: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), expiresAt: import_core120.graphql.arg({ type: import_core120.graphql.String }), idempotencyKey: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }) });
var issueClinicalOrder = field(createClinicalOrderTransaction, { consultationId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), planId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), clientId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), locationId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), serviceId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), orderedById: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), authorizedPerformerId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), supervisorId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), indication: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), protocolVersion: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), instruction: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), anatomicSite: import_core120.graphql.arg({ type: import_core120.graphql.String }), doseRange: import_core120.graphql.arg({ type: import_core120.graphql.String }), performerConstraints: import_core120.graphql.arg({ type: import_core120.graphql.String }), validUntil: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), supersedesId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), idempotencyKey: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }) });
var signTreatmentConsent = field(signConsentTransaction, { clientId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), appointmentId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), serviceId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), templateVersionId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), presentedById: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), signerName: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), signerRole: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), representativeAuthority: import_core120.graphql.arg({ type: import_core120.graphql.String }), interpreter: import_core120.graphql.arg({ type: import_core120.graphql.String }), witness: import_core120.graphql.arg({ type: import_core120.graphql.String }), discussionEvidence: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), signatureEvidence: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), effectiveUntil: import_core120.graphql.arg({ type: import_core120.graphql.String }), supersedesId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), idempotencyKey: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }) });
var approveTreatmentPlan = field(approveTreatmentPlanTransaction, { expectedConsultationHash: import_core120.graphql.arg({ type: import_core120.graphql.String }), clientId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), consultationId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), providerId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), title: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), goals: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), startsAt: import_core120.graphql.arg({ type: import_core120.graphql.String }), endsAt: import_core120.graphql.arg({ type: import_core120.graphql.String }), items: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), supersedesId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), idempotencyKey: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }) });
var prepareTreatmentSession = field(prepareTreatmentSessionTransaction, { planId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), appointmentId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), orderId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), consentId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), providerId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), supervisorId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), serviceId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), roomId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), deviceId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), durationMinutes: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.Int) }), idempotencyKey: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }) });
var startTreatmentSession = field(startTreatmentSessionTransaction, { treatmentSessionId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), protocolVersion: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), timeOutEvidence: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), idempotencyKey: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }) });
var recordTreatmentAdministration = field(recordTreatmentAdministrationTransaction, { treatmentSessionId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), orderId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), consentId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), performerId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), supervisorId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), roomId: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.ID) }), deviceId: import_core120.graphql.arg({ type: import_core120.graphql.ID }), protocolVersion: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), timeOutEvidence: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), anatomicMap: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), deviceSettings: import_core120.graphql.arg({ type: import_core120.graphql.JSON }), technique: import_core120.graphql.arg({ type: import_core120.graphql.String }), immediateOutcome: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), aftercare: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), startedAt: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), completedAt: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), lots: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.JSON) }), status: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }), idempotencyKey: import_core120.graphql.arg({ type: import_core120.graphql.nonNull(import_core120.graphql.String) }) });

// features/keystone/mutations/clinicalRecordActions.ts
var import_core121 = require("@keystone-6/core");
var denied9 = { success: false, recordId: null, evidenceHash: null };
var fail2 = (error) => ({ ...denied9, error: error instanceof Error ? error.message : "Clinical record action failed" });
async function transitionClinicalOrderTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
    await Promise.all([assertPracticeRecord(context, "ClinicalOrder", args.orderId), assertProviderActor(context, args.providerId, actor.actorId)]);
  } catch (error) {
    return fail2(error);
  }
  const next = { hold: "held", release: "active", partially_fulfill: "partially_fulfilled", fulfill: "fulfilled", revoke: "revoked", expire: "expired", enter_in_error: "entered_in_error" };
  if (!next[args.action] || !validIdempotencyKey(args.idempotencyKey) || !args.reason.trim()) return { ...denied9, error: "Order action is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-clinical-order-action", [`order:${args.orderId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await sudo.query.ClinicalOrderAction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash order { id }" }))[0];
      if (existing) {
        if (existing.order?.id !== args.orderId) throw new Error("Idempotency key was already used");
        return { success: true, recordId: args.orderId, evidenceHash: existing.evidenceHash, error: null };
      }
      const order = await sudo.query.ClinicalOrder.findOne({ where: { id: args.orderId }, query: "id status" });
      if (!order) throw new Error("Order not found");
      const allowed = { active: ["hold", "partially_fulfill", "fulfill", "revoke", "expire", "enter_in_error"], held: ["release", "revoke", "expire", "enter_in_error"], partially_fulfilled: ["hold", "fulfill", "revoke", "expire", "enter_in_error"] };
      if (!allowed[order.status]?.includes(args.action)) throw new Error("Clinical order transition is invalid");
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString(), hash = evidenceHash({ ...args, fromStatus: order.status, toStatus: next[args.action], actorId: actor.actorId, occurredAt });
      await sudo.query.ClinicalOrderAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, order: { connect: { id: order.id } }, actor: { connect: { id: args.providerId } }, action: args.action, fromStatus: order.status, toStatus: next[args.action], reason: args.reason.trim(), evidence: bounded(args.evidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      await sudo.query.ClinicalOrder.updateOne({ where: { id: order.id }, data: { status: next[args.action] }, query: "id" });
      return { success: true, recordId: order.id, evidenceHash: hash, error: null };
    });
  } catch (error) {
    return fail2(error);
  }
}
async function withdrawTreatmentConsentTransaction(context, args) {
  let actor;
  try {
    actor = await assertActiveActor(context);
    const consent = await assertPracticeRecord(context, "ConsentRecord", args.consentId, "id practice { id } client { user { id } }");
    if (consent.client?.user?.id !== actor.actorId && !permissions.canManageClinical({ session: context.session })) throw new Error("Consent withdrawal ownership is not authorized");
  } catch (error) {
    return fail2(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim()) return { ...denied9, error: "Consent withdrawal evidence is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-consent-withdrawal", [`consent:${args.consentId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await sudo.query.ConsentAction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash consent { id }" }))[0];
      if (existing) {
        if (existing.consent?.id !== args.consentId) throw new Error("Idempotency key was already used");
        return { success: true, recordId: args.consentId, evidenceHash: existing.evidenceHash, error: null };
      }
      const consent = await sudo.query.ConsentRecord.findOne({ where: { id: args.consentId }, query: "id status" });
      if (!consent || consent.status !== "effective") throw new Error("Only effective consent can be withdrawn");
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString(), hash = evidenceHash({ ...args, actorId: actor.actorId, occurredAt });
      await sudo.query.ConsentAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, consent: { connect: { id: consent.id } }, actor: { connect: { id: actor.actorId } }, action: "withdraw", fromStatus: consent.status, toStatus: "withdrawn", reason: args.reason.trim(), evidence: { patientRequestRecorded: true }, evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      await sudo.query.ConsentRecord.updateOne({ where: { id: consent.id }, data: { status: "withdrawn", withdrawnAt: occurredAt }, query: "id" });
      return { success: true, recordId: consent.id, evidenceHash: hash, error: null };
    });
  } catch (error) {
    return fail2(error);
  }
}
async function appendSignedClinicalNoteTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
    const records = await Promise.all([assertPracticeRecord(context, "Client", args.clientId), assertProviderActor(context, args.providerId, actor.actorId), args.appointmentId ? assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id }") : null, args.supersedesId ? assertPracticeRecord(context, "ClientNote", args.supersedesId, "id practice { id } client { id } supersededBy { id }") : null]);
    if (records[2] && records[2].client?.id !== args.clientId) throw new Error("Appointment does not match the client");
    if (records[3] && (records[3].client?.id !== args.clientId || records[3].supersededBy?.id)) throw new Error("Clinical note supersession is invalid");
  } catch (error) {
    return fail2(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.type.trim() || !args.content.trim() || args.supersedesId && !args.reason?.trim()) return { ...denied9, error: "Signed note evidence is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-clinical-note", [`client:${args.clientId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await sudo.query.ClientNote.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      const signedAt = (/* @__PURE__ */ new Date()).toISOString(), hash = evidenceHash({ ...args, actorId: actor.actorId, signedAt });
      const note = await sudo.query.ClientNote.createOne({ data: { practice: { connect: { id: actor.practiceId } }, client: { connect: { id: args.clientId } }, appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : void 0, author: { connect: { id: actor.actorId } }, type: args.type.trim(), content: args.content.trim(), status: "signed", signedAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey, supersedes: args.supersedesId ? { connect: { id: args.supersedesId } } : void 0, lateEntryReason: args.reason?.trim() || null }, query: "id evidenceHash" });
      return { success: true, recordId: note.id, evidenceHash: note.evidenceHash, error: null };
    });
  } catch (error) {
    return fail2(error);
  }
}
var resultType12 = import_core121.graphql.object()({ name: "ClinicalRecordActionResult", fields: { success: import_core121.graphql.field({ type: import_core121.graphql.nonNull(import_core121.graphql.Boolean) }), recordId: import_core121.graphql.field({ type: import_core121.graphql.ID }), evidenceHash: import_core121.graphql.field({ type: import_core121.graphql.String }), error: import_core121.graphql.field({ type: import_core121.graphql.String }) } });
var wrap2 = (fn, args) => import_core121.graphql.field({ type: resultType12, args, resolve: (_s, values, context) => fn(context, values) });
var transitionClinicalOrder = wrap2(transitionClinicalOrderTransaction, { orderId: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.ID) }), providerId: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.ID) }), action: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.String) }), reason: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.String) }), evidence: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.JSON) }), idempotencyKey: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.String) }) });
var withdrawTreatmentConsent = wrap2(withdrawTreatmentConsentTransaction, { consentId: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.ID) }), reason: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.String) }), idempotencyKey: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.String) }) });
var appendSignedClinicalNote = wrap2(appendSignedClinicalNoteTransaction, { clientId: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.ID) }), appointmentId: import_core121.graphql.arg({ type: import_core121.graphql.ID }), providerId: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.ID) }), type: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.String) }), content: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.String) }), supersedesId: import_core121.graphql.arg({ type: import_core121.graphql.ID }), reason: import_core121.graphql.arg({ type: import_core121.graphql.String }), idempotencyKey: import_core121.graphql.arg({ type: import_core121.graphql.nonNull(import_core121.graphql.String) }) });

// features/keystone/mutations/clinicalAssetWorkflows.ts
var import_node_crypto5 = require("node:crypto");
var import_core122 = require("@keystone-6/core");

// features/keystone/legalHoldPolicy.ts
var LEGAL_HOLD_LOCK_NAMESPACE = "medspa-effective-legal-hold";
function legalHoldAppliesToAsset(hold, asset, at = /* @__PURE__ */ new Date()) {
  if (!asset.id || !asset.practice?.id || hold.practice?.id !== asset.practice.id) return false;
  const matchesAsset = hold.asset?.id === asset.id || Boolean(asset.client?.id && hold.client?.id === asset.client.id) || Boolean(asset.incident?.id && hold.incident?.id === asset.incident.id);
  if (!matchesAsset) return false;
  if (hold.status !== "released") return true;
  const placedAt = hold.placedAt ? new Date(hold.placedAt).getTime() : NaN;
  const releasedAt = hold.releasedAt ? new Date(hold.releasedAt).getTime() : NaN;
  return !(typeof hold.releaseEvidenceHash === "string" && hold.releaseEvidenceHash.trim().length > 0 && typeof hold.releaseReason === "string" && hold.releaseReason.trim().length > 0 && typeof hold.releaseAuthorityReference === "string" && hold.releaseAuthorityReference.trim().length > 0 && typeof hold.releasedBy?.id === "string" && hold.releasedBy.id.length > 0 && Number.isFinite(placedAt) && Number.isFinite(releasedAt) && releasedAt >= placedAt && releasedAt <= at.getTime());
}
function effectiveHoldsForAsset(holds, asset, at = /* @__PURE__ */ new Date()) {
  if (!asset.id || !asset.practice?.id) throw new Error("Asset practice scope is required to resolve legal holds");
  const matching = /* @__PURE__ */ new Map();
  for (const hold of holds) {
    if (!hold.id) throw new Error("Legal-hold identity is unavailable");
    if (legalHoldAppliesToAsset(hold, asset, at)) matching.set(hold.id, hold);
  }
  return [...matching.values()];
}

// features/keystone/mutations/clinicalAssetWorkflows.ts
var denied10 = { success: false, recordId: null, status: null };
function fail3(error) {
  return { ...denied10, error: error instanceof Error ? error.message : "Clinical asset workflow failed" };
}
async function resolveEffectiveHoldsForAsset(sudo, practiceId5, asset, at = /* @__PURE__ */ new Date()) {
  if (!practiceId5 || !asset?.id || asset.practice?.id !== practiceId5) throw new Error("Asset practice scope is required to resolve legal holds");
  const query = (where) => sudo.query.LegalHold.findMany({
    where: { practice: { id: { equals: practiceId5 } }, ...where },
    take: 101,
    query: "id status placedAt releasedAt releaseEvidenceHash releaseReason releaseAuthorityReference releasedBy { id } practice { id } client { id } asset { id } incident { id }"
  });
  const sets = await Promise.all([
    query({ asset: { id: { equals: asset.id } } }),
    asset.client?.id ? query({ client: { id: { equals: asset.client.id } } }) : Promise.resolve([]),
    asset.incident?.id ? query({ incident: { id: { equals: asset.incident.id } } }) : Promise.resolve([])
  ]);
  if (sets.some((rows) => rows.length > 100)) throw new Error("Legal-hold evidence exceeds the safe verification bound");
  const unique = /* @__PURE__ */ new Map();
  for (const hold of sets.flat()) {
    if (!hold.id) throw new Error("Legal-hold identity is unavailable");
    unique.set(hold.id, hold);
  }
  if (unique.size > 100) throw new Error("Combined legal-hold evidence exceeds the safe verification bound");
  return effectiveHoldsForAsset([...unique.values()], asset, at);
}
async function grantPhotoConsentTransaction(context, args) {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !(/* @__PURE__ */ new Set(["clinical_care", "measurement", "education", "marketing"])).has(args.purpose) || !args.signerName.trim() || !args.signatureEvidence.trim()) return { ...denied10, error: "Photo-consent evidence is invalid" };
  try {
    const client = await assertPracticeRecord(context, "Client", args.clientId, "id practice { id } user { id }");
    if (args.appointmentId) {
      const appointment = await assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id }");
      if (appointment.client?.id !== client.id) throw new Error("Photo consent appointment does not match the client");
    }
    const privileged = permissions.canManageSensitiveRecords({ session: context.session });
    if (!privileged && client.user?.id !== context.session.itemId) throw new Error("Photo-consent ownership could not be verified");
    const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
    const mediaScope = bounded(args.mediaScope);
    const audienceScope = bounded(args.audienceScope);
    const evidence = { ...args, mediaScope, audienceScope, signatureEvidenceHash: evidenceHash(args.signatureEvidence), actorId: context.session.itemId, occurredAt };
    const hash = evidenceHash(evidence);
    return await serializableWorkflow(context, "medspa-photo-consent", [`client:${client.id}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const consent = await tx.sudo().query.PhotoConsent.createOne({ data: { practice: { connect: { id: client.practice.id } }, client: { connect: { id: client.id } }, appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : void 0, purpose: args.purpose, status: "granted", mediaScope, audienceScope, signerName: args.signerName.trim(), signerRole: args.signerRole.trim(), signatureEvidenceHash: evidence.signatureEvidenceHash, effectiveFrom: occurredAt, effectiveUntil: args.effectiveUntil || void 0, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id status" });
      await tx.sudo().query.PhotoConsentAction.createOne({ data: { practice: { connect: { id: client.practice.id } }, consent: { connect: { id: consent.id } }, actor: { connect: { id: context.session.itemId } }, action: "grant", reason: "Purpose-specific authorization recorded", scope: { mediaScope, audienceScope }, occurredAt, evidenceHash: hash, idempotencyKey: `${args.idempotencyKey}:grant` }, query: "id" });
      return { success: true, recordId: consent.id, status: consent.status, error: null };
    });
  } catch (error) {
    return fail3(error);
  }
}
async function withdrawPhotoConsentTransaction(context, args) {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.reason.trim()) return { ...denied10, error: "Withdrawal evidence is invalid" };
  try {
    const consent = await assertPracticeRecord(context, "PhotoConsent", args.consentId, "id practice { id } status client { user { id } } purpose");
    const privileged = permissions.canManageSensitiveRecords({ session: context.session });
    if (!privileged && consent.client?.user?.id !== context.session.itemId) throw new Error("Photo-consent ownership could not be verified");
    if (!["granted", "partially_withdrawn"].includes(consent.status)) throw new Error("Photo consent is not withdrawable");
    const normalizedScope = bounded(args.scope || {});
    const partial = !Array.isArray(normalizedScope) && normalizedScope !== null && Object.keys(normalizedScope).length > 0;
    const next = partial ? "partially_withdrawn" : "withdrawn";
    const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
    const hash = evidenceHash({ consentId: consent.id, next, scope: args.scope || null, reason: args.reason.trim(), actorId: context.session.itemId, occurredAt });
    await context.sudo().query.PhotoConsentAction.createOne({ data: { practice: { connect: { id: consent.practice.id } }, consent: { connect: { id: consent.id } }, actor: { connect: { id: context.session.itemId } }, action: partial ? "partial_withdrawal" : "withdrawal", reason: args.reason.trim(), scope: normalizedScope, occurredAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id" });
    await context.sudo().query.PhotoConsent.updateOne({ where: { id: consent.id }, data: { status: next }, query: "id" });
    return { success: true, recordId: consent.id, status: next, error: null };
  } catch (error) {
    return fail3(error);
  }
}
async function createClinicalAssetIntentTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
  } catch (error) {
    return fail3(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.purpose.trim() || !args.contentType.match(/^image\/(jpeg|png|webp)$/) && args.category === "photo" || !Number.isInteger(args.byteSize) || args.byteSize < 1 || args.byteSize > 25e6) return { ...denied10, error: "Clinical asset metadata is invalid" };
  try {
    const links = await Promise.all([assertPracticeRecord(context, "Client", args.clientId), args.appointmentId ? assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id }") : null, args.treatmentSessionId ? assertPracticeRecord(context, "TreatmentSession", args.treatmentSessionId, "id practice { id } client { id }") : null, args.incidentId ? assertPracticeRecord(context, "Incident", args.incidentId, "id practice { id } client { id }") : null, args.noteId ? assertPracticeRecord(context, "ClientNote", args.noteId, "id practice { id } client { id }") : null, args.photoConsentId ? assertPracticeRecord(context, "PhotoConsent", args.photoConsentId, "id practice { id } client { id }") : null]);
    if (links.slice(1).some((record) => record && record.client?.id !== args.clientId)) throw new Error("Clinical asset links do not identify the same client");
    const objectId = (0, import_node_crypto5.randomUUID)();
    const storageKey = `clinical/${actor.practiceId}/${args.clientId}/${objectId}`;
    const encryptionKeyReference = process.env.CLINICAL_ASSET_KMS_KEY_ID || "UNCONFIGURED_FAIL_CLOSED";
    if (encryptionKeyReference === "UNCONFIGURED_FAIL_CLOSED") throw new Error("Private clinical object encryption is not configured");
    const asset = await context.sudo().query.ClientAsset.createOne({ data: { practice: { connect: { id: actor.practiceId } }, client: { connect: { id: args.clientId } }, appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : void 0, treatmentSession: args.treatmentSessionId ? { connect: { id: args.treatmentSessionId } } : void 0, incident: args.incidentId ? { connect: { id: args.incidentId } } : void 0, note: args.noteId ? { connect: { id: args.noteId } } : void 0, photoConsent: args.photoConsentId ? { connect: { id: args.photoConsentId } } : void 0, category: args.category, purpose: args.purpose.trim(), storageKey, encryptionKeyReference, storageRegion: process.env.CLINICAL_ASSET_REGION || "private", originalFilename: args.originalFilename, contentType: args.contentType, byteSize: String(args.byteSize), status: "quarantined", accessClass: "clinical_restricted", retentionClass: args.retentionClass, retainUntil: args.retainUntil || void 0, legalHold: false, releasedToClient: false, uploadedBy: { connect: { id: actor.actorId } }, metadata: { privateObject: true, publicUrl: null, uploadIntentOnly: true, idempotencyKey: args.idempotencyKey } }, query: "id status" });
    const eventHash = evidenceHash({ assetId: asset.id, action: "upload_intent", actorId: actor.actorId, purpose: args.purpose, storageKeyHash: evidenceHash(storageKey) });
    await context.sudo().query.AssetAccessEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, asset: { connect: { id: asset.id } }, actor: { connect: { id: actor.actorId } }, action: "upload_intent", purpose: args.purpose, outcome: "pending_private_upload", evidence: { storageKeyHash: evidenceHash(storageKey), encryptionConfigured: true }, evidenceHash: eventHash, occurredAt: (/* @__PURE__ */ new Date()).toISOString(), idempotencyKey: args.idempotencyKey }, query: "id" });
    return { success: true, recordId: asset.id, status: asset.status, error: null };
  } catch (error) {
    return fail3(error);
  }
}
async function markClinicalAssetReadyTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
  } catch (error) {
    return fail3(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !/^[a-f0-9]{64}$/i.test(args.checksum)) return { ...denied10, error: "Asset validation evidence is invalid" };
  try {
    const asset = await assertPracticeRecord(context, "ClientAsset", args.assetId, "id practice { id } status contentType byteSize");
    if (asset.status !== "quarantined") throw new Error("Only quarantined assets can be validated");
    const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
    const hash = evidenceHash({ assetId: asset.id, checksum: args.checksum, validationEvidence: args.validationEvidence, actorId: actor.actorId, occurredAt });
    await context.sudo().query.ClientAsset.updateOne({ where: { id: asset.id }, data: { status: "ready", checksum: args.checksum, readyAt: occurredAt }, query: "id" });
    await context.sudo().query.AssetAccessEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, asset: { connect: { id: asset.id } }, actor: { connect: { id: actor.actorId } }, action: "validate", purpose: "private clinical object validation", outcome: "ready", evidence: bounded(args.validationEvidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
    return { success: true, recordId: asset.id, status: "ready", error: null };
  } catch (error) {
    return fail3(error);
  }
}
async function authorizeClinicalAssetAccessTransaction(context, args) {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.purpose.trim() || !args.reason.trim()) return { ...denied10, error: "Asset access purpose and reason are required" };
  try {
    const asset = await assertPracticeRecord(context, "ClientAsset", args.assetId, "id practice { id } status accessClass releasedToClient retainUntil legalHold client { user { id } } appointment { provider { user { id } } } photoConsent { purpose status effectiveUntil }");
    if (asset.status !== "ready") throw new Error("Asset is not available");
    const sensitive = permissions.canManageSensitiveRecords({ session: context.session });
    const assignedProvider = asset.appointment?.provider?.user?.id === context.session.itemId;
    const clientOwner = asset.releasedToClient && asset.client?.user?.id === context.session.itemId;
    if (!sensitive && !assignedProvider && !clientOwner) throw new Error("Asset access is not authorized");
    if (asset.accessClass === "marketing_authorized" && (asset.photoConsent?.purpose !== "marketing" || !["granted"].includes(asset.photoConsent.status) || asset.photoConsent.effectiveUntil && new Date(asset.photoConsent.effectiveUntil) <= /* @__PURE__ */ new Date())) throw new Error("Marketing photo authorization is not effective");
    const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
    const hash = evidenceHash({ assetId: asset.id, action: args.action, purpose: args.purpose, reason: args.reason, actorId: context.session.itemId, occurredAt });
    await context.sudo().query.AssetAccessEvent.createOne({ data: { practice: { connect: { id: asset.practice.id } }, asset: { connect: { id: asset.id } }, actor: { connect: { id: context.session.itemId } }, action: args.action, purpose: args.purpose.trim(), outcome: "authorized_for_private_delivery", reason: args.reason.trim(), evidence: { storageKeyDisclosed: false, publicUrlIssued: false }, evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
    return { success: true, recordId: asset.id, status: "authorized_for_private_delivery", error: null };
  } catch (error) {
    return fail3(error);
  }
}
async function releaseClinicalAssetTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
  } catch (error) {
    return fail3(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || !(/* @__PURE__ */ new Set(["client", "marketing"])).has(args.audience)) return { ...denied10, error: "Asset release evidence is invalid" };
  try {
    const initialAsset = await assertPracticeRecord(context, "ClientAsset", args.assetId, "id practice { id } client { id } incident { id }");
    const lockKeys = [
      `asset:${initialAsset.id}`,
      ...initialAsset.client?.id ? [`client:${initialAsset.client.id}`] : [],
      ...initialAsset.incident?.id ? [`incident:${initialAsset.incident.id}`] : [],
      `idempotency:${actor.practiceId}:asset-release:${args.idempotencyKey}`
    ];
    return await serializableWorkflow(context, LEGAL_HOLD_LOCK_NAMESPACE, lockKeys, async (tx) => {
      const sudo = tx.sudo();
      const asset = await sudo.query.ClientAsset.findOne({
        where: { id: initialAsset.id },
        query: "id practice { id } status legalHold client { id } incident { id }"
      });
      if (!asset || asset.practice?.id !== actor.practiceId || asset.client?.id !== initialAsset.client?.id || asset.incident?.id !== initialAsset.incident?.id) {
        throw new Error("Asset scope changed; retry the release request");
      }
      if (asset.status !== "ready") throw new Error("Only validated assets can be released");
      const now2 = /* @__PURE__ */ new Date();
      const holds = await resolveEffectiveHoldsForAsset(sudo, actor.practiceId, asset, now2);
      if (asset.legalHold || holds.length) throw new Error("Asset, client, or incident is under an effective legal hold");
      let consent = null;
      if (args.audience === "marketing") {
        if (!args.photoConsentId) throw new Error("Marketing release requires separate photo authorization");
        consent = await assertPracticeRecord(tx, "PhotoConsent", args.photoConsentId, "id practice { id } purpose status effectiveUntil client { id }");
        if (consent.client?.id !== asset.client?.id || consent.purpose !== "marketing" || consent.status !== "granted" || consent.effectiveUntil && new Date(consent.effectiveUntil) <= now2) throw new Error("Marketing photo authorization is not effective");
      }
      const occurredAt = now2.toISOString();
      const hash = evidenceHash({ assetId: asset.id, audience: args.audience, consentId: consent?.id || null, reason: args.reason, actorId: actor.actorId, occurredAt });
      await sudo.query.ClientAsset.updateOne({
        where: { id: asset.id },
        data: { releasedToClient: args.audience === "client", accessClass: args.audience === "client" ? "client_released" : "marketing_authorized", photoConsent: consent ? { connect: { id: consent.id } } : void 0 },
        query: "id"
      });
      await sudo.query.AssetAccessEvent.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        asset: { connect: { id: asset.id } },
        actor: { connect: { id: actor.actorId } },
        action: "release",
        purpose: `release to ${args.audience}`,
        outcome: "authorized_without_public_url",
        reason: args.reason.trim(),
        evidence: { consentId: consent?.id || null, publicUrlIssued: false },
        evidenceHash: hash,
        occurredAt,
        idempotencyKey: args.idempotencyKey
      }, query: "id" });
      return { success: true, recordId: asset.id, status: args.audience === "client" ? "client_released" : "marketing_authorized", error: null };
    });
  } catch (error) {
    return fail3(error);
  }
}
async function tombstoneClinicalAssetTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
  } catch (error) {
    return fail3(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || args.reason.length > 1e3) return { ...denied10, error: "Retention disposition evidence is invalid" };
  try {
    const initialAsset = await assertPracticeRecord(context, "ClientAsset", args.assetId, "id practice { id } client { id } incident { id }");
    const scopedKey = `${actor.practiceId}:asset-tombstone:${evidenceHash(args.idempotencyKey)}`;
    const requestHash = evidenceHash({ practiceId: actor.practiceId, assetId: args.assetId, reason: args.reason.trim(), actorId: actor.actorId });
    const lockKeys = [`asset:${initialAsset.id}`, ...initialAsset.client?.id ? [`client:${initialAsset.client.id}`] : [], ...initialAsset.incident?.id ? [`incident:${initialAsset.incident.id}`] : [], `idempotency:${scopedKey}`];
    return await serializableWorkflow(context, LEGAL_HOLD_LOCK_NAMESPACE, lockKeys, async (tx) => {
      const sudo = tx.sudo();
      const prior = (await sudo.query.AssetAccessEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedKey } }, take: 1, query: "id action evidence" }))[0];
      if (prior) {
        if (prior.action !== "tombstone" || prior.evidence?.requestHash !== requestHash) throw new Error("Retention disposition key was reused with different evidence");
        return { success: true, recordId: args.assetId, status: "tombstoned", error: null };
      }
      const asset = await sudo.query.ClientAsset.findOne({ where: { id: args.assetId }, query: "id practice { id } status legalHold retainUntil client { id } incident { id }" });
      if (!asset || asset.practice?.id !== actor.practiceId || asset.client?.id !== initialAsset.client?.id || asset.incident?.id !== initialAsset.incident?.id) throw new Error("Clinical asset is unavailable");
      if (asset.status === "tombstoned") throw new Error("Asset metadata is already tombstoned under another request");
      const holds = await resolveEffectiveHoldsForAsset(sudo, actor.practiceId, asset);
      if (asset.legalHold || holds.length) throw new Error("Asset, client, or incident is under an effective legal hold");
      const now2 = /* @__PURE__ */ new Date();
      if (!asset.retainUntil || new Date(asset.retainUntil) > now2) throw new Error("Asset retention period has not ended");
      const occurredAt = now2.toISOString();
      const hash = evidenceHash({ requestHash, occurredAt });
      await sudo.query.ClientAsset.updateOne({ where: { id: asset.id }, data: { status: "tombstoned", tombstonedAt: occurredAt, deletionRequestedAt: occurredAt }, query: "id" });
      await sudo.query.AssetAccessEvent.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        asset: { connect: { id: asset.id } },
        actor: { connect: { id: actor.actorId } },
        action: "tombstone",
        purpose: "retention disposition",
        outcome: "metadata_tombstoned_external_object_deletion_not_performed",
        reason: args.reason.trim(),
        evidence: { requestHash, retentionElapsed: true, legalHold: false, externalObjectDeletion: "not_performed" },
        evidenceHash: hash,
        occurredAt,
        idempotencyKey: scopedKey
      }, query: "id" });
      return { success: true, recordId: asset.id, status: "tombstoned", error: null };
    });
  } catch (error) {
    return fail3(error);
  }
}
var resultType13 = import_core122.graphql.object()({ name: "ClinicalAssetWorkflowResult", fields: { success: import_core122.graphql.field({ type: import_core122.graphql.nonNull(import_core122.graphql.Boolean) }), recordId: import_core122.graphql.field({ type: import_core122.graphql.ID }), status: import_core122.graphql.field({ type: import_core122.graphql.String }), error: import_core122.graphql.field({ type: import_core122.graphql.String }) } });
var wrap3 = (fn, args) => import_core122.graphql.field({ type: resultType13, args, resolve(_s, values, context) {
  return fn(context, values);
} });
var grantPhotoConsent = wrap3(grantPhotoConsentTransaction, { clientId: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.ID) }), appointmentId: import_core122.graphql.arg({ type: import_core122.graphql.ID }), purpose: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), mediaScope: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.JSON) }), audienceScope: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.JSON) }), signerName: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), signerRole: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), signatureEvidence: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), effectiveUntil: import_core122.graphql.arg({ type: import_core122.graphql.String }), idempotencyKey: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }) });
var withdrawPhotoConsent = wrap3(withdrawPhotoConsentTransaction, { consentId: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.ID) }), scope: import_core122.graphql.arg({ type: import_core122.graphql.JSON }), reason: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), idempotencyKey: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }) });
var createClinicalAssetIntent = wrap3(createClinicalAssetIntentTransaction, { clientId: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.ID) }), appointmentId: import_core122.graphql.arg({ type: import_core122.graphql.ID }), treatmentSessionId: import_core122.graphql.arg({ type: import_core122.graphql.ID }), incidentId: import_core122.graphql.arg({ type: import_core122.graphql.ID }), noteId: import_core122.graphql.arg({ type: import_core122.graphql.ID }), photoConsentId: import_core122.graphql.arg({ type: import_core122.graphql.ID }), category: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), purpose: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), originalFilename: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), contentType: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), byteSize: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.Int) }), retentionClass: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), retainUntil: import_core122.graphql.arg({ type: import_core122.graphql.String }), idempotencyKey: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }) });
var markClinicalAssetReady = wrap3(markClinicalAssetReadyTransaction, { assetId: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.ID) }), checksum: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), validationEvidence: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.JSON) }), idempotencyKey: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }) });
var authorizeClinicalAssetAccess = wrap3(authorizeClinicalAssetAccessTransaction, { assetId: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.ID) }), action: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), purpose: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), reason: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), idempotencyKey: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }) });
var releaseClinicalAsset = wrap3(releaseClinicalAssetTransaction, { assetId: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.ID) }), audience: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), photoConsentId: import_core122.graphql.arg({ type: import_core122.graphql.ID }), reason: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), idempotencyKey: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }) });
var tombstoneClinicalAsset = wrap3(tombstoneClinicalAssetTransaction, { assetId: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.ID) }), reason: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }), idempotencyKey: import_core122.graphql.arg({ type: import_core122.graphql.nonNull(import_core122.graphql.String) }) });

// features/keystone/mutations/followUpWorkflows.ts
var import_core123 = require("@keystone-6/core");
var denied11 = { success: false, recordId: null, status: null };
var fail4 = (error) => ({ ...denied11, error: error instanceof Error ? error.message : "Follow-up workflow failed" });
async function scheduleFollowUpTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
    await Promise.all([assertPracticeRecord(context, "TreatmentSession", args.treatmentSessionId), assertPracticeRecord(context, "User", args.assignedToId)]);
  } catch (error) {
    return fail4(error);
  }
  const dueAt = new Date(args.dueAt);
  if (!validIdempotencyKey(args.idempotencyKey) || Number.isNaN(dueAt.getTime()) || dueAt <= /* @__PURE__ */ new Date() || !args.title.trim()) return { ...denied11, error: "Follow-up schedule is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-follow-up-schedule", [`session:${args.treatmentSessionId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await sudo.query.FollowUpAction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "task { id status }" }))[0];
      if (existing?.task) return { success: true, recordId: existing.task.id, status: existing.task.status, error: null };
      const session = await sudo.query.TreatmentSession.findOne({ where: { id: args.treatmentSessionId }, query: "id client { id } appointment { id location { id } }" });
      if (!session?.client || !session.appointment?.location) throw new Error("Treatment session is unavailable");
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString(), hash = evidenceHash({ ...args, actorId: actor.actorId, occurredAt });
      const task = await sudo.query.FollowUpTask.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: session.appointment.location.id } }, client: { connect: { id: session.client.id } }, appointment: { connect: { id: session.appointment.id } }, treatmentSession: { connect: { id: session.id } }, assignedTo: { connect: { id: args.assignedToId } }, dueAt: dueAt.toISOString(), title: args.title.trim(), instructions: args.instructions.trim(), status: "open" }, query: "id status" });
      await sudo.query.FollowUpAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, task: { connect: { id: task.id } }, actor: { connect: { id: actor.actorId } }, action: "schedule", reason: "Procedure-derived follow-up scheduled", evidence: { dueAt: dueAt.toISOString(), treatmentSessionId: session.id }, redFlag: "none", evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      return { success: true, recordId: task.id, status: task.status, error: null };
    });
  } catch (error) {
    return fail4(error);
  }
}
async function appendFollowUpActionTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
    await assertPracticeRecord(context, "FollowUpTask", args.taskId);
  } catch (error) {
    return fail4(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !["contact", "patient_response", "escalate", "complete", "cancel"].includes(args.action) || !["none", "review", "urgent"].includes(args.redFlag) || !args.reason.trim()) return { ...denied11, error: "Follow-up action is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-follow-up-action", [`task:${args.taskId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await sudo.query.FollowUpAction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "task { id status }" }))[0];
      if (existing?.task) {
        if (existing.task.id !== args.taskId) throw new Error("Idempotency key was already used");
        return { success: true, recordId: existing.task.id, status: existing.task.status, error: null };
      }
      const task = await sudo.query.FollowUpTask.findOne({ where: { id: args.taskId }, query: "id status" });
      if (!task || ["completed", "cancelled"].includes(task.status)) throw new Error("Follow-up is closed");
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString(), status = args.action === "complete" ? "completed" : args.action === "cancel" ? "cancelled" : "in_progress", hash = evidenceHash({ ...args, actorId: actor.actorId, occurredAt });
      await sudo.query.FollowUpAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, task: { connect: { id: task.id } }, actor: { connect: { id: actor.actorId } }, action: args.action, reason: args.reason.trim(), evidence: bounded(args.evidence), redFlag: args.redFlag, evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      await sudo.query.FollowUpTask.updateOne({ where: { id: task.id }, data: { status, completedAt: status === "completed" ? occurredAt : void 0 }, query: "id" });
      return { success: true, recordId: task.id, status, error: null };
    });
  } catch (error) {
    return fail4(error);
  }
}
async function submitFollowUpResponseTransaction(context, args) {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !["none", "review", "urgent"].includes(args.redFlag)) return { ...denied11, error: "Authenticated follow-up response is invalid" };
  try {
    const task = await assertPracticeRecord(context, "FollowUpTask", args.taskId, "id practice { id } client { user { id } }");
    if (task.client?.user?.id !== context.session.itemId) throw new Error("Follow-up ownership could not be verified");
    return await serializableWorkflow(context, "medspa-follow-up-response", [`task:${args.taskId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await sudo.query.FollowUpAction.findMany({ where: { practice: { id: { equals: task.practice.id } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "task { id status }" }))[0];
      if (existing?.task) {
        if (existing.task.id !== args.taskId) throw new Error("Idempotency key was already used");
        return { success: true, recordId: existing.task.id, status: existing.task.status, error: null };
      }
      const current = await sudo.query.FollowUpTask.findOne({ where: { id: args.taskId }, query: "id status" });
      if (!current || ["completed", "cancelled"].includes(current.status)) throw new Error("Follow-up is closed");
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString(), hash = evidenceHash({ ...args, actorId: context.session.itemId, occurredAt });
      await sudo.query.FollowUpAction.createOne({ data: { practice: { connect: { id: task.practice.id } }, task: { connect: { id: task.id } }, actor: { connect: { id: context.session.itemId } }, action: "patient_response", reason: "Authenticated patient response", evidence: bounded(args.response), redFlag: args.redFlag, evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      await sudo.query.FollowUpTask.updateOne({ where: { id: task.id }, data: { status: "in_progress" }, query: "id" });
      return { success: true, recordId: task.id, status: "in_progress", error: null };
    });
  } catch (error) {
    return fail4(error);
  }
}
var resultType14 = import_core123.graphql.object()({ name: "FollowUpWorkflowResult", fields: { success: import_core123.graphql.field({ type: import_core123.graphql.nonNull(import_core123.graphql.Boolean) }), recordId: import_core123.graphql.field({ type: import_core123.graphql.ID }), status: import_core123.graphql.field({ type: import_core123.graphql.String }), error: import_core123.graphql.field({ type: import_core123.graphql.String }) } });
var wrap4 = (fn, args) => import_core123.graphql.field({ type: resultType14, args, resolve: (_s, values, context) => fn(context, values) });
var scheduleFollowUp = wrap4(scheduleFollowUpTransaction, { treatmentSessionId: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.ID) }), assignedToId: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.ID) }), dueAt: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }), title: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }), instructions: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }), idempotencyKey: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }) });
var submitFollowUpResponse = wrap4(submitFollowUpResponseTransaction, { taskId: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.ID) }), response: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.JSON) }), redFlag: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }), idempotencyKey: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }) });
var appendFollowUpAction = wrap4(appendFollowUpActionTransaction, { taskId: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.ID) }), action: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }), reason: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }), evidence: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.JSON) }), redFlag: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }), idempotencyKey: import_core123.graphql.arg({ type: import_core123.graphql.nonNull(import_core123.graphql.String) }) });

// features/keystone/mutations/intakeWorkflows.ts
var import_core124 = require("@keystone-6/core");
var denied12 = { success: false, recordId: null, evidenceHash: null };
var reviewDispositions = ["reviewed", "needs_clarification", "escalated"];
var isReviewDisposition = (value) => reviewDispositions.some((disposition) => disposition === value);
var fail5 = (error) => ({ ...denied12, error: error instanceof Error ? error.message : "Intake workflow failed" });
async function submitIntakeTransaction(context, args) {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.acknowledgement.trim()) return { ...denied12, error: "Authenticated intake evidence is required" };
  try {
    const actor = requireActorPractice(context);
    const [template, appointment, prior] = await Promise.all([
      assertPracticeRecord(context, "FormTemplate", args.templateId, "id practice { id } version isActive"),
      assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { user { id } }"),
      args.supersedesId ? assertPracticeRecord(context, "FormSubmission", args.supersedesId, "id practice { id } client { id } supersededBy { id }") : null
    ]);
    if (appointment.client?.user?.id !== actor.actorId) throw new Error("Intake ownership could not be verified");
    if (template.isActive !== true) throw new Error("Intake template is not active");
    if (prior && (prior.client?.id !== actor.actorId || prior.supersededBy?.id)) throw new Error("Intake supersession is invalid");
    const submittedAt = (/* @__PURE__ */ new Date()).toISOString(), data = bounded(args.responses);
    const hash = evidenceHash({ templateId: template.id, templateVersion: template.version, appointmentId: appointment.id, clientId: actor.actorId, data, acknowledgement: args.acknowledgement, submittedAt });
    return await serializableWorkflow(context, "medspa-intake", [`appointment:${appointment.id}`, `client:${actor.actorId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await tx.sudo().query.FormSubmission.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      const row2 = await sudo.query.FormSubmission.createOne({ data: { practice: { connect: { id: actor.practiceId } }, template: { connect: { id: template.id } }, templateVersion: template.version, appointment: { connect: { id: appointment.id } }, client: { connect: { id: actor.actorId } }, status: "submitted", data, acknowledgement: args.acknowledgement.trim(), submittedAt, signedAt: submittedAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey, supersedes: prior ? { connect: { id: prior.id } } : void 0 }, query: "id evidenceHash" });
      if (prior) await sudo.query.FormSubmission.updateOne({ where: { id: prior.id }, data: { status: "superseded" }, query: "id" });
      return { success: true, recordId: row2.id, evidenceHash: row2.evidenceHash, error: null };
    });
  } catch (error) {
    return fail5(error);
  }
}
async function reviewIntakeTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
    await assertPracticeRecord(context, "FormSubmission", args.submissionId);
  } catch (error) {
    return fail5(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !isReviewDisposition(args.disposition) || !args.rationale.trim()) return { ...denied12, error: "Intake review evidence is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-intake-review", [`submission:${args.submissionId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo(), existing = (await sudo.query.IntakeReviewAction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash submission { id }" }))[0];
      if (existing) {
        if (existing.submission?.id !== args.submissionId) throw new Error("Idempotency key was already used");
        return { success: true, recordId: args.submissionId, evidenceHash: existing.evidenceHash, error: null };
      }
      const row2 = await sudo.query.FormSubmission.findOne({ where: { id: args.submissionId }, query: "id status" });
      if (!row2 || row2.status === "superseded") throw new Error("Superseded intake cannot be reviewed");
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString(), hash = evidenceHash({ ...args, reviewerId: actor.actorId, fromStatus: row2.status, occurredAt });
      await sudo.query.IntakeReviewAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, submission: { connect: { id: row2.id } }, reviewer: { connect: { id: actor.actorId } }, disposition: args.disposition, rationale: args.rationale.trim(), findings: bounded(args.findings), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      await sudo.query.FormSubmission.updateOne({ where: { id: row2.id }, data: { status: args.disposition === "reviewed" ? "reviewed" : "in_review", reviewedBy: { connect: { id: actor.actorId } }, reviewedAt: occurredAt }, query: "id" });
      return { success: true, recordId: row2.id, evidenceHash: hash, error: null };
    });
  } catch (error) {
    return fail5(error);
  }
}
var resultType15 = import_core124.graphql.object()({ name: "IntakeWorkflowResult", fields: { success: import_core124.graphql.field({ type: import_core124.graphql.nonNull(import_core124.graphql.Boolean) }), recordId: import_core124.graphql.field({ type: import_core124.graphql.ID }), evidenceHash: import_core124.graphql.field({ type: import_core124.graphql.String }), error: import_core124.graphql.field({ type: import_core124.graphql.String }) } });
var submitIntake = import_core124.graphql.field({ type: resultType15, args: { templateId: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.ID) }), appointmentId: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.ID) }), responses: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.JSON) }), acknowledgement: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.String) }), supersedesId: import_core124.graphql.arg({ type: import_core124.graphql.ID }), idempotencyKey: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.String) }) }, resolve: (_s, args, context) => submitIntakeTransaction(context, args) });
var reviewIntake = import_core124.graphql.field({ type: resultType15, args: { submissionId: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.ID) }), disposition: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.String) }), rationale: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.String) }), findings: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.JSON) }), idempotencyKey: import_core124.graphql.arg({ type: import_core124.graphql.nonNull(import_core124.graphql.String) }) }, resolve: (_s, args, context) => {
  if (!isReviewDisposition(args.disposition)) return Promise.resolve({ ...denied12, error: "Intake review evidence is invalid" });
  return reviewIntakeTransaction(context, { submissionId: args.submissionId, disposition: args.disposition, rationale: args.rationale, findings: args.findings, idempotencyKey: args.idempotencyKey });
} });

// features/keystone/mutations/inventoryCustodyWorkflows.ts
var import_core125 = require("@keystone-6/core");
var denied13 = { success: false, recordId: null, movementCount: 0 };
var fail6 = (error) => ({ ...denied13, error: error instanceof Error ? error.message : "Inventory custody workflow failed" });
function parseLines(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) throw new Error("Choose between 1 and 200 receipt lines");
  return value.map((row2) => {
    const line = { purchaseOrderLineId: String(row2?.purchaseOrderLineId || ""), productId: String(row2?.productId || ""), quantity: Number(row2?.quantity), lotNumber: String(row2?.lotNumber || "").trim(), expiresAt: row2?.expiresAt || null, condition: String(row2?.condition || "").trim(), temperatureEvidence: row2?.temperatureEvidence || {}, quarantineReason: row2?.quarantineReason ? String(row2.quarantineReason).trim() : null };
    if (!line.purchaseOrderLineId || !line.productId || !Number.isInteger(line.quantity) || line.quantity <= 0 || !line.lotNumber || !line.condition) throw new Error("Receipt line evidence is invalid");
    return line;
  });
}
async function receivePurchaseOrderTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageInventory);
  } catch (error) {
    return fail6(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.receiptNumber.trim() || args.receiptNumber.trim().length > 120) return { ...denied13, error: "Receipt evidence is invalid" };
  let lines;
  try {
    lines = parseLines(args.lines);
  } catch (error) {
    return fail6(error);
  }
  try {
    const po = await assertPracticeRecord(context, "PurchaseOrder", args.purchaseOrderId, "id practice { id } location { id } lines { id product { id } }");
    const receivedAtDate = new Date(args.receivedAt);
    if (Number.isNaN(receivedAtDate.getTime())) throw new Error("Receipt timestamp is invalid");
    const receivedAt = receivedAtDate.toISOString();
    const scopedReceiptKey = `${actor.practiceId}:goods-receipt:${evidenceHash(args.idempotencyKey)}`;
    const receiptRequestHash = evidenceHash({ purchaseOrderId: po.id, receiptNumber: args.receiptNumber.trim(), receivedAt, lines, actorId: actor.actorId });
    const lotKeys = /* @__PURE__ */ new Set();
    for (const line of lines) {
      const lotKey = `${line.productId}:${line.lotNumber.toLocaleLowerCase()}`;
      if (lotKeys.has(lotKey)) throw new Error("A product lot may only appear once per receipt");
      lotKeys.add(lotKey);
    }
    return await serializableWorkflow(context, "medspa-goods-receipt", [`po:${po.id}`, ...lines.map((line) => `product:${line.productId}:lot:${line.lotNumber.toLocaleLowerCase()}`), `idempotency:${scopedReceiptKey}`], async (tx) => {
      const sudo = tx.sudo();
      const priorReceipt = (await sudo.query.GoodsReceipt.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedReceiptKey } }, take: 1, query: "id evidence" }))[0];
      if (priorReceipt) {
        if (priorReceipt.evidence?.requestHash !== receiptRequestHash) throw new Error("Goods-receipt key was already used with different evidence");
        return { success: true, recordId: priorReceipt.id, movementCount: Number(priorReceipt.evidence?.lineCount || 0), error: null };
      }
      const currentPo = await sudo.query.PurchaseOrder.findOne({ where: { id: po.id }, query: "id practice { id } status revision location { id } vendor { id } lines { id product { id } orderedQuantity receivedQuantity }" });
      if (!currentPo || currentPo.practice?.id !== actor.practiceId || !currentPo.location?.id || !["submitted", "partially_received"].includes(currentPo.status)) throw new Error("Purchase order is not receivable in this practice");
      const currentLines = new Map((currentPo.lines || []).map((item) => [item.id, item]));
      const totalsByLine = /* @__PURE__ */ new Map();
      for (const line of lines) totalsByLine.set(line.purchaseOrderLineId, (totalsByLine.get(line.purchaseOrderLineId) || 0) + line.quantity);
      for (const [lineId, total] of totalsByLine) {
        const source = currentLines.get(lineId);
        if (!source || !source.product?.id || lines.some((line) => line.purchaseOrderLineId === lineId && line.productId !== source.product.id) || Number(source.receivedQuantity || 0) + total > Number(source.orderedQuantity || 0)) throw new Error("Receipt exceeds or mismatches the current purchase-order balance");
        await assertPracticeRecord(tx, "Product", source.product.id);
      }
      const receiptEvidence = { purchaseOrderId: currentPo.id, receiptNumber: args.receiptNumber.trim(), receivedAt, lines, actorId: actor.actorId };
      const receipt = await sudo.query.GoodsReceipt.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        location: { connect: { id: currentPo.location.id } },
        purchaseOrder: { connect: { id: currentPo.id } },
        receiptNumber: args.receiptNumber.trim(),
        receivedAt,
        receivedBy: { connect: { id: actor.actorId } },
        idempotencyKey: scopedReceiptKey,
        evidence: { hash: evidenceHash(receiptEvidence), requestHash: receiptRequestHash, lineCount: lines.length }
      }, query: "id" });
      for (const [lineId, total] of totalsByLine) {
        const source = currentLines.get(lineId);
        await sudo.query.PurchaseOrderLine.updateOne({ where: { id: lineId }, data: { receivedQuantity: Number(source.receivedQuantity || 0) + total }, query: "id" });
      }
      for (const [index, line] of lines.entries()) {
        const source = currentLines.get(line.purchaseOrderLineId);
        const quarantined = Boolean(line.quarantineReason);
        const expiresAt = line.expiresAt ? new Date(line.expiresAt) : null;
        if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= receivedAtDate)) throw new Error("Received lot is already expired");
        const lot = await sudo.query.InventoryLot.createOne({ data: {
          practice: { connect: { id: actor.practiceId } },
          location: { connect: { id: currentPo.location.id } },
          product: { connect: { id: line.productId } },
          vendor: currentPo.vendor?.id ? { connect: { id: currentPo.vendor.id } } : void 0,
          lotNumber: line.lotNumber,
          receivedQuantity: line.quantity,
          remainingQuantity: line.quantity,
          receivedAt,
          expiresAt: expiresAt?.toISOString(),
          status: quarantined ? "quarantined" : "available"
        }, query: "id" });
        const lineHash = evidenceHash({ ...line, receiptId: receipt.id, lotId: lot.id, receivedAt });
        await sudo.query.GoodsReceiptLine.createOne({ data: {
          practice: { connect: { id: actor.practiceId } },
          receipt: { connect: { id: receipt.id } },
          purchaseOrderLine: { connect: { id: source.id } },
          product: { connect: { id: line.productId } },
          lot: { connect: { id: lot.id } },
          quantity: line.quantity,
          lotNumberSnapshot: line.lotNumber,
          expirationSnapshot: expiresAt?.toISOString(),
          condition: line.condition,
          temperatureEvidence: line.temperatureEvidence,
          quarantineReason: line.quarantineReason || "",
          evidenceHash: lineHash,
          idempotencyKey: `${scopedReceiptKey}:line:${index}`
        }, query: "id" });
        await sudo.query.StockMovement.createOne({ data: {
          practice: { connect: { id: actor.practiceId } },
          location: { connect: { id: currentPo.location.id } },
          lot: { connect: { id: lot.id } },
          product: { connect: { id: line.productId } },
          type: "receive",
          delta: line.quantity,
          balanceBefore: 0,
          balanceAfter: line.quantity,
          idempotencyKey: `${scopedReceiptKey}:movement:${index}`,
          reason: quarantined ? "Received into quarantine" : "Authorized goods receipt",
          actor: { connect: { id: actor.actorId } },
          metadata: { receiptId: receipt.id, receiptLineEvidenceHash: lineHash }
        }, query: "id" });
        const movement = await recordInventoryMovement(tx, {
          practiceId: actor.practiceId,
          productId: line.productId,
          locationId: currentPo.location.id,
          type: "receive",
          delta: line.quantity,
          reason: `Goods receipt ${receipt.id}`,
          idempotencyKey: `${scopedReceiptKey}:inventory:${index}`,
          metadata: { receiptId: receipt.id, lotId: lot.id }
        });
        if (!movement.success) throw new Error(movement.error || "Location inventory movement failed");
      }
      const refreshed = await sudo.query.PurchaseOrderLine.findMany({ where: { purchaseOrder: { id: { equals: currentPo.id } } }, query: "id orderedQuantity receivedQuantity" });
      const complete = refreshed.every((item) => item.receivedQuantity >= item.orderedQuantity);
      await sudo.query.PurchaseOrder.updateOne({ where: { id: currentPo.id }, data: { status: complete ? "received" : "partially_received", revision: Number(currentPo.revision || 1) + 1 }, query: "id" });
      return { success: true, recordId: receipt.id, movementCount: lines.length, error: null };
    });
  } catch (error) {
    return fail6(error);
  }
}
async function dispositionInventoryLotTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageInventory);
  } catch (error) {
    return fail6(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !Number.isInteger(args.quantity) || args.quantity < 0 || !args.reason.trim() || ["destroy", "return"].includes(args.action) && !args.witnessId) return { ...denied13, error: "Lot disposition evidence is invalid" };
  try {
    const lot = await assertPracticeRecord(context, "InventoryLot", args.lotId, "id practice { id } status remainingQuantity location { id } product { id quantity }");
    if (args.witnessId) await assertPracticeRecord(context, "User", args.witnessId);
    if (["recalled", "destroyed", "returned"].includes(lot.status)) throw new Error("Lot cannot be dispositioned from its current state");
    return await serializableWorkflow(context, "medspa-lot-disposition", [`lot:${lot.id}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const removing = ["destroy", "return", "expire"].includes(args.action);
      const quantity = removing ? args.quantity : 0;
      if (quantity > lot.remainingQuantity) throw new Error("Lot disposition exceeds remaining quantity");
      const after = lot.remainingQuantity - quantity;
      const status = args.action === "quarantine" ? "quarantined" : args.action === "return" ? "returned" : args.action === "destroy" ? "destroyed" : "expired";
      await sudo.query.InventoryLot.updateOne({ where: { id: lot.id }, data: { remainingQuantity: after, status }, query: "id" });
      await sudo.query.StockMovement.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: lot.location.id } }, lot: { connect: { id: lot.id } }, product: { connect: { id: lot.product.id } }, type: args.action === "return" ? "return" : args.action === "expire" ? "expire" : "adjustment", delta: -quantity, balanceBefore: lot.remainingQuantity, balanceAfter: after, idempotencyKey: args.idempotencyKey, reason: args.reason.trim(), actor: { connect: { id: actor.actorId } }, metadata: { action: args.action, witnessId: args.witnessId || null, evidenceHash: evidenceHash({ ...args, actorId: actor.actorId }) } }, query: "id" });
      if (quantity) await sudo.query.Product.updateOne({ where: { id: lot.product.id }, data: { quantity: Math.max(0, Number(lot.product.quantity || 0) - quantity) }, query: "id" });
      return { success: true, recordId: lot.id, movementCount: 1, error: null };
    });
  } catch (error) {
    return fail6(error);
  }
}
async function returnRetailLotTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageInventory);
    await Promise.all([assertPracticeRecord(context, "MedSpaTransactionLineItem", args.transactionLineId), assertPracticeRecord(context, "InventoryLot", args.lotId)]);
  } catch (error) {
    return fail6(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !Number.isInteger(args.quantity) || args.quantity < 1 || !["restock", "quarantine"].includes(args.disposition) || !args.reason.trim()) return { ...denied13, error: "Retail return evidence is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-retail-return", [
      `lot:${args.lotId}`,
      `line:${args.transactionLineId}`,
      `idempotency:${actor.practiceId}:${args.idempotencyKey}`
    ], async (tx) => {
      const s = tx.sudo();
      const scopedKey = `${actor.practiceId}:retail-return:${evidenceHash(args.idempotencyKey)}`;
      const requestHash = evidenceHash({ transactionLineId: args.transactionLineId, lotId: args.lotId, quantity: args.quantity, disposition: args.disposition, reason: args.reason.trim(), actorId: actor.actorId });
      const prior = (await s.query.StockMovement.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedKey } }, take: 1, query: "id lot { id } transactionLine { id } delta metadata" }))[0];
      if (prior) {
        if (prior.lot?.id !== args.lotId || prior.transactionLine?.id !== args.transactionLineId || prior.delta !== args.quantity || prior.metadata?.requestHash !== requestHash) throw new Error("Retail-return key was already used with different evidence");
        return { success: true, recordId: prior.id, movementCount: 1, error: null };
      }
      const lot = await s.query.InventoryLot.findOne({ where: { id: args.lotId }, query: "id practice { id } remainingQuantity status product { id quantity } location { id }" });
      if (!lot?.product || !lot.location || lot.practice?.id !== actor.practiceId) throw new Error("Return lot is unavailable");
      if (["recalled", "destroyed", "returned", "expired"].includes(lot.status) || lot.status === "quarantined" && args.disposition === "restock") throw new Error("Held, recalled, destroyed, returned, or expired lots cannot be restocked");
      const openRecalls = await s.query.RecallCase.findMany({ where: { practice: { id: { equals: actor.practiceId } }, lot: { id: { equals: lot.id } }, status: { not: { equals: "closed" } } }, take: 1, query: "id status" });
      if (openRecalls.length) throw new Error("An open recall hold prevents this lot return from restoring availability");
      const movements = await s.query.StockMovement.findMany({ where: { practice: { id: { equals: actor.practiceId } }, lot: { id: { equals: lot.id } }, transactionLine: { id: { equals: args.transactionLineId } }, type: { in: ["retail_sale", "return"] } }, take: 101, query: "id type delta product { id }" });
      if (movements.length > 100 || movements.some((movement2) => movement2.product?.id !== lot.product.id)) throw new Error("Retail return evidence is unavailable or exceeds the verification bound");
      const sold = -movements.filter((movement2) => movement2.type === "retail_sale").reduce((sum, movement2) => sum + Number(movement2.delta || 0), 0);
      const returned = movements.filter((movement2) => movement2.type === "return").reduce((sum, movement2) => sum + Number(movement2.delta || 0), 0);
      if (args.quantity > sold - returned) throw new Error("Return quantity exceeds sold lot quantity");
      const movementResult = await recordInventoryMovement(tx, {
        practiceId: actor.practiceId,
        productId: lot.product.id,
        locationId: lot.location.id,
        type: "return",
        delta: args.quantity,
        reason: `Retail return: ${args.reason.trim()}`,
        idempotencyKey: `${scopedKey}:inventory`,
        metadata: { requestHash, lotId: lot.id, disposition: args.disposition }
      });
      if (!movementResult.success) throw new Error(movementResult.error || "Location inventory return failed");
      const at = (/* @__PURE__ */ new Date()).toISOString();
      const after = Number(lot.remainingQuantity || 0) + args.quantity;
      const hash = evidenceHash({ ...args, actorId: actor.actorId, at });
      await s.query.InventoryLot.updateOne({ where: { id: lot.id }, data: { remainingQuantity: after, status: args.disposition === "restock" ? "available" : "quarantined" }, query: "id" });
      const movement = await s.query.StockMovement.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        location: { connect: { id: lot.location.id } },
        lot: { connect: { id: lot.id } },
        product: { connect: { id: lot.product.id } },
        type: "return",
        delta: args.quantity,
        balanceBefore: lot.remainingQuantity,
        balanceAfter: after,
        idempotencyKey: scopedKey,
        reason: args.reason.trim(),
        actor: { connect: { id: actor.actorId } },
        transactionLine: { connect: { id: args.transactionLineId } },
        metadata: { disposition: args.disposition, requestHash, evidenceHash: hash }
      }, query: "id" });
      return { success: true, recordId: movement.id, movementCount: 1, error: null };
    });
  } catch (error) {
    return fail6(error);
  }
}
var resultType16 = import_core125.graphql.object()({ name: "InventoryCustodyResult", fields: { success: import_core125.graphql.field({ type: import_core125.graphql.nonNull(import_core125.graphql.Boolean) }), recordId: import_core125.graphql.field({ type: import_core125.graphql.ID }), movementCount: import_core125.graphql.field({ type: import_core125.graphql.nonNull(import_core125.graphql.Int) }), error: import_core125.graphql.field({ type: import_core125.graphql.String }) } });
var receivePurchaseOrder = import_core125.graphql.field({ type: resultType16, args: { purchaseOrderId: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.ID) }), receiptNumber: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.String) }), receivedAt: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.String) }), lines: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.JSON) }), idempotencyKey: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.String) }) }, resolve(_s, args, context) {
  return receivePurchaseOrderTransaction(context, args);
} });
var returnRetailLot = import_core125.graphql.field({ type: resultType16, args: { transactionLineId: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.ID) }), lotId: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.ID) }), quantity: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.Int) }), disposition: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.String) }), reason: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.String) }), idempotencyKey: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.String) }) }, resolve(_s, args, context) {
  return returnRetailLotTransaction(context, args);
} });
var dispositionInventoryLot = import_core125.graphql.field({ type: resultType16, args: { lotId: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.ID) }), action: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.String) }), quantity: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.Int) }), reason: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.String) }), witnessId: import_core125.graphql.arg({ type: import_core125.graphql.ID }), idempotencyKey: import_core125.graphql.arg({ type: import_core125.graphql.nonNull(import_core125.graphql.String) }) }, resolve(_s, args, context) {
  return dispositionInventoryLotTransaction(context, args);
} });

// features/keystone/mutations/governanceWorkflows.ts
var import_core126 = require("@keystone-6/core");
var denied14 = { success: false, recordId: null, status: null };
var fail7 = (error) => ({ ...denied14, error: error instanceof Error ? error.message : "Governance workflow failed" });
async function acceptMembershipAgreementTransaction(context, args) {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.termsVersion.trim() || !args.signatureEvidence.trim()) return { ...denied14, error: "Membership agreement evidence is invalid" };
  try {
    const membership = await assertPracticeRecord(context, "ClientMembership", args.clientMembershipId, "id practice { id } status client { id } membership { id monthlyPrice } agreements(orderBy: { acceptedAt: desc }, take: 1) { id effectiveUntil } ");
    const finance = permissions.canManageFinance({ session: context.session });
    if (!finance && membership.client?.id !== context.session.itemId) throw new Error("Membership agreement ownership could not be verified");
    const acceptedAt = (/* @__PURE__ */ new Date()).toISOString();
    const termsHash = evidenceHash(args.terms);
    const evidence = { membershipId: membership.id, termsVersion: args.termsVersion, termsHash, benefitSnapshot: args.benefitSnapshot, renewalDisclosure: args.renewalDisclosure, cancellationDisclosure: args.cancellationDisclosure, affirmativeConsentHash: evidenceHash(args.signatureEvidence), actorId: context.session.itemId, acceptedAt };
    const hash = evidenceHash(evidence);
    return await serializableWorkflow(context, "medspa-membership-agreement", [`membership:${membership.id}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const agreement = await tx.sudo().query.MembershipAgreement.createOne({ data: { practice: { connect: { id: membership.practice.id } }, clientMembership: { connect: { id: membership.id } }, client: { connect: { id: membership.client.id } }, membership: { connect: { id: membership.membership.id } }, termsVersion: args.termsVersion.trim(), termsHash, priceMinorSnapshot: membership.membership.monthlyPrice || 0, currencyCode: "USD", benefitSnapshot: bounded(args.benefitSnapshot), renewalDisclosure: bounded(args.renewalDisclosure), cancellationDisclosure: bounded(args.cancellationDisclosure), affirmativeConsentHash: evidence.affirmativeConsentHash, acceptedAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id" });
      await tx.sudo().query.ClientMembership.updateOne({ where: { id: membership.id }, data: { status: "active" }, query: "id" });
      await tx.sudo().query.MembershipLedgerEntry.createOne({ data: { practice: { connect: { id: membership.practice.id } }, clientMembership: { connect: { id: membership.id } }, agreement: { connect: { id: agreement.id } }, actor: { connect: { id: context.session.itemId } }, type: "activate", amountMinor: 0, benefitDelta: 0, reason: "Versioned membership agreement accepted", evidence: { agreementEvidenceHash: hash }, occurredAt: acceptedAt, evidenceHash: hash, idempotencyKey: `${args.idempotencyKey}:activate` }, query: "id" });
      return { success: true, recordId: agreement.id, status: "active", error: null };
    });
  } catch (error) {
    return fail7(error);
  }
}
async function transitionMembershipTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance);
  } catch (error) {
    return fail7(error);
  }
  const actions = /* @__PURE__ */ new Set(["renewal_due", "charge_authorized", "charge_settled", "charge_failed", "benefit_issue", "benefit_use", "benefit_reverse", "freeze", "resume", "nonrenew", "cancel", "expire"]);
  if (!actions.has(args.action) || !validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || !Number.isInteger(args.amountMinor || 0) || !Number.isInteger(args.benefitDelta || 0)) return { ...denied14, error: "Membership ledger action is invalid" };
  try {
    const membership = await assertPracticeRecord(context, "ClientMembership", args.clientMembershipId, "id practice { id } status agreements(orderBy: { acceptedAt: desc }, take: 1) { id termsVersion effectiveUntil }");
    const agreement = membership.agreements?.[0];
    if (!agreement || agreement.effectiveUntil && new Date(agreement.effectiveUntil) <= /* @__PURE__ */ new Date()) throw new Error("An effective membership agreement is required");
    const allowed = { active: ["renewal_due", "charge_authorized", "charge_settled", "charge_failed", "benefit_issue", "benefit_use", "benefit_reverse", "freeze", "nonrenew", "cancel", "expire"], paused: ["charge_settled", "charge_failed", "benefit_reverse", "resume", "nonrenew", "cancel", "expire"] };
    if (!allowed[membership.status]?.includes(args.action)) throw new Error("Membership transition is invalid");
    const transitions3 = { freeze: "paused", resume: "active", nonrenew: "active", cancel: "cancelled", expire: "cancelled" };
    const next = transitions3[args.action] || membership.status;
    const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
    const hash = evidenceHash({ ...args, fromStatus: membership.status, next, agreementId: agreement.id, actorId: actor.actorId, occurredAt });
    await context.sudo().query.MembershipLedgerEntry.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientMembership: { connect: { id: membership.id } }, agreement: { connect: { id: agreement.id } }, actor: { connect: { id: actor.actorId } }, type: args.action, amountMinor: args.amountMinor || 0, benefitDelta: args.benefitDelta || 0, reason: args.reason.trim(), evidence: { fromStatus: membership.status, toStatus: next }, occurredAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id" });
    if (next !== membership.status) await context.sudo().query.ClientMembership.updateOne({ where: { id: membership.id }, data: { status: next, pausedUntil: args.action === "freeze" ? void 0 : null }, query: "id" });
    return { success: true, recordId: membership.id, status: next, error: null };
  } catch (error) {
    return fail7(error);
  }
}
async function requestPatientRightsTransaction(context, args) {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey)) return { ...denied14, error: "Authenticated request evidence is required" };
  try {
    const client = await assertPracticeRecord(context, "Client", args.clientId, "id practice { id } user { id }");
    const privileged = permissions.canManageSensitiveRecords({ session: context.session });
    if (!privileged && client.user?.id !== context.session.itemId) throw new Error("Patient-rights ownership could not be verified");
    const responseDays = Number(process.env.PATIENT_RIGHTS_RESPONSE_DAYS);
    if (!Number.isInteger(responseDays) || responseDays < 1) throw new Error("Patient-rights response policy is not configured");
    const requestedAt = (/* @__PURE__ */ new Date()).toISOString();
    const dueAt = new Date(Date.now() + responseDays * 864e5);
    const hash = evidenceHash({ ...args, actorId: context.session.itemId, requestedAt });
    const request = await context.sudo().query.PatientRightsRequest.createOne({ data: { practice: { connect: { id: client.practice.id } }, client: { connect: { id: client.id } }, requestedBy: { connect: { id: context.session.itemId } }, type: args.type, status: "received", scope: bounded(args.scope), requestedAt, dueAt: dueAt.toISOString(), idempotencyKey: args.idempotencyKey }, query: "id status" });
    await context.sudo().query.PatientRightsAction.createOne({ data: { practice: { connect: { id: client.practice.id } }, request: { connect: { id: request.id } }, actor: { connect: { id: context.session.itemId } }, action: "receive", reason: "Authenticated patient-rights request received", evidence: bounded(args.scope), evidenceHash: hash, occurredAt: requestedAt, idempotencyKey: `${args.idempotencyKey}:receive` }, query: "id" });
    return { success: true, recordId: request.id, status: request.status, error: null };
  } catch (error) {
    return fail7(error);
  }
}
async function appendPatientRightsActionTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
  } catch (error) {
    return fail7(error);
  }
  const map = { verify_identity: "identity_review", assign: "in_progress", collect_records: "in_progress", approve: "fulfilled", partial: "partially_fulfilled", deny_with_basis: "denied_with_basis", deliver: "fulfilled", close: "closed" };
  if (!map[args.action] || !validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || args.action === "deny_with_basis" && !args.legalBasis?.trim()) return { ...denied14, error: "Patient-rights action is invalid" };
  try {
    const request = await assertPracticeRecord(context, "PatientRightsRequest", args.requestId, "id practice { id } status dueAt");
    const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
    const hash = evidenceHash({ ...args, fromStatus: request.status, toStatus: map[args.action], actorId: actor.actorId, occurredAt });
    await context.sudo().query.PatientRightsAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, request: { connect: { id: request.id } }, actor: { connect: { id: actor.actorId } }, action: args.action, reason: args.reason.trim(), evidence: bounded(args.evidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
    await context.sudo().query.PatientRightsRequest.updateOne({ where: { id: request.id }, data: { status: map[args.action], legalBasis: args.legalBasis || void 0, responseEvidenceHash: hash, completedAt: ["fulfilled", "partially_fulfilled", "denied_with_basis", "closed"].includes(map[args.action]) ? occurredAt : void 0 }, query: "id" });
    return { success: true, recordId: request.id, status: map[args.action], error: null };
  } catch (error) {
    return fail7(error);
  }
}
async function openBreakGlassTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageClinical);
  } catch (error) {
    return fail7(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.emergencyReason.trim() || !Number.isInteger(args.minutes) || args.minutes < 1 || args.minutes > 60) return { ...denied14, error: "Break-glass request is invalid" };
  try {
    await assertPracticeRecord(context, "Client", args.clientId);
    const openedAt = /* @__PURE__ */ new Date();
    const expiresAt = new Date(openedAt.getTime() + args.minutes * 6e4);
    const hash = evidenceHash({ ...args, actorId: actor.actorId, openedAt: openedAt.toISOString(), expiresAt: expiresAt.toISOString() });
    const record = await context.sudo().query.BreakGlassEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, client: { connect: { id: args.clientId } }, actor: { connect: { id: actor.actorId } }, status: "opened", emergencyReason: args.emergencyReason.trim(), requestedScope: bounded(args.requestedScope), openedAt: openedAt.toISOString(), expiresAt: expiresAt.toISOString(), evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id status" });
    await context.sudo().query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action: "clinical.break_glass.opened", resourceType: "Client", resourceId: args.clientId, correlationId: args.idempotencyKey, evidence: { breakGlassId: record.id, reasonHash: evidenceHash(args.emergencyReason), expiresAt: expiresAt.toISOString() }, evidenceHash: hash, occurredAt: openedAt.toISOString() }, query: "id" });
    return { success: true, recordId: record.id, status: record.status, error: null };
  } catch (error) {
    return fail7(error);
  }
}
async function publishRetentionPolicyTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
    const fresh = await assertActiveActor(context);
    if (fresh.role?.canManagePractice !== true || fresh.role?.canManageSensitiveRecords !== true) throw new Error("Practice-owner approval is required");
  } catch (error) {
    return fail7(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.sourceCitations.trim() || !Number.isInteger(args.retainMonths) || args.retainMonths < 1) return { ...denied14, error: "Retention policy pack is incomplete" };
  try {
    const hash = evidenceHash({ ...args, approvedBy: actor.actorId });
    const policy = await context.sudo().query.RetentionPolicy.createOne({ data: { practice: { connect: { id: actor.practiceId } }, jurisdiction: args.jurisdiction.trim(), recordClass: args.recordClass.trim(), version: args.version.trim(), retainMonths: args.retainMonths, minorsRule: args.minorsRule || "", dispositionRule: args.dispositionRule.trim(), sourceCitations: args.sourceCitations.trim(), approvedBy: { connect: { id: actor.actorId } }, effectiveFrom: new Date(args.effectiveFrom).toISOString(), effectiveUntil: args.effectiveUntil ? new Date(args.effectiveUntil).toISOString() : void 0, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id" });
    return { success: true, recordId: policy.id, status: "effective", error: null };
  } catch (error) {
    return fail7(error);
  }
}
async function placeLegalHoldTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
    const fresh = await assertActiveActor(context);
    if (fresh.role?.canManagePractice !== true || fresh.role?.canManageSensitiveRecords !== true) throw new Error("Practice-owner approval is required");
  } catch (error) {
    return fail7(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.clientId && !args.assetId && !args.incidentId || !args.reason.trim() || args.reason.length > 1e3 || !args.authorityReference.trim() || args.authorityReference.length > 500) return { ...denied14, error: "Legal-hold evidence is incomplete" };
  try {
    const scopedKey = `${actor.practiceId}:legal-hold:${evidenceHash(args.idempotencyKey)}`;
    const requestHash = evidenceHash({ practiceId: actor.practiceId, clientId: args.clientId || null, assetId: args.assetId || null, incidentId: args.incidentId || null, reason: args.reason.trim(), authorityReference: args.authorityReference.trim(), actorId: actor.actorId });
    const lockKeys = [`idempotency:${scopedKey}`, ...args.clientId ? [`client:${args.clientId}`] : [], ...args.assetId ? [`asset:${args.assetId}`] : [], ...args.incidentId ? [`incident:${args.incidentId}`] : []];
    return await serializableWorkflow(context, LEGAL_HOLD_LOCK_NAMESPACE, lockKeys, async (tx) => {
      const sudo = tx.sudo();
      const prior = (await sudo.query.LegalHold.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedKey } }, take: 1, query: "id status evidenceHash" }))[0];
      if (prior) {
        if (prior.evidenceHash !== requestHash) throw new Error("Legal-hold key was reused with different evidence");
        return { success: true, recordId: prior.id, status: prior.status, error: null };
      }
      const [client, asset, incident] = await Promise.all([
        args.clientId ? assertPracticeRecord(tx, "Client", args.clientId, "id practice { id }") : Promise.resolve(null),
        args.assetId ? assertPracticeRecord(tx, "ClientAsset", args.assetId, "id practice { id } client { id } incident { id }") : Promise.resolve(null),
        args.incidentId ? assertPracticeRecord(tx, "Incident", args.incidentId, "id practice { id } client { id }") : Promise.resolve(null)
      ]);
      if (asset && (client && asset.client?.id !== client.id || incident && asset.incident?.id !== incident.id)) throw new Error("Legal-hold targets do not describe the same record scope");
      if (client && incident && incident.client?.id !== client.id) throw new Error("Legal-hold client and incident do not match");
      const placedAt = (/* @__PURE__ */ new Date()).toISOString();
      const hold = await sudo.query.LegalHold.createOne({ data: {
        practice: { connect: { id: actor.practiceId } },
        client: client ? { connect: { id: client.id } } : void 0,
        asset: asset ? { connect: { id: asset.id } } : void 0,
        incident: incident ? { connect: { id: incident.id } } : void 0,
        status: "active",
        reason: args.reason.trim(),
        authorityReference: args.authorityReference.trim(),
        placedBy: { connect: { id: actor.actorId } },
        placedAt,
        evidenceHash: requestHash,
        idempotencyKey: scopedKey
      }, query: "id status" });
      if (asset) await sudo.query.ClientAsset.updateOne({ where: { id: asset.id }, data: { legalHold: true }, query: "id" });
      return { success: true, recordId: hold.id, status: hold.status, error: null };
    });
  } catch (error) {
    return fail7(error);
  }
}
async function releaseLegalHoldTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
    const fresh = await assertActiveActor(context);
    if (fresh.role?.canManagePractice !== true || fresh.role?.canManageSensitiveRecords !== true) throw new Error("Practice-owner approval is required");
  } catch (error) {
    return fail7(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || args.reason.length > 1e3 || !args.authorityReference.trim() || args.authorityReference.length > 500) return { ...denied14, error: "Legal-hold release evidence is incomplete" };
  try {
    const initial = await assertPracticeRecord(context, "LegalHold", args.legalHoldId, "id practice { id } status asset { id client { id } incident { id } } client { id } incident { id } placedAt releasedAt releaseEvidenceHash");
    const requestHash = evidenceHash({ practiceId: actor.practiceId, holdId: initial.id, reason: args.reason.trim(), authorityReference: args.authorityReference.trim(), actorId: actor.actorId });
    const lockKeys = [`hold:${initial.id}`, ...initial.asset?.id ? [`asset:${initial.asset.id}`] : [], ...initial.asset?.client?.id ? [`client:${initial.asset.client.id}`] : [], ...initial.asset?.incident?.id ? [`incident:${initial.asset.incident.id}`] : [], ...initial.client?.id ? [`client:${initial.client.id}`] : [], ...initial.incident?.id ? [`incident:${initial.incident.id}`] : []];
    return await serializableWorkflow(context, LEGAL_HOLD_LOCK_NAMESPACE, lockKeys, async (tx) => {
      const sudo = tx.sudo();
      const hold = await sudo.query.LegalHold.findOne({ where: { id: initial.id }, query: "id status practice { id } asset { id client { id } incident { id } } client { id } incident { id } placedAt releasedAt releaseEvidenceHash" });
      if (!hold || hold.practice?.id !== actor.practiceId) throw new Error("Legal hold is unavailable");
      const refreshAssetHoldMirror = async () => {
        if (!hold.asset?.id) return;
        const asset = await sudo.query.ClientAsset.findOne({ where: { id: hold.asset.id }, query: "id practice { id } client { id } incident { id }" });
        if (!asset || asset.practice?.id !== actor.practiceId) return;
        const remainingHolds = await resolveEffectiveHoldsForAsset(sudo, actor.practiceId, asset);
        await sudo.query.ClientAsset.updateOne({ where: { id: asset.id }, data: { legalHold: remainingHolds.length > 0 }, query: "id" });
      };
      if (hold.status === "released") {
        if (hold.releaseEvidenceHash !== requestHash) throw new Error("Legal hold was released with different evidence");
        await refreshAssetHoldMirror();
        return { success: true, recordId: hold.id, status: "released", error: null };
      }
      if (hold.status !== "active") throw new Error("Legal hold is not releasable");
      const releasedAt = (/* @__PURE__ */ new Date()).toISOString();
      await sudo.query.LegalHold.updateOne({ where: { id: hold.id }, data: {
        status: "released",
        releasedBy: { connect: { id: actor.actorId } },
        releasedAt,
        releaseReason: args.reason.trim(),
        releaseAuthorityReference: args.authorityReference.trim(),
        releaseEvidenceHash: requestHash
      }, query: "id" });
      await refreshAssetHoldMirror();
      return { success: true, recordId: hold.id, status: "released", error: null };
    });
  } catch (error) {
    return fail7(error);
  }
}
var resultType17 = import_core126.graphql.object()({ name: "GovernanceWorkflowResult", fields: { success: import_core126.graphql.field({ type: import_core126.graphql.nonNull(import_core126.graphql.Boolean) }), recordId: import_core126.graphql.field({ type: import_core126.graphql.ID }), status: import_core126.graphql.field({ type: import_core126.graphql.String }), error: import_core126.graphql.field({ type: import_core126.graphql.String }) } });
var wrap5 = (fn, args) => import_core126.graphql.field({ type: resultType17, args, resolve(_s, values, context) {
  return fn(context, values);
} });
var acceptMembershipAgreement = wrap5(acceptMembershipAgreementTransaction, { clientMembershipId: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.ID) }), termsVersion: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), terms: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.JSON) }), benefitSnapshot: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.JSON) }), renewalDisclosure: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.JSON) }), cancellationDisclosure: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.JSON) }), signatureEvidence: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), idempotencyKey: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }) });
var transitionMembership = wrap5(transitionMembershipTransaction, { clientMembershipId: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.ID) }), action: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), reason: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), amountMinor: import_core126.graphql.arg({ type: import_core126.graphql.Int }), benefitDelta: import_core126.graphql.arg({ type: import_core126.graphql.Int }), idempotencyKey: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }) });
var requestPatientRights = wrap5(requestPatientRightsTransaction, { clientId: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.ID) }), type: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), scope: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.JSON) }), idempotencyKey: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }) });
var appendPatientRightsAction = wrap5(appendPatientRightsActionTransaction, { requestId: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.ID) }), action: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), reason: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), evidence: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.JSON) }), legalBasis: import_core126.graphql.arg({ type: import_core126.graphql.String }), idempotencyKey: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }) });
var openBreakGlass = wrap5(openBreakGlassTransaction, { clientId: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.ID) }), emergencyReason: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), requestedScope: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.JSON) }), minutes: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.Int) }), idempotencyKey: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }) });
var placeLegalHold = wrap5(placeLegalHoldTransaction, { clientId: import_core126.graphql.arg({ type: import_core126.graphql.ID }), assetId: import_core126.graphql.arg({ type: import_core126.graphql.ID }), incidentId: import_core126.graphql.arg({ type: import_core126.graphql.ID }), reason: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), authorityReference: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), idempotencyKey: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }) });
var releaseLegalHold = wrap5(releaseLegalHoldTransaction, { legalHoldId: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.ID) }), reason: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), authorityReference: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), idempotencyKey: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }) });
var publishRetentionPolicy = wrap5(publishRetentionPolicyTransaction, { jurisdiction: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), recordClass: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), version: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), retainMonths: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.Int) }), minorsRule: import_core126.graphql.arg({ type: import_core126.graphql.String }), dispositionRule: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), sourceCitations: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), effectiveFrom: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }), effectiveUntil: import_core126.graphql.arg({ type: import_core126.graphql.String }), idempotencyKey: import_core126.graphql.arg({ type: import_core126.graphql.nonNull(import_core126.graphql.String) }) });

// features/keystone/mutations/safetyWorkflows.ts
var import_core127 = require("@keystone-6/core");

// features/keystone/deviceSafetyReleasePolicy.ts
function hasBlockingDeviceSafetyCase(recallStatuses, incidentStatuses) {
  return [...recallStatuses, ...incidentStatuses].some((status) => status !== "closed");
}

// features/keystone/mutations/safetyWorkflows.ts
var denied15 = { success: false, recordId: null, affectedCount: 0, status: null };
var fail8 = (error) => ({ ...denied15, error: error instanceof Error ? error.message : "Safety workflow failed" });
async function reportIncidentTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
  } catch (error) {
    return fail8(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !(/* @__PURE__ */ new Set(["low", "moderate", "high", "critical"])).has(args.severity) || !args.summary.trim()) return { ...denied15, error: "Incident evidence is invalid" };
  try {
    const records = await Promise.all([assertPracticeRecord(context, "Client", args.clientId), assertPracticeRecord(context, "Location", args.locationId), args.appointmentId ? assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id } location { id }") : null, args.treatmentSessionId ? assertPracticeRecord(context, "TreatmentSession", args.treatmentSessionId, "id practice { id } client { id } appointment { id } location { id } device { id }") : null, args.administrationId ? assertPracticeRecord(context, "TreatmentAdministration", args.administrationId, "id practice { id } client { id } appointment { id } treatmentSession { id } device { id }") : null, args.suspectLotId ? assertPracticeRecord(context, "InventoryLot", args.suspectLotId) : null, args.suspectDeviceId ? assertPracticeRecord(context, "Resource", args.suspectDeviceId) : null]);
    const appointment = records[2], session = records[3], administration = records[4];
    if (appointment && (appointment.client?.id !== args.clientId || appointment.location?.id !== args.locationId) || session && (session.client?.id !== args.clientId || session.location?.id !== args.locationId || args.appointmentId && session.appointment?.id !== args.appointmentId) || administration && (administration.client?.id !== args.clientId || args.appointmentId && administration.appointment?.id !== args.appointmentId || args.treatmentSessionId && administration.treatmentSession?.id !== args.treatmentSessionId) || args.suspectDeviceId && ((administration?.device?.id || session?.device?.id) && (administration?.device?.id || session?.device?.id) !== args.suspectDeviceId)) throw new Error("Incident evidence links do not match");
    return await serializableWorkflow(context, "medspa-incident", [`client:${args.clientId}`, ...args.suspectDeviceId ? [`device:${args.suspectDeviceId}`] : [], `idempotency:${args.idempotencyKey}`], async (tx) => {
      const occurredAt = new Date(args.occurredAt).toISOString();
      const symptoms = bounded(args.symptoms);
      const immediateActions = bounded(args.immediateActions);
      const evidence = { ...args, symptoms, immediateActions, actorId: actor.actorId, reportedAt: (/* @__PURE__ */ new Date()).toISOString() };
      const hash = evidenceHash(evidence);
      const incident = await tx.sudo().query.Incident.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: args.locationId } }, client: { connect: { id: args.clientId } }, appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : void 0, treatmentSession: args.treatmentSessionId ? { connect: { id: args.treatmentSessionId } } : void 0, administration: args.administrationId ? { connect: { id: args.administrationId } } : void 0, suspectLot: args.suspectLotId ? { connect: { id: args.suspectLotId } } : void 0, suspectDevice: args.suspectDeviceId ? { connect: { id: args.suspectDeviceId } } : void 0, reportedBy: { connect: { id: actor.actorId } }, occurredAt, summary: args.summary.trim(), severity: args.severity, status: args.severity === "critical" ? "under_review" : "open", triageDisposition: args.severity === "critical" ? "immediate_clinician_and_emergency_escalation_required" : "awaiting_clinical_triage", interventions: { symptoms, immediateActions, onsetAt: args.onsetAt || null }, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id status" });
      await tx.sudo().query.IncidentAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, incident: { connect: { id: incident.id } }, actor: { connect: { id: actor.actorId } }, action: "report", toStatus: incident.status, severity: args.severity, rationale: args.summary.trim(), evidence: bounded(evidence), evidenceHash: hash, occurredAt: evidence.reportedAt, idempotencyKey: `${args.idempotencyKey}:report` }, query: "id" });
      if (args.suspectDeviceId && ["high", "critical"].includes(args.severity)) await tx.sudo().query.Resource.updateOne({ where: { id: args.suspectDeviceId }, data: { readinessStatus: "incident_lockout", isActive: false }, query: "id" });
      if (args.suspectLotId && ["high", "critical"].includes(args.severity)) await tx.sudo().query.InventoryLot.updateOne({ where: { id: args.suspectLotId }, data: { status: "quarantined" }, query: "id" });
      return { success: true, recordId: incident.id, affectedCount: 1, status: incident.status, error: null };
    });
  } catch (error) {
    return fail8(error);
  }
}
async function appendIncidentActionTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
  } catch (error) {
    return fail8(error);
  }
  const actions = /* @__PURE__ */ new Set(["triage", "clinical_review", "intervention", "referral", "emergency_transfer", "manufacturer_notice", "regulatory_decision", "regulatory_submit", "capa_assign", "capa_verify", "clinical_resolve", "close"]);
  if (!validIdempotencyKey(args.idempotencyKey) || !actions.has(args.action) || !(/* @__PURE__ */ new Set(["open", "under_review", "closed"])).has(args.toStatus) || !args.rationale.trim()) return { ...denied15, error: "Incident action evidence is invalid" };
  try {
    const incident = await assertPracticeRecord(context, "Incident", args.incidentId, "id practice { id } status severity revision closedAt");
    if (args.clinicianId) await assertProviderActor(context, args.clinicianId, actor.actorId);
    if (["triage", "clinical_review", "intervention", "referral", "emergency_transfer", "clinical_resolve", "close"].includes(args.action) && (!args.clinicianId || !permissions.canManageClinical({ session: context.session }))) throw new Error("Qualified clinical authority is required for this action");
    if (args.severity && !(/* @__PURE__ */ new Set(["low", "moderate", "high", "critical"])).has(args.severity)) throw new Error("Incident severity is invalid");
    return await serializableWorkflow(context, "medspa-incident-transition", [`incident:${incident.id}`, `idempotency:${actor.practiceId}:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const prior = (await sudo.query.IncidentAction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id incident { id } action fromStatus toStatus occurredAt evidenceHash" }))[0];
      if (prior) {
        const retryHash = prior.incident?.id === incident.id ? evidenceHash({ ...args, incidentId: incident.id, fromStatus: prior.fromStatus, actorId: actor.actorId, occurredAt: new Date(prior.occurredAt).toISOString() }) : null;
        if (retryHash !== prior.evidenceHash || prior.action !== args.action || prior.toStatus !== args.toStatus) throw new Error("Incident action key was already used with different evidence");
        return { success: true, recordId: incident.id, affectedCount: 1, status: prior.toStatus, error: null };
      }
      const current = await sudo.query.Incident.findOne({ where: { id: incident.id }, query: "id practice { id } status severity revision closedAt" });
      if (!current || current.practice?.id !== actor.practiceId) throw new Error("Incident not found");
      if (current.status === "closed") throw new Error("Closed incidents cannot be changed without an explicit reopen workflow");
      if (args.action === "close") {
        if (args.toStatus !== "closed" || current.status !== "under_review" || !args.clinicianId || !permissions.canManageClinical({ session: context.session })) throw new Error("Closing requires a reviewed incident and qualified clinical authority");
        await assertProviderActor(tx, args.clinicianId, actor.actorId);
      } else {
        if (args.toStatus === "closed") throw new Error("Only the qualified close action can close an incident");
        if (args.toStatus === "open" && current.status !== "open") throw new Error("Incident cannot be reopened without an explicit reopen workflow");
        if (args.toStatus === "under_review" && !["open", "under_review"].includes(current.status)) throw new Error("Incident state transition is invalid");
      }
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
      const evidence = { ...args, incidentId: incident.id, fromStatus: current.status, actorId: actor.actorId, occurredAt };
      const hash = evidenceHash(evidence);
      await sudo.query.IncidentAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, incident: { connect: { id: incident.id } }, actor: { connect: { id: actor.actorId } }, clinician: args.clinicianId ? { connect: { id: args.clinicianId } } : void 0, action: args.action, fromStatus: current.status, toStatus: args.toStatus, severity: args.severity || current.severity, rationale: args.rationale.trim(), evidence: bounded(args.evidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      await sudo.query.Incident.updateOne({ where: { id: incident.id }, data: { status: args.toStatus, severity: args.severity || current.severity, closedAt: args.action === "close" ? occurredAt : void 0, revision: Number(current.revision || 1) + 1 }, query: "id" });
      return { success: true, recordId: incident.id, affectedCount: 1, status: args.toStatus, error: null };
    });
  } catch (error) {
    return fail8(error);
  }
}
async function openRecallCaseTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
  } catch (error) {
    return fail8(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.lotId && !args.deviceId || args.lotId && args.deviceId || !args.sourceReference.trim() || !args.scopeReason.trim()) return { ...denied15, error: "Recall scope is invalid" };
  try {
    await Promise.all([assertPracticeRecord(context, "Location", args.locationId), args.lotId ? assertPracticeRecord(context, "InventoryLot", args.lotId) : Promise.resolve(null), args.deviceId ? assertPracticeRecord(context, "Resource", args.deviceId) : Promise.resolve(null)]);
    return await serializableWorkflow(context, "medspa-recall", [...args.lotId ? [`lot:${args.lotId}`] : [`device:${args.deviceId}`], `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const openedAt = (/* @__PURE__ */ new Date()).toISOString();
      const hash = evidenceHash({ ...args, actorId: actor.actorId, openedAt });
      if (args.lotId) await sudo.query.InventoryLot.updateOne({ where: { id: args.lotId }, data: { status: "recalled" }, query: "id" });
      if (args.deviceId) await sudo.query.Resource.updateOne({ where: { id: args.deviceId }, data: { readinessStatus: "recall_quarantine", isActive: false }, query: "id" });
      const recall = await sudo.query.RecallCase.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: args.locationId } }, lot: args.lotId ? { connect: { id: args.lotId } } : void 0, device: args.deviceId ? { connect: { id: args.deviceId } } : void 0, openedBy: { connect: { id: actor.actorId } }, sourceReference: args.sourceReference.trim(), scopeReason: args.scopeReason.trim(), status: "quarantined", openedAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id status" });
      await sudo.query.RecallAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, recall: { connect: { id: recall.id } }, actor: { connect: { id: actor.actorId } }, action: "quarantine", reason: args.scopeReason.trim(), evidence: { lotId: args.lotId || null, deviceId: args.deviceId || null }, evidenceHash: hash, occurredAt: openedAt, idempotencyKey: `${args.idempotencyKey}:quarantine` }, query: "id" });
      const administrations = args.lotId ? await sudo.query.AdministrationLot.findMany({ where: { lot: { id: { equals: args.lotId } } }, take: 5e3, query: "id evidenceHash administration { id client { id } }" }) : await sudo.query.TreatmentAdministration.findMany({ where: { device: { id: { equals: args.deviceId } } }, take: 5e3, query: "id evidenceHash client { id }" });
      let affectedCount = 0;
      for (const row2 of administrations) {
        const administration = args.lotId ? row2.administration : row2;
        if (!administration?.id || !administration.client?.id) continue;
        const exposureHash = evidenceHash({ recallId: recall.id, administrationId: administration.id, administrationLotId: args.lotId ? row2.id : null, sourceEvidenceHash: row2.evidenceHash });
        await sudo.query.RecallExposure.createOne({ data: { practice: { connect: { id: actor.practiceId } }, recall: { connect: { id: recall.id } }, client: { connect: { id: administration.client.id } }, administration: { connect: { id: administration.id } }, administrationLot: args.lotId ? { connect: { id: row2.id } } : void 0, status: "identified", identifiedAt: openedAt, notificationDueAt: openedAt, evidenceHash: exposureHash }, query: "id" });
        affectedCount += 1;
      }
      await sudo.query.RecallAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, recall: { connect: { id: recall.id } }, actor: { connect: { id: actor.actorId } }, action: "identify_exposure", reason: "Patient exposure cohort generated from immutable administration evidence", evidence: { affectedCount }, evidenceHash: evidenceHash({ recallId: recall.id, affectedCount, openedAt }), occurredAt: openedAt, idempotencyKey: `${args.idempotencyKey}:cohort` }, query: "id" });
      await sudo.query.RecallCase.updateOne({ where: { id: recall.id }, data: { status: "patients_identified" }, query: "id" });
      return { success: true, recordId: recall.id, affectedCount, status: "patients_identified", error: null };
    });
  } catch (error) {
    return fail8(error);
  }
}
async function appendRecallActionTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
  } catch (error) {
    return fail8(error);
  }
  const nextByAction = { assess: "applicability_review", quarantine: "quarantined", identify_exposure: "patients_identified", notify: "notifications_in_progress", clinical_assessment: "notifications_in_progress", dispose: "disposition_complete", close: "closed" };
  if (!nextByAction[args.action] || !validIdempotencyKey(args.idempotencyKey) || !args.reason.trim()) return { ...denied15, error: "Recall action is invalid" };
  try {
    const recall = await assertPracticeRecord(context, "RecallCase", args.recallId, "id practice { id } status exposures { id status }");
    const exposure = args.exposureId ? await assertPracticeRecord(context, "RecallExposure", args.exposureId, "id practice { id } recall { id } status") : null;
    if (exposure && exposure.recall?.id !== recall.id) throw new Error("Recall exposure does not match");
    if (["clinical_assessment", "close"].includes(args.action) && !permissions.canManageClinical({ session: context.session })) throw new Error("Qualified clinical authority is required");
    if (args.action === "close" && recall.exposures?.some((item) => !["assessed", "closed"].includes(item.status))) throw new Error("Recall exposures require documented assessment before closure");
    const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
    const hash = evidenceHash({ ...args, fromStatus: recall.status, toStatus: nextByAction[args.action], actorId: actor.actorId, occurredAt });
    await context.sudo().query.RecallAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, recall: { connect: { id: recall.id } }, exposure: exposure ? { connect: { id: exposure.id } } : void 0, actor: { connect: { id: actor.actorId } }, action: args.action, reason: args.reason.trim(), evidence: bounded(args.evidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
    await context.sudo().query.RecallCase.updateOne({ where: { id: recall.id }, data: { status: nextByAction[args.action], closedAt: args.action === "close" ? occurredAt : void 0 }, query: "id" });
    if (exposure) {
      const exposureStatus = args.action === "notify" ? "notified" : args.action === "clinical_assessment" ? "assessed" : args.action === "close" ? "closed" : exposure.status;
      await context.sudo().query.RecallExposure.updateOne({ where: { id: exposure.id }, data: { status: exposureStatus }, query: "id" });
    }
    return { success: true, recordId: recall.id, affectedCount: exposure ? 1 : 0, status: nextByAction[args.action], error: null };
  } catch (error) {
    return fail8(error);
  }
}
async function transitionDeviceReadinessTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canSchedule);
  } catch (error) {
    return fail8(error);
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim()) return { ...denied15, error: "Device readiness evidence is invalid" };
  if (["maintenance_due", "service", "retire"].includes(args.action) && !permissions.canManageInventory({ session: context.session })) return { ...denied15, error: "Equipment-custody authority is required" };
  if (args.toStatus === "available" && (!args.qualifiedReleaseProviderId || !permissions.canManageClinical({ session: context.session }))) return { ...denied15, error: "Qualified clinical release is required" };
  const actionTargets = { acceptance_test: ["available", "out_of_service"], clean: ["cleaning"], maintenance_due: ["maintenance_due"], lockout: ["incident_lockout"], service: ["out_of_service"], recall_quarantine: ["recall_quarantine"], release: ["available"], retire: ["retired"] };
  if (!actionTargets[args.action]?.includes(args.toStatus)) return { ...denied15, error: "Device readiness action does not match the target state" };
  const allowed = { acceptance_testing: ["available", "out_of_service"], available: ["cleaning", "maintenance_due", "incident_lockout", "recall_quarantine", "retired"], cleaning: ["available", "out_of_service"], maintenance_due: ["out_of_service"], out_of_service: ["available", "retired"], incident_lockout: ["available", "retired"], recall_quarantine: ["available", "retired"] };
  try {
    return await serializableWorkflow(context, "medspa-device-readiness", [`device:${args.resourceId}`, `idempotency:${actor.practiceId}:${args.idempotencyKey}`], async (tx) => {
      const current = await assertPracticeRecord(tx, "Resource", args.resourceId, "id practice { id } type readinessStatus revision");
      if (!["device", "equipment"].includes(current.type)) throw new Error("Readiness transitions apply only to devices and equipment");
      if (!(allowed[current.readinessStatus] || []).includes(args.toStatus)) throw new Error("Invalid device readiness transition");
      if (args.toStatus === "available") {
        await assertProviderActor(tx, args.qualifiedReleaseProviderId, actor.actorId);
        const sudo2 = tx.sudo();
        const [recalls, incidents] = await Promise.all([
          sudo2.query.RecallCase.findMany({ where: { practice: { id: { equals: actor.practiceId } }, device: { id: { equals: current.id } }, status: { not: { equals: "closed" } } }, take: 1, query: "id status" }),
          sudo2.query.Incident.findMany({ where: { practice: { id: { equals: actor.practiceId } }, suspectDevice: { id: { equals: current.id } }, status: { not: { equals: "closed" } } }, take: 1, query: "id status" })
        ]);
        if (hasBlockingDeviceSafetyCase(recalls.map((item) => item.status), incidents.map((item) => item.status))) {
          throw new Error("Device release is blocked by an unresolved recall or incident");
        }
      }
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString();
      const hash = evidenceHash({ ...args, fromStatus: current.readinessStatus, actorId: actor.actorId, occurredAt });
      const sudo = tx.sudo();
      await sudo.query.DeviceReadinessEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, resource: { connect: { id: current.id } }, actor: { connect: { id: actor.actorId } }, qualifiedReleaseBy: args.qualifiedReleaseProviderId ? { connect: { id: args.qualifiedReleaseProviderId } } : void 0, action: args.action, fromStatus: current.readinessStatus, toStatus: args.toStatus, reason: args.reason.trim(), evidence: bounded(args.evidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      await sudo.query.Resource.updateOne({ where: { id: current.id }, data: { readinessStatus: args.toStatus, isActive: args.toStatus === "available", releasedAt: args.action === "release" ? occurredAt : void 0, cleanedAt: args.action === "clean" ? occurredAt : void 0, revision: Number(current.revision || 1) + 1 }, query: "id" });
      return { success: true, recordId: current.id, affectedCount: 1, status: args.toStatus, error: null };
    });
  } catch (error) {
    return fail8(error);
  }
}
var resultType18 = import_core127.graphql.object()({ name: "SafetyWorkflowResult", fields: { success: import_core127.graphql.field({ type: import_core127.graphql.nonNull(import_core127.graphql.Boolean) }), recordId: import_core127.graphql.field({ type: import_core127.graphql.ID }), affectedCount: import_core127.graphql.field({ type: import_core127.graphql.nonNull(import_core127.graphql.Int) }), status: import_core127.graphql.field({ type: import_core127.graphql.String }), error: import_core127.graphql.field({ type: import_core127.graphql.String }) } });
var wrap6 = (fn, args) => import_core127.graphql.field({ type: resultType18, args, resolve(_s, values, context) {
  return fn(context, values);
} });
var reportIncident = wrap6(reportIncidentTransaction, { clientId: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.ID) }), locationId: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.ID) }), appointmentId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), treatmentSessionId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), administrationId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), suspectLotId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), suspectDeviceId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), occurredAt: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), onsetAt: import_core127.graphql.arg({ type: import_core127.graphql.String }), severity: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), summary: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), symptoms: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.JSON) }), immediateActions: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.JSON) }), idempotencyKey: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }) });
var appendIncidentAction = wrap6(appendIncidentActionTransaction, { incidentId: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.ID) }), clinicianId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), action: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), toStatus: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), severity: import_core127.graphql.arg({ type: import_core127.graphql.String }), rationale: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), evidence: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.JSON) }), idempotencyKey: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }) });
var openRecallCase = wrap6(openRecallCaseTransaction, { locationId: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.ID) }), lotId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), deviceId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), sourceReference: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), scopeReason: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), idempotencyKey: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }) });
var appendRecallAction = wrap6(appendRecallActionTransaction, { recallId: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.ID) }), exposureId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), action: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), reason: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), evidence: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.JSON) }), idempotencyKey: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }) });
var transitionDeviceReadiness = wrap6(transitionDeviceReadinessTransaction, { resourceId: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.ID) }), action: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), toStatus: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), reason: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }), qualifiedReleaseProviderId: import_core127.graphql.arg({ type: import_core127.graphql.ID }), evidence: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.JSON) }), idempotencyKey: import_core127.graphql.arg({ type: import_core127.graphql.nonNull(import_core127.graphql.String) }) });

// features/keystone/mutations/resourceReservationWorkflows.ts
var import_core128 = require("@keystone-6/core");
var denied16 = { success: false, appointmentId: null, reservationCount: 0, revision: null };
var resourcePurposes = ["room", "device", "equipment", "recovery"];
var isResourcePurpose = (value) => resourcePurposes.some((purpose) => purpose === value);
function parse2(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) throw new Error("Choose between 1 and 100 resource segments");
  return value.map((raw) => {
    const input = raw && typeof raw === "object" ? raw : {};
    const purpose = String(input.purpose || "");
    if (!isResourcePurpose(purpose)) throw new Error("Resource segment is invalid");
    const segment = {
      segmentKey: String(input.segmentKey || ""),
      serviceId: String(input.serviceId || ""),
      providerId: String(input.providerId || ""),
      supervisorId: input.supervisorId ? String(input.supervisorId) : null,
      resourceId: String(input.resourceId || ""),
      purpose,
      units: Number(input.units),
      startsAt: String(input.startsAt || ""),
      endsAt: String(input.endsAt || "")
    };
    const start = new Date(segment.startsAt), end = new Date(segment.endsAt);
    if (!segment.segmentKey || !segment.serviceId || !segment.providerId || !segment.resourceId || !Number.isInteger(segment.units) || segment.units < 1 || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error("Resource segment is invalid");
    return segment;
  });
}
async function scheduleAppointmentResourcesTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required");
    await assertPracticeRecord(context, "Appointment", args.appointmentId);
  } catch (error) {
    return { ...denied16, error: error instanceof Error ? error.message : "Appointment not found" };
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim()) return { ...denied16, error: "Schedule evidence is invalid" };
  let segments;
  try {
    segments = parse2(args.segments);
  } catch (error) {
    return { ...denied16, error: error instanceof Error ? error.message : "Resource segments are invalid" };
  }
  try {
    for (const segment of segments) await Promise.all([assertPracticeRecord(context, "Service", segment.serviceId), assertPracticeRecord(context, "Provider", segment.providerId), assertPracticeRecord(context, "Resource", segment.resourceId), segment.supervisorId ? assertPracticeRecord(context, "Provider", segment.supervisorId) : Promise.resolve(null)]);
    return await serializableWorkflow(context, "medspa-resource-reservation", [`appointment:${args.appointmentId}`, ...segments.map((s) => `resource:${s.resourceId}`), `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const appointment = await sudo.query.Appointment.findOne({ where: { id: args.appointmentId }, query: "id status metadata practice { id } location { id } client { id } revision lineItems { service { id } } resourceReservations { id status revision } supervisorReservations { id status }" });
      if (!appointment || ["completed", "cancelled", "no_show"].includes(appointment.status)) throw new Error("Appointment is not schedulable");
      if (appointment.metadata?.planBooking) throw new Error("Approved-plan reservations require the exact versioned plan reschedule workflow; generic segment replacement cannot change their evidence");
      const bookedServices = new Set(appointment.lineItems.map((line) => line.service?.id));
      if (segments.some((segment) => !bookedServices.has(segment.serviceId))) throw new Error("Resource segment service is not booked on this appointment");
      const revision = Math.max(Number(appointment.revision || 1), ...appointment.resourceReservations.map((item) => Number(item.revision || 0))) + 1;
      const authorities = [];
      for (const segment of segments) authorities.push(await evaluateProviderAuthority(sudo, { providerId: segment.providerId, serviceId: segment.serviceId, locationId: appointment.location.id, at: new Date(segment.startsAt), stage: "scheduling", supervisorId: segment.supervisorId }));
      for (const segment of segments) {
        if (segment.supervisorId) {
          const conflicts = await sudo.query.AppointmentSupervisorReservation.findMany({ where: { supervisor: { id: { equals: segment.supervisorId } }, status: { equals: "reserved" }, startsAt: { lt: segment.endsAt }, endsAt: { gt: segment.startsAt }, NOT: { appointment: { id: { equals: appointment.id } } } }, take: 1, query: "id" });
          if (conflicts.length) throw new Error("Required supervisor capacity is unavailable");
        }
        const resource = await sudo.query.Resource.findOne({ where: { id: segment.resourceId }, query: "id type capacity isActive readinessStatus maintenanceDueAt calibrationDueAt location { id }" });
        if (!resource || resource.location?.id !== appointment.location.id || resource.isActive === false) throw new Error("Segment resource is unavailable");
        if (["device", "equipment"].includes(resource.type) && (resource.readinessStatus !== "available" || resource.maintenanceDueAt && new Date(resource.maintenanceDueAt) <= new Date(segment.startsAt) || resource.calibrationDueAt && new Date(resource.calibrationDueAt) <= new Date(segment.startsAt))) throw new Error("Segment device is not ready");
        const overlaps = await sudo.query.AppointmentResourceReservation.findMany({ where: { resource: { id: { equals: resource.id } }, status: { in: ["reserved", "in_use"] }, startsAt: { lt: segment.endsAt }, endsAt: { gt: segment.startsAt }, NOT: { appointment: { id: { equals: appointment.id } } } }, take: 500, query: "id units" });
        const requestedParallel = segments.filter((other) => other !== segment && other.resourceId === segment.resourceId && other.startsAt < segment.endsAt && other.endsAt > segment.startsAt).reduce((sum, other) => sum + other.units, 0);
        if (overlaps.reduce((sum, item) => sum + Number(item.units || 0), 0) + requestedParallel + segment.units > Number(resource.capacity || 1)) throw new Error("Segment resource capacity is unavailable");
      }
      for (const existing of appointment.resourceReservations.filter((item) => ["reserved", "in_use"].includes(item.status))) await sudo.query.AppointmentResourceReservation.updateOne({ where: { id: existing.id }, data: { status: "superseded" }, query: "id" });
      for (const existing of appointment.supervisorReservations.filter((item) => item.status === "reserved")) await sudo.query.AppointmentSupervisorReservation.updateOne({ where: { id: existing.id }, data: { status: "superseded" }, query: "id" });
      for (const [index, segment] of segments.entries()) {
        const authority2 = authorities[index];
        if (segment.supervisorId) await sudo.query.AppointmentSupervisorReservation.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: appointment.location.id } }, appointment: { connect: { id: appointment.id } }, supervisor: { connect: { id: segment.supervisorId } }, service: { connect: { id: segment.serviceId } }, startsAt: new Date(segment.startsAt).toISOString(), endsAt: new Date(segment.endsAt).toISOString(), status: "reserved", evidenceHash: authority2.evidenceHash, idempotencyKey: `${args.idempotencyKey}:supervisor:${index}` }, query: "id" });
        const hash = evidenceHash({ appointmentId: appointment.id, revision, segment, authorityHash: authority2.evidenceHash, reason: args.reason, actorId: actor.actorId });
        await sudo.query.AppointmentResourceReservation.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: appointment.location.id } }, appointment: { connect: { id: appointment.id } }, resource: { connect: { id: segment.resourceId } }, segmentKey: segment.segmentKey, purpose: segment.purpose, units: segment.units, startsAt: new Date(segment.startsAt).toISOString(), endsAt: new Date(segment.endsAt).toISOString(), status: "reserved", revision, assignmentEvidence: { segmentKey: segment.segmentKey, serviceId: segment.serviceId, providerId: segment.providerId, supervisorId: segment.supervisorId || null, authorityHash: authority2.evidenceHash, reason: args.reason }, evidenceHash: hash, idempotencyKey: `${args.idempotencyKey}:segment:${index}` }, query: "id" });
        await recordAuthorityDecision(tx, authority2, { clientId: appointment.client?.id, appointmentId: appointment.id }, `${args.idempotencyKey}:authority:${index}`);
      }
      await sudo.query.Appointment.updateOne({ where: { id: appointment.id }, data: { revision }, query: "id" });
      return { success: true, appointmentId: appointment.id, reservationCount: segments.length, revision, error: null };
    });
  } catch (error) {
    return { ...denied16, error: error instanceof Error ? error.message : "Resource scheduling failed" };
  }
}
var resultType19 = import_core128.graphql.object()({ name: "ResourceReservationWorkflowResult", fields: { success: import_core128.graphql.field({ type: import_core128.graphql.nonNull(import_core128.graphql.Boolean) }), appointmentId: import_core128.graphql.field({ type: import_core128.graphql.ID }), reservationCount: import_core128.graphql.field({ type: import_core128.graphql.nonNull(import_core128.graphql.Int) }), revision: import_core128.graphql.field({ type: import_core128.graphql.Int }), error: import_core128.graphql.field({ type: import_core128.graphql.String }) } });
var scheduleAppointmentResources = import_core128.graphql.field({ type: resultType19, args: { appointmentId: import_core128.graphql.arg({ type: import_core128.graphql.nonNull(import_core128.graphql.ID) }), segments: import_core128.graphql.arg({ type: import_core128.graphql.nonNull(import_core128.graphql.JSON) }), reason: import_core128.graphql.arg({ type: import_core128.graphql.nonNull(import_core128.graphql.String) }), idempotencyKey: import_core128.graphql.arg({ type: import_core128.graphql.nonNull(import_core128.graphql.String) }) }, resolve(_s, args, context) {
  return scheduleAppointmentResourcesTransaction(context, args);
} });

// features/keystone/mutations/staffAccessWorkflows.ts
var import_node_crypto6 = require("node:crypto");
var import_core129 = require("@keystone-6/core");
var isCapabilityKey = (key) => capabilityKeys.some((capability) => capability === key);
var providerRoles = ["provider", "esthetician", "nurse", "physician", "assistant"];
var isProviderRole = (value) => providerRoles.some((role) => role === value);
var tokenHash = (token) => (0, import_node_crypto6.createHash)("sha256").update(token).digest("hex");
var denied17 = (error) => ({ success: false, recordId: null, token: null, error });
async function upsertAccessRoleTransaction(context, args) {
  let actor;
  try {
    actor = { ...requireActorPractice(context, permissions.canManageRoles), role: (await assertActiveActor(context)).role };
  } catch (error) {
    return denied17(error instanceof Error ? error.message : "Role authority is required");
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.name.trim() || args.name.length > 120 || !args.capabilities || typeof args.capabilities !== "object" || Array.isArray(args.capabilities)) return denied17("Access-role evidence is invalid");
  const source = args.capabilities;
  if (Object.keys(source).some((key) => !isCapabilityKey(key) || typeof source[key] !== "boolean")) return denied17("Access-role capabilities are invalid");
  const capabilities = {
    canManagePeople: source.canManagePeople === true,
    canManageRoles: source.canManageRoles === true,
    canAccessDashboard: source.canAccessDashboard === true,
    canManageOnboarding: source.canManageOnboarding === true,
    canManagePractice: source.canManagePractice === true,
    canSchedule: source.canSchedule === true,
    canReadClients: source.canReadClients === true,
    canManageClinical: source.canManageClinical === true,
    canManageSensitiveRecords: source.canManageSensitiveRecords === true,
    canManageInventory: source.canManageInventory === true,
    canManageFinance: source.canManageFinance === true,
    canManageCommunications: source.canManageCommunications === true,
    canViewReports: source.canViewReports === true,
    canManageIntegrations: source.canManageIntegrations === true
  };
  if (!capabilitiesWithinGrantAuthority(capabilities, actor.role)) return denied17("You cannot grant capabilities you do not hold");
  const data = { name: args.name.trim(), practice: { connect: { id: actor.practiceId } }, ...capabilities };
  try {
    return await serializableWorkflow(context, "medspa-access-role", [`idempotency:${args.idempotencyKey}`, ...args.roleId ? [`role:${args.roleId}`] : []], async (tx) => {
      const sudo = tx.sudo();
      const prior = (await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, correlationId: { equals: args.idempotencyKey }, action: { equals: "access_role.upserted" } }, take: 1, query: "resourceId" }))[0];
      if (prior) return { success: true, recordId: prior.resourceId, token: null, error: null };
      if (args.roleId) {
        const current = await sudo.query.Role.findOne({ where: { id: args.roleId }, query: "id practice { id } assignedTo { id } canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations" });
        if (!current || current.practice?.id !== actor.practiceId) throw new Error("Role not found");
        if (current.assignedTo?.some((user) => user.id === actor.actorId)) throw new Error("You cannot edit a role assigned to your own account");
        if (!capabilitiesWithinGrantAuthority(current, actor.role)) throw new Error("You cannot edit a role with capabilities you do not hold");
      }
      const role = args.roleId ? await sudo.query.Role.updateOne({ where: { id: args.roleId }, data, query: "id" }) : await sudo.query.Role.createOne({ data, query: "id" });
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString(), hash = tokenHash(JSON.stringify({ roleId: role.id, name: args.name, source, actorId: actor.actorId, occurredAt }));
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action: "access_role.upserted", resourceType: "Role", resourceId: role.id, correlationId: args.idempotencyKey, evidence: { name: args.name, capabilities }, evidenceHash: hash, occurredAt }, query: "id" });
      return { success: true, recordId: role.id, token: null, error: null };
    });
  } catch (error) {
    return denied17(error instanceof Error ? error.message : "Access role failed");
  }
}
async function inviteStaffTransaction(context, args) {
  let actor;
  try {
    actor = { ...requireActorPractice(context, permissions.canManageRoles), role: (await assertActiveActor(context)).role };
    await Promise.all([assertPracticeRecord(context, "Role", args.roleId), ...(args.locationIds || []).map((id) => assertPracticeRecord(context, "Location", id))]);
  } catch (error) {
    return denied17(error instanceof Error ? error.message : "Role authority is required");
  }
  const email = args.email.trim().toLowerCase();
  if (!validIdempotencyKey(args.idempotencyKey) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Number.isInteger(args.expiresInHours) || args.expiresInHours < 1 || args.expiresInHours > 168 || (args.locationIds?.length || 0) > 100) return denied17("Staff invitation is invalid");
  const invitedRole = await context.sudo().query.Role.findOne({ where: { id: args.roleId }, query: "id practice { id } canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations" });
  if (!invitedRole || invitedRole.practice?.id !== actor.practiceId || !capabilitiesWithinGrantAuthority(invitedRole, actor.role)) return denied17("You cannot assign a role with capabilities you do not hold");
  const token = (0, import_node_crypto6.randomBytes)(32).toString("base64url"), hash = tokenHash(token), expiresAt = new Date(Date.now() + args.expiresInHours * 36e5).toISOString();
  try {
    return await serializableWorkflow(context, "medspa-staff-invitation", [`email:${email}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.StaffInvitation.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id" }))[0];
      if (existing) return { success: true, recordId: existing.id, token: null, error: null };
      const users = await sudo.query.User.findMany({ where: { email: { equals: email } }, take: 1, query: "id" });
      if (users.length) throw new Error("A user with this email already exists");
      const invitation = await sudo.query.StaffInvitation.createOne({ data: { practice: { connect: { id: actor.practiceId } }, email, role: { connect: { id: args.roleId } }, locations: args.locationIds?.length ? { connect: args.locationIds.map((id) => ({ id })) } : void 0, invitedBy: { connect: { id: actor.actorId } }, tokenHash: hash, status: "pending", expiresAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      return { success: true, recordId: invitation.id, token, error: null };
    });
  } catch (error) {
    return denied17(error instanceof Error ? error.message : "Staff invitation failed");
  }
}
async function acceptStaffInvitationTransaction(context, args) {
  if (context.session?.itemId || args.token.length < 32 || !args.name.trim() || args.name.length > 120 || args.password.length < 12 || args.password.length > 200) return denied17("Invitation acceptance is invalid");
  const hash = tokenHash(args.token);
  try {
    return await serializableWorkflow(context, "medspa-staff-invitation-accept", [`token:${hash}`], async (tx) => {
      const sudo = tx.sudo();
      const invitation = (await sudo.query.StaffInvitation.findMany({ where: { tokenHash: { equals: hash } }, take: 1, query: `id email status expiresAt practice { id } role { id practice { id } canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations } locations { id practice { id } } invitedBy { id status name email practice { id } locations { id } role { id name canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations } }` }))[0];
      if (!invitation || invitation.status !== "pending" || new Date(invitation.expiresAt) <= /* @__PURE__ */ new Date()) throw new Error("Invitation is invalid or expired");
      if (invitation.role?.practice?.id !== invitation.practice?.id || invitation.locations.some((location) => location.practice?.id !== invitation.practice.id)) throw new Error("Invitation scope is invalid");
      const inviter = invitation.invitedBy;
      if (!inviter || inviter.status !== "active" || inviter.practice?.id !== invitation.practice.id || inviter.role?.canManagePeople !== true || inviter.role?.canManageRoles !== true || !capabilitiesWithinGrantAuthority(invitation.role, inviter.role)) throw new Error("Inviting authority is no longer active or cannot grant this role");
      const syntheticSession = { itemId: inviter.id, listKey: "User", data: { name: inviter.name, email: inviter.email, status: inviter.status, practice: { id: inviter.practice.id }, locations: inviter.locations || [], role: inviter.role } };
      const scoped2 = tx.withSession(syntheticSession).sudo();
      const user = await scoped2.query.User.createOne({ data: { name: args.name.trim(), email: invitation.email, password: args.password, status: "active", practice: { connect: { id: invitation.practice.id } }, role: { connect: { id: invitation.role.id } }, locations: invitation.locations.length ? { connect: invitation.locations.map((location) => ({ id: location.id })) } : void 0 }, query: "id" });
      await scoped2.query.StaffInvitation.updateOne({ where: { id: invitation.id }, data: { status: "accepted", acceptedUser: { connect: { id: user.id } }, acceptedAt: (/* @__PURE__ */ new Date()).toISOString(), tokenHash: tokenHash((0, import_node_crypto6.randomBytes)(32).toString("base64url")) }, query: "id" });
      return { success: true, recordId: user.id, token: null, error: null };
    });
  } catch {
    return denied17("Invitation is invalid or expired");
  }
}
async function createProviderProfileTransaction(context, args) {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManagePeople);
    const records = await Promise.all([assertPracticeRecord(context, "User", args.userId, "id status practice { id } providerProfile { id }"), ...args.locationIds.map((id) => assertPracticeRecord(context, "Location", id))]);
    if (records[0].status !== "active" || records[0].providerProfile?.id) throw new Error("Provider profile is unavailable");
  } catch (error) {
    return denied17(error instanceof Error ? error.message : "People authority is required");
  }
  if (!validIdempotencyKey(args.idempotencyKey) || !isProviderRole(args.role) || args.locationIds.length < 1 || args.locationIds.length > 100) return denied17("Provider profile input is invalid");
  try {
    return await serializableWorkflow(context, "medspa-provider-profile", [`user:${args.userId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const prior = (await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, correlationId: { equals: args.idempotencyKey }, action: { equals: "provider_profile.created" } }, take: 1, query: "resourceId" }))[0];
      if (prior) return { success: true, recordId: prior.resourceId, token: null, error: null };
      const provider = await sudo.query.Provider.createOne({ data: { practice: { connect: { id: actor.practiceId } }, user: { connect: { id: args.userId } }, role: args.role, title: args.title?.trim() || "", status: "inactive", isActive: false, isPublic: false, locations: { connect: args.locationIds.map((id) => ({ id })) } }, query: "id" });
      const occurredAt = (/* @__PURE__ */ new Date()).toISOString(), hash = tokenHash(JSON.stringify({ providerId: provider.id, userId: args.userId, role: args.role, actorId: actor.actorId, occurredAt }));
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action: "provider_profile.created", resourceType: "Provider", resourceId: provider.id, correlationId: args.idempotencyKey, evidence: { userId: args.userId, role: args.role, locationIds: args.locationIds, initialStatus: "inactive" }, evidenceHash: hash, occurredAt }, query: "id" });
      return { success: true, recordId: provider.id, token: null, error: null };
    });
  } catch (error) {
    return denied17(error instanceof Error ? error.message : "Provider profile failed");
  }
}
var resultType20 = import_core129.graphql.object()({ name: "StaffAccessWorkflowResult", fields: { success: import_core129.graphql.field({ type: import_core129.graphql.nonNull(import_core129.graphql.Boolean) }), recordId: import_core129.graphql.field({ type: import_core129.graphql.ID }), token: import_core129.graphql.field({ type: import_core129.graphql.String }), error: import_core129.graphql.field({ type: import_core129.graphql.String }) } });
var upsertAccessRole = import_core129.graphql.field({ type: resultType20, args: { roleId: import_core129.graphql.arg({ type: import_core129.graphql.ID }), name: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.String) }), capabilities: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.JSON) }), idempotencyKey: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.String) }) }, resolve: (_s, args, context) => upsertAccessRoleTransaction(context, args) });
var inviteStaff = import_core129.graphql.field({ type: resultType20, args: { email: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.String) }), roleId: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.ID) }), locationIds: import_core129.graphql.arg({ type: import_core129.graphql.list(import_core129.graphql.nonNull(import_core129.graphql.ID)) }), expiresInHours: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.Int) }), idempotencyKey: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.String) }) }, resolve: (_s, args, context) => inviteStaffTransaction(context, args) });
var acceptStaffInvitation = import_core129.graphql.field({ type: resultType20, args: { token: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.String) }), name: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.String) }), password: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.String) }) }, resolve: (_s, args, context) => acceptStaffInvitationTransaction(context, args) });
var createProviderProfile = import_core129.graphql.field({ type: resultType20, args: { userId: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.ID) }), role: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.String) }), title: import_core129.graphql.arg({ type: import_core129.graphql.String }), locationIds: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.list(import_core129.graphql.nonNull(import_core129.graphql.ID))) }), idempotencyKey: import_core129.graphql.arg({ type: import_core129.graphql.nonNull(import_core129.graphql.String) }) }, resolve: (_s, args, context) => {
  if (!isProviderRole(args.role)) return Promise.resolve(denied17("Provider profile input is invalid"));
  return createProviderProfileTransaction(context, { userId: args.userId, role: args.role, title: args.title, locationIds: args.locationIds, idempotencyKey: args.idempotencyKey });
} });

// features/keystone/mutations/storefrontSettings.ts
var import_core130 = require("@keystone-6/core");
var StorefrontSettingsResult = import_core130.graphql.object()({
  name: "StorefrontSettingsResult",
  fields: {
    success: import_core130.graphql.field({ type: import_core130.graphql.nonNull(import_core130.graphql.Boolean) }),
    error: import_core130.graphql.field({ type: import_core130.graphql.String })
  }
});
var publishStorefrontSettings = import_core130.graphql.field({
  type: import_core130.graphql.nonNull(StorefrontSettingsResult),
  args: {
    displayName: import_core130.graphql.arg({ type: import_core130.graphql.nonNull(import_core130.graphql.String) }),
    primaryLocationId: import_core130.graphql.arg({ type: import_core130.graphql.nonNull(import_core130.graphql.ID) }),
    accentHue: import_core130.graphql.arg({ type: import_core130.graphql.nonNull(import_core130.graphql.Int) }),
    logoSvg: import_core130.graphql.arg({ type: import_core130.graphql.String }),
    logoHue: import_core130.graphql.arg({ type: import_core130.graphql.Int }),
    isPublished: import_core130.graphql.arg({ type: import_core130.graphql.nonNull(import_core130.graphql.Boolean) }),
    expectedRevision: import_core130.graphql.arg({ type: import_core130.graphql.nonNull(import_core130.graphql.Int) })
  },
  async resolve(_source, args, context) {
    try {
      const actor = await assertActiveActor(context);
      if (actor.role?.canManagePractice !== true) throw new Error("Current practice-management authorization is required");
      const displayName = args.displayName.trim();
      if (!displayName || displayName.length > 80 || /[\u0000-\u001f\u007f]/.test(displayName)) throw new Error("Display name must be 1-80 printable characters");
      if (!validLogoHue(args.accentHue)) throw new Error("Accent hue must be a whole number from 0 through 360");
      if (args.logoHue != null && !validLogoHue(args.logoHue)) throw new Error("Logo hue must be a whole number from 0 through 360");
      const sanitized = args.logoSvg == null ? void 0 : args.logoSvg.trim() ? sanitizeStoreLogoSvg(args.logoSvg) : "";
      if (args.logoSvg?.trim() && !sanitized) throw new Error("Logo must be a safe SVG document");
      if (!Number.isInteger(args.expectedRevision) || args.expectedRevision < 0) throw new Error("Settings revision is invalid");
      return await serializableWorkflow(context, "medspa-storefront-settings", [actor.practiceId], async (tx) => {
        const current = await assertActiveActor(tx);
        if (current.practiceId !== actor.practiceId || !current.role.canManagePractice) throw new Error("Current practice-management authorization is required");
        const sudo = tx.sudo();
        const location = await sudo.query.Location.findOne({ where: { id: args.primaryLocationId }, query: "id isActive practice { id }" });
        if (!location || location.practice?.id !== actor.practiceId) throw new Error("Primary location was not found");
        if (args.isPublished && !location.isActive) throw new Error("Primary location must be active before publishing");
        const rows = await sudo.query.StorefrontSetting.findMany({ where: { practice: { id: { equals: actor.practiceId } } }, take: 2, query: "id revision logoSvg logoHue" });
        if (rows.length > 1) throw new Error("Storefront settings identity is ambiguous");
        const existing = rows[0];
        if ((existing?.revision ?? 0) !== args.expectedRevision) throw new Error("Storefront settings changed; reload before saving again");
        const data = {
          practice: { connect: { id: actor.practiceId } },
          displayName,
          primaryLocation: { connect: { id: location.id } },
          accentHue: args.accentHue,
          logoSvg: sanitized ?? existing?.logoSvg ?? DEFAULT_LOGO_SVG,
          logoHue: args.logoHue ?? existing?.logoHue ?? 0,
          isPublished: args.isPublished,
          revision: (existing?.revision ?? 0) + 1
        };
        if (existing) await sudo.query.StorefrontSetting.updateOne({ where: { id: existing.id }, data, query: "id" });
        else await sudo.query.StorefrontSetting.createOne({ data, query: "id" });
        return { success: true, error: null };
      });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Storefront settings could not be saved" };
    }
  }
});

// features/keystone/mutations/registerCustomer.ts
var import_core131 = require("@keystone-6/core");
var result = import_core131.graphql.object()({
  name: "CustomerRegistrationResult",
  fields: { success: import_core131.graphql.field({ type: import_core131.graphql.nonNull(import_core131.graphql.Boolean) }), error: import_core131.graphql.field({ type: import_core131.graphql.String }) }
});
var registerCustomer = import_core131.graphql.field({
  type: import_core131.graphql.nonNull(result),
  args: { name: import_core131.graphql.arg({ type: import_core131.graphql.nonNull(import_core131.graphql.String) }), email: import_core131.graphql.arg({ type: import_core131.graphql.nonNull(import_core131.graphql.String) }), password: import_core131.graphql.arg({ type: import_core131.graphql.nonNull(import_core131.graphql.String) }) },
  async resolve(_source, args, context) {
    const name = args.name.trim(), email = args.email.trim().toLowerCase();
    if (context.session?.itemId || !name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || args.password.length < 12 || args.password.length > 200) return { success: false, error: "Enter a name, email and password of 12\u2013200 characters." };
    try {
      const slug = process.env.MEDSPA_PRACTICE_SLUG;
      if (!slug) throw new Error("Storefront is unavailable");
      await serializableWorkflow(context, "medspa-customer-registration", [`identity:${email}`], async (tx) => {
        const sudo = tx.sudo();
        const practices = await sudo.query.Practice.findMany({ where: { slug: { equals: slug }, isActive: { equals: true }, storefrontSetting: { isPublished: { equals: true }, primaryLocation: { isActive: { equals: true } } } }, take: 2, query: "id isDemo storefrontSetting { primaryLocation { id practice { id } } }" });
        const practice = practices[0];
        if (practices.length !== 1 || !practice || practice.storefrontSetting?.primaryLocation?.practice?.id !== practice.id) throw new Error("Storefront is unavailable");
        if (practice.isDemo && !await assertOwnedLocalDatabase(tx.prisma)) throw new Error("Fictional runtime is unavailable");
        if (await sudo.query.User.count({ where: { email: { equals: email } } })) throw new Error("Account cannot be created");
        await withinCustomerCreation(tx, { practiceId: practice.id, email, name }, async () => {
          const user = await sudo.query.User.createOne({ data: { name, email, password: args.password, practice: { connect: { id: practice.id } }, status: "active", onboardingStatus: "dismissed" }, query: "id" });
          await sudo.query.Client.createOne({ data: { practice: { connect: { id: practice.id } }, user: { connect: { id: user.id } }, homeLocation: { connect: { id: practice.storefrontSetting.primaryLocation.id } } }, query: "id" });
        });
      });
      return { success: true, error: null };
    } catch {
      return { success: false, error: "Account could not be created. Sign in if you already have an account." };
    }
  }
});

// features/keystone/mutations/index.ts
var gql = String.raw;
var extendGraphqlSchema = import_core132.graphql.extend((base) => ({
  query: {
    redirectToInit: import_core132.graphql.field({
      type: import_core132.graphql.Boolean,
      resolve: redirectToInit_default
    }),
    checkAvailability,
    calculateCommission,
    storefrontProviders,
    storefrontProvider,
    publicStorefrontSettings,
    medspaOperationsWorkspace,
    medspaPlanJourney,
    medspaConsultationQueue,
    medspaAppointmentSchedule,
    medspaAppointmentClinicalHeader,
    clientPortal
  },
  mutation: {
    registerCustomer,
    bookAppointment,
    processPayment: paymentMutations.processPayment,
    confirmPayment: paymentMutations.confirmPayment,
    refundPayment: paymentMutations.refundPayment,
    reverseAppointmentSettlement: paymentMutations.reverseAppointmentSettlement,
    distributeTip: paymentMutations.distributeTip,
    purchaseGiftCard: giftCardMutations.purchaseGiftCard,
    confirmGiftCardPurchase: giftCardMutations.confirmGiftCardPurchase,
    applyGiftCardBalance: giftCardMutations.applyGiftCardBalance,
    transitionAppointment,
    processAppointmentDeposit,
    redeemClientPackage,
    reverseClientPackageUsage,
    joinWaitlist,
    transitionWaitlistEntry,
    upsertProviderSchedule,
    setProviderScheduleAvailability,
    payoutCommissions,
    adjustMedSpaInventory,
    setResourceAvailability,
    registerProviderCredential,
    configureProviderAuthorization,
    transitionProviderAuthority,
    publishConsentTemplate,
    submitIntake,
    reviewIntake,
    scheduleFollowUp,
    appendFollowUpAction,
    submitFollowUpResponse,
    recordConsultation,
    appendSignedClinicalNote,
    recordContraindicationFinding,
    decideContraindication,
    issueClinicalOrder,
    transitionClinicalOrder,
    signTreatmentConsent,
    withdrawTreatmentConsent,
    approveTreatmentPlan,
    prepareTreatmentSession,
    startTreatmentSession,
    recordTreatmentAdministration,
    grantPhotoConsent,
    withdrawPhotoConsent,
    createClinicalAssetIntent,
    markClinicalAssetReady,
    authorizeClinicalAssetAccess,
    releaseClinicalAsset,
    tombstoneClinicalAsset,
    reportIncident,
    appendIncidentAction,
    openRecallCase,
    appendRecallAction,
    transitionDeviceReadiness,
    scheduleAppointmentResources,
    receivePurchaseOrder,
    dispositionInventoryLot,
    returnRetailLot,
    acceptMembershipAgreement,
    transitionMembership,
    requestPatientRights,
    appendPatientRightsAction,
    openBreakGlass,
    placeLegalHold,
    releaseLegalHold,
    publishRetentionPolicy,
    runMedSpaOnboarding,
    upsertAccessRole,
    inviteStaff,
    acceptStaffInvitation,
    createProviderProfile,
    publishStorefrontSettings,
    completeAppointmentCheckout
  }
}));

// features/keystone/index.ts
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
var databaseURL = required("DATABASE_URL");
var localRuntime = localRuntimeDescriptor();
var sessionSecret = required("SESSION_SECRET");
if (sessionSecret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Practice Owner",
          canManagePeople: true,
          canManageRoles: true,
          canAccessDashboard: true,
          canManageOnboarding: true,
          canManagePractice: true,
          canSchedule: true,
          canReadClients: true,
          canManageClinical: true,
          canManageSensitiveRecords: true,
          canManageInventory: true,
          canManageFinance: true,
          canManageCommunications: true,
          canViewReports: true,
          canManageIntegrations: true
        }
      }
    }
  },
  passwordResetLink: {
    async sendToken(args) {
      await sendPasswordResetEmail(args.token, args.identity);
    }
  },
  sessionData: `
    name
    email
    status
    practice { id }
    locations { id }
    role {
      id name
      canManagePeople canManageRoles canAccessDashboard canManageOnboarding
      canManagePractice canSchedule canReadClients canManageClinical
      canManageSensitiveRecords canManageInventory canManageFinance
      canManageCommunications canViewReports canManageIntegrations
    }
  `
});
var keystone_default = withAuth((0, import_core133.config)({
  db: { provider: "postgresql", url: databaseURL, onConnect: async (context) => {
    await assertOwnedLocalDatabase(context.prisma);
  } },
  lists: models,
  storage: {
    my_images: localRuntime ? {
      kind: "local",
      type: "image",
      storagePath: ".runtime/medspa-goal/public-images",
      generateUrl: (path) => `/images/local/${path.replace(/^\/+/, "")}`,
      serverRoute: { path: "/images/local" }
    } : {
      kind: "s3",
      type: "image",
      bucketName: required("S3_BUCKET_NAME"),
      region: required("S3_REGION"),
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
      endpoint: required("S3_ENDPOINT"),
      signed: { expiry: 300 },
      forcePathStyle: true
    }
  },
  ui: { isAccessAllowed: ({ session }) => permissions.canAccessDashboard({ session }) },
  session: (0, import_session.statelessSessions)({
    maxAge: 60 * 60 * 24 * 7,
    secret: sessionSecret,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  }),
  graphql: { extendGraphqlSchema }
}));

// keystone.ts
var keystone_default2 = keystone_default;
//# sourceMappingURL=config.js.map
