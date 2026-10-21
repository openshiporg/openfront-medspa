import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { assertPracticeRecord, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";
import { recordInventoryMovement } from "./inventoryWorkflows";

type Result = { success: boolean; recordId: string | null; movementCount: number; error: string | null };
const denied = { success: false, recordId: null, movementCount: 0 };
const fail = (error: unknown): Result => ({ ...denied, error: error instanceof Error ? error.message : "Inventory custody workflow failed" });

type ReceiptLine = { purchaseOrderLineId: string; productId: string; quantity: number; lotNumber: string; expiresAt?: string | null; condition: string; temperatureEvidence?: unknown; quarantineReason?: string | null };
function parseLines(value: unknown): ReceiptLine[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) throw new Error("Choose between 1 and 200 receipt lines");
  return value.map((row: any) => { const line = { purchaseOrderLineId: String(row?.purchaseOrderLineId || ""), productId: String(row?.productId || ""), quantity: Number(row?.quantity), lotNumber: String(row?.lotNumber || "").trim(), expiresAt: row?.expiresAt || null, condition: String(row?.condition || "").trim(), temperatureEvidence: row?.temperatureEvidence || {}, quarantineReason: row?.quarantineReason ? String(row.quarantineReason).trim() : null }; if (!line.purchaseOrderLineId || !line.productId || !Number.isInteger(line.quantity) || line.quantity <= 0 || !line.lotNumber || !line.condition) throw new Error("Receipt line evidence is invalid"); return line; });
}

