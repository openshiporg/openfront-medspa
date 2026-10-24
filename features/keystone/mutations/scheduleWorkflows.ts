import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { timeToMinutes } from "../scheduling/availability";
import { serializableWorkflow } from "./serializableWorkflow";
import { assertPracticeRecord, requireActorPractice } from "../workflowAuth";

type ScheduleType = "recurring" | "one_time" | "time_off";
type ScheduleResult = {
  success: boolean;
  scheduleId: string | null;
  revision: number | null;
  error: string | null;
};

type ScheduleInput = {
  scheduleId?: string | null;
  providerId: string;
  locationId: string;
  type: string;
  dayOfWeek?: number | null;
  localDate?: string | null;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  isAvailable?: boolean | null;
  isPublic?: boolean | null;
  reason?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  idempotencyKey?: string | null;
  expectedRevision?: number | null;
};

const denied = { success: false, scheduleId: null, revision: null };

function operator(context: Context) {
  return permissions.canSchedule({ session: context.session as any });
}

function dateKey(value?: string | null, label = "Schedule date") {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} is invalid`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label} is invalid`);
  return value;
}

function timestampForDate(value: string | null) {
  return value ? `${value}T12:00:00.000Z` : null;
}

function normalize(input: ScheduleInput) {
  const type = input.type as ScheduleType;
  if (!new Set<ScheduleType>(["recurring", "one_time", "time_off"]).has(type)) throw new Error("Schedule type is invalid");
  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  if (end <= start) throw new Error("Schedule end time must follow start time");
  const breakStart = input.breakStart?.trim() || "";
  const breakEnd = input.breakEnd?.trim() || "";
  if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) throw new Error("Schedule break requires both start and end");
  if (breakStart && breakEnd) {
    const breakStartMinutes = timeToMinutes(breakStart);
    const breakEndMinutes = timeToMinutes(breakEnd);
    if (breakStartMinutes < start || breakEndMinutes > end || breakEndMinutes <= breakStartMinutes) throw new Error("Schedule break must fall within working hours");
  }
  const localDate = dateKey(input.localDate);
  const effectiveFrom = dateKey(input.effectiveFrom, "Effective start date");
  const effectiveTo = dateKey(input.effectiveTo, "Effective end date");
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) throw new Error("Effective end date must follow its start date");
  if (type === "recurring" && (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek! < 0 || input.dayOfWeek! > 6)) throw new Error("Recurring schedules require a valid day of week");
  if (type !== "recurring" && !localDate) throw new Error("One-time and time-off schedules require a local date");
  if (type === "recurring" && localDate) throw new Error("Recurring schedules cannot have a local date");
  const reason = input.reason?.trim() || "";
  if (reason.length > 1_000) throw new Error("Schedule reason is too long");
  const idempotencyKey = input.idempotencyKey?.trim() || "";
  if (!input.scheduleId && (idempotencyKey.length < 12 || idempotencyKey.length > 200)) throw new Error("A valid idempotency key is required");
  return {
    type,
    dayOfWeek: type === "recurring" ? input.dayOfWeek! : null,
    localDate: type === "recurring" ? "" : localDate!,
    date: type === "recurring" ? null : timestampForDate(localDate),
    startTime: input.startTime,
    endTime: input.endTime,
    breakStart,
    breakEnd,
    isAvailable: type === "time_off" ? false : input.isAvailable !== false,
    // Online booking only sees hours that are explicitly public; omitted keeps the stored value.
    ...(input.isPublic === undefined || input.isPublic === null ? {} : { isPublic: type !== "time_off" && input.isPublic === true }),
    reason,
    effectiveFrom: type === "recurring" ? timestampForDate(effectiveFrom) : null,
    effectiveTo: type === "recurring" ? timestampForDate(effectiveTo) : null,
    idempotencyKey,
  };
}

