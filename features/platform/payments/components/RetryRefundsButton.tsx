'use client';

import { useState, useTransition } from 'react';
import { RotateCw } from 'lucide-react';
import { pillClass } from '@/features/platform/components/pill';
import { retryRefundsAction } from '../actions/payments';

/** Re-queries every open processor refund, and submits only what the processor confirms is missing. */
export function RetryRefundsButton() {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={pending} className={pillClass('quiet', 'sm')} onClick={() => start(async () => {
        const result = await retryRefundsAction();
        setNote(result.success ? { tone: 'ok', text: result.message || 'Done.' } : { tone: 'error', text: result.error || 'Retry failed.' });
      })}><RotateCw />{pending ? 'Checking' : 'Retry refunds'}</button>
      {note ? <span role={note.tone === 'error' ? 'alert' : 'status'} className={note.tone === 'error' ? 'text-xs text-rose-700 dark:text-rose-300' : 'text-xs text-muted-foreground'}>{note.text}</span> : null}
    </span>
  );
}
