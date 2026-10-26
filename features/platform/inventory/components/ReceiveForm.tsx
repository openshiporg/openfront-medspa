'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { receiveOrder } from '../actions/inventory';
import type { PurchaseOrderLineRow, ReceiptLineInput } from '../types';
import { Field, FormError, inputClass, newKey } from './form';

type Row = { lineId: string; productId: string; title: string; open: number; quantity: string; lotNumber: string; expiresAt: string; condition: string; quarantineReason: string };

function localNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function ReceiveForm({ purchaseOrderId, lines }: { purchaseOrderId: string; lines: PurchaseOrderLineRow[] }) {
  const router = useRouter();
  const openLines = lines.filter((line) => line.product?.id && Number(line.receivedQuantity || 0) < line.orderedQuantity);
  const [rows, setRows] = useState<Row[]>(() => openLines.map((line) => ({
    lineId: line.id, productId: line.product!.id, title: line.productTitle, open: line.orderedQuantity - Number(line.receivedQuantity || 0),
    quantity: String(line.orderedQuantity - Number(line.receivedQuantity || 0)), lotNumber: '', expiresAt: '', condition: 'Intact', quarantineReason: '',
  })));
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receivedAt, setReceivedAt] = useState(localNow);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  if (!openLines.length) return null;
  const set = (index: number, patch: Partial<Row>) => setRows((current) => current.map((row, at) => at === index ? { ...row, ...patch } : row));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const receiving = rows.filter((row) => Number(row.quantity) > 0);
    if (!receiving.length) { setError('Enter a quantity on at least one line.'); return; }
    for (const row of receiving) {
      const quantity = Number(row.quantity);
      if (!Number.isInteger(quantity) || quantity > row.open) { setError(`${row.title}: receive between 1 and ${row.open}.`); return; }
      if (!row.lotNumber.trim()) { setError(`${row.title}: enter the lot number.`); return; }
    }
    const linesPayload: ReceiptLineInput[] = receiving.map((row) => ({
      purchaseOrderLineId: row.lineId, productId: row.productId, quantity: Number(row.quantity), lotNumber: row.lotNumber.trim(),
      expiresAt: row.expiresAt ? new Date(`${row.expiresAt}T23:59:00`).toISOString() : null, condition: row.condition.trim() || 'Intact',
      quarantineReason: row.quarantineReason.trim() || null,
    }));
    const payload = { purchaseOrderId, receiptNumber: receiptNumber.trim(), receivedAt: new Date(receivedAt).toISOString(), lines: linesPayload };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: newKey(`platform:receipt:${purchaseOrderId}`) };
    setBusy(true); setError(null);
    try {
      const result = await receiveOrder({ ...payload, idempotencyKey: attempt.current.key });
      if (!result.success) { setError(result.error || 'Receipt failed.'); return; }
      attempt.current = null; setDone(true);
      router.refresh();
    } finally { setBusy(false); }
  }

  if (done) return <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">Receipt recorded</p>;

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Receipt / packing slip number"><input className={inputClass} required maxLength={120} value={receiptNumber} onChange={(event) => setReceiptNumber(event.target.value)} /></Field>
        <Field label="Received at"><input className={inputClass} type="datetime-local" required value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} /></Field>
      </div>
      <div className="grid gap-3">
        {rows.map((row, index) => (
          <fieldset key={row.lineId} className="grid gap-3 rounded-[6px] border p-3">
            <legend className="px-1 text-sm font-medium">{row.title} <span className="text-xs font-normal text-muted-foreground tabular-nums">· {row.open} open</span></legend>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Quantity"><input className={inputClass} type="number" min={0} max={row.open} step={1} value={row.quantity} onChange={(event) => set(index, { quantity: event.target.value })} /></Field>
              <Field label="Lot number"><input className={inputClass} maxLength={120} value={row.lotNumber} onChange={(event) => set(index, { lotNumber: event.target.value })} /></Field>
              <Field label="Expires"><input className={inputClass} type="date" value={row.expiresAt} onChange={(event) => set(index, { expiresAt: event.target.value })} /></Field>
              <Field label="Condition"><input className={inputClass} maxLength={200} value={row.condition} onChange={(event) => set(index, { condition: event.target.value })} /></Field>
            </div>
            <Field label="Quarantine reason · optional"><input className={inputClass} maxLength={500} value={row.quarantineReason} onChange={(event) => set(index, { quarantineReason: event.target.value })} /></Field>
          </fieldset>
        ))}
      </div>
      <div className={cn(trackClass, 'self-start')}>
        <button type="submit" className={pillClass('primary')} disabled={busy}><PackageCheck />{busy ? 'Recording' : 'Record receipt'}</button>
      </div>
    </form>
  );
}
