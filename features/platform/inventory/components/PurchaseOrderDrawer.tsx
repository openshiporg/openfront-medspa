'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usd } from '@/features/platform/components/medspa-ui';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { createOrder } from '../actions/inventory';
import type { InventoryLocation, InventoryProduct, InventoryVendor } from '../types';
import { Drawer, Field, FormError, fromCents, inputClass, newKey, toCents } from './form';

type Line = { productId: string; quantity: string; unitCost: string };

export function PurchaseOrderDrawer({ vendors, locations, products }: { vendors: InventoryVendor[]; locations: InventoryLocation[]; products: InventoryProduct[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [expectedAt, setExpectedAt] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: '1', unitCost: '' }]);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const parsed = lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), unitCostMinor: toCents(line.unitCost) }));
  const total = parsed.reduce((sum, line) => sum + (Number.isInteger(line.quantity) && line.unitCostMinor !== null ? line.quantity * line.unitCostMinor : 0), 0);
  const disabled = !vendors.length || !locations.length || !products.length;

  function setLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, at) => {
      if (at !== index) return line;
      const next = { ...line, ...patch };
      // Default the unit cost from the product's recorded cost.
      if (patch.productId && !line.unitCost) next.unitCost = fromCents(products.find((product) => product.id === patch.productId)?.cost);
      return next;
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (parsed.some((line) => !line.productId || !Number.isInteger(line.quantity) || line.quantity < 1 || line.unitCostMinor === null)) {
      setError('Each line needs a product, a quantity of at least 1 and a unit cost.'); return;
    }
    const payload = { vendorId, locationId, expectedAt: expectedAt ? new Date(`${expectedAt}T12:00:00`).toISOString() : null, lines: parsed as Array<{ productId: string; quantity: number; unitCostMinor: number }> };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: newKey('platform:purchase-order') };
    setBusy(true); setError(null);
    try {
      const result = await createOrder({ ...payload, idempotencyKey: attempt.current.key });
      if (!result.success) { setError(result.error || 'Order was not created.'); return; }
      attempt.current = null; setOpen(false); setLines([{ productId: '', quantity: '1', unitCost: '' }]);
      router.push(`/dashboard/platform/inventory/purchase-orders/${result.recordId}`);
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className={trackClass}>
        <button type="button" className={pillClass('primary')} disabled={disabled} onClick={() => setOpen(true)}><Plus />New order</button>
      </div>
      <Drawer open={open} onOpenChange={setOpen} title="New purchase order" footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Total <span className="font-semibold tabular-nums text-foreground">{usd(total)}</span></span>
          <div className={trackClass}>
            <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" form="po-form" className={pillClass('primary')} disabled={busy}>{busy ? 'Creating' : 'Create draft'}</button>
          </div>
        </div>
      }>
        <form id="po-form" onSubmit={submit} className="grid gap-4">
          <FormError message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vendor">
              <select className={inputClass} value={vendorId} required onChange={(event) => setVendorId(event.target.value)}>
                {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </select>
            </Field>
            <Field label="Deliver to">
              <select className={inputClass} value={locationId} required onChange={(event) => setLocationId(event.target.value)}>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </Field>
            <Field label="Expected" className="sm:col-span-2"><input className={inputClass} type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} /></Field>
          </div>
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-xs font-medium text-muted-foreground">Lines</legend>
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_6rem]">
                  <select aria-label={`Line ${index + 1} product`} className={inputClass} value={line.productId} required onChange={(event) => setLine(index, { productId: event.target.value })}>
                    <option value="" disabled>Product</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>)}
                  </select>
                  <input aria-label={`Line ${index + 1} quantity`} className={inputClass} type="number" min={1} step={1} required value={line.quantity} onChange={(event) => setLine(index, { quantity: event.target.value })} />
                  <input aria-label={`Line ${index + 1} unit cost`} className={inputClass} inputMode="decimal" placeholder="Unit $" required value={line.unitCost} onChange={(event) => setLine(index, { unitCost: event.target.value })} />
                </div>
                <button type="button" aria-label={`Remove line ${index + 1}`} className={pillClass('quiet', 'sm')} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, at) => at !== index))}><Trash2 /></button>
              </div>
            ))}
            <div className={cn(trackClass, 'self-start')}>
              <button type="button" className={pillClass('raised', 'sm')} disabled={lines.length >= 100} onClick={() => setLines((current) => [...current, { productId: '', quantity: '1', unitCost: '' }])}><Plus />Add line</button>
            </div>
          </fieldset>
        </form>
      </Drawer>
    </>
  );
}
