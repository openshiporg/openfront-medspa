'use client';

import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { inputClass, pillClass, trackClass } from '@/features/platform/components/pill';
import { transitionResourceReadiness } from '../actions/resources';
import { READINESS_ACTIONS } from '../types';

/** Device readiness transitions; release to Available is signed by the current provider. */
export function ReadinessActions({ resourceId, status, releaseProviderId }: { resourceId: string; status: string; releaseProviderId: string | null }) {
  const actions = READINESS_ACTIONS[status] || [];
  const [chosen, setChosen] = useState<(typeof actions)[number] | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState('');
  if (!actions.length) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!chosen || busy) return;
    setBusy(true); setError(null);
    const result = await transitionResourceReadiness({ resourceId, action: chosen.action, toStatus: chosen.toStatus, reason, qualifiedReleaseProviderId: releaseProviderId, idempotencyKey: key }).catch(() => ({ success: false, error: 'Not confirmed. Reload to check the current status.' }));
    setBusy(false);
    if (result.success) { setChosen(null); setReason(''); } else setError(result.error || 'Not saved');
  }

  return (
    <div className="grid gap-2">
      <div className={cn(trackClass, 'flex-wrap')} role="group" aria-label="Readiness">
        {actions.map((item) => {
          const needsRelease = item.toStatus === 'available' && !releaseProviderId;
          return (
            <button key={`${item.action}-${item.toStatus}`} type="button" disabled={needsRelease} title={needsRelease ? 'Release needs a provider profile' : undefined}
              aria-pressed={chosen === item} className={pillClass(chosen === item ? 'raised' : 'quiet', 'sm')}
              onClick={() => { setChosen(item); setKey(crypto.randomUUID()); setError(null); }}>
              {item.label}
            </button>
          );
        })}
      </div>
      {chosen ? (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <input className={cn(inputClass, 'h-9 min-w-0 flex-1')} required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} aria-label={`Reason for ${chosen.label.toLowerCase()}`} placeholder="Reason" />
          <div className={trackClass}>
            <button type="button" className={pillClass('quiet', 'sm')} onClick={() => setChosen(null)}>Cancel</button>
            <button type="submit" className={pillClass('primary', 'sm')} disabled={busy || !reason.trim()}>{busy ? 'Saving' : chosen.label}</button>
          </div>
        </form>
      ) : null}
      {error ? <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}
