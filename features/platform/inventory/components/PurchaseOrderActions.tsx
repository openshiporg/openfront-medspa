'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { transitionOrder } from '../actions/inventory';
import { FormError } from './form';

export function PurchaseOrderActions({ id, status, revision, hasReceipts }: { id: string; status: string; revision: number; hasReceipts: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'submit' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = status === 'draft';
  const canCancel = ['draft', 'submitted'].includes(status) && !hasReceipts;
  if (!canSubmit && !canCancel) return null;

  async function run(action: 'submit' | 'cancel') {
    if (action === 'cancel' && !window.confirm('Cancel this purchase order?')) return;
    setBusy(action); setError(null);
    try {
      const result = await transitionOrder({ purchaseOrderId: id, action, expectedRevision: revision });
      if (!result.success) { setError(result.error || 'Change failed.'); return; }
      router.refresh();
    } finally { setBusy(null); }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <FormError message={error} />
      <div className={trackClass}>
        {canCancel ? <button type="button" className={pillClass('danger')} disabled={busy !== null} onClick={() => run('cancel')}>{busy === 'cancel' ? 'Cancelling' : 'Cancel order'}</button> : null}
        {canSubmit ? <button type="button" className={pillClass('primary')} disabled={busy !== null} onClick={() => run('submit')}>{busy === 'submit' ? 'Submitting' : 'Submit to vendor'}</button> : null}
      </div>
    </div>
  );
}
