'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { saveVendor } from '../actions/inventory';
import type { InventoryVendor } from '../types';
import { Drawer, Field, FormError, inputClass } from './form';

export function VendorDrawer({ vendor }: { vendor?: InventoryVendor }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: vendor?.name || '', email: vendor?.email || '', phone: vendor?.phone || '', isActive: vendor?.isActive ?? true });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const result = await saveVendor({ vendorId: vendor?.id || null, ...form });
      if (!result.success) { setError(result.error || 'Vendor was not saved.'); return; }
      setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  const formId = `vendor-${vendor?.id || 'new'}`;
  return (
    <>
      <div className={trackClass}>
        <button type="button" className={pillClass(vendor ? 'raised' : 'primary', vendor ? 'sm' : 'md')} onClick={() => setOpen(true)}>
          {vendor ? <><Pencil />Edit</> : <><Plus />New vendor</>}
        </button>
      </div>
      <Drawer open={open} onOpenChange={setOpen} title={vendor ? `Edit ${vendor.name}` : 'New vendor'} footer={
        <div className={cn(trackClass, 'w-full justify-end')}>
          <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" form={formId} className={pillClass('primary')} disabled={busy}>{busy ? 'Saving' : 'Save vendor'}</button>
        </div>
      }>
        <form id={formId} onSubmit={submit} className="grid gap-4">
          <FormError message={error} />
          <Field label="Name"><input className={inputClass} required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Email"><input className={inputClass} type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Phone"><input className={inputClass} type="tel" maxLength={40} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <label className="flex min-h-10 items-center gap-3 text-sm">
            <input type="checkbox" className="size-4" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Active
          </label>
        </form>
      </Drawer>
    </>
  );
}
