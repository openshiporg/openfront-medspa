'use client';

import { useState } from 'react';
import { pillClass } from '@/features/platform/components/pill';
import { setTreatmentStatus } from '../actions/catalog';

/** Deactivating also takes the treatment offline. */
export function TreatmentStatusToggle({ id, status }: { id: string; status: 'active' | 'inactive' | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = status === 'inactive' ? 'active' : 'inactive';
  return (
    <>
      <button type="button" className={pillClass(next === 'inactive' ? 'quiet' : 'raised', 'sm')} disabled={busy}
        onClick={async () => { setBusy(true); setError(null); const result = await setTreatmentStatus({ id, status: next }).catch(() => ({ success: false, error: 'Not saved' })); setBusy(false); if (!result.success) setError(result.error || 'Not saved'); }}>
        {next === 'inactive' ? 'Deactivate' : 'Activate'}
      </button>
      {error ? <span role="alert" className="px-2 text-xs text-rose-700 dark:text-rose-300">{error}</span> : null}
    </>
  );
}
