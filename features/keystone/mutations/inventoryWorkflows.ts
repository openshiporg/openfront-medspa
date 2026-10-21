import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { serializableWorkflow } from "./serializableWorkflow";

type InventoryResult = { success: boolean; movementId: string | null; balanceAfter: number | null; error: string | null };
const denied = { success: false, movementId: null, balanceAfter: null };

function validKey(value: string) {
  return value.trim().length >= 12 && value.length <= 200;
}

export async function recordInventoryMovement(context: Context, input: {
  productId: string;
  locationId: string;
  practiceId: string;
  appointmentId?: string | null;
  type: "receive" | "adjustment" | "sale" | "return";
  delta: number;
  reason: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}): Promise<InventoryResult> {
  if (!Number.isInteger(input.delta) || input.delta === 0 || Math.abs(input.delta) > 1_000_000) {
    return { ...denied, error: "Inventory delta must be a non-zero integer" };
  }
  if (!validKey(input.idempotencyKey)) return { ...denied, error: "Inventory idempotency key is invalid" };
  const reason = input.reason.trim();
  if (!reason || reason.length > 500) return { ...denied, error: "Inventory reason is required" };

  const sudo = context.sudo();
  const existing = (await sudo.query.InventoryMovement.findMany({
    where: { practice: { id: { equals: input.practiceId } }, idempotencyKey: { equals: input.idempotencyKey } }, take: 1,
    query: "id type delta balanceAfter reason practice { id } product { id } location { id } appointment { id }",
  }))[0];
  if (existing) {
    if (existing.practice?.id !== input.practiceId || existing.product?.id !== input.productId || existing.location?.id !== input.locationId || existing.delta !== input.delta
      || existing.type !== input.type || existing.reason !== input.reason.trim()
      || (existing.appointment?.id || null) !== (input.appointmentId || null)) {
      return { ...denied, error: "Inventory idempotency key was reused for another movement" };
    }
    return { success: true, movementId: existing.id, balanceAfter: existing.balanceAfter, error: null };
  }

  const [product, location, latestMovements] = await Promise.all([
    sudo.query.Product.findOne({ where: { id: input.productId }, query: "id quantity isActive practice { id }" }),
    sudo.query.Location.findOne({ where: { id: input.locationId }, query: "id isActive practice { id }" }),
    sudo.query.InventoryMovement.findMany({
      where: { product: { id: { equals: input.productId } }, location: { id: { equals: input.locationId } } },
      orderBy: { createdAt: "desc" }, take: 1, query: "id balanceAfter",
    }),
  ]);
  if (!product || product.isActive === false || product.practice?.id !== input.practiceId) return { ...denied, error: "Product is unavailable" };
  if (!location || location.isActive === false || location.practice?.id !== input.practiceId) return { ...denied, error: "Location is unavailable" };
  const balanceBefore = Number(latestMovements[0]?.balanceAfter || 0);
  const balanceAfter = balanceBefore + input.delta;
  if (balanceAfter < 0) return { ...denied, error: "Location inventory cannot fall below zero" };
  const aggregateQuantity = Number(product.quantity || 0) + input.delta;
  if (aggregateQuantity < 0) return { ...denied, error: "Aggregate inventory cannot fall below zero" };

  await sudo.query.Product.updateOne({ where: { id: product.id }, data: { quantity: aggregateQuantity }, query: "id" });
  const movement = await sudo.query.InventoryMovement.createOne({
    data: {
      practice: { connect: { id: input.practiceId } },
      type: input.type, delta: input.delta, balanceBefore, balanceAfter, reason,
      idempotencyKey: input.idempotencyKey,
      product: { connect: { id: product.id } }, location: { connect: { id: location.id } },
      appointment: input.appointmentId ? { connect: { id: input.appointmentId } } : undefined,
      metadata: (input.metadata || {}) as any,
    },
    query: "id",
  });
  return { success: true, movementId: movement.id, balanceAfter, error: null };
}

export async function adjustMedSpaInventoryTransaction(context: Context, input: {
  productId: string; locationId: string; delta: number; reason: string; idempotencyKey: string;
}): Promise<InventoryResult> {
  if (!permissions.canManageInventory({ session: context.session as any }) || !context.session?.data?.practice?.id) {
    return { ...denied, error: "You must be an authorized inventory operator with a practice" };
  }
  try {
    return await serializableWorkflow(context, "medspa-inventory", [
      `product:${input.productId}`, `location:${input.locationId}`, `idempotency:${input.idempotencyKey}`,
    ], async (transactionContext) => {
      const product = await transactionContext.sudo().query.Product.findOne({ where: { id: input.productId }, query: "id trackLots practice { id }" });
      if (!product || product.practice?.id !== transactionContext.session?.data?.practice?.id) return { ...denied, error: "Product is unavailable" };
      if (product.trackLots) return { ...denied, error: "Tracked inventory requires controlled lot receiving or disposition" };
      return recordInventoryMovement(transactionContext, {
        ...input, practiceId: transactionContext.session!.data.practice!.id, type: input.delta > 0 ? "receive" : "adjustment",
      });
    });
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Inventory adjustment failed" };
  }
}

const resultType = graphql.object<InventoryResult>()({
  name: "MedSpaInventoryResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    movementId: graphql.field({ type: graphql.ID }),
    balanceAfter: graphql.field({ type: graphql.Int }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const adjustMedSpaInventory = graphql.field({
  type: resultType,
  args: {
    productId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    locationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    delta: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
    reason: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return adjustMedSpaInventoryTransaction(context, args); },
});
