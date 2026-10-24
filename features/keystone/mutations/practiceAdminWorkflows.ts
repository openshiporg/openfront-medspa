import { graphql } from "@keystone-6/core";
import type { Context, ProviderRoleType, ProviderStatusType, ProviderTierType } from ".keystone/types";
import { permissions } from "../access";
import { assertActiveActor, assertPracticeRecord, evidenceHash, jsonValue, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";

type Result = { success: boolean; recordId: string | null; error: string | null };
const denied = (error: string): Result => ({ success: false, recordId: null, error });
const failure = (error: unknown, fallback: string) => denied(error instanceof Error ? error.message : fallback);

const providerRoles: readonly ProviderRoleType[] = ["provider", "esthetician", "nurse", "physician", "assistant"];
const providerTiers: readonly ProviderTierType[] = ["junior", "senior", "master", "celebrity"];
const providerStatuses: readonly ProviderStatusType[] = ["active", "on_leave", "inactive"];
const WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

async function auditOnce(sudo: ReturnType<Context["sudo"]>, practiceId: string, action: string, idempotencyKey: string) {
  return (await sudo.query.AuditEvent.findMany({
    where: { practice: { id: { equals: practiceId } }, correlationId: { equals: idempotencyKey }, action: { equals: action } },
    take: 1, query: "resourceId",
  }))[0] || null;
}

async function audit(sudo: ReturnType<Context["sudo"]>, practiceId: string, actorId: string, action: string, resourceType: string, resourceId: string, idempotencyKey: string, evidence: Record<string, unknown>) {
  const occurredAt = new Date().toISOString();
  await sudo.query.AuditEvent.createOne({
    data: {
      practice: { connect: { id: practiceId } }, actor: { connect: { id: actorId } }, action, resourceType, resourceId,
      correlationId: idempotencyKey, evidence: jsonValue(evidence), evidenceHash: evidenceHash({ ...evidence, resourceId, actorId, occurredAt }), occurredAt,
    },
    query: "id",
  });
}

const uniqueIds = (ids: readonly string[] | null | undefined) => [...new Set((ids || []).filter(Boolean))];

export type ProviderProfileInput = {
  providerId: string; title?: string | null; bio?: string | null; role: string; tier: string; status: string;
  isActive: boolean; isPublic: boolean; specializationIds: readonly string[]; locationIds: readonly string[]; idempotencyKey: string;
};

/**
 * Edits a provider's profile, treatments and locations. Activation keeps the
 * authority rule: a provider who performs treatments that need clinical
 * authority must hold an effective credential and service authorization.
 */
export async function updateProviderProfileTransaction(context: Context, args: ProviderProfileInput): Promise<Result> {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManagePeople, "People-management access is required");
    await assertActiveActor(context);
  } catch (error) { return failure(error, "People-management access is required"); }

  const specializationIds = uniqueIds(args.specializationIds);
  const locationIds = uniqueIds(args.locationIds);
  const title = args.title?.trim() || "";
  const bio = args.bio?.trim() || "";
  if (!validIdempotencyKey(args.idempotencyKey)) return denied("A valid request key is required");
  if (!providerRoles.includes(args.role as ProviderRoleType)) return denied("Choose a valid role");
  if (!providerTiers.includes(args.tier as ProviderTierType)) return denied("Choose a valid tier");
  if (!providerStatuses.includes(args.status as ProviderStatusType)) return denied("Choose a valid status");
  if (title.length > 120 || bio.length > 4_000) return denied("Title or bio is too long");
  if (!locationIds.length || locationIds.length > 100 || specializationIds.length > 200) return denied("Choose at least one location");
  if (args.isPublic && (args.status !== "active" || !args.isActive)) return denied("Only an active provider can be bookable online");
  const active = args.status === "active" && args.isActive;

  try {
    await Promise.all([
      assertPracticeRecord(context, "Provider", args.providerId),
      ...locationIds.map((id) => assertPracticeRecord(context, "Location", id)),
      ...specializationIds.map((id) => assertPracticeRecord(context, "Service", id)),
    ]);
    return await serializableWorkflow(context, "medspa-provider-profile-update", [`provider:${args.providerId}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const prior = await auditOnce(sudo, actor.practiceId, "provider_profile.updated", args.idempotencyKey);
      if (prior) return { success: true, recordId: prior.resourceId, error: null };
      const provider = await sudo.query.Provider.findOne({
        where: { id: args.providerId },
        query: "id status isActive user { id } specializations { id } locations { id } credentials { status effectiveFrom expiresAt primarySourceVerified } authorizations { status effectiveFrom effectiveTo service { id } }",
      });
      if (!provider) throw new Error("Provider not found");
      const activating = active && !(provider.status === "active" && provider.isActive === true);
      if (activating) {
        if (provider.user?.id === actor.actorId) throw new Error("You cannot activate your own provider profile");
        const services = specializationIds.length
          ? await sudo.query.Service.findMany({ where: { id: { in: specializationIds } }, take: 200, query: "id staffAuthorizationRequired requiresConsultation requiresIntakeReview requiresLotTraceability" })
          : [];
        const restricted = services.filter((service: any) => service.staffAuthorizationRequired !== false || service.requiresConsultation || service.requiresIntakeReview || service.requiresLotTraceability);
        if (restricted.length) {
          const now = new Date();
          const credentialed = provider.credentials.some((item: any) => item.status === "verified" && item.primarySourceVerified === true && new Date(item.effectiveFrom) <= now && new Date(item.expiresAt) > now);
          const authorizedServices = new Set(provider.authorizations
            .filter((item: any) => item.status === "active" && new Date(item.effectiveFrom) <= now && (!item.effectiveTo || new Date(item.effectiveTo) > now))
            .map((item: any) => item.service?.id));
          if (!credentialed || restricted.some((service: any) => !authorizedServices.has(service.id))) {
            throw new Error("Treatments that need clinical authority require an effective credential and authorization before activation");
          }
        }
      }
      const currentSpecializations = new Set(provider.specializations.map((item: any) => item.id));
      const currentLocations = new Set(provider.locations.map((item: any) => item.id));
      await sudo.query.Provider.updateOne({
        where: { id: provider.id },
        data: {
          title, bio, role: args.role as ProviderRoleType, tier: args.tier as ProviderTierType, status: args.status as ProviderStatusType,
          isActive: args.isActive, isPublic: args.isPublic,
          specializations: {
            connect: specializationIds.filter((id) => !currentSpecializations.has(id)).map((id) => ({ id })),
            disconnect: [...currentSpecializations].filter((id) => !specializationIds.includes(id as string)).map((id) => ({ id: id as string })),
          },
          locations: {
            connect: locationIds.filter((id) => !currentLocations.has(id)).map((id) => ({ id })),
            disconnect: [...currentLocations].filter((id) => !locationIds.includes(id as string)).map((id) => ({ id: id as string })),
          },
        },
        query: "id",
      });
      await audit(sudo, actor.practiceId, actor.actorId, "provider_profile.updated", "Provider", provider.id, args.idempotencyKey, {
        fromStatus: provider.status, toStatus: args.status, role: args.role, tier: args.tier, isActive: args.isActive, isPublic: args.isPublic,
        specializationIds, locationIds,
      });
      return { success: true, recordId: provider.id, error: null };
    });
  } catch (error) { return failure(error, "Provider profile update failed"); }
}

export type LocationInput = {
  locationId?: string | null; name: string; address?: string | null; city?: string | null; state?: string | null; zipCode?: string | null;
  phone?: string | null; email?: string | null; timezone: string; hours: unknown; isActive: boolean; idempotencyKey: string;
};

function validTimezone(value: string) {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone");
  if (supported?.length) return supported.includes(value) || value === "UTC";
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; }
}

function minutes(value: unknown) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function normalizeHours(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Opening hours are invalid");
  const source = input as Record<string, any>;
  if (Object.keys(source).some((key) => !WEEK.includes(key as (typeof WEEK)[number]))) throw new Error("Opening hours contain an unknown day");
  const hours: Record<string, { open?: string; close?: string; closed: boolean }> = {};
  for (const day of WEEK) {
    const entry = source[day];
    if (!entry || entry.closed === true) { hours[day] = { closed: true }; continue; }
    const open = minutes(entry.open);
    const close = minutes(entry.close);
    const label = day[0].toUpperCase() + day.slice(1);
    if (open === null || close === null) throw new Error(`${label} hours must be HH:MM`);
    if (close <= open) throw new Error(`${label} closing time must be after opening`);
    hours[day] = { open: entry.open, close: entry.close, closed: false };
  }
  return hours;
}

/** Creates or edits a practice location. The storefront's primary location can't be deactivated. */
export async function upsertLocationTransaction(context: Context, args: LocationInput): Promise<Result> {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManagePractice, "Practice-management access is required");
    await assertActiveActor(context);
    if (args.locationId) await assertPracticeRecord(context, "Location", args.locationId);
  } catch (error) { return failure(error, "Practice-management access is required"); }

  const name = args.name.trim();
  const email = args.email?.trim() || "";
  const text = (value?: string | null, max = 200) => (value || "").trim().slice(0, max);
  if (!validIdempotencyKey(args.idempotencyKey)) return denied("A valid request key is required");
  if (!name || name.length > 120) return denied("Enter a location name");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return denied("Enter a valid email");
  if (!validTimezone(args.timezone)) return denied("Choose a valid timezone");
  let hours: ReturnType<typeof normalizeHours>;
  try { hours = normalizeHours(args.hours); } catch (error) { return failure(error, "Opening hours are invalid"); }

  const data = {
    name, address: text(args.address), city: text(args.city, 120), state: text(args.state, 60), zipCode: text(args.zipCode, 20),
    phone: text(args.phone, 40), email, timezone: args.timezone, hours, isActive: args.isActive,
  };

  try {
    return await serializableWorkflow(context, "medspa-location", [args.locationId ? `location:${args.locationId}` : `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const action = args.locationId ? "location.updated" : "location.created";
      const prior = await auditOnce(sudo, actor.practiceId, action, args.idempotencyKey);
      if (prior) return { success: true, recordId: prior.resourceId, error: null };
      if (args.locationId && !args.isActive) {
        const primary = await sudo.query.StorefrontSetting.count({ where: { practice: { id: { equals: actor.practiceId } }, primaryLocation: { id: { equals: args.locationId } } } });
        if (primary) throw new Error("Choose another primary storefront location before deactivating this one");
      }
      const record = args.locationId
        ? await sudo.query.Location.updateOne({ where: { id: args.locationId }, data, query: "id" })
        : await sudo.query.Location.createOne({ data: { ...data, practice: { connect: { id: actor.practiceId } } }, query: "id" });
      if (!record) throw new Error("Location not found");
      await audit(sudo, actor.practiceId, actor.actorId, action, "Location", record.id, args.idempotencyKey, { name, timezone: args.timezone, isActive: args.isActive });
      return { success: true, recordId: record.id, error: null };
    });
  } catch (error) { return failure(error, "Location could not be saved"); }
}

