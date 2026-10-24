import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { assertPracticeRecord, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";

type Result = { success: boolean; recordId: string | null; error: string | null };
const fail = (error: unknown): Result => ({ success: false, recordId: null, error: error instanceof Error ? error.message : "Procurement workflow failed" });

const PRODUCT_KINDS = ["retail", "consumable", "both"] as const;
const MAX_MINOR = 100_000_000;

function cents(value: unknown, label: string) {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > MAX_MINOR) throw new Error(`${label} must be whole cents`);
  return value as number;
}

function text(value: unknown, label: string, max: number, required = false) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (required && !trimmed) throw new Error(`${label} is required`);
  if (trimmed.length > max) throw new Error(`${label} is too long`);
  return trimmed;
}

export type UpsertProductInput = {
  productId?: string | null; name: string; sku: string; kind: string; trackLots: boolean; price: number; cost?: number | null;
  reorderPoint?: number | null; category?: string | null; description?: string | null; isActive: boolean;
};

/** Catalog fields only. On-hand quantity changes only through inventory movements. */
export async function upsertProductTransaction(context: Context, args: UpsertProductInput): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageInventory, "Inventory authority is required"); } catch (error) { return fail(error); }
  try {
    const name = text(args.name, "Name", 200, true);
    const sku = text(args.sku, "SKU", 80, true);
    if (!PRODUCT_KINDS.includes(args.kind as any)) throw new Error("Choose retail, consumable or both");
    const price = cents(args.price, "Price");
    const cost = args.cost == null ? 0 : cents(args.cost, "Cost");
    const reorderPoint = args.reorderPoint == null ? 0 : args.reorderPoint;
    if (!Number.isInteger(reorderPoint) || reorderPoint < 0 || reorderPoint > 1_000_000) throw new Error("Reorder point must be a whole number");
    const data = {
      name, sku, kind: args.kind as any, trackLots: args.trackLots === true, price, cost, reorderPoint,
      category: text(args.category, "Category", 120), description: text(args.description, "Description", 2000), isActive: args.isActive === true,
    };
    return await serializableWorkflow(context, "medspa-product-catalog", [`sku:${sku.toLocaleLowerCase()}`, ...(args.productId ? [`product:${args.productId}`] : [])], async tx => {
      const sudo = tx.sudo();
      // SKU is unique across the database, so check globally and report it plainly.
      const clash = await sudo.query.Product.findMany({ where: { sku: { equals: sku } }, take: 2, query: "id" });
      if (clash.some((row: any) => row.id !== args.productId)) throw new Error("That SKU is already in use");
      if (args.productId) {
        const product = await assertPracticeRecord(tx, "Product", args.productId, "id practice { id } trackLots quantity");
        if (product.trackLots !== data.trackLots && Number(product.quantity || 0) > 0) throw new Error("Lot tracking can't change while stock is on hand");
        const updated = await sudo.query.Product.updateOne({ where: { id: product.id }, data, query: "id" });
        return { success: true, recordId: updated.id, error: null };
      }
      const created = await sudo.query.Product.createOne({ data: { ...data, quantity: 0, practice: { connect: { id: actor.practiceId } } }, query: "id" });
      return { success: true, recordId: created.id, error: null };
    });
  } catch (error) { return fail(error); }
}

type PurchaseOrderLineInput = { productId: string; quantity: number; unitCostMinor: number };

