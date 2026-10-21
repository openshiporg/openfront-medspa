import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { serializableWorkflow } from "./serializableWorkflow";
import { assertPracticeRecord, requireActorPractice } from "../workflowAuth";

type WaitlistResult = { success: boolean; waitlistEntryId: string | null; status: string | null; error: string | null };

const denied = { success: false, waitlistEntryId: null, status: null };

function operator(context: Context) {
  return permissions.canSchedule({ session: context.session as any });
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Waitlist date range is invalid");
  return date;
}

export async function joinWaitlistTransaction(
  context: Context,
  args: {
    clientId?: string | null; guestName?: string | null; guestPhone?: string | null;
    serviceId: string; preferredProviderIds?: string[] | null; preferredDays?: unknown;
    preferredTimeRange?: string | null; dateRangeStart?: string | null; dateRangeEnd?: string | null;
    notes?: string | null; idempotencyKey: string;
  },
): Promise<WaitlistResult> {
  let actor;
  try { actor = requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required"); await Promise.all([assertPracticeRecord(context, "Service", args.serviceId), args.clientId ? assertPracticeRecord(context, "User", args.clientId) : Promise.resolve(null), ...(args.preferredProviderIds || []).map(id => assertPracticeRecord(context, "Provider", id))]); }
  catch (error) { return { ...denied, error: error instanceof Error ? error.message : "Waitlist scope is unavailable" }; }
  if (!args.idempotencyKey?.trim() || args.idempotencyKey.length < 12 || args.idempotencyKey.length > 200) return { ...denied, error: "Idempotency key is invalid" };
  const notes = args.notes?.trim() || "";
  const preferredTimeRange = args.preferredTimeRange?.trim() || "";
  const guestName = args.guestName?.trim() || "";
  const guestPhone = args.guestPhone?.trim() || "";
  if (!args.clientId && !guestName) return { ...denied, error: "A client or walk-in name is required" };
  if (guestName.length > 120 || guestPhone.length > 40 || notes.length > 2_000 || preferredTimeRange.length > 120) return { ...denied, error: "Waitlist details are too long" };
  const preferredDays = Array.isArray(args.preferredDays) ? [...new Set(args.preferredDays.map(String))] : [];
  const allowedDays = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
  if (preferredDays.length > 7 || preferredDays.some((day) => !allowedDays.has(day.toLowerCase()))) return { ...denied, error: "Preferred days are invalid" };
  let start: Date | null;
  let end: Date | null;
  try {
    start = parseDate(args.dateRangeStart);
    end = parseDate(args.dateRangeEnd);
    if (start && end && end <= start) throw new Error("Waitlist end date must follow its start date");
    if (end && end.getTime() > Date.now() + 366 * 24 * 60 * 60_000) throw new Error("Waitlist date range is too far in the future");
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Waitlist date range is invalid" };
  }
  const providerIds = [...new Set((args.preferredProviderIds || []).filter(Boolean))];
  if (providerIds.length > 20) return { ...denied, error: "Too many preferred providers" };

  try {
    return await serializableWorkflow(context, "medspa-waitlist", [
      `client-service:${args.clientId || `${guestName}:${guestPhone}`}:${args.serviceId}`,
      `request:${args.idempotencyKey}`,
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.WaitlistEntry.findMany({
        where: { requestKey: { equals: args.idempotencyKey } }, take: 1,
        query: "id status guestName guestPhone client { id } service { id }",
      }))[0];
      if (existing) {
        if ((existing.client?.id || null) !== (args.clientId || null) || existing.service?.id !== args.serviceId
          || (!args.clientId && (existing.guestName !== guestName || (existing.guestPhone || "") !== guestPhone))) {
          throw new Error("Idempotency key was already used for another waitlist request");
        }
        return { success: true, waitlistEntryId: existing.id, status: existing.status, error: null };
      }
      const [client, service, providers] = await Promise.all([
        args.clientId ? sudo.query.User.findOne({ where: { id: args.clientId }, query: "id" }) : Promise.resolve(null),
        sudo.query.Service.findOne({ where: { id: args.serviceId }, query: "id status" }),
        providerIds.length ? sudo.query.Provider.findMany({ where: { id: { in: providerIds } }, query: "id status isActive" }) : Promise.resolve([]),
      ]);
      if ((args.clientId && !client) || !service || (service.status && service.status !== "active")) throw new Error("Waitlist client or service is unavailable");
      if (providers.length !== providerIds.length || providers.some((provider: any) => provider.status === "inactive" || provider.isActive === false)) throw new Error("A preferred provider is unavailable");
      const duplicate = (await sudo.query.WaitlistEntry.findMany({
        where: args.clientId
          ? { client: { id: { equals: args.clientId } }, service: { id: { equals: args.serviceId } }, isActive: { equals: true } }
          : { guestName: { equals: guestName }, guestPhone: { equals: guestPhone }, service: { id: { equals: args.serviceId } }, isActive: { equals: true } },
        take: 1, query: "id status",
      }))[0];
      if (duplicate) return { success: true, waitlistEntryId: duplicate.id, status: duplicate.status, error: null };

      const entry = await sudo.query.WaitlistEntry.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } }, client: args.clientId ? { connect: { id: args.clientId } } : undefined,
          guestName, guestPhone, service: { connect: { id: args.serviceId } },
          preferredProviders: providerIds.length ? { connect: providerIds.map((id) => ({ id })) } : undefined,
          preferredDays, preferredTimeRange, dateRangeStart: start?.toISOString(), dateRangeEnd: end?.toISOString(),
          notes, requestKey: args.idempotencyKey, status: "active", isActive: true,
        },
        query: "id status",
      });
      return { success: true, waitlistEntryId: entry.id, status: entry.status, error: null };
    });
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Waitlist request failed" };
  }
}