const resultType = graphql.object<Result>()({
  name: "PracticeAdminWorkflowResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    recordId: graphql.field({ type: graphql.ID }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const updateProviderProfile = graphql.field({
  type: resultType,
  args: {
    providerId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    title: graphql.arg({ type: graphql.String }), bio: graphql.arg({ type: graphql.String }),
    role: graphql.arg({ type: graphql.nonNull(graphql.String) }), tier: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    status: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    isActive: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }), isPublic: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
    specializationIds: graphql.arg({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) }),
    locationIds: graphql.arg({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return updateProviderProfileTransaction(context, args); },
});

export const upsertLocation = graphql.field({
  type: resultType,
  args: {
    locationId: graphql.arg({ type: graphql.ID }),
    name: graphql.arg({ type: graphql.nonNull(graphql.String) }), address: graphql.arg({ type: graphql.String }),
    city: graphql.arg({ type: graphql.String }), state: graphql.arg({ type: graphql.String }), zipCode: graphql.arg({ type: graphql.String }),
    phone: graphql.arg({ type: graphql.String }), email: graphql.arg({ type: graphql.String }),
    timezone: graphql.arg({ type: graphql.nonNull(graphql.String) }), hours: graphql.arg({ type: graphql.nonNull(graphql.JSON) }),
    isActive: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return upsertLocationTransaction(context, args); },
});
