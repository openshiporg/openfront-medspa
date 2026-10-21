import { createHash } from "node:crypto";
import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import defaultSeed from "../../platform/onboarding/lib/seed.json";
import { assertOwnedLocalDatabase } from '../localRuntime';
import { DEFAULT_LOGO_SVG } from '../../lib/store-logo';
import { captureServiceSnapshot } from "../serviceSnapshot";
import { recordInventoryMovement } from "./inventoryWorkflows";
import {
  loadScopedOnboardingImageIds,
  ONBOARDING_IMAGE_LOOKUP_LIMIT,
  resolveScopedOnboardingImage,
} from "../onboardingImageScope";
import {
  assertOnboardingLocationPractice,
  guardedOnboardingPracticeCreate,
  guardedOnboardingPracticeUpdate,
  hasAuthoritativeOnboardingPractice,
} from "../onboardingTenantIntegrity";

const REQUIRED_ARRAYS = [
  "resources", "categories", "services", "providers", "scheduleBlocks", "clients",
  "intakeForms", "formTemplates", "memberships", "packages", "products",
  "messageTemplates", "appointments", "gallery", "paymentProviders",
] as const;

export type MedSpaOnboardingResult = {
  success: boolean;
  completed: boolean;
  created: number;
  reused: number;
  locationId: string | null;
  error: string | null;
};

type FailurePoint = "resources" | "services" | "people" | "appointments";

// A real practice gets its location, settings and catalog as private drafts the
// merchant reviews and publishes; template people, photos and paid offers are not copied.
function realPracticeSeed(seed: Record<string, any>) {
  return {
    ...seed,
    storefront: { ...seed.storefront, isPublished: false },
    resources: seed.resources.map((item: any) => ({ ...item, isPublic: false })),
    services: seed.services.map((item: any) => ({ ...item, isPublic: false })),
    providers: [], scheduleBlocks: [], clients: [], appointments: [], gallery: [], memberships: [], packages: [],
  };
}

