'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { adjustStock } from '../actions/inventory';
import type { InventoryLocation, InventoryProduct } from '../types';
import { Drawer, Field, FormError, inputClass, newKey } from './form';

export function StockAdjustDrawer({ product, locations }: { product: InventoryProduct; locations: InventoryLocation[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const change = Number(delta);
    if (!Number.isInteger(change) || change === 0) { setError('Enter a whole number other than 0, like 12 or -2.'); return; }
    const fingerprint = JSON.stringify({ locationId, change, reason: reason.trim() });
    // Same details reuse the key, so a lost response can't double-count stock.
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: newKey(`platform:inventory:${product.id}`) };
    setBusy(true); setError(null);
    try {
      const result = await adjustStock({ productId: product.id, locationId, delta: change, reason: reason.trim(), idempotencyKey: attempt.current.key });
      if (!result.success) { setError(result.error || 'Stock change failed.'); return; }
      attempt.current = null; setDelta(''); setReason(''); setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  if (!locations.length) return null;
  return (
    <>
      <div className={trackClass}>
        <button type="button" className={pillClass('raised', 'sm')} onClick={() => setOpen(true)}><ArrowUpDown />Adjust</button>
      </div>
      <Drawer open={open} onOpenChange={setOpen} title={`Adjust ${product.name}`} footer={
        <div className={cn(trackClass, 'w-full justify-end')}>
          <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" form={`adjust-${product.id}`} className={pillClass('primary')} disabled={busy}>{busy ? 'Recording' : 'Record change'}</button>
        </div>
      }>
        <form id={`adjust-${product.id}`} onSubmit={submit} className="grid gap-4">
          <FormError message={error} />
          <p className="text-sm text-muted-foreground">On hand: <span className="font-medium tabular-nums text-foreground">{product.quantity ?? 0}</span></p>
          <Field label="Location">
            <select className={inputClass} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </Field>
          <Field label="Change"><input className={inputClass} type="number" step={1} required placeholder="12 or -2" value={delta} onChange={(event) => setDelta(event.target.value)} /></Field>
          <Field label="Reason"><input className={inputClass} required maxLength={500} placeholder="Delivery, count, damage" value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
        </form>
      </Drawer>
    </>
  );
}
