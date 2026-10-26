import Link from 'next/link';
import { ArrowUpRight, Boxes, ClipboardList, History, PackageOpen, Truck } from 'lucide-react';
import { Chip, EmptyState, ErrorState, MetricStrip, Panel, PillLink, SegmentTabs, StatusDot, Track, usd, type Tone } from '@/features/platform/components/medspa-ui';
import { pillClass } from '@/features/platform/components/pill';
import { getInventoryLots, getInventoryProducts, getMovements, getPurchaseOrders, getVendors } from '../actions/inventory';
import { ProductDrawer } from '../components/ProductDrawer';
import { StockAdjustDrawer } from '../components/StockAdjustDrawer';
import { VendorDrawer } from '../components/VendorDrawer';
import { PurchaseOrderDrawer } from '../components/PurchaseOrderDrawer';
import { LotDispositionDrawer } from '../components/LotDispositionDrawer';

const BASE = '/dashboard/platform/inventory';
const kindLabel: Record<string, string> = { retail: 'Retail', consumable: 'Consumable', both: 'Retail & consumable' };
export const poTone: Record<string, Tone> = { draft: 'zinc', submitted: 'blue', partially_received: 'amber', received: 'emerald', cancelled: 'rose' };
export const poLabel: Record<string, string> = { draft: 'Draft', submitted: 'Submitted', partially_received: 'Partly received', received: 'Received', cancelled: 'Cancelled' };
const lotTone: Record<string, Tone> = { available: 'emerald', quarantined: 'amber', recalled: 'rose', expired: 'orange', depleted: 'zinc', returned: 'zinc', destroyed: 'zinc' };
const lotLabel: Record<string, string> = { available: 'Available', quarantined: 'Quarantined', recalled: 'Recalled', expired: 'Expired', depleted: 'Depleted', returned: 'Returned', destroyed: 'Destroyed' };
const movementLabel: Record<string, string> = { receive: 'Received', adjustment: 'Adjusted', sale: 'Sold', return: 'Returned', consume: 'Used in treatment', retail_sale: 'Sold', transfer: 'Transferred', expire: 'Expired' };

export function date(value?: string | null, withTime = false) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', withTime ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

function Unavailable({ id, title, tab }: { id: string; title: string; tab: string }) {
  return <ErrorState id={id} title={title} action={<Track><PillLink href={`${BASE}?tab=${tab}`}>Retry</PillLink></Track>} />;
}

