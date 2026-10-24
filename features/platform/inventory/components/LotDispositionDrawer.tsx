'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { dispositionLot } from '../actions/inventory';
import type { InventoryLotRow, StaffOption } from '../types';
import { Drawer, Field, FormError, inputClass, newKey } from './form';

type Action = 'quarantine' | 'return' | 'destroy' | 'expire';
const ACTIONS: Array<{ value: Action; label: string; removes: boolean; witness: boolean }> = [
  { value: 'quarantine', label: 'Quarantine', removes: false, witness: false },
  { value: 'expire', label: 'Mark expired', removes: true, witness: false },
  { value: 'return', label: 'Return to vendor', removes: true, witness: true },
  { value: 'destroy', label: 'Destroy', removes: true, witness: true },
];

export function LotDispositionDrawer({ lot, staff }: { lot: InventoryLotRow; staff: StaffOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(lot.status === 'quarantined' ? 'destroy' : 'quarantine');
  const [quantity, setQuantity] = useState(String(lot.remainingQuantity ?? 0));
  const [reason, setReason] = useState('');
  const [witnessId, setWitnessId] = useState('');
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const definition = ACTIONS.find((item) => item.value === action)!;
  const available = ACTIONS.filter((item) => !(item.value === 'quarantine' && lot.status === 'quarantined'));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = definition.removes ? Number(quantity) : 0;
    if (!Number.isInteger(amount) || amount < 0 || amount > Number(lot.remainingQuantity || 0)) { setError(`Quantity must be between 0 and ${lot.remainingQuantity ?? 0}.`); return; }
    if (definition.witness && !witnessId) { setError('Choose a witness.'); return; }
    const payload = { lotId: lot.id, action, quantity: amount, reason: reason.trim(), witnessId: definition.witness ? witnessId : null };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: newKey(`platform:lot:${lot.id}`) };
    setBusy(true); setError(null);
    try {
      const result = await dispositionLot({ ...payload, idempotencyKey: attempt.current.key });
      if (!result.success) { setError(result.error || 'Lot change failed.'); return; }
      attempt.current = null; setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  if (['recalled', 'destroyed', 'returned'].includes(lot.status)) return null;
  return (
    <>
      <div className={trackClass}>
        <button type="button" className={pillClass('raised', 'sm')} onClick={() => setOpen(true)}>Disposition</button>
      </div>
      <Drawer open={open} onOpenChange={setOpen} title={`Lot ${lot.lotNumber}`} footer={
        <div className={cn(trackClass, 'w-full justify-end')}>
          <button type="button" className={pillClass('quiet')} onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" form={`lot-${lot.id}`} className={pillClass(action === 'destroy' ? 'danger' : 'primary')} disabled={busy}>{busy ? 'Recording' : definition.label}</button>
        </div>
      }>
        <form id={`lot-${lot.id}`} onSubmit={submit} className="grid gap-4">
          <FormError message={error} />
          <p className="text-sm text-muted-foreground">{lot.product?.name} · <span className="tabular-nums">{lot.remainingQuantity ?? 0}</span> remaining</p>
          <Field label="Action">
            <select className={inputClass} value={action} onChange={(event) => setAction(event.target.value as Action)}>
              {available.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          {definition.removes ? (
            <Field label="Quantity removed"><input className={inputClass} type="number" min={0} max={lot.remainingQuantity ?? 0} step={1} required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></Field>
          ) : null}
          {definition.witness ? (
            <Field label="Witness">
              <select className={inputClass} value={witnessId} required onChange={(event) => setWitnessId(event.target.value)}>
                <option value="" disabled>Choose a witness</option>
                {staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </Field>
          ) : null}
          <Field label="Reason"><input className={inputClass} required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
        </form>
      </Drawer>
    </>
  );
}
