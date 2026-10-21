import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { serializableWorkflow } from "./serializableWorkflow";
import { assertPracticeRecord, requireActorPractice } from "../workflowAuth";

type ResourceResult = { success: boolean; resourceId: string | null; revision: number | null; error: string | null };
const denied = { success: false, resourceId: null, revision: null };

export async function setResourceAvailabilityTransaction(context: Context, input: {
  resourceId: string; isActive: boolean; expectedRevision: number;
}): Promise<ResourceResult> {
  try { requireActorPractice(context, permissions.canSchedule, "Authorized scheduling access is required"); await assertPracticeRecord(context, "Resource", input.resourceId); }
  catch (error) { return { ...denied, error: error instanceof Error ? error.message : "Resource not found" }; }
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
    return { ...denied, error: "A valid resource revision is required" };
  }
  try {
    return await serializableWorkflow(context, "medspa-resource", [`resource:${input.resourceId}`], async (transactionContext) => {
      await assertPracticeRecord(transactionContext, "Resource", input.resourceId);
      const sudo = transactionContext.sudo();
      const resource = await sudo.query.Resource.findOne({
        where: { id: input.resourceId }, query: "id type isActive revision practice { id } location { id isActive practice { id } }",
      });
      if (!resource) throw new Error("Resource not found");
      if (resource.practice?.id !== transactionContext.session!.data.practice?.id || resource.location?.practice?.id !== resource.practice?.id || !resource.location?.id || resource.location.isActive === false) throw new Error("Resource location is unavailable");
      if (resource.isActive === input.isActive) {
        return { success: true, resourceId: resource.id, revision: resource.revision, error: null };
      }
      if (input.isActive && ["device", "equipment"].includes(resource.type)) throw new Error("Device activation requires the qualified device-readiness release workflow");
      if (resource.revision !== input.expectedRevision) throw new Error("Resource was changed by another operator");
      if (!input.isActive) {
        const activeAppointments = await sudo.query.Appointment.count({
          where: { practice: { id: { equals: resource.practice!.id } }, OR: [{ resource: { id: { equals: resource.id } } }, { room: { id: { equals: resource.id } } }, { device: { id: { equals: resource.id } } }], status: { in: ["pending", "confirmed", "in_progress"] } },
        });
        const activeReservations = await sudo.query.AppointmentResourceReservation.count({ where: { practice: { id: { equals: resource.practice!.id } }, resource: { id: { equals: resource.id } }, status: { in: ["reserved", "in_use"] } } });
        if (activeAppointments > 0 || activeReservations > 0) throw new Error("Resource has active appointments and cannot be disabled");
      }
      const revision = resource.revision + 1;
      await sudo.query.Resource.updateOne({
        where: { id: resource.id }, data: { isActive: input.isActive, revision }, query: "id",
      });
      return { success: true, resourceId: resource.id, revision, error: null };
    });
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Resource update failed" };
  }
}

const resultType = graphql.object<ResourceResult>()({
  name: "ResourceWorkflowResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    resourceId: graphql.field({ type: graphql.ID }),
    revision: graphql.field({ type: graphql.Int }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const setResourceAvailability = graphql.field({
  type: resultType,
  args: {
    resourceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    isActive: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
    expectedRevision: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
  },
  resolve(_source, args, context: Context) { return setResourceAvailabilityTransaction(context, args); },
});