export async function ProductsTab({ filter }: { filter: string }) {
  const result = await getInventoryProducts();
  if (result.status === 'unavailable') return <Unavailable id="products-unavailable" title="Products unavailable" tab="products" />;
  const { products, locations } = result.data;
  const low = products.filter((product) => product.isActive && Number(product.quantity || 0) <= Number(product.reorderPoint || 0));
  const shown = filter === 'low' ? low : filter === 'inactive' ? products.filter((product) => !product.isActive) : filter === 'all' ? products : products.filter((product) => product.isActive);
  const stockValue = products.reduce((sum, product) => sum + Number(product.quantity || 0) * Number(product.cost || 0), 0);

  return (
    <div className="grid gap-5">
      <MetricStrip items={[
        { label: 'Active products', value: products.filter((product) => product.isActive).length },
        { label: 'At or below reorder', value: low.length, tone: low.length ? 'amber' : undefined, href: `${BASE}?tab=products&filter=low` },
        { label: 'Stock at cost', value: usd(stockValue, { whole: true }) },
        { label: 'Locations', value: locations.length },
      ]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentTabs label="Product filter" active={filter} tabs={[
          { value: 'active', label: 'Active', href: `${BASE}?tab=products` },
          { value: 'low', label: 'Reorder', href: `${BASE}?tab=products&filter=low`, count: low.length },
          { value: 'inactive', label: 'Inactive', href: `${BASE}?tab=products&filter=inactive` },
          { value: 'all', label: 'All', href: `${BASE}?tab=products&filter=all`, count: products.length },
        ]} />
        <ProductDrawer />
      </div>
      {!shown.length ? <EmptyState icon={Boxes} title={filter === 'low' ? 'Nothing to reorder' : 'No products'} /> : (
        <Panel padded={false}>
          <ul className="divide-y">
            {shown.map((product) => {
              const onHand = Number(product.quantity || 0);
              const reorder = product.isActive && onHand <= Number(product.reorderPoint || 0);
              return (
                <li key={product.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {reorder ? <StatusDot tone={onHand === 0 ? 'rose' : 'amber'} /> : null}
                      <h3 className="min-w-0 truncate text-sm font-semibold">{product.name}</h3>
                      {!product.isActive ? <Chip tone="zinc">Inactive</Chip> : null}
                      {product.trackLots ? <Chip>Lot tracked</Chip> : null}
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{product.sku || 'No SKU'}</span><span>{kindLabel[product.kind] || product.kind}</span>{product.category ? <span>{product.category}</span> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <span className="tabular-nums"><span className="text-xs text-muted-foreground">On hand </span><span className="font-semibold">{onHand}</span><span className="text-xs text-muted-foreground"> / reorder {product.reorderPoint ?? 0}</span></span>
                    <span className="tabular-nums"><span className="text-xs text-muted-foreground">Price </span>{usd(product.price)}</span>
                    <span className="tabular-nums"><span className="text-xs text-muted-foreground">Cost </span>{usd(product.cost)}</span>
                    <div className="flex gap-2">
                      {!product.trackLots && product.isActive ? <StockAdjustDrawer product={product} locations={locations} /> : null}
                      <ProductDrawer product={product} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}

export async function LotsTab({ status }: { status: string }) {
  const result = await getInventoryLots(status);
  if (result.status === 'unavailable') return <Unavailable id="lots-unavailable" title="Lots unavailable" tab="lots" />;
  const { lots, counts, staff } = result.data;
  const soon = Date.now() + 30 * 86_400_000;
  return (
    <div className="grid gap-5">
      <SegmentTabs label="Lot status" active={status} tabs={[
        { value: 'available', label: 'Available', href: `${BASE}?tab=lots`, count: counts.available },
        { value: 'quarantined', label: 'Quarantined', href: `${BASE}?tab=lots&status=quarantined`, count: counts.quarantined },
        { value: 'recalled', label: 'Recalled', href: `${BASE}?tab=lots&status=recalled`, count: counts.recalled },
        { value: 'expired', label: 'Expired', href: `${BASE}?tab=lots&status=expired`, count: counts.expired },
        { value: 'depleted', label: 'Depleted', href: `${BASE}?tab=lots&status=depleted`, count: counts.depleted },
        { value: 'all', label: 'All', href: `${BASE}?tab=lots&status=all`, count: counts.all },
      ]} />
      {!lots.length ? <EmptyState icon={PackageOpen} title="No lots" action={<Track><PillLink href={`${BASE}?tab=purchase-orders`}>Purchase orders</PillLink></Track>} /> : (
        <Panel padded={false}>
          <ul className="divide-y">
            {lots.map((lot) => {
              const expiring = lot.status === 'available' && lot.expiresAt && new Date(lot.expiresAt).getTime() <= soon;
              return (
                <li key={lot.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <StatusDot tone={expiring ? 'orange' : lotTone[lot.status] || 'zinc'} />
                      <h3 className="min-w-0 truncate text-sm font-semibold">{lot.product?.name || 'Product'} · {lot.lotNumber}</h3>
                      <span className="text-xs text-muted-foreground">{expiring ? 'Expiring soon' : lotLabel[lot.status] || lot.status}</span>
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{lot.location?.name || 'No location'}</span>{lot.vendor ? <span>{lot.vendor.name}</span> : null}<span>Received {date(lot.receivedAt)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <span className="tabular-nums"><span className="text-xs text-muted-foreground">Remaining </span><span className="font-semibold">{lot.remainingQuantity ?? 0}</span><span className="text-xs text-muted-foreground"> / {lot.receivedQuantity ?? 0}</span></span>
                    <span className="tabular-nums"><span className="text-xs text-muted-foreground">Expires </span>{date(lot.expiresAt)}</span>
                    <LotDispositionDrawer lot={lot} staff={staff} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}

export async function PurchaseOrdersTab({ status }: { status: string }) {
  const result = await getPurchaseOrders(status);
  if (result.status === 'unavailable') return <Unavailable id="orders-unavailable" title="Purchase orders unavailable" tab="purchase-orders" />;
  const { orders, counts, vendors, locations, products } = result.data;
  const tab = (value: string, label: string) => ({ value, label, href: value === 'open' ? `${BASE}?tab=purchase-orders` : `${BASE}?tab=purchase-orders&status=${value}`, count: value === 'open' ? counts.draft + counts.submitted + counts.partially_received : counts[value] });
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentTabs label="Purchase order status" active={status} tabs={[
          tab('open', 'Open'), tab('draft', 'Draft'), tab('submitted', 'Submitted'), tab('partially_received', 'Partly received'), tab('received', 'Received'), tab('cancelled', 'Cancelled'), tab('all', 'All'),
        ]} />
        <PurchaseOrderDrawer vendors={vendors} locations={locations} products={products} />
      </div>
      {!vendors.length ? <EmptyState icon={Truck} title="Add a vendor first" action={<Track><PillLink href={`${BASE}?tab=vendors`}>Vendors</PillLink></Track>} /> : null}
      {vendors.length && !orders.length ? <EmptyState icon={ClipboardList} title="No purchase orders" /> : null}
      {orders.length ? (
        <Panel padded={false}>
          <ul className="divide-y">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`${BASE}/purchase-orders/${order.id}`} className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between md:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <StatusDot tone={poTone[order.status] || 'zinc'} />
                      <h3 className="text-sm font-semibold tabular-nums">{order.number}</h3>
                      <span className="text-xs text-muted-foreground">{poLabel[order.status] || order.status}</span>
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{order.vendor?.name || 'No vendor'}</span><span>{order.location?.name || 'No location'}</span><span>{order.linesCount ?? 0} lines</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-5 text-sm">
                    <span className="text-xs text-muted-foreground">Expected {date(order.expectedAt)}</span>
                    <span className="font-semibold tabular-nums">{usd(order.totalMinor)}</span>
                    <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

export async function VendorsTab() {
  const result = await getVendors();
  if (result.status === 'unavailable') return <Unavailable id="vendors-unavailable" title="Vendors unavailable" tab="vendors" />;
  const vendors = result.data;
  return (
    <div className="grid gap-5">
      <div className="flex justify-end"><VendorDrawer /></div>
      {!vendors.length ? <EmptyState icon={Truck} title="No vendors" /> : (
        <Panel padded={false}>
          <ul className="divide-y">
            {vendors.map((vendor) => (
              <li key={vendor.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusDot tone={vendor.isActive ? 'emerald' : 'zinc'} />
                    <h3 className="min-w-0 truncate text-sm font-semibold">{vendor.name}</h3>
                    {!vendor.isActive ? <span className="text-xs text-muted-foreground">Inactive</span> : null}
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {vendor.email ? <a className="underline-offset-2 hover:underline" href={`mailto:${vendor.email}`}>{vendor.email}</a> : null}
                    {vendor.phone ? <a className="tabular-nums underline-offset-2 hover:underline" href={`tel:${vendor.phone}`}>{vendor.phone}</a> : null}
                    <span>{vendor.purchaseOrdersCount ?? 0} orders</span>
                  </p>
                </div>
                <VendorDrawer vendor={vendor} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

export async function MovementsTab({ source, productId }: { source: string; productId: string }) {
  const result = await getMovements(source, productId);
  if (result.status === 'unavailable') return <Unavailable id="movements-unavailable" title="Movements unavailable" tab="movements" />;
  const { movements, products } = result.data;
  const href = (nextSource: string) => `${BASE}?tab=movements${nextSource !== 'all' ? `&source=${nextSource}` : ''}${productId ? `&product=${productId}` : ''}`;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SegmentTabs label="Movement source" active={source} tabs={[
          { value: 'all', label: 'All', href: href('all') }, { value: 'product', label: 'Stock', href: href('product') }, { value: 'lot', label: 'Lots', href: href('lot') },
        ]} />
        <form className="flex items-end gap-2" action={BASE}>
          <input type="hidden" name="tab" value="movements" />
          {source !== 'all' ? <input type="hidden" name="source" value={source} /> : null}
          <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Product
            <select name="product" defaultValue={productId} className="h-10 min-w-0 max-w-[14rem] rounded-[6px] border bg-background px-3 text-sm text-foreground">
              <option value="">All products</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
          <Track><button type="submit" className={pillClass()}>Filter</button></Track>
        </form>
      </div>
      {!movements.length ? <EmptyState icon={History} title="No movements" /> : (
        <Panel padded={false}>
          <ul className="divide-y">
            {movements.map((movement) => (
              <li key={movement.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusDot tone={movement.delta > 0 ? 'emerald' : 'zinc'} />
                    <h3 className="min-w-0 truncate text-sm font-semibold">{movement.product}</h3>
                    <span className="text-xs text-muted-foreground">{movementLabel[movement.type] || movement.type}{movement.lot ? ` · lot ${movement.lot}` : ''}</span>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{date(movement.createdAt, true)}</span>{movement.location ? <span>{movement.location}</span> : null}{movement.actor ? <span>{movement.actor}</span> : null}{movement.reason ? <span className="break-words">{movement.reason}</span> : null}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums"><span className={movement.delta > 0 ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold'}>{movement.delta > 0 ? `+${movement.delta}` : movement.delta}</span>{movement.balanceAfter !== null ? <span className="text-xs text-muted-foreground"> → {movement.balanceAfter}</span> : null}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