export async function receivePurchaseOrderTransaction(context: Context, args: { purchaseOrderId: string; receiptNumber: string; receivedAt: string; lines: unknown; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageInventory); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.receiptNumber.trim() || args.receiptNumber.trim().length > 120) return { ...denied, error: "Receipt evidence is invalid" };
  let lines: ReceiptLine[]; try { lines = parseLines(args.lines); } catch (error) { return fail(error); }
  try {
    const po = await assertPracticeRecord(context, "PurchaseOrder", args.purchaseOrderId, "id practice { id } location { id } lines { id product { id } }");
    const receivedAtDate = new Date(args.receivedAt);
    if (Number.isNaN(receivedAtDate.getTime())) throw new Error("Receipt timestamp is invalid");
    const receivedAt = receivedAtDate.toISOString();
    const scopedReceiptKey = `${actor.practiceId}:goods-receipt:${evidenceHash(args.idempotencyKey)}`;
    const receiptRequestHash = evidenceHash({ purchaseOrderId: po.id, receiptNumber: args.receiptNumber.trim(), receivedAt, lines, actorId: actor.actorId });
    const lotKeys = new Set<string>();
    for (const line of lines) {
      const lotKey = `${line.productId}:${line.lotNumber.toLocaleLowerCase()}`;
      if (lotKeys.has(lotKey)) throw new Error("A product lot may only appear once per receipt");
      lotKeys.add(lotKey);
    }
    return await serializableWorkflow(context, "medspa-goods-receipt", [`po:${po.id}`, ...lines.map(line => `product:${line.productId}:lot:${line.lotNumber.toLocaleLowerCase()}`), `idempotency:${scopedReceiptKey}`], async tx => {
      const sudo = tx.sudo();
      const priorReceipt = (await sudo.query.GoodsReceipt.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedReceiptKey } }, take: 1, query: "id evidence" }))[0];
      if (priorReceipt) {
        if (priorReceipt.evidence?.requestHash !== receiptRequestHash) throw new Error("Goods-receipt key was already used with different evidence");
        return { success: true, recordId: priorReceipt.id, movementCount: Number(priorReceipt.evidence?.lineCount || 0), error: null };
      }
      const currentPo = await sudo.query.PurchaseOrder.findOne({ where: { id: po.id }, query: "id practice { id } status revision location { id } vendor { id } lines { id product { id } orderedQuantity receivedQuantity }" });
      if (!currentPo || currentPo.practice?.id !== actor.practiceId || !currentPo.location?.id || !["submitted", "partially_received"].includes(currentPo.status)) throw new Error("Purchase order is not receivable in this practice");
      const currentLines = new Map((currentPo.lines || []).map((item: any) => [item.id, item]));
      const totalsByLine = new Map<string, number>();
      for (const line of lines) totalsByLine.set(line.purchaseOrderLineId, (totalsByLine.get(line.purchaseOrderLineId) || 0) + line.quantity);
      for (const [lineId, total] of totalsByLine) {
        const source: any = currentLines.get(lineId);
        if (!source || !source.product?.id || lines.some((line) => line.purchaseOrderLineId === lineId && line.productId !== source.product.id)
          || Number(source.receivedQuantity || 0) + total > Number(source.orderedQuantity || 0)) throw new Error("Receipt exceeds or mismatches the current purchase-order balance");
        await assertPracticeRecord(tx, "Product", source.product.id);
      }
      const receiptEvidence = { purchaseOrderId: currentPo.id, receiptNumber: args.receiptNumber.trim(), receivedAt, lines, actorId: actor.actorId };
      const receipt = await sudo.query.GoodsReceipt.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, location: { connect: { id: currentPo.location.id } }, purchaseOrder: { connect: { id: currentPo.id } },
        receiptNumber: args.receiptNumber.trim(), receivedAt, receivedBy: { connect: { id: actor.actorId } }, idempotencyKey: scopedReceiptKey,
        evidence: { hash: evidenceHash(receiptEvidence), requestHash: receiptRequestHash, lineCount: lines.length },
      }, query: "id" });
      for (const [lineId, total] of totalsByLine) {
        const source: any = currentLines.get(lineId);
        await sudo.query.PurchaseOrderLine.updateOne({ where: { id: lineId }, data: { receivedQuantity: Number(source.receivedQuantity || 0) + total }, query: "id" });
      }
      for (const [index, line] of lines.entries()) {
        const source: any = currentLines.get(line.purchaseOrderLineId);
        const quarantined = Boolean(line.quarantineReason);
        const expiresAt = line.expiresAt ? new Date(line.expiresAt) : null;
        if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= receivedAtDate)) throw new Error("Received lot is already expired");
        const lot = await sudo.query.InventoryLot.createOne({ data: {
          practice: { connect: { id: actor.practiceId } }, location: { connect: { id: currentPo.location.id } }, product: { connect: { id: line.productId } },
          vendor: currentPo.vendor?.id ? { connect: { id: currentPo.vendor.id } } : undefined, lotNumber: line.lotNumber, receivedQuantity: line.quantity,
          remainingQuantity: line.quantity, receivedAt, expiresAt: expiresAt?.toISOString(), status: quarantined ? "quarantined" : "available",
        }, query: "id" });
        const lineHash = evidenceHash({ ...line, receiptId: receipt.id, lotId: lot.id, receivedAt });
        await sudo.query.GoodsReceiptLine.createOne({ data: {
          practice: { connect: { id: actor.practiceId } }, receipt: { connect: { id: receipt.id } }, purchaseOrderLine: { connect: { id: source.id } },
          product: { connect: { id: line.productId } }, lot: { connect: { id: lot.id } }, quantity: line.quantity, lotNumberSnapshot: line.lotNumber,
          expirationSnapshot: expiresAt?.toISOString(), condition: line.condition, temperatureEvidence: line.temperatureEvidence as any,
          quarantineReason: line.quarantineReason || "", evidenceHash: lineHash, idempotencyKey: `${scopedReceiptKey}:line:${index}`,
        }, query: "id" });
        await sudo.query.StockMovement.createOne({ data: {
          practice: { connect: { id: actor.practiceId } }, location: { connect: { id: currentPo.location.id } }, lot: { connect: { id: lot.id } },
          product: { connect: { id: line.productId } }, type: "receive", delta: line.quantity, balanceBefore: 0, balanceAfter: line.quantity,
          idempotencyKey: `${scopedReceiptKey}:movement:${index}`, reason: quarantined ? "Received into quarantine" : "Authorized goods receipt",
          actor: { connect: { id: actor.actorId } }, metadata: { receiptId: receipt.id, receiptLineEvidenceHash: lineHash },
        }, query: "id" });
        const movement = await recordInventoryMovement(tx, {
          practiceId: actor.practiceId, productId: line.productId, locationId: currentPo.location.id, type: "receive", delta: line.quantity,
          reason: `Goods receipt ${receipt.id}`, idempotencyKey: `${scopedReceiptKey}:inventory:${index}`, metadata: { receiptId: receipt.id, lotId: lot.id },
        });
        if (!movement.success) throw new Error(movement.error || "Location inventory movement failed");
      }
      const refreshed = await sudo.query.PurchaseOrderLine.findMany({ where: { purchaseOrder: { id: { equals: currentPo.id } } }, query: "id orderedQuantity receivedQuantity" });
      const complete = refreshed.every((item: any) => item.receivedQuantity >= item.orderedQuantity);
      await sudo.query.PurchaseOrder.updateOne({ where: { id: currentPo.id }, data: { status: complete ? "received" : "partially_received", revision: Number(currentPo.revision || 1) + 1 }, query: "id" });
      return { success: true, recordId: receipt.id, movementCount: lines.length, error: null };
    });
  } catch (error) { return fail(error); }
}

