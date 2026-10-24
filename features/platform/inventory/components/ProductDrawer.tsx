'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { saveProduct } from '../actions/inventory';
import type { InventoryProduct, ProductKind } from '../types';
import { Drawer, Field, FormError, fromCents, inputClass, textareaClass, toCents } from './form';

const KINDS: Array<{ value: ProductKind; label: string }> = [
  { value: 'retail', label: 'Retail' }, { value: 'consumable', label: 'Treatment consumable' }, { value: 'both', label: 'Both' },
];

export function ProductDrawer({ product }: { product?: InventoryProduct }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    name: product?.name || '', sku: product?.sku || '', kind: (product?.kind || 'retail') as ProductKind, trackLots: product?.trackLots ?? false,
    price: fromCents(product?.price), cost: fromCents(product?.cost), reorderPoint: String(product?.reorderPoint ?? 5),
    category: product?.category || '', description: product?.description || '', isActive: product?.isActive ?? true,
  }));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = toCents(form.price);
    const cost = toCents(form.cost);
    const reorderPoint = Number(form.reorderPoint);
    if (price === null || cost === null) { setError('Enter prices like 24 or 24.50.'); return; }
    if (!Number.isInteger(reorderPoint) || reorderPoint < 0) { setError('Reorder point must be a whole number.'); return; }
    setBusy(true); setError(null);
    try {
      const result = await saveProduct({ productId: product?.id || null, name: form.name, sku: form.sku, kind: form.kind, trackLots: form.trackLots, price, cost, reorderPoint, category: form.category, description: form.description, isActive: form.isActive });
      if (!result.success) { setError(result.error || 'Product was not saved.'); return; }
      setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  const lotLocked = Boolean(product && Number(product.quantity || 0) > 0);

  return (
    <>
      <div className={trackClass}>
        <button type="button" className={pillClass(product ? 'raised' : 'primary', product ? 'sm' : 'md')} onClick={() => setOpen(true)}>
          {product ? <><Pencil />Edit</> : <><Plus />New product</>}
        </button>
      </div>
      <Drawer open={open} onOpenChange={setOpen} title={product ? `Edit ${product.name}` : 'New product'} footer={
        <div className={cn(trackClass, 'w-full justify-end')}>
          <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" form="product-form" className={pillClass('primary')} disabled={busy}>{busy ? 'Saving' : 'Save product'}</button>
        </div>
      }>
        <form id="product-form" onSubmit={submit} className="grid gap-4">
          <FormError message={error} />
          <Field label="Name"><input className={inputClass} required maxLength={200} value={form.name} onChange={(event) => set('name', event.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU"><input className={inputClass} required maxLength={80} value={form.sku} onChange={(event) => set('sku', event.target.value)} /></Field>
            <Field label="Kind">
              <select className={inputClass} value={form.kind} onChange={(event) => set('kind', event.target.value as ProductKind)}>
                {KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
              </select>
            </Field>
            <Field label="Price ($)"><input className={inputClass} inputMode="decimal" required value={form.price} onChange={(event) => set('price', event.target.value)} /></Field>
            <Field label="Cost ($)"><input className={inputClass} inputMode="decimal" value={form.cost} onChange={(event) => set('cost', event.target.value)} /></Field>
            <Field label="Reorder at"><input className={inputClass} type="number" min={0} step={1} value={form.reorderPoint} onChange={(event) => set('reorderPoint', event.target.value)} /></Field>
            <Field label="Category"><input className={inputClass} maxLength={120} value={form.category} onChange={(event) => set('category', event.target.value)} /></Field>
          </div>
          <Field label="Description"><textarea className={textareaClass} maxLength={2000} value={form.description} onChange={(event) => set('description', event.target.value)} /></Field>
          <label className="flex min-h-10 items-center gap-3 text-sm">
            <input type="checkbox" className="size-4" checked={form.trackLots} disabled={lotLocked} onChange={(event) => set('trackLots', event.target.checked)} />
            Track lots and expiry{lotLocked ? <span className="text-xs text-muted-foreground">Locked while stock is on hand</span> : null}
          </label>
          <label className="flex min-h-10 items-center gap-3 text-sm">
            <input type="checkbox" className="size-4" checked={form.isActive} onChange={(event) => set('isActive', event.target.checked)} />Active
          </label>
        </form>
      </Drawer>
    </>
  );
}
