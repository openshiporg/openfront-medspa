import { createHash } from "node:crypto";
import { assertDomainEventReplaySafe } from "./domainEventReplayPolicy";

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function snapshot(item: unknown, fields: readonly string[]) {
  const record = (item || {}) as Record<string, unknown>;
  return Object.fromEntries(fields.filter((field) => field in record).map((field) => [field, canonicalize(record[field])]));
}

function payloadHash(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(payload))).digest("hex");
}

export async function enqueueDomainEvent(context: any, input: {
  eventKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  operation: "create" | "update" | "delete";
  practiceId: string;
  locationId?: string | null;
  payload: Record<string, unknown>;
  occurredAt?: Date;
}) {
  if (!input.eventKey?.trim() || !input.aggregateId?.trim()) throw new Error("Domain event identity is required");
  if (!input.practiceId?.trim()) throw new Error("Domain event practice attribution is required");
  const occurredAt = input.occurredAt || new Date();
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
    practiceId: input.practiceId,
  };
  await context.prisma.$executeRawUnsafe(
    "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
    "medspa-domain-outbox",
    input.eventKey,
  );
  const existing = await context.sudo().query.DomainEvent.findOne({
    where: { eventKey: input.eventKey },
    query: "id eventType eventVersion aggregateType aggregateId operation locationId payloadHash practice { id }",
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
      practiceId: existing.practice?.id || null,
    }, replayIdentity);
    if (replay.repairPractice) {
      await context.sudo().query.DomainEvent.updateOne({
        where: { id: existing.id },
        data: { practice: { connect: { id: input.practiceId } } },
        query: "id",
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
      attempts: 0,
    },
    query: "id",
  });
  return { id: event.id, created: true };
}

export function createLifecycleHooks(
  aggregateType: string,
  fields: readonly string[],
) {
  return {
    afterOperation: async ({ operation, item, originalItem, context }: any) => {
      const aggregateId = String(item?.id || originalItem?.id || "");
      if (!aggregateId) throw new Error(`${aggregateType} lifecycle event is missing its aggregate id`);
      const versionSource = item?.updatedAt || item?.createdAt || originalItem?.updatedAt || originalItem?.createdAt;
      const version = versionSource ? new Date(versionSource).toISOString() : `${operation}:v1`;
      const before = operation === "create" ? null : snapshot(originalItem, fields);
      const after = operation === "delete" ? null : snapshot(item, fields);
      if (operation === "update" && JSON.stringify(canonicalize(before)) === JSON.stringify(canonicalize(after))) return;
      const payload = { aggregateType, aggregateId, operation, before, after };
      const practiceId = String(item?.practiceId || originalItem?.practiceId || "");
      if (!practiceId) throw new Error(`${aggregateType} lifecycle event is missing its practice id`);
      await enqueueDomainEvent(context, {
        eventKey: `${aggregateType}:${aggregateId}:${operation}:${version}:${payloadHash(payload).slice(0, 16)}`,
        eventType: `medspa.${aggregateType}.${operation}.v1`,
        aggregateType,
        aggregateId,
        operation,
        practiceId,
        locationId: String(item?.locationId || originalItem?.locationId || "") || null,
        payload,
        occurredAt: versionSource ? new Date(versionSource) : new Date(),
      });
    },
  };
}
