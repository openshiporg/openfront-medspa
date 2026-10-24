export type InventoryTab = 'products' | 'lots' | 'purchase-orders' | 'vendors' | 'movements';
export const INVENTORY_TABS: InventoryTab[] = ['products', 'lots', 'purchase-orders', 'vendors', 'movements'];

export type ProductKind = 'retail' | 'consumable' | 'both';

export interface InventoryProduct {
  id: string; name: string; sku: string | null; kind: ProductKind; trackLots: boolean; price: number | null; cost: number | null;
  quantity: number | null; reorderPoint: number | null; category: string | null; description: string | null; isActive: boolean;
}
export interface InventoryLocation { id: string; name: string }
export interface InventoryVendor { id: string; name: string; email: string | null; phone: string | null; isActive: boolean; purchaseOrdersCount: number | null }
export interface InventoryLotRow {
  id: string; lotNumber: string; status: string; receivedQuantity: number | null; remainingQuantity: number | null; receivedAt: string | null; expiresAt: string | null;
  product: { id: string; name: string } | null; location: { name: string } | null; vendor: { name: string } | null;
}
export interface PurchaseOrderRow {
  id: string; number: string; status: string; totalMinor: number | null; orderedAt: string | null; expectedAt: string | null; revision: number | null; createdAt: string | null;
  vendor: { name: string } | null; location: { name: string } | null; linesCount: number | null;
}
export interface PurchaseOrderLineRow { id: string; productTitle: string; orderedQuantity: number; receivedQuantity: number | null; unitCostMinor: number; product: { id: string; name: string; trackLots: boolean } | null }
export interface GoodsReceiptRow {
  id: string; receiptNumber: string; receivedAt: string | null; receivedBy: { name: string } | null;
  lines: Array<{ id: string; quantity: number; lotNumberSnapshot: string | null; condition: string | null; quarantineReason: string | null; product: { name: string } | null }>;
}
export interface PurchaseOrderDetail extends PurchaseOrderRow { lines: PurchaseOrderLineRow[]; receipts: GoodsReceiptRow[] }
export interface MovementRow { id: string; source: 'product' | 'lot'; type: string; delta: number; balanceAfter: number | null; reason: string | null; createdAt: string; product: string; location: string | null; lot: string | null; actor: string | null }
export interface StaffOption { id: string; name: string }

export type InventoryRead<T> = { status: 'loaded'; data: T } | { status: 'unavailable' };
export type ActionResult = { success: boolean; recordId?: string | null; error?: string | null };

export interface ProductInput { productId?: string | null; name: string; sku: string; kind: ProductKind; trackLots: boolean; price: number; cost: number; reorderPoint: number; category: string; description: string; isActive: boolean }
export interface VendorInput { vendorId?: string | null; name: string; email: string; phone: string; isActive: boolean }
export interface PurchaseOrderInput { vendorId: string; locationId: string; expectedAt: string | null; lines: Array<{ productId: string; quantity: number; unitCostMinor: number }>; idempotencyKey: string }
export interface ReceiptLineInput { purchaseOrderLineId: string; productId: string; quantity: number; lotNumber: string; expiresAt: string | null; condition: string; quarantineReason: string | null }