export async function dispositionInventoryLotTransaction(context: Context, args: { lotId: string; action: "quarantine" | "return" | "destroy" | "expire"; quantity: number; reason: string; witnessId?: string | null; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageInventory); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !Number.isInteger(args.quantity) || args.quantity < 0 || !args.reason.trim() || (["destroy","return"].includes(args.action) && !args.witnessId)) return { ...denied, error: "Lot disposition evidence is invalid" };
  try {
    const lot = await assertPracticeRecord(context, "InventoryLot", args.lotId, "id practice { id } status remainingQuantity location { id } product { id quantity }"); if (args.witnessId) await assertPracticeRecord(context, "User", args.witnessId);
    if (["recalled","destroyed","returned"].includes(lot.status)) throw new Error("Lot cannot be dispositioned from its current state");
    return await serializableWorkflow(context, "medspa-lot-disposition", [`lot:${lot.id}`, `idempotency:${args.idempotencyKey}`], async tx => {
      const sudo = tx.sudo(); const removing = ["destroy","return","expire"].includes(args.action); const quantity = removing ? args.quantity : 0; if (quantity > lot.remainingQuantity) throw new Error("Lot disposition exceeds remaining quantity"); const after = lot.remainingQuantity - quantity;
      const status = args.action === "quarantine" ? "quarantined" : args.action === "return" ? "returned" : args.action === "destroy" ? "destroyed" : "expired";
      await sudo.query.InventoryLot.updateOne({ where: { id: lot.id }, data: { remainingQuantity: after, status }, query: "id" });
      await sudo.query.StockMovement.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: lot.location.id } }, lot: { connect: { id: lot.id } }, product: { connect: { id: lot.product.id } }, type: args.action === "return" ? "return" : args.action === "expire" ? "expire" : "adjustment", delta: -quantity, balanceBefore: lot.remainingQuantity, balanceAfter: after, idempotencyKey: args.idempotencyKey, reason: args.reason.trim(), actor: { connect: { id: actor.actorId } }, metadata: { action: args.action, witnessId: args.witnessId || null, evidenceHash: evidenceHash({ ...args, actorId: actor.actorId }) } }, query: "id" });
      if (quantity) await sudo.query.Product.updateOne({ where: { id: lot.product.id }, data: { quantity: Math.max(0, Number(lot.product.quantity || 0) - quantity) }, query: "id" });
      return { success: true, recordId: lot.id, movementCount: 1, error: null };
    });
  } catch (error) { return fail(error); }
}

