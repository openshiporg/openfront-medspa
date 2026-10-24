'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type {
  ActionResult, InventoryLocation, InventoryLotRow, InventoryProduct, InventoryRead, InventoryVendor, MovementRow, ProductInput,
  PurchaseOrderDetail, PurchaseOrderInput, PurchaseOrderRow, ReceiptLineInput, StaffOption, VendorInput,
} from '../types';

const NO_STORE = { cache: 'no-store' as const };
const PO_STATUSES = ['draft', 'submitted', 'partially_received', 'received', 'cancelled'];
const LOT_STATUSES = ['available', 'quarantined', 'recalled', 'expired', 'depleted', 'returned', 'destroyed'];

function refresh(path = '/dashboard/platform/inventory') {
  revalidatePath(path);
}

export async function getInventoryProducts(): Promise<InventoryRead<{ products: InventoryProduct[]; locations: InventoryLocation[] }>> {
  const response = await keystoneClient<{ products: InventoryProduct[]; locations: InventoryLocation[] }>(`
    query InventoryProducts {
      products(orderBy: { name: asc }, take: 500) { id name sku kind trackLots price cost quantity reorderPoint category description isActive }
      locations(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 50) { id name }
    }
  `, {}, NO_STORE).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  return { status: 'loaded', data: { products: response.data.products || [], locations: response.data.locations || [] } };
}

export async function getInventoryLots(status: string): Promise<InventoryRead<{ lots: InventoryLotRow[]; counts: Record<string, number>; staff: StaffOption[] }>> {
  const where = LOT_STATUSES.includes(status) ? { status: { equals: status } } : {};
  const response = await keystoneClient<Record<string, any>>(`
    query InventoryLots($where: InventoryLotWhereInput!) {
      inventoryLots(where: $where, orderBy: { expiresAt: asc }, take: 300) {
        id lotNumber status receivedQuantity remainingQuantity receivedAt expiresAt
        product { id name } location { name } vendor { name }
      }
      ${LOT_STATUSES.map((value) => `${value}: inventoryLotsCount(where: { status: { equals: ${value} } })`).join('\n')}
      all: inventoryLotsCount
      users(where: { status: { equals: active }, role: { canAccessDashboard: { equals: true } } }, orderBy: { name: asc }, take: 100) { id name }
    }
  `, { where }, NO_STORE).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const counts = Object.fromEntries([...LOT_STATUSES, 'all'].map((key) => [key, Number(response.data[key] || 0)]));
  return { status: 'loaded', data: { lots: response.data.inventoryLots || [], counts, staff: response.data.users || [] } };
}

export async function getPurchaseOrders(status: string): Promise<InventoryRead<{ orders: PurchaseOrderRow[]; counts: Record<string, number>; vendors: InventoryVendor[]; locations: InventoryLocation[]; products: InventoryProduct[] }>> {
  const where = PO_STATUSES.includes(status) ? { status: { equals: status } } : status === 'open' ? { status: { in: ['draft', 'submitted', 'partially_received'] } } : {};
  const response = await keystoneClient<Record<string, any>>(`
    query PurchaseOrders($where: PurchaseOrderWhereInput!) {
      purchaseOrders(where: $where, orderBy: { createdAt: desc }, take: 200) {
        id number status totalMinor orderedAt expectedAt revision createdAt linesCount vendor { name } location { name }
      }
      ${PO_STATUSES.map((value) => `${value}: purchaseOrdersCount(where: { status: { equals: ${value} } })`).join('\n')}
      all: purchaseOrdersCount
      vendors(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 200) { id name email phone isActive purchaseOrdersCount }
      locations(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 50) { id name }
      products(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 500) { id name sku kind trackLots price cost quantity reorderPoint category description isActive }
    }
  `, { where }, NO_STORE).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const counts = Object.fromEntries([...PO_STATUSES, 'all'].map((key) => [key, Number(response.data[key] || 0)]));
  return { status: 'loaded', data: { orders: response.data.purchaseOrders || [], counts, vendors: response.data.vendors || [], locations: response.data.locations || [], products: response.data.products || [] } };
}

export async function getPurchaseOrder(id: string): Promise<InventoryRead<PurchaseOrderDetail | null>> {
  const response = await keystoneClient<{ purchaseOrder: PurchaseOrderDetail | null }>(`
    query PurchaseOrderDetail($id: ID!) {
      purchaseOrder(where: { id: $id }) {
        id number status totalMinor orderedAt expectedAt revision createdAt linesCount vendor { name } location { name }
        lines(orderBy: { productTitle: asc }) { id productTitle orderedQuantity receivedQuantity unitCostMinor product { id name trackLots } }
        receipts(orderBy: { receivedAt: desc }) {
          id receiptNumber receivedAt receivedBy { name }
          lines { id quantity lotNumberSnapshot condition quarantineReason product { name } }
        }
      }
    }
  `, { id }, NO_STORE).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  return { status: 'loaded', data: response.data.purchaseOrder };
}