export async function upsertProviderScheduleTransaction(context: Context, input: ScheduleInput): Promise<ScheduleResult> {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required");
    await Promise.all([assertPracticeRecord(context, "Provider", input.providerId), assertPracticeRecord(context, "Location", input.locationId), input.scheduleId ? assertPracticeRecord(context, "ProviderSchedule", input.scheduleId) : Promise.resolve(null)]);
  } catch (error) { return { ...denied, error: error instanceof Error ? error.message : "Schedule record not found" }; }
  let normalized: ReturnType<typeof normalize>;
  try {
    normalized = normalize(input);
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Schedule input is invalid" };
  }
  try {
    return await serializableWorkflow(context, "medspa-schedule", [
      `provider:${input.providerId}`,
      `location:${input.locationId}`,
      input.scheduleId ? `schedule:${input.scheduleId}` : `idempotency:${normalized.idempotencyKey}`,
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const [provider, location] = await Promise.all([
        sudo.query.Provider.findOne({ where: { id: input.providerId }, query: "id status isActive locations { id }" }),
        sudo.query.Location.findOne({ where: { id: input.locationId }, query: "id isActive" }),
      ]);
      if (!provider || provider.status === "inactive" || provider.isActive === false) throw new Error("Provider is unavailable");
      if (!location || location.isActive === false) throw new Error("Location is unavailable");
      if (!provider.locations?.some((assigned: any) => assigned.id === location.id)) throw new Error("Provider is not assigned to this location");
      if (!input.scheduleId) {
        const existing = (await sudo.query.ProviderSchedule.findMany({
          where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: normalized.idempotencyKey } }, take: 1,
          query: "id revision provider { id } location { id } type dayOfWeek localDate startTime endTime",
        }))[0];
        if (existing) {
          if (existing.provider?.id !== input.providerId || existing.location?.id !== input.locationId || existing.type !== normalized.type
            || (existing.dayOfWeek ?? null) !== normalized.dayOfWeek || (existing.localDate || "") !== normalized.localDate
            || existing.startTime !== normalized.startTime || existing.endTime !== normalized.endTime) {
            throw new Error("Idempotency key was already used for another schedule");
          }
          return { success: true, scheduleId: existing.id, revision: existing.revision, error: null };
        }
        const created = await sudo.query.ProviderSchedule.createOne({
          data: {
            ...normalized,
            practice: { connect: { id: actor.practiceId } },
            provider: { connect: { id: input.providerId } },
            location: { connect: { id: input.locationId } },
            revision: 1,
          },
          query: "id revision",
        });
        return { success: true, scheduleId: created.id, revision: created.revision, error: null };
      }

      const existing = await sudo.query.ProviderSchedule.findOne({
        where: { id: input.scheduleId }, query: "id revision idempotencyKey provider { id } location { id }",
      });
      if (!existing || existing.provider?.id !== input.providerId || existing.location?.id !== input.locationId) throw new Error("Schedule not found");
      if (!Number.isInteger(input.expectedRevision) || input.expectedRevision !== existing.revision) throw new Error("Schedule was changed by another operator");
      const revision = existing.revision + 1;
      await sudo.query.ProviderSchedule.updateOne({
        where: { id: existing.id },
        data: { ...normalized, idempotencyKey: existing.idempotencyKey, revision },
        query: "id",
      });
      return { success: true, scheduleId: existing.id, revision, error: null };
    });
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Schedule workflow failed" };
  }
}

export async function setProviderScheduleAvailabilityTransaction(
  context: Context,
  input: { scheduleId: string; isAvailable: boolean; reason?: string | null; expectedRevision: number },
): Promise<ScheduleResult> {
  try { requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required"); await assertPracticeRecord(context, "ProviderSchedule", input.scheduleId); }
  catch (error) { return { ...denied, error: error instanceof Error ? error.message : "Schedule record not found" }; }
  const reason = input.reason?.trim() || "";
  if (reason.length > 1_000) return { ...denied, error: "Schedule reason is too long" };
  try {
    return await serializableWorkflow(context, "medspa-schedule", [`schedule:${input.scheduleId}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const schedule = await sudo.query.ProviderSchedule.findOne({
        where: { id: input.scheduleId }, query: "id type revision isAvailable reason",
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
        query: "id",
      });
      return { success: true, scheduleId: schedule.id, revision, error: null };
    });
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Schedule workflow failed" };
  }
}

const resultType = graphql.object<ScheduleResult>()({
  name: "ProviderScheduleWorkflowResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    scheduleId: graphql.field({ type: graphql.ID }),
    revision: graphql.field({ type: graphql.Int }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const upsertProviderSchedule = graphql.field({
  type: resultType,
  args: {
    scheduleId: graphql.arg({ type: graphql.ID }), providerId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    locationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    type: graphql.arg({ type: graphql.nonNull(graphql.String) }), dayOfWeek: graphql.arg({ type: graphql.Int }),
    localDate: graphql.arg({ type: graphql.String }), startTime: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    endTime: graphql.arg({ type: graphql.nonNull(graphql.String) }), breakStart: graphql.arg({ type: graphql.String }),
    breakEnd: graphql.arg({ type: graphql.String }), isAvailable: graphql.arg({ type: graphql.Boolean }), isPublic: graphql.arg({ type: graphql.Boolean }),
    reason: graphql.arg({ type: graphql.String }), effectiveFrom: graphql.arg({ type: graphql.String }),
    effectiveTo: graphql.arg({ type: graphql.String }), idempotencyKey: graphql.arg({ type: graphql.String }),
    expectedRevision: graphql.arg({ type: graphql.Int }),
  },
  resolve(_source, args, context: Context) { return upsertProviderScheduleTransaction(context, args); },
});

export const setProviderScheduleAvailability = graphql.field({
  type: resultType,
  args: {
    scheduleId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    isAvailable: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
    reason: graphql.arg({ type: graphql.String }),
    expectedRevision: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
  },
  resolve(_source, args, context: Context) { return setProviderScheduleAvailabilityTransaction(context, args); },
});