export async function transitionWaitlistEntryTransaction(
  context: Context,
  args: { waitlistEntryId: string; action: string; appointmentId?: string | null; reason?: string | null },
): Promise<WaitlistResult> {
  try { requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required"); await Promise.all([assertPracticeRecord(context, "WaitlistEntry", args.waitlistEntryId), args.appointmentId ? assertPracticeRecord(context, "Appointment", args.appointmentId) : Promise.resolve(null)]); }
  catch (error) { return { ...denied, error: error instanceof Error ? error.message : "Waitlist entry not found" }; }
  const targets: Record<string, string> = { notify: "notified", remove: "removed", reactivate: "active", convert: "converted" };
  const target = targets[args.action];
  if (!target) return { ...denied, error: "Unsupported waitlist transition" };
  const reason = args.reason?.trim() || "";
  if (reason.length > 1_000) return { ...denied, error: "Transition reason is too long" };
  if (args.action === "convert" && !args.appointmentId) return { ...denied, error: "Converted waitlist entries require an appointment" };

  try {
    return await serializableWorkflow(context, "medspa-waitlist", [`entry:${args.waitlistEntryId}`], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const entry = await sudo.query.WaitlistEntry.findOne({
        where: { id: args.waitlistEntryId },
        query: "id status client { id } service { id } convertedAppointment { id }",
      });
      if (!entry) throw new Error("Waitlist entry not found");
      if (entry.status === target && (target !== "converted" || entry.convertedAppointment?.id === args.appointmentId)) {
        return { success: true, waitlistEntryId: entry.id, status: entry.status, error: null };
      }
      const valid: Record<string, string[]> = {
        active: ["notified", "removed"], notified: ["active", "converted", "removed"], removed: ["active"], converted: [],
      };
      if (!(valid[entry.status || "active"] || []).includes(target)) throw new Error(`Cannot transition waitlist entry from ${entry.status || "active"} to ${target}`);
      if (target === "converted") {
        const appointment = await sudo.query.Appointment.findOne({
          where: { id: args.appointmentId! },
          query: "id client { user { id } } services { id }",
        });
        if (!appointment || appointment.client?.user?.id !== entry.client?.id || !appointment.services.some((service: any) => service.id === entry.service?.id)) {
          throw new Error("Converted appointment does not match the waitlist entry");
        }
      }
      const now = new Date().toISOString();
      await sudo.query.WaitlistEntry.updateOne({
        where: { id: entry.id },
        data: {
          status: target, isActive: target === "active" || target === "notified",
          notifiedAt: target === "notified" ? now : undefined,
          transitionedAt: now, transitionReason: reason,
          convertedAppointment: target === "converted" ? { connect: { id: args.appointmentId! } } : undefined,
        },
        query: "id",
      });
      return { success: true, waitlistEntryId: entry.id, status: target, error: null };
    });
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Waitlist transition failed" };
  }
}

const resultType = graphql.object<WaitlistResult>()({
  name: "WaitlistWorkflowResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    waitlistEntryId: graphql.field({ type: graphql.ID }), status: graphql.field({ type: graphql.String }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const joinWaitlist = graphql.field({
  type: resultType,
  args: {
    clientId: graphql.arg({ type: graphql.ID }), guestName: graphql.arg({ type: graphql.String }), guestPhone: graphql.arg({ type: graphql.String }),
    serviceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    preferredProviderIds: graphql.arg({ type: graphql.list(graphql.nonNull(graphql.ID)) }), preferredDays: graphql.arg({ type: graphql.JSON }),
    preferredTimeRange: graphql.arg({ type: graphql.String }), dateRangeStart: graphql.arg({ type: graphql.String }),
    dateRangeEnd: graphql.arg({ type: graphql.String }), notes: graphql.arg({ type: graphql.String }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return joinWaitlistTransaction(context, args); },
});

export const transitionWaitlistEntry = graphql.field({
  type: resultType,
  args: {
    waitlistEntryId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), action: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    appointmentId: graphql.arg({ type: graphql.ID }), reason: graphql.arg({ type: graphql.String }),
  },
  resolve(_source, args, context: Context) { return transitionWaitlistEntryTransaction(context, args); },
});