export async function getVendors(): Promise<InventoryRead<InventoryVendor[]>> {
  const response = await keystoneClient<{ vendors: InventoryVendor[] }>(`
    query InventoryVendors { vendors(orderBy: { name: asc }, take: 300) { id name email phone isActive purchaseOrdersCount } }
  `, {}, NO_STORE).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  return { status: 'loaded', data: response.data.vendors || [] };
}

export async function getMovements(source: string, productId: string): Promise<InventoryRead<{ movements: MovementRow[]; products: Array<{ id: string; name: string }> }>> {
  const productWhere = productId ? { product: { id: { equals: productId } } } : {};
  const wantProduct = source !== 'lot';
  const wantLot = source !== 'product';
  const response = await keystoneClient<Record<string, any>>(`
    query InventoryMovements($productWhere: InventoryMovementWhereInput!, $lotWhere: StockMovementWhereInput!, $productTake: Int!, $lotTake: Int!) {
      inventoryMovements(where: $productWhere, orderBy: { createdAt: desc }, take: $productTake) {
        id type delta balanceAfter reason createdAt product { name } location { name }
      }
      stockMovements(where: $lotWhere, orderBy: { createdAt: desc }, take: $lotTake) {
        id type delta balanceAfter reason createdAt product { name } location { name } lot { lotNumber } actor { name }
      }
      products(orderBy: { name: asc }, take: 500) { id name }
    }
  `, { productWhere, lotWhere: productWhere, productTake: wantProduct ? 150 : 0, lotTake: wantLot ? 150 : 0 }, NO_STORE).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const movements: MovementRow[] = [
    ...(response.data.inventoryMovements || []).map((row: any) => ({ id: `p:${row.id}`, source: 'product' as const, type: row.type, delta: row.delta, balanceAfter: row.balanceAfter, reason: row.reason, createdAt: row.createdAt, product: row.product?.name || 'Product', location: row.location?.name || null, lot: null, actor: null })),
    ...(response.data.stockMovements || []).map((row: any) => ({ id: `l:${row.id}`, source: 'lot' as const, type: row.type, delta: row.delta, balanceAfter: row.balanceAfter, reason: row.reason, createdAt: row.createdAt, product: row.product?.name || 'Product', location: row.location?.name || null, lot: row.lot?.lotNumber || null, actor: row.actor?.name || null })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { status: 'loaded', data: { movements, products: response.data.products || [] } };
}

export async function saveProduct(input: ProductInput): Promise<ActionResult> {
  const response = await keystoneClient<{ upsertProduct: ActionResult }>(`
    mutation UpsertProduct($productId: ID, $name: String!, $sku: String!, $kind: String!, $trackLots: Boolean!, $price: Int!, $cost: Int, $reorderPoint: Int, $category: String, $description: String, $isActive: Boolean!) {
      upsertProduct(productId: $productId, name: $name, sku: $sku, kind: $kind, trackLots: $trackLots, price: $price, cost: $cost, reorderPoint: $reorderPoint, category: $category, description: $description, isActive: $isActive) { success recordId error }
    }
  `, { ...input }).catch(() => null);
  if (!response?.success) return { success: false, error: 'Product was not saved. Try again.' };
  if (response.data.upsertProduct.success) refresh();
  return response.data.upsertProduct;
}

export async function adjustStock(input: { productId: string; locationId: string; delta: number; reason: string; idempotencyKey: string }): Promise<ActionResult> {
  const response = await keystoneClient<{ adjustMedSpaInventory: { success: boolean; error: string | null } }>(`
    mutation AdjustStock($productId: ID!, $locationId: ID!, $delta: Int!, $reason: String!, $idempotencyKey: String!) {
      adjustMedSpaInventory(productId: $productId, locationId: $locationId, delta: $delta, reason: $reason, idempotencyKey: $idempotencyKey) { success error }
    }
  `, { ...input }).catch(() => null);
  if (!response?.success) return { success: false, error: 'Stock change not confirmed. Check movements before retrying.' };
  if (response.data.adjustMedSpaInventory.success) refresh();
  return response.data.adjustMedSpaInventory;
}

async function currentPracticeId(): Promise<string | null> {
  const response = await keystoneClient<{ authenticatedItem: { practice: { id: string } | null } | null }>(`
    query InventoryPractice { authenticatedItem { ... on User { practice { id } } } }
  `, {}, NO_STORE).catch(() => null);
  return response?.success ? response.data.authenticatedItem?.practice?.id || null : null;
}

export async function saveVendor(input: VendorInput): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name || name.length > 200) return { success: false, error: 'Enter a vendor name.' };
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return { success: false, error: 'Enter a valid email.' };
  const data = { name, email: input.email.trim(), phone: input.phone.trim(), isActive: input.isActive };
  if (input.vendorId) {
    const response = await keystoneClient<{ updateVendor: { id: string } | null }>(`
      mutation UpdateVendor($id: ID!, $data: VendorUpdateInput!) { updateVendor(where: { id: $id }, data: $data) { id } }
    `, { id: input.vendorId, data }).catch(() => null);
    if (!response?.success || !response.data.updateVendor) return { success: false, error: 'Vendor was not saved. Try again.' };
    refresh();
    return { success: true, recordId: response.data.updateVendor.id };
  }
  const practiceId = await currentPracticeId();
  if (!practiceId) return { success: false, error: 'Practice not set up.' };
  const response = await keystoneClient<{ createVendor: { id: string } | null }>(`
    mutation CreateVendor($data: VendorCreateInput!) { createVendor(data: $data) { id } }
  `, { data: { ...data, practice: { connect: { id: practiceId } } } }).catch(() => null);
  if (!response?.success || !response.data.createVendor) return { success: false, error: 'Vendor was not saved. Try again.' };
  refresh();
  return { success: true, recordId: response.data.createVendor.id };
}