export async function returnRetailLotTransaction(context: Context, args: { transactionLineId: string; lotId: string; quantity: number; disposition: "restock" | "quarantine"; reason: string; idempotencyKey: string }): Promise<Result> {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageInventory);
    await Promise.all([assertPracticeRecord(context, "MedSpaTransactionLineItem", args.transactionLineId), assertPracticeRecord(context, "InventoryLot", args.lotId)]);
  } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !Number.isInteger(args.quantity) || args.quantity < 1 || !["restock", "quarantine"].includes(args.disposition) || !args.reason.trim()) return { ...denied, error: "Retail return evidence is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-retail-return", [
      `lot:${args.lotId}`, `line:${args.transactionLineId}`, `idempotency:${actor.practiceId}:${args.idempotencyKey}`,
    ], async tx => {
      const s = tx.sudo();
      const scopedKey = `${actor.practiceId}:retail-return:${evidenceHash(args.idempotencyKey)}`;
      const requestHash = evidenceHash({ transactionLineId: args.transactionLineId, lotId: args.lotId, quantity: args.quantity, disposition: args.disposition, reason: args.reason.trim(), actorId: actor.actorId });
      const prior = (await s.query.StockMovement.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedKey } }, take: 1, query: "id lot { id } transactionLine { id } delta metadata" }))[0];
      if (prior) {
        if (prior.lot?.id !== args.lotId || prior.transactionLine?.id !== args.transactionLineId || prior.delta !== args.quantity || prior.metadata?.requestHash !== requestHash) throw new Error("Retail-return key was already used with different evidence");
        return { success: true, recordId: prior.id, movementCount: 1, error: null };
      }
      const lot = await s.query.InventoryLot.findOne({ where: { id: args.lotId }, query: "id practice { id } remainingQuantity status product { id quantity } location { id }" });
      if (!lot?.product || !lot.location || lot.practice?.id !== actor.practiceId) throw new Error("Return lot is unavailable");
      if (["recalled", "destroyed", "returned", "expired"].includes(lot.status) || (lot.status === "quarantined" && args.disposition === "restock")) throw new Error("Held, recalled, destroyed, returned, or expired lots cannot be restocked");
      const openRecalls = await s.query.RecallCase.findMany({ where: { practice: { id: { equals: actor.practiceId } }, lot: { id: { equals: lot.id } }, status: { not: { equals: "closed" } } }, take: 1, query: "id status" });
      if (openRecalls.length) throw new Error("An open recall hold prevents this lot return from restoring availability");
      const movements = await s.query.StockMovement.findMany({ where: { practice: { id: { equals: actor.practiceId } }, lot: { id: { equals: lot.id } }, transactionLine: { id: { equals: args.transactionLineId } }, type: { in: ["retail_sale", "return"] } }, take: 101, query: "id type delta product { id }" });
      if (movements.length > 100 || movements.some((movement: any) => movement.product?.id !== lot.product.id)) throw new Error("Retail return evidence is unavailable or exceeds the verification bound");
      const sold = -movements.filter((movement: any) => movement.type === "retail_sale").reduce((sum: number, movement: any) => sum + Number(movement.delta || 0), 0);
      const returned = movements.filter((movement: any) => movement.type === "return").reduce((sum: number, movement: any) => sum + Number(movement.delta || 0), 0);
      if (args.quantity > sold - returned) throw new Error("Return quantity exceeds sold lot quantity");
      const movementResult = await recordInventoryMovement(tx, {
        practiceId: actor.practiceId, productId: lot.product.id, locationId: lot.location.id, type: "return", delta: args.quantity,
        reason: `Retail return: ${args.reason.trim()}`, idempotencyKey: `${scopedKey}:inventory`,
        metadata: { requestHash, lotId: lot.id, disposition: args.disposition },
      });
      if (!movementResult.success) throw new Error(movementResult.error || "Location inventory return failed");
      const at = new Date().toISOString();
      const after = Number(lot.remainingQuantity || 0) + args.quantity;
      const hash = evidenceHash({ ...args, actorId: actor.actorId, at });
      await s.query.InventoryLot.updateOne({ where: { id: lot.id }, data: { remainingQuantity: after, status: args.disposition === "restock" ? "available" : "quarantined" }, query: "id" });
      const movement = await s.query.StockMovement.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, location: { connect: { id: lot.location.id } }, lot: { connect: { id: lot.id } }, product: { connect: { id: lot.product.id } },
        type: "return", delta: args.quantity, balanceBefore: lot.remainingQuantity, balanceAfter: after, idempotencyKey: scopedKey, reason: args.reason.trim(),
        actor: { connect: { id: actor.actorId } }, transactionLine: { connect: { id: args.transactionLineId } }, metadata: { disposition: args.disposition, requestHash, evidenceHash: hash },
      }, query: "id" });
      return { success: true, recordId: movement.id, movementCount: 1, error: null };
    });
  } catch (error) { return fail(error); }
}

const resultType = graphql.object<Result>()({ name: "InventoryCustodyResult", fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), recordId: graphql.field({ type: graphql.ID }), movementCount: graphql.field({ type: graphql.nonNull(graphql.Int) }), error: graphql.field({ type: graphql.String }) } });
export const receivePurchaseOrder = graphql.field({ type: resultType, args: { purchaseOrderId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), receiptNumber: graphql.arg({ type: graphql.nonNull(graphql.String) }), receivedAt: graphql.arg({ type: graphql.nonNull(graphql.String) }), lines: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) }, resolve(_s, args, context: Context) { return receivePurchaseOrderTransaction(context, args); } });
export const returnRetailLot = graphql.field({ type: resultType, args: { transactionLineId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), lotId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), quantity: graphql.arg({ type: graphql.nonNull(graphql.Int) }), disposition: graphql.arg({ type: graphql.nonNull(graphql.String) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) }, resolve(_s,args,context:Context){ return returnRetailLotTransaction(context,args as any); } });
export const dispositionInventoryLot = graphql.field({ type: resultType, args: { lotId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), action: graphql.arg({ type: graphql.nonNull(graphql.String) }), quantity: graphql.arg({ type: graphql.nonNull(graphql.Int) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), witnessId: graphql.arg({ type: graphql.ID }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) }, resolve(_s, args, context: Context) { return dispositionInventoryLotTransaction(context, args as any); } });
