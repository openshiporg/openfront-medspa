'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { inputClass, pillClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { transitionWaitlist } from '../actions/engagement';
import type { WaitlistStatus } from '../types';

type Action = 'notify' | 'remove' | 'reactivate';
const labels: Record<Action, string> = { notify: 'Mark notified', remove: 'Remove', reactivate: 'Reactivate' };

export function WaitlistEntryActions({ entryId, status, name }: { entryId: string; status: WaitlistStatus; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions: Action[] = status === 'active' ? ['notify', 'remove'] : status === 'notified' ? ['remove', 'reactivate'] : status === 'removed' ? ['reactivate'] : [];

  async function run(action: Action) {
    setBusy(true); setError(null);
    try {
      const result = await transitionWaitlist(entryId, action, reason);
      if (result.success) { setPending(null); setReason(''); router.refresh(); }
      else setError(result.error || 'Not updated.');
    } catch {
      setError('Not updated. Try again.');
    } finally { setBusy(false); }
  }

  if (pending) {
    return (
      <div className="grid w-full gap-2 sm:w-72">
        <label className="sr-only" htmlFor={`waitlist-reason-${entryId}`}>Note for {name}</label>
        <input id={`waitlist-reason-${entryId}`} className={inputClass} maxLength={1000} placeholder={pending === 'notify' ? 'Offered by phone' : 'Note'} value={reason} onChange={(event) => setReason(event.target.value)} />
        {error ? <p role="alert" className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />{error}</p> : null}
        <div className={cn(trackClass, 'self-start')}>
          <button type="button" className={pillClass('quiet', 'sm')} onClick={() => { setPending(null); setError(null); }} disabled={busy}>Cancel</button>
          <button type="button" className={pillClass(pending === 'remove' ? 'danger' : 'primary', 'sm')} onClick={() => run(pending)} disabled={busy}>{busy ? 'Saving' : labels[pending]}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={trackClass}>
      {status === 'active' || status === 'notified' ? <Link href="/dashboard/platform/appointments/new" className={pillClass('primary', 'sm')}>Book</Link> : null}
      {actions.map((action) => (
        <button key={action} type="button" className={pillClass(action === 'remove' ? 'quiet' : 'raised', 'sm')} onClick={() => setPending(action)}>{labels[action]}</button>
      ))}
    </div>
  );
}
