import { graphql } from "@keystone-6/core";
import { permissions } from "../access";
import { assertActiveActor, assertPracticeRecord, requireActorPractice } from "../workflowAuth";
import { computeProviderAvailability } from "../scheduling/availability";

const TimeSlot = graphql.object<{
  time: string;
  startTime: string;
  available: boolean;
  resourceId?: string | null;
  resourceName?: string | null;
  resourceIds: string[];
  roomId?: string | null;
  deviceId?: string | null;
  supervisorIds: string[];
  blockedReason?: string | null;
}>()({
  name: "TimeSlot",
  fields: {
    time: graphql.field({ type: graphql.nonNull(graphql.String) }),
    startTime: graphql.field({ type: graphql.nonNull(graphql.String) }),
    available: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    resourceId: graphql.field({ type: graphql.String }),
    resourceName: graphql.field({ type: graphql.String }),
    resourceIds: graphql.field({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) }),
    roomId: graphql.field({ type: graphql.ID }),
    deviceId: graphql.field({ type: graphql.ID }),
    supervisorIds: graphql.field({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) }),
    blockedReason: graphql.field({ type: graphql.String }),
  },
});

const AvailabilityResult = graphql.object<{
  providerId: string;
  providerName: string;
  date: string;
  timezone: string;
  locationId?: string | null;
  supervisorIds: string[];
  slots: {
    time: string;
    startTime: string;
    available: boolean;
    resourceId?: string | null;
    resourceName?: string | null;
    resourceIds: string[];
    roomId?: string | null;
    deviceId?: string | null;
    supervisorIds: string[];
    blockedReason?: string | null;
  }[];
}>()({
  name: "AvailabilityResult",
  fields: {
    providerId: graphql.field({ type: graphql.nonNull(graphql.ID) }),
    providerName: graphql.field({ type: graphql.nonNull(graphql.String) }),
    date: graphql.field({ type: graphql.nonNull(graphql.String) }),
    timezone: graphql.field({ type: graphql.nonNull(graphql.String) }),
    locationId: graphql.field({ type: graphql.ID }),
    supervisorIds: graphql.field({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) }),
    slots: graphql.field({ type: graphql.nonNull(graphql.list(graphql.nonNull(TimeSlot))) }),
  },
});

export const checkAvailability = graphql.field({
  type: AvailabilityResult,
  args: {
    providerId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    date: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    serviceDuration: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
    serviceId: graphql.arg({ type: graphql.ID }),
    locationId: graphql.arg({ type: graphql.ID }),
  },
  async resolve(_source, args, context: any) {
    const sudo = context.sudo();
    const schedulingActor = permissions.canSchedule({ session: context.session })
      ? requireActorPractice(context, permissions.canSchedule, "Scheduling authority is required")
      : null;
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
        where: { id: args.serviceId }, query: "id status isPublic baseDuration practice { id isActive storefrontSetting { isPublished primaryLocation { id isActive } } }",
      });
      if (!service || service.status !== "active" || (publicOnly && (service.isPublic !== true || service.practice?.isActive !== true || service.practice?.storefrontSetting?.isPublished !== true || service.practice?.storefrontSetting?.primaryLocation?.isActive !== true))) throw new Error("Service is unavailable");
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
      publicOnly,
    });
  },
});

export const availabilityExtension = graphql.extend(() => ({
  query: { checkAvailability },
}));