function validateSeed(input: unknown, isolatedLocal: boolean): any {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("MedSpa seed must be an object");
  let seed = input as Record<string, any>;
  if (!seed.medspaInfo || typeof seed.medspaInfo !== "object" || Array.isArray(seed.medspaInfo)) {
    throw new Error("MedSpa seed requires medspaInfo");
  }
  if (!seed.storefront || typeof seed.storefront !== "object" || Array.isArray(seed.storefront)) {
    throw new Error("MedSpa seed requires storefront settings");
  }
  if (!String(seed.medspaInfo.name || "").trim() || !String(seed.storefront.displayName || '').trim()) {
    throw new Error("Onboarding requires a practice name and storefront display name");
  }
  if (isolatedLocal && !/\b(?:demo|mock)\b/i.test(String(seed.medspaInfo.name || ""))) {
    throw new Error("Onboarding practice and storefront identities must be clearly marked demo or mock");
  }
  if (!Number.isInteger(seed.storefront.accentHue) || seed.storefront.accentHue < 0 || seed.storefront.accentHue > 360 || (isolatedLocal && seed.storefront.isPublished !== true)) {
    throw new Error("Onboarding storefront settings must publish a valid demo hue");
  }
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(seed[key])) throw new Error(`MedSpa seed requires ${key}`);
    if (seed[key].length > 500) throw new Error(`MedSpa seed ${key} exceeds the 500-item limit`);
  }
  if (!isolatedLocal) seed = realPracticeSeed(seed);
  const imagePaths = [
    ...seed.services.map((item: any) => item.imagePath),
    ...seed.providers.map((item: any) => item.imagePath),
    ...seed.gallery.map((item: any) => item.imagePath),
  ].filter(Boolean);
  if (imagePaths.some((value: unknown) => typeof value !== "string" || !/^\/images\/[a-z0-9_./-]+$/i.test(value) || value.includes(".."))) {
    throw new Error("MedSpa seed image paths must be canonical relative /images/ paths");
  }
  const resourceTypes = new Set(["room", "device", "equipment", "station", "other"]);
  if (seed.resources.some((item: any) => !resourceTypes.has(item.type))) throw new Error("MedSpa seed contains an unsupported resource type");
  if (isolatedLocal && (!/\b(?:demo|mock|fictional)\b/i.test(`${seed.medspaInfo.name || ""} ${seed.medspaInfo.address || ""}`)
    || !/^\+?1?[\s().-]*[2-9]\d{2}[\s().-]*555[\s.-]*01\d{2}$/.test(String(seed.medspaInfo.phone || ""))
    || !/@[a-z0-9.-]+\.example$/i.test(String(seed.medspaInfo.email || "")))) {
    throw new Error("Onboarding location and contact must be unmistakably fictional demo data");
  }
  const resourcesByKey = new Map(seed.resources.map((item: any) => [item.key, item]));
  for (const resource of seed.resources) {
    if (typeof resource.isPublic !== "boolean" || (resource.isPublic && resource.isActive !== true)) {
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
      const resource = resourcesByKey.get(resourceKey) as any;
      if (service.isPublic && (!resource || resource.isActive !== true || resource.isPublic !== true)) {
        throw new Error(`Public onboarding service ${service.name || "unknown"} requires an active explicitly public resource`);
      }
    }
  }
  if (isolatedLocal && !seed.services.some((service: any) => service.status === "active" && service.isPublic === true)) {
    throw new Error("Onboarding requires at least one active mock public service");
  }
  const servicesByKey = new Map(seed.services.map((item: any) => [item.key, item]));
  const providersByKey = new Map(seed.providers.map((item: any) => [item.key, item]));
  for (const provider of seed.providers) {
    if (typeof provider.isPublic !== "boolean" || (provider.isPublic && (provider.status !== "active" || provider.isActive !== true || provider.role !== "assistant"
      || !isolatedLocal))) {
      throw new Error(`Public onboarding provider ${provider.name || "unknown"} must be active, explicitly public, fictional demo support personnel`);
    }
    for (const serviceKey of provider.specializations || []) {
      const service = servicesByKey.get(serviceKey) as any;
      if (provider.isPublic && (!service || service.status !== "active" || service.isPublic !== true)) {
        throw new Error(`Public onboarding provider ${provider.name || "unknown"} may reference only active explicitly public services`);
      }
    }
  }
  for (const block of seed.scheduleBlocks) {
    const provider = providersByKey.get(block.provider) as any;
    if (typeof block.isPublic !== "boolean" || (block.isPublic && (block.isAvailable !== true || !provider || provider.isPublic !== true))) {
      throw new Error(`Public onboarding schedule ${block.key || "unknown"} must be available and belong to explicitly public demo personnel`);
    }
  }
  if (seed.products.some((item: any) => item.trackLots !== false && Number(item.quantity || 0) > 0)) {
    throw new Error("Tracked inventory must enter through controlled lot receiving");
  }
  for (const [section, fields] of Object.entries({
    memberships: ["monthlyPrice"],
    packages: ["totalPrice", "savingsAmount"],
    products: ["price", "cost"],
  })) {
    for (const item of seed[section]) {
      for (const field of fields) {
        if (item[field] != null && !Number.isInteger(item[field])) {
          throw new Error(`${section}.${field} must be integer cents`);
        }
      }
    }
  }
  return seed;
}

function appointmentStart(item: any) {
  const start = new Date();
  start.setDate(start.getDate() + (item.dayOffset || 1));
  const [hours, minutes] = (item.time || "10:00").split(":").map(Number);
  start.setHours(hours, minutes, 0, 0);
  return start;
}