export async function createOrder(input: PurchaseOrderInput): Promise<ActionResult> {
  const response = await keystoneClient<{ draftPurchaseOrder: ActionResult }>(`
    mutation CreatePurchaseOrder($vendorId: ID!, $locationId: ID!, $expectedAt: String, $lines: JSON!, $idempotencyKey: String!) {
      draftPurchaseOrder(vendorId: $vendorId, locationId: $locationId, expectedAt: $expectedAt, lines: $lines, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { ...input }).catch(() => null);
  if (!response?.success) return { success: false, error: 'Order not confirmed. Check purchase orders before retrying.' };
  if (response.data.draftPurchaseOrder.success) refresh();
  return response.data.draftPurchaseOrder;
}

export async function transitionOrder(input: { purchaseOrderId: string; action: 'submit' | 'cancel'; expectedRevision: number }): Promise<ActionResult> {
  const response = await keystoneClient<{ transitionPurchaseOrder: ActionResult }>(`
    mutation TransitionPurchaseOrder($purchaseOrderId: ID!, $action: String!, $expectedRevision: Int!) {
      transitionPurchaseOrder(purchaseOrderId: $purchaseOrderId, action: $action, expectedRevision: $expectedRevision) { success recordId error }
    }
  `, { ...input }).catch(() => null);
  if (!response?.success) return { success: false, error: 'Change not confirmed. Reload the order.' };
  if (response.data.transitionPurchaseOrder.success) {
    refresh();
    refresh(`/dashboard/platform/inventory/purchase-orders/${input.purchaseOrderId}`);
  }
  return response.data.transitionPurchaseOrder;
}

export async function receiveOrder(input: { purchaseOrderId: string; receiptNumber: string; receivedAt: string; lines: ReceiptLineInput[]; idempotencyKey: string }): Promise<ActionResult> {
  const response = await keystoneClient<{ receivePurchaseOrder: { success: boolean; recordId: string | null; error: string | null } }>(`
    mutation ReceivePurchaseOrder($purchaseOrderId: ID!, $receiptNumber: String!, $receivedAt: String!, $lines: JSON!, $idempotencyKey: String!) {
      receivePurchaseOrder(purchaseOrderId: $purchaseOrderId, receiptNumber: $receiptNumber, receivedAt: $receivedAt, lines: $lines, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { ...input }).catch(() => null);
  if (!response?.success) return { success: false, error: 'Receipt not confirmed. Check receipts before retrying.' };
  if (response.data.receivePurchaseOrder.success) {
    refresh();
    refresh(`/dashboard/platform/inventory/purchase-orders/${input.purchaseOrderId}`);
  }
  return response.data.receivePurchaseOrder;
}

export async function dispositionLot(input: { lotId: string; action: 'quarantine' | 'return' | 'destroy' | 'expire'; quantity: number; reason: string; witnessId: string | null; idempotencyKey: string }): Promise<ActionResult> {
  const response = await keystoneClient<{ dispositionInventoryLot: { success: boolean; recordId: string | null; error: string | null } }>(`
    mutation DispositionLot($lotId: ID!, $action: String!, $quantity: Int!, $reason: String!, $witnessId: ID, $idempotencyKey: String!) {
      dispositionInventoryLot(lotId: $lotId, action: $action, quantity: $quantity, reason: $reason, witnessId: $witnessId, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { ...input }).catch(() => null);
  if (!response?.success) return { success: false, error: 'Lot change not confirmed. Check movements before retrying.' };
  if (response.data.dispositionInventoryLot.success) refresh();
  return response.data.dispositionInventoryLot;
}
