'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, EyeOff } from 'lucide-react';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { setReviewApproval } from '../actions/reviews';

export function ReviewModeration({ reviewId, isApproved }: { reviewId: string; isApproved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: boolean) {
    setBusy(true); setError(null);
    try {
      const result = await setReviewApproval(reviewId, next, crypto.randomUUID());
      if (result.success) router.refresh();
      else setError(result.error || 'Not updated.');
    } catch {
      setError('Not updated. Try again.');
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col items-start gap-1.5 md:items-end">
      <div className={trackClass}>
        {isApproved
          ? <button type="button" className={pillClass('raised', 'sm')} disabled={busy} onClick={() => update(false)}><EyeOff />Hide</button>
          : <button type="button" className={pillClass('primary', 'sm')} disabled={busy} onClick={() => update(true)}><Check />Approve</button>}
      </div>
      {error ? <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300"><StatusDot tone="rose" />{error}</p> : null}
    </div>
  );
}