export async function createPurchaseOrderTransaction(context: Context, args: { vendorId: string; locationId: string; expectedAt?: string | null; lines: unknown; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageInventory, "Inventory authority is required"); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey)) return fail(new Error("Purchase order key is invalid"));
  try {
    if (!Array.isArray(args.lines) || args.lines.length === 0 || args.lines.length > 100) throw new Error("Add between 1 and 100 lines");
    const lines: PurchaseOrderLineInput[] = args.lines.map((row: any) => ({ productId: String(row?.productId || ""), quantity: Number(row?.quantity), unitCostMinor: Number(row?.unitCostMinor) }));
    for (const line of lines) {
      if (!line.productId || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1_000_000) throw new Error("Each line needs a product and a quantity of at least 1");
      cents(line.unitCostMinor, "Unit cost");
    }
    if (new Set(lines.map(line => line.productId)).size !== lines.length) throw new Error("A product may only appear once per order");
    let expectedAt: string | null = null;
    if (args.expectedAt) {
      const date = new Date(args.expectedAt);
      if (Number.isNaN(date.getTime())) throw new Error("Expected date is invalid");
      expectedAt = date.toISOString();
    }
    const scopedKey = `${actor.practiceId}:purchase-order:${args.idempotencyKey.trim()}`;
    return await serializableWorkflow(context, "medspa-purchase-order", [`idempotency:${scopedKey}`], async tx => {
      const sudo = tx.sudo();
      const prior = (await sudo.query.PurchaseOrder.findMany({ where: { practice: { id: { equals: actor.practiceId } }, number: { startsWith: "PO-" } }, orderBy: { createdAt: "desc" }, take: 1, query: "id number" }))[0];
      const replay = (await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, correlationId: { equals: scopedKey } }, take: 1, query: "resourceId" }))[0];
      if (replay?.resourceId) return { success: true, recordId: replay.resourceId, error: null };
      const [vendor, location] = await Promise.all([
        assertPracticeRecord(tx, "Vendor", args.vendorId, "id practice { id } isActive"),
        assertPracticeRecord(tx, "Location", args.locationId, "id practice { id } isActive"),
      ]);
      if (vendor.isActive === false) throw new Error("Vendor is inactive");
      if (location.isActive === false) throw new Error("Location is inactive");
      const products = await Promise.all(lines.map(line => assertPracticeRecord(tx, "Product", line.productId, "id practice { id } name")));
      const sequence = Number(String(prior?.number || "PO-0").replace(/\D/g, "")) + 1;
      const number = `PO-${String(sequence).padStart(5, "0")}`;
      const totalMinor = lines.reduce((sum, line) => sum + line.quantity * line.unitCostMinor, 0);
      const order = await sudo.query.PurchaseOrder.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, vendor: { connect: { id: vendor.id } }, location: { connect: { id: location.id } },
        number, status: "draft", totalMinor, expectedAt, revision: 1,
        lines: { create: lines.map((line, index) => ({ product: { connect: { id: line.productId } }, productTitle: products[index].name, orderedQuantity: line.quantity, receivedQuantity: 0, unitCostMinor: line.unitCostMinor })) },
      }, query: "id" });
      await sudo.query.AuditEvent.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action: "purchase_order.created",
        resourceType: "PurchaseOrder", resourceId: order.id, correlationId: scopedKey, evidence: { number, totalMinor, lineCount: lines.length }, evidenceHash: evidenceHash({ orderId: order.id, number, lines, actorId: actor.actorId }), occurredAt: new Date().toISOString(),
      }, query: "id" });
      return { success: true, recordId: order.id, error: null };
    });
  } catch (error) { return fail(error); }
}

export async function transitionPurchaseOrderTransaction(context: Context, args: { purchaseOrderId: string; action: string; expectedRevision: number }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageInventory, "Inventory authority is required"); } catch (error) { return fail(error); }
  if (!["submit", "cancel"].includes(args.action)) return fail(new Error("Choose submit or cancel"));
  try {
    return await serializableWorkflow(context, "medspa-purchase-order", [`po:${args.purchaseOrderId}`], async tx => {
      const sudo = tx.sudo();
      const order = await assertPracticeRecord(tx, "PurchaseOrder", args.purchaseOrderId, "id practice { id } status revision linesCount receiptsCount");
      if (Number(order.revision || 1) !== args.expectedRevision) throw new Error("This order changed. Reload and try again");
      if (args.action === "submit" && order.status !== "draft") throw new Error("Only a draft order can be submitted");
      if (args.action === "submit" && !order.linesCount) throw new Error("Add a line before submitting");
      if (args.action === "cancel" && (!["draft", "submitted"].includes(order.status) || order.receiptsCount)) throw new Error("Orders with receipts can't be cancelled");
      const status = args.action === "submit" ? "submitted" : "cancelled";
      await sudo.query.PurchaseOrder.updateOne({ where: { id: order.id }, data: {
        status, revision: Number(order.revision || 1) + 1, ...(args.action === "submit" ? { orderedAt: new Date().toISOString() } : {}),
      }, query: "id" });
      await sudo.query.AuditEvent.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action: `purchase_order.${status}`,
        resourceType: "PurchaseOrder", resourceId: order.id, correlationId: `${order.id}:${args.expectedRevision}`, evidence: { from: order.status, to: status }, evidenceHash: evidenceHash({ orderId: order.id, from: order.status, to: status, actorId: actor.actorId }), occurredAt: new Date().toISOString(),
      }, query: "id" });
      return { success: true, recordId: order.id, error: null };
    });
  } catch (error) { return fail(error); }
}

const resultType = graphql.object<Result>()({
  name: "ProcurementWorkflowResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    recordId: graphql.field({ type: graphql.ID }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const upsertProduct = graphql.field({
  type: resultType,
  args: {
    productId: graphql.arg({ type: graphql.ID }),
    name: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    sku: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    kind: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    trackLots: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
    price: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
    cost: graphql.arg({ type: graphql.Int }),
    reorderPoint: graphql.arg({ type: graphql.Int }),
    category: graphql.arg({ type: graphql.String }),
    description: graphql.arg({ type: graphql.String }),
    isActive: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }),
  },
  resolve(_source, args, context: Context) { return upsertProductTransaction(context, args); },
});

export const createPurchaseOrder = graphql.field({
  type: resultType,
  args: {
    vendorId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    locationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    expectedAt: graphql.arg({ type: graphql.String }),
    lines: graphql.arg({ type: graphql.nonNull(graphql.JSON) }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return createPurchaseOrderTransaction(context, args); },
});

export const transitionPurchaseOrder = graphql.field({
  type: resultType,
  args: {
    purchaseOrderId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    action: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    expectedRevision: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
  },
  resolve(_source, args, context: Context) { return transitionPurchaseOrderTransaction(context, args); },
});
