'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { pillClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import type { TreatmentStepResult } from '../types';

/**
 * Freezes the payload and idempotency key on first send. A retry re-sends the
 * original; only a definitive server rejection (nothing written) unlocks edits.
 */
export function StepAttemptForm({ label, build, send, children, disabled = false }: {
  label: string;
  build: (form: FormData) => Record<string, unknown> | string;
  send: (input: Record<string, unknown>) => Promise<TreatmentStepResult>;
  children: ReactNode;
  disabled?: boolean;
}) {
  const router = useRouter();
  const frozen = useRef<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok' | 'pending'; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    if (!frozen.current) {
      const built = build(new FormData(event.currentTarget));
      if (typeof built === 'string') { setMessage({ tone: 'error', text: built }); return; }
      frozen.current = { ...built, idempotencyKey: crypto.randomUUID() };
    }
    setBusy(true);
    try {
      const result = await send(frozen.current);
      if (result.success) {
        setMessage({ tone: 'ok', text: 'Saved' });
        frozen.current = null;
        router.refresh();
      } else if (result.error && result.error !== 'Not confirmed. Reload before retrying.') {
        // The workflow rejected the request before writing; edits are safe.
        frozen.current = null;
        setMessage({ tone: 'error', text: result.error });
      } else {
        setMessage({ tone: 'pending', text: 'Not confirmed. Retry sends the same request.' });
      }
    } catch {
      setMessage({ tone: 'pending', text: 'Not confirmed. Retry sends the same request.' });
    } finally { setBusy(false); }
  }

  const locked = Boolean(frozen.current);
  return (
    <form onSubmit={submit} className="grid gap-4">
      <fieldset disabled={busy || locked || disabled} className="grid min-w-0 gap-4 disabled:opacity-70">{children}</fieldset>
      {message ? (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={cn('flex items-center gap-2 text-sm', message.tone === 'error' ? 'text-rose-700 dark:text-rose-300' : 'text-muted-foreground')}>
          <StatusDot tone={message.tone === 'ok' ? 'emerald' : message.tone === 'error' ? 'rose' : 'amber'} />{message.text}
        </p>
      ) : null}
      <div className={cn(trackClass, 'self-start')}>
        <button type="submit" className={pillClass('primary')} disabled={busy || disabled}>{busy ? 'Saving' : locked ? 'Retry' : label}</button>
      </div>
    </form>
  );
}
