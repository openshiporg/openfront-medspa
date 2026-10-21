import { createHash } from "node:crypto";
import type { JSONValue } from "@keystone-6/core/types";
import type { Context } from ".keystone/types";
import { isSignedIn, practiceId, type AccessArgs } from "./access";

export type Capability = (args: AccessArgs) => boolean;

export function requireActorPractice(context: Context, capability: Capability = isSignedIn, message = "Authorized practice access is required") {
  if (!context.session?.itemId || !capability({ session: context.session as any })) throw new Error(message);
  const id = practiceId(context.session as any);
  if (!id) throw new Error("The authenticated actor is not assigned to a practice");
  return { actorId: context.session.itemId, practiceId: id };
}

export async function assertActiveActor(context: Context) {
  const expectedPracticeId = practiceId(context.session as any);
  if (!context.session?.itemId || !expectedPracticeId) throw new Error("Authenticated practice access is unavailable");
  const actor = await context.sudo().query.User.findOne({ where: { id: context.session.itemId }, query: `id status practice { id } role { id practice { id } canManagePeople canManageRoles canAccessDashboard canManageOnboarding canManagePractice canSchedule canReadClients canManageClinical canManageSensitiveRecords canManageInventory canManageFinance canManageCommunications canViewReports canManageIntegrations }` });
  if (!actor || actor.status !== "active" || actor.practice?.id !== expectedPracticeId) throw new Error("Authenticated practice access is unavailable");
  if (actor.role && (actor.role.id !== context.session.data.role?.id || actor.role.practice?.id !== expectedPracticeId)) throw new Error("Authenticated role scope is unavailable");
  const sessionRole = context.session.data.role || {};
  for (const key of ["canManagePeople","canManageRoles","canAccessDashboard","canManageOnboarding","canManagePractice","canSchedule","canReadClients","canManageClinical","canManageSensitiveRecords","canManageInventory","canManageFinance","canManageCommunications","canViewReports","canManageIntegrations"] as const) {
    if ((sessionRole as any)[key] === true && actor.role?.[key] !== true) throw new Error("Authenticated capability is no longer active");
  }
  return { actorId: actor.id, practiceId: expectedPracticeId, role: actor.role || {} };
}

/**
 * Narrow privileged lookup used only after authentication/capability checks.
 * It returns no cross-practice data and fails with the same not-found message.
 */
export async function assertProviderActor(context: Context, providerId: string, actorId: string) {
  const provider = await assertPracticeRecord(context, "Provider", providerId, "id practice { id } user { id }");
  if (provider.user?.id !== actorId) throw new Error("The provider must match the authenticated actor");
  return provider;
}

export async function assertPracticeRecord(
  context: Context,
  listKey: string,
  recordId: string,
  query = "id practice { id }",
) {
  const expectedPracticeId = practiceId(context.session as any);
  if (!context.session?.itemId || !expectedPracticeId || !recordId) throw new Error("Record not found");
  await assertActiveActor(context);
  const api = (context.sudo().query as any)[listKey];
  if (!api) throw new Error("Record not found");
  const record = await api.findOne({ where: { id: recordId }, query });
  if (!record || record.practice?.id !== expectedPracticeId) throw new Error("Record not found");
  return record;
}

export function assertSamePractice(expectedPracticeId: string, ...records: Array<{ practice?: { id?: string | null } | null } | null | undefined>) {
  if (records.some(record => !record || record.practice?.id !== expectedPracticeId)) throw new Error("Record not found");
}

export function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
  return value;
}

export function jsonValue(value: unknown): JSONValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("JSON evidence contains a non-finite number");
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === "object") {
    const normalized: Record<string, JSONValue> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))) {
      if (child !== undefined) normalized[key] = jsonValue(child);
    }
    return normalized;
  }
  throw new Error("Evidence payload is not JSON-compatible");
}

export function bounded(value: unknown, maxBytes = 100_000): JSONValue {
  const normalized = jsonValue(value ?? {});
  if (JSON.stringify(normalized).length > maxBytes) throw new Error("Evidence payload is too large");
  return normalized;
}

export function evidenceHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

export function validIdempotencyKey(value: string) {
  return typeof value === "string" && value.trim().length >= 12 && value.length <= 200;
}
