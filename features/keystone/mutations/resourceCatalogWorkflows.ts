import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { serializableWorkflow } from "./serializableWorkflow";
import { assertActiveActor, requireActorPractice, validIdempotencyKey } from "../workflowAuth";

type ResourceUpsertResult = { success: boolean; resourceId: string | null; revision: number | null; error: string | null };
const denied = { success: false, resourceId: null, revision: null };

const RESOURCE_TYPES = new Set(["room", "device", "equipment", "station", "other"]);
// Devices and equipment enter acceptance testing and go live only through the
// qualified device-readiness release; rooms and stations are usable at once.
const READINESS_GATED = new Set(["device", "equipment"]);

export type ResourceUpsertInput = {
  resourceId?: string | null;
  expectedRevision?: number | null;
  name: string;
  type: string;
  locationId: string;
  capacity: number;
  isPublic: boolean;
  notes?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  maintenanceDueAt?: string | null;
  calibrationDueAt?: string | null;
  serviceIds: readonly string[];
  idempotencyKey: string;
};

function text(value: string | null | undefined, max: number, label: string) {
  const trimmed = (value || "").trim();
  if (trimmed.length > max) throw new Error(`${label} is too long`);
  return trimmed;
}

function timestamp(value: string | null | undefined, label: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid`);
  return date.toISOString();
}

export async function upsertResourceTransaction(context: Context, input: ResourceUpsertInput): Promise<ResourceUpsertResult> {
  let actor: { actorId: string; practiceId: string };
  try {
    actor = requireActorPractice(context, permissions.canManagePractice, "Practice management access is required");
    await assertActiveActor(context);
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Practice management access is required" };
  }

  let data: Record<string, unknown>;
  try {
    if (!validIdempotencyKey(input.idempotencyKey)) throw new Error("A valid request key is required");
    const name = text(input.name, 120, "Name");
    if (!name) throw new Error("Enter a name");
    if (!RESOURCE_TYPES.has(input.type)) throw new Error("Choose room, device, equipment, station or other");
    if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 50) throw new Error("Capacity must be a whole number from 1 to 50");
    if (!input.locationId) throw new Error("Choose a location");
    const serviceIds = [...new Set((input.serviceIds || []).filter(Boolean))];
    if (serviceIds.length > 100) throw new Error("Too many treatments selected");
    data = {
      name,
      type: input.type,
      capacity: input.capacity,
      isPublic: input.isPublic === true,
      notes: text(input.notes, 2000, "Notes"),
      manufacturer: text(input.manufacturer, 120, "Manufacturer"),
      model: text(input.model, 120, "Model"),
      serialNumber: text(input.serialNumber, 120, "Serial number"),
      maintenanceDueAt: timestamp(input.maintenanceDueAt, "Maintenance date"),
      calibrationDueAt: timestamp(input.calibrationDueAt, "Calibration date"),
      serviceIds,
    };
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Resource details are invalid" };
  }

  const lockKeys = [`idempotency:${actor.practiceId}:resource:${input.idempotencyKey}`];
  if (input.resourceId) lockKeys.push(`resource:${input.resourceId}`);

  try {
    return await serializableWorkflow(context, "medspa-resource", lockKeys, async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const location = await sudo.query.Location.findOne({ where: { id: input.locationId }, query: "id isActive practice { id }" });
      if (!location || location.practice?.id !== actor.practiceId) throw new Error("Location is outside this practice");
      if (location.isActive === false) throw new Error("Location is inactive");

      const serviceIds = data.serviceIds as string[];
      if (serviceIds.length) {
        const samePractice = await sudo.query.Service.count({ where: { id: { in: serviceIds }, practice: { id: { equals: actor.practiceId } } } });
        if (samePractice !== serviceIds.length) throw new Error("A selected treatment is outside this practice");
      }

      const { serviceIds: _ids, ...fields } = data;
      const serviceRefs = serviceIds.map((id) => ({ id }));

      if (!input.resourceId) {
        // One name per location. A replay of the same request key returns the
        // resource it created instead of failing on its own name.
        const sameName = await sudo.query.Resource.findMany({
          where: { practice: { id: { equals: actor.practiceId } }, location: { id: { equals: location.id } }, name: { equals: fields.name as string, mode: "insensitive" } },
          take: 1, query: "id revision metadata",
        });
        if (sameName[0]) {
          if ((sameName[0].metadata as { createdByRequest?: string } | null)?.createdByRequest === input.idempotencyKey) {
            return { success: true, resourceId: sameName[0].id, revision: sameName[0].revision, error: null };
          }
          throw new Error("This location already has a resource with that name");
        }

        const gated = READINESS_GATED.has(input.type);
        const created = await sudo.query.Resource.createOne({
          data: {
            ...fields,
            practice: { connect: { id: actor.practiceId } },
            location: { connect: { id: location.id } },
            services: { connect: serviceRefs },
            isActive: !gated,
            readinessStatus: gated ? "acceptance_testing" : "available",
            revision: 1,
            metadata: { createdByRequest: input.idempotencyKey },
          },
          query: "id revision",
        });
        return { success: true, resourceId: created.id, revision: created.revision, error: null };
      }

      const current = await sudo.query.Resource.findOne({ where: { id: input.resourceId }, query: "id type revision practice { id }" });
      if (!current || current.practice?.id !== actor.practiceId) throw new Error("Resource not found");
      if (!Number.isInteger(input.expectedRevision) || current.revision !== input.expectedRevision) throw new Error("Resource was changed by another operator; reload and try again");
      if (current.type !== input.type && (READINESS_GATED.has(current.type) || READINESS_GATED.has(input.type))) {
        throw new Error("A device's type can't change; add a new resource instead");
      }
      const revision = current.revision + 1;
      await sudo.query.Resource.updateOne({
        where: { id: current.id },
        data: { ...fields, location: { connect: { id: location.id } }, services: { set: serviceRefs }, revision },
        query: "id",
      });
      return { success: true, resourceId: current.id, revision, error: null };
    });
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Resource could not be saved" };
  }
}

const resultType = graphql.object<ResourceUpsertResult>()({
  name: "ResourceUpsertResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    resourceId: graphql.field({ type: graphql.ID }),
    revision: graphql.field({ type: graphql.Int }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const upsertResource = graphql.field({
  type: resultType,
  args: {
    resourceId: graphql.arg({ type: graphql.ID }),
    expectedRevision: graphql.arg({ type: graphql.Int }),
    name: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    type: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    locationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    capacity: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
    isPublic: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
    notes: graphql.arg({ type: graphql.String }),
    manufacturer: graphql.arg({ type: graphql.String }),
    model: graphql.arg({ type: graphql.String }),
    serialNumber: graphql.arg({ type: graphql.String }),
    maintenanceDueAt: graphql.arg({ type: graphql.String }),
    calibrationDueAt: graphql.arg({ type: graphql.String }),
    serviceIds: graphql.arg({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return upsertResourceTransaction(context, args); },
});