export async function runMedSpaOnboardingTransaction(
  context: Context,
  seedInput: unknown = defaultSeed,
  failurePoint?: FailurePoint,
): Promise<MedSpaOnboardingResult> {
  const userId = context.session?.itemId;
  if (!userId || context.session?.data?.role?.canManageOnboarding !== true) throw new Error("You do not have permission to run medspa onboarding");
  const actor = await context.sudo().query.User.findOne({ where: { id: userId }, query: "id status practice { id } role { id canManageOnboarding practice { id } assignedTo { id practice { id } } }" });
  if (!actor || actor.status !== "active" || actor.role?.canManageOnboarding !== true) throw new Error("You do not have permission to run medspa onboarding");
  if (actor.practice?.id && context.session?.data.practice?.id !== actor.practice.id) throw new Error("Authenticated practice scope is stale");
  if (actor.role?.practice?.id && actor.role.practice.id !== actor.practice?.id) throw new Error("Role and user practice scopes do not match");
  if (actor.practice?.id && !actor.role?.practice?.id && actor.role.assignedTo.some((user: any) => user.practice?.id !== actor.practice.id)) throw new Error("Legacy role spans multiple practice scopes");
  if (!actor.practice?.id && (actor.role?.practice?.id || actor.role?.assignedTo?.length !== 1 || actor.role.assignedTo[0]?.id !== actor.id)) {
    throw new Error("The one-time onboarding role is not an isolated bootstrap role");
  }
  const isolatedLocal = await assertOwnedLocalDatabase(context.prisma);
  const seed = validateSeed(seedInput, isolatedLocal);

  return context.transaction(async (transactionContext: Context) => {
    await transactionContext.prisma.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      "openfront-medspa-onboarding",
    );
    // Hold the exact current actor and role through commit; concurrent access
    // revocation cannot slip between preflight and the setup writes.
    await transactionContext.prisma.$queryRawUnsafe('SELECT "id" FROM "User" WHERE "id" = $1 FOR SHARE', userId);
    await transactionContext.prisma.$queryRawUnsafe('SELECT "id" FROM "Role" WHERE "id" = $1 FOR SHARE', actor.role.id);
    const currentActor = await transactionContext.sudo().query.User.findOne({ where: { id: userId }, query: 'id status role { id canManageOnboarding }' });
    if (currentActor?.status !== 'active' || currentActor.role?.id !== actor.role.id || currentActor.role.canManageOnboarding !== true) throw new Error('Current onboarding authority is required');
    let sudo = transactionContext.sudo();
    let created = 0;
    let reused = 0;
    let onboardingPracticeId: string | null = actor.practice?.id || null;

    const findOne = async (list: keyof typeof sudo.query, where: any, query = "id") => {
      if (list !== "Practice" && (!onboardingPracticeId || !hasAuthoritativeOnboardingPractice(list))) {
        throw new Error(`Onboarding cannot query ${list} without authoritative practice ownership`);
      }
      const scopedWhere = list !== "Practice"
        ? { AND: [where, { practice: { id: { equals: onboardingPracticeId } } }] }
        : where;
      const rows = await (sudo.query[list] as any).findMany({ where: scopedWhere, take: 1, query });
      return rows[0] || null;
    };
    const createOne = async (list: keyof typeof sudo.query, data: any, query = "id") => {
      if (list === "Practice") {
        throw new Error("Practice creation is restricted to the isolated onboarding bootstrap branch");
      }
      const record = await guardedOnboardingPracticeCreate({
        list,
        practiceId: onboardingPracticeId,
        data,
        query,
        create: (args) => (sudo.query[list] as any).createOne(args),
      });
      created += 1;
      return record;
    };
    const updateOne = async (list: keyof typeof sudo.query, id: string, data: any, query = "id") => {
      if (list === "Practice") {
        if (!onboardingPracticeId || id !== onboardingPracticeId) {
          throw new Error("Onboarding Practice update must match the established practice identity");
        }
        const existing = await sudo.query.Practice.findOne({ where: { id }, query: "id" });
        if (!existing || existing.id !== onboardingPracticeId) {
          throw new Error("Onboarding Practice update target is stale or missing");
        }
        const updated = await sudo.query.Practice.updateOne({ where: { id }, data, query });
        if (!updated || updated.id !== onboardingPracticeId) {
          throw new Error("Onboarding Practice update did not retain its established identity");
        }
        reused += 1;
        return updated;
      }
      const updated = await guardedOnboardingPracticeUpdate({
        list,
        id,
        practiceId: onboardingPracticeId,
        data,
        query,
        read: (args) => (sudo.query[list] as any).findMany(args),
        update: (args) => (sudo.query[list] as any).updateOne(args),
      });
      reused += 1;
      return updated;
    };

    const medspa = seed.medspaInfo;
    const practiceSlug = medspa.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let practice: any;
    if (onboardingPracticeId) {
      practice = await sudo.query.Practice.findOne({ where: { id: onboardingPracticeId }, query: "id slug name isDemo" });
      if (!practice) throw new Error("Authenticated practice not found");
      if (!isolatedLocal || !practice.isDemo) throw new Error("Practice setup has already been completed");
      if (practice.name !== medspa.name) practice = await updateOne("Practice", practice.id, { name: medspa.name }, "id slug name");
      if (!actor.role.practice?.id) await sudo.query.Role.updateOne({ where: { id: actor.role.id }, data: { practice: { connect: { id: practice.id } } }, query: "id" });
    } else {
      const collision = await sudo.query.Practice.findMany({ where: { slug: { equals: practiceSlug } }, take: 1, query: "id" });
      if (collision.length) throw new Error("Practice slug is already in use");
      practice = await sudo.query.Practice.createOne({
        data: { name: medspa.name, slug: practiceSlug, currencyCode: "USD", isActive: true, isDemo: isolatedLocal },
        query: "id slug name",
      });
      if (!practice || typeof practice.id !== "string" || practice.name !== medspa.name || practice.slug !== practiceSlug) {
        throw new Error("Isolated onboarding bootstrap did not create the expected Practice identity");
      }
      created += 1;
      onboardingPracticeId = practice.id;
      await transactionContext.prisma.user.update({ where: { id: userId }, data: { practiceId: practice.id } });
      await transactionContext.prisma.role.update({ where: { id: actor.role.id }, data: { practiceId: practice.id } });
      const scopedSession = { ...context.session!, data: { ...context.session!.data, practice: { id: practice.id } } } as any;
      sudo = transactionContext.withSession(scopedSession).sudo();
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: practice.id } }, actor: { connect: { id: userId } }, action: "practice.bootstrap.completed", resourceType: "Practice", resourceId: practice.id, correlationId: `onboarding:${practice.id}`, evidence: { roleId: actor.role.id }, evidenceHash: createHash("sha256").update(`${userId}:${actor.role.id}:${practice.id}`).digest("hex"), occurredAt: new Date().toISOString() }, query: "id" });
    }
    const locationData = {
      name: seed.storefront.displayName.trim(), address: medspa.address, city: medspa.city, state: medspa.state,
      zipCode: medspa.zipCode, phone: medspa.phone, email: medspa.email,
      timezone: medspa.timezone, hours: medspa.hours, isActive: true,
    };
    const priorStorefront = await findOne("StorefrontSetting", {}, "id primaryLocation { id }");
    let existingLocation: any = null;
    if (priorStorefront?.primaryLocation?.id) {
      const priorLocationId = priorStorefront.primaryLocation.id;
      existingLocation = await findOne(
        "Location",
        { id: { equals: priorLocationId } },
        "id practice { id }",
      );
      assertOnboardingLocationPractice(existingLocation, onboardingPracticeId, priorLocationId);
    } else {
      existingLocation = await findOne("Location", { name: { equals: medspa.name } }, "id practice { id }");
      if (existingLocation) assertOnboardingLocationPractice(existingLocation, onboardingPracticeId);
    }
    const location = existingLocation
      ? await updateOne("Location", existingLocation.id, locationData, "id practice { id }")
      : await createOne("Location", locationData, "id practice { id }");
    assertOnboardingLocationPractice(location, onboardingPracticeId);

    // Ordinary owner scheduling membership, not professional credentials or a
    // global role grant. Never reactivate a suspended/ended membership on replay.
    const ownerMembership = await findOne('PracticeMembership', { user: { id: { equals: userId } } }, 'id status locations { id }');
    if (ownerMembership && ownerMembership.status !== 'active') throw new Error('Owner membership requires an explicit reviewed access change');
    if (!ownerMembership) {
      const currentOwner = await sudo.query.User.findOne({ where: { id: userId }, query: 'id role { canManagePractice }' });
      if (!currentOwner?.role?.canManagePractice) throw new Error('Current practice-owner authority is required to establish membership');
      await createOne('PracticeMembership', { user: { connect: { id: userId } }, locations: { connect: [{ id: location.id }] }, status: 'active' });
    }

    const resourceIds: Record<string, string> = {};
    for (const item of seed.resources) {
      const data = {
        name: item.name, type: item.type || "station", capacity: item.capacity || 1,
        isActive: item.isActive ?? true, isPublic: item.isPublic === true,
        readinessStatus: item.readinessStatus || "acceptance_testing", notes: item.notes || "",
        metadata: { ...(item.metadata || {}), seedKey: item.key, source: "onboarding" },
        location: { connect: { id: location.id } },
      };
      const existing = await findOne("Resource", { name: { equals: item.name } });
      const record = existing
        ? await updateOne("Resource", existing.id, data)
        : await createOne("Resource", data);
      resourceIds[item.key] = record.id;
    }
    if (failurePoint === "resources") throw new Error("Injected onboarding failure after resources");

    const categoryIds: Record<string, string> = {};
    for (const item of seed.categories) {
      const data = {
        name: item.name, description: item.description || "", slug: item.slug,
        displayOrder: item.displayOrder || 0, sortOrder: item.displayOrder || 0,
        isVisible: true, icon: item.icon || "",
      };
      const existing = await findOne("ServiceCategory", { slug: { equals: item.slug } });
      const record = existing
        ? await updateOne("ServiceCategory", existing.id, data)
        : await createOne("ServiceCategory", data);
      categoryIds[item.key] = record.id;
      categoryIds[item.name] = record.id;
    }

    let onboardingImageIds: string[] | null = null;
    const getOnboardingImageIds = async (practiceId: string | null) => {
      if (onboardingImageIds) return onboardingImageIds;
      const lookup = await loadScopedOnboardingImageIds(
        practiceId,
        (args) => sudo.query.MedSpaImage.findMany(args as any),
      );
      if (lookup.status === "overflow") {
        throw new Error(`Practice image inventory exceeds the safe onboarding lookup limit of ${lookup.limit}`);
      }
      onboardingImageIds = lookup.ids;
      return onboardingImageIds;
    };

    const imageByPath = async (imagePath: string, altText: string, metadata: Record<string, unknown>) => {
      const imagePracticeId = onboardingPracticeId;
      if (!imagePracticeId) throw new Error("Onboarding image writes require an established practice");
      if (Object.prototype.hasOwnProperty.call(metadata, "seedKey")
        && (typeof metadata.seedKey !== "string" || !metadata.seedKey.trim())) {
        throw new Error("Onboarding image seed key is malformed");
      }
      const seedKey = typeof metadata.seedKey === "string" ? metadata.seedKey : null;
      const candidateIds = await getOnboardingImageIds(imagePracticeId);
      const lookup = await resolveScopedOnboardingImage(
        imagePracticeId,
        candidateIds,
        seedKey,
        imagePath,
        (args) => transactionContext.prisma.medSpaImage.findMany(args as any),
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
        metadata: { ...metadata, source: "onboarding" },
      };
      const query = "id practice { id } imagePath";
      const record = lookup.status === "found"
        ? await updateOne("MedSpaImage", lookup.id, data, query)
        : await createOne("MedSpaImage", data, query);
      if (!record || typeof record.id !== "string" || record.practice?.id !== imagePracticeId) {
        throw new Error("Onboarding image write did not retain the established practice scope");
      }
      if (lookup.status === "missing") candidateIds.push(record.id);
      return record;
    };

    const serviceIds: Record<string, string> = {};
    const serviceRecords: Record<string, any> = {};
    for (const item of seed.services) {
      const image = item.imagePath
        ? await imageByPath(item.imagePath, item.name, { seedKey: `service-image:${item.key}`, placement: "service" })
        : null;
      const resourceConnections = (item.requiredResources || []).map((key: string) => resourceIds[key]).filter(Boolean).map((id: string) => ({ id }));
      const data = {
        name: item.name, description: item.description || "", baseDuration: item.baseDuration,
        price: item.price, basePrice: item.basePrice, depositRequired: item.depositRequired ?? false,
        depositAmount: item.depositAmount || 0, status: item.status || "inactive",
        isPublic: item.isPublic === true,
        staffAuthorizationRequired: item.staffAuthorizationRequired ?? true,
        requiresConsultation: item.requiresConsultation ?? true,
        requiresIntakeReview: item.requiresIntakeReview ?? true,
        requiresLotTraceability: item.requiresLotTraceability ?? true,
        metadata: { ...(item.metadata || {}), seedKey: item.key, source: "onboarding" },
        category: categoryIds[item.category] ? { connect: { id: categoryIds[item.category] } } : undefined,
        requiredResources: { connect: resourceConnections },
        image: image ? { connect: { id: image.id } } : undefined,
      };
      const existing = await findOne("Service", { name: { equals: item.name } });
      const record = existing
        ? await updateOne("Service", existing.id, data, "id name price basePrice baseDuration image { imagePath image { url } }")
        : await createOne("Service", data, "id name price basePrice baseDuration image { imagePath image { url } }");
      serviceIds[item.key] = record.id;
      serviceRecords[item.key] = record;
    }
    const storefrontData = {
      practice: { connect: { id: practice.id } },
      displayName: seed.storefront.displayName.trim(),
      primaryLocation: { connect: { id: location.id } },
      accentHue: seed.storefront.accentHue,
      isPublished: seed.storefront.isPublished === true,
    };
    // Match the explicit publisher's physical practice lock before read/revision/write.
    await transactionContext.prisma.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', 'medspa-storefront-settings', practice.id);
    const existingStorefront = await findOne("StorefrontSetting", {}, "id revision displayName accentHue isPublished primaryLocation { id }");
    if (existingStorefront) {
      const unchanged = existingStorefront.displayName === storefrontData.displayName
        && existingStorefront.accentHue === storefrontData.accentHue
        && existingStorefront.isPublished === storefrontData.isPublished
        && existingStorefront.primaryLocation?.id === location.id;
      if (unchanged) reused += 1;
      else await updateOne("StorefrontSetting", existingStorefront.id, {
        ...storefrontData,
        revision: existingStorefront.revision + 1,
      });
    } else {
      await createOne("StorefrontSetting", { ...storefrontData, logoSvg: DEFAULT_LOGO_SVG, logoHue: 0, revision: 1 });
    }
    if (failurePoint === "services") throw new Error("Injected onboarding failure after services");

    const userIds: Record<string, string> = {};
    const ensureUser = async (person: any) => {
      const existing = await findOne("User", { email: { equals: person.email } }, "id name email");
      if (existing) {
        reused += 1;
        userIds[person.key] = existing.id;
        return existing;
      }
      const user = await createOne("User", {
        name: person.name, email: person.email, phone: person.phone || "",
        password: `seed_${crypto.randomUUID()}_${crypto.randomUUID()}`,
      }, "id name email");
      userIds[person.key] = user.id;
      return user;
    };

    const providerIds: Record<string, string> = {};
    for (const item of seed.providers) {
      const user = await ensureUser(item);
      const image = item.imagePath
        ? await imageByPath(item.imagePath, item.name, { seedKey: `provider-image:${item.key}`, placement: "provider" })
        : null;
      const specializations = (item.specializations || []).map((key: string) => serviceIds[key]).filter(Boolean).map((id: string) => ({ id }));
      const data = {
        user: { connect: { id: user.id } }, role: item.role || "assistant", tier: item.tier || "junior",
        title: item.title || "", bio: item.bio || "", baseCommissionRate: item.baseCommissionRate ?? 0,
        commissionRate: item.baseCommissionRate ?? 0, status: item.status || "inactive",
        isActive: item.isActive === true, isPublic: item.isPublic === true,
        photo: image ? { connect: { id: image.id } } : undefined,
        specializations: { connect: specializations }, locations: { connect: [{ id: location.id }] },
      };
      const existing = await findOne("Provider", { user: { id: { equals: user.id } } });
      const record = existing
        ? await updateOne("Provider", existing.id, data)
        : await createOne("Provider", data);
      providerIds[item.key] = record.id;
    }

    for (const block of seed.scheduleBlocks) {
      const providerId = providerIds[block.provider];
      for (const dayOfWeek of block.daysOfWeek || []) {
        const where = {
          provider: { id: { equals: providerId } }, location: { id: { equals: location.id } }, dayOfWeek: { equals: dayOfWeek },
          startTime: { equals: block.startTime }, endTime: { equals: block.endTime }, type: { equals: "recurring" },
        };
        const existing = await findOne("ProviderSchedule", where);
        const data = {
          type: "recurring", dayOfWeek, startTime: block.startTime, endTime: block.endTime,
          breakStart: block.breakStart || "", breakEnd: block.breakEnd || "",
          isAvailable: block.isAvailable ?? true, isPublic: block.isPublic === true,
          provider: { connect: { id: providerId } },
          location: { connect: { id: location.id } },
          idempotencyKey: `onboarding:schedule:${block.provider}:${dayOfWeek}:${block.startTime}-${block.endTime}`,
        };
        if (existing) await updateOne("ProviderSchedule", existing.id, data);
        else await createOne("ProviderSchedule", data);
      }
    }

    const clientIds: Record<string, string> = {};
    for (const item of seed.clients) {
      const user = await ensureUser(item);
      const data = {
        user: { connect: { id: user.id } }, homeLocation: { connect: { id: location.id } },
        preferredProvider: item.preferredProvider && providerIds[item.preferredProvider]
          ? { connect: { id: providerIds[item.preferredProvider] } } : undefined,
        operationalNotes: item.operationalNotes || item.notes || "", marketingConsent: item.marketingConsent ?? false,
        totalVisits: 0, lifetimeValue: 0,
      };
      const existing = await findOne("Client", { user: { id: { equals: user.id } } });
      const record = existing ? await updateOne("Client", existing.id, data) : await createOne("Client", data);
      clientIds[item.key] = record.id;
    }
    if (failurePoint === "people") throw new Error("Injected onboarding failure after people");

    for (const item of seed.intakeForms) {
      const services = (item.requiredForServices || []).map((key: string) => serviceIds[key]).filter(Boolean).map((id: string) => ({ id }));
      const data = { name: item.name, fields: item.fields, isActive: true, requiredForServices: { connect: services } };
      const existing = await findOne("IntakeForm", { name: { equals: item.name } });
      if (existing) await updateOne("IntakeForm", existing.id, data); else await createOne("IntakeForm", data);
    }
    for (const item of seed.formTemplates) {
      const data = { name: item.name, type: item.type, description: item.description || "", fields: item.fields, isActive: true };
      const existing = await findOne("FormTemplate", { name: { equals: item.name } });
      if (existing) await updateOne("FormTemplate", existing.id, data); else await createOne("FormTemplate", data);
    }
    for (const item of seed.memberships) {
      const services = (item.includedServices || []).map((key: string) => serviceIds[key]).filter(Boolean).map((id: string) => ({ id }));
      const data = { name: item.name, description: item.description || "", monthlyPrice: item.monthlyPrice, discountPercent: item.discountPercent, isActive: true, includedServices: { connect: services } };
      const existing = await findOne("Membership", { name: { equals: item.name } });
      if (existing) await updateOne("Membership", existing.id, data); else await createOne("Membership", data);
    }
    for (const item of seed.packages) {
      const services = (item.services || []).map((key: string) => serviceIds[key] || Object.entries(serviceRecords).find(([, service]) => service.name === key)?.[1]?.id).filter(Boolean).map((id: string) => ({ id }));
      const data = { name: item.name, description: item.description || "", totalPrice: item.totalPrice, savingsAmount: item.savingsAmount, validDays: item.validDays, isActive: true, services: { connect: services } };
      const existing = await findOne("ServicePackage", { name: { equals: item.name } });
      if (existing) await updateOne("ServicePackage", existing.id, data); else await createOne("ServicePackage", data);
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
            metadata: { source: "onboarding", seedKey: item.key },
          });
          if (!movement.success) throw new Error(movement.error || "Unable to establish opening inventory");
        }
      }
    }
    for (const item of seed.messageTemplates) {
      const data = { name: item.name, type: item.type, content: item.content, variables: item.variables, isActive: true };
      const existing = await findOne("MessageTemplate", { name: { equals: item.name } });
      if (existing) await updateOne("MessageTemplate", existing.id, data); else await createOne("MessageTemplate", data);
    }
    for (const item of seed.gallery) {
      await imageByPath(item.imagePath, item.title, {
        seedKey: `gallery:${item.key}`, placement: "gallery", title: item.title,
        caption: item.caption, serviceId: item.service ? serviceIds[item.service] : null,
      });
    }

    // Do not scan arbitrary JSON metadata or globally deduplicate seed keys here.
    // Each image lookup is scoped to a bounded same-practice ID set; duplicate
    // or malformed identities fail closed instead of deleting any image.
    const existingAppointments = await sudo.query.Appointment.findMany({ take: 500, query: "id metadata" });
    for (const item of seed.appointments) {
      const existing = existingAppointments.find((appointment: any) => appointment.metadata?.seedKey === item.key);
      if (existing) { reused += 1; continue; }
      const services = (item.services || []).map((key: string) => serviceRecords[key]).filter(Boolean);
      const duration = services.reduce((sum: number, service: any) => sum + Number(service.baseDuration || 0), 0) || 60;
      const start = appointmentStart(item);
      const end = new Date(start.getTime() + duration * 60_000);
      await createOne("Appointment", {
        startTime: start.toISOString(), endTime: end.toISOString(), duration,
        status: item.status || "confirmed", depositPaid: item.depositPaid ?? false,
        metadata: { seedKey: item.key, source: "onboarding" }, notes: item.notes || "",
        location: { connect: { id: location.id } }, client: clientIds[item.client] ? { connect: { id: clientIds[item.client] } } : undefined,
        provider: providerIds[item.provider] ? { connect: { id: providerIds[item.provider] } } : undefined,
        services: { connect: services.map((service: any) => ({ id: service.id })) },
        lineItems: { create: services.map((service: any) => {
          const snapshot = captureServiceSnapshot(service);
          return {
            service: { connect: { id: service.id } },
            staff: providerIds[item.provider] ? { connect: { id: providerIds[item.provider] } } : undefined,
            serviceTitle: snapshot.serviceTitle, serviceImagePath: snapshot.serviceImagePath,
            duration: snapshot.duration, price: snapshot.price,
            quantity: 1, notes: item.notes || "",
            metadata: {
              seedKey: `${item.key}:${service.id}`, source: "onboarding", snapshotVersion: 1,
              serviceName: snapshot.serviceTitle, serviceImagePath: snapshot.serviceImagePath,
            },
          };
        }) },
      });
    }
    if (failurePoint === "appointments") throw new Error("Injected onboarding failure after appointments");

    for (const item of seed.paymentProviders) {
      const providerCode = `pp_${practiceSlug}_${String(item.code).replace(/^pp_/, "")}`;
      const data = {
        name: item.name, code: providerCode, adapter: item.adapter,
        isInstalled: item.isInstalled ?? false, isDefault: item.isDefault ?? false,
        config: item.config || {},
      };
      const existing = await findOne("PaymentProvider", { code: { equals: providerCode } });
      if (existing) await updateOne("PaymentProvider", existing.id, data); else await createOne("PaymentProvider", data);
    }

    if (!onboardingPracticeId) throw new Error("Onboarding completion requires an established practice");
    const completionActors = await sudo.query.User.findMany({
      where: {
        AND: [
          { id: { equals: userId } },
          { practice: { id: { equals: onboardingPracticeId } } },
        ],
      },
      take: 2,
      query: "id practice { id }",
    });
    if (completionActors.length !== 1 || completionActors[0]?.practice?.id !== onboardingPracticeId) {
      throw new Error("Onboarding completion actor is stale or outside the established practice");
    }
    const completedActor = await sudo.query.User.updateOne({
      where: { id: userId },
      data: { onboardingStatus: "completed" },
      query: "id practice { id }",
    });
    if (!completedActor || completedActor.id !== userId || completedActor.practice?.id !== onboardingPracticeId) {
      throw new Error("Onboarding completion did not retain the established practice scope");
    }

    return { success: true, completed: true, created, reused, locationId: location.id, error: null };
  }, { maxWait: 5_000, timeout: 120_000, isolationLevel: "Serializable" as any });
}

const resultType = graphql.object<MedSpaOnboardingResult>()({
  name: "RunMedSpaOnboardingResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    completed: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    created: graphql.field({ type: graphql.nonNull(graphql.Int) }),
    reused: graphql.field({ type: graphql.nonNull(graphql.Int) }),
    locationId: graphql.field({ type: graphql.ID }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const runMedSpaOnboarding = graphql.field({
  type: resultType,
  args: { seed: graphql.arg({ type: graphql.JSON }) },
  async resolve(_source, { seed }, context: Context) {
    return runMedSpaOnboardingTransaction(context, seed ?? defaultSeed);
  },
});
