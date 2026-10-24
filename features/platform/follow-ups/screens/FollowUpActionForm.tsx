'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, trackClass } from '@/features/platform/components/pill';
import { StatusDot } from '@/features/platform/components/medspa-ui';
import { appendFollowUpStep } from '../actions/followUps';

const ACTIONS = [
  { value: 'contact', label: 'Contacted' },
  { value: 'patient_response', label: 'Client responded' },
  { value: 'escalate', label: 'Escalate' },
  { value: 'complete', label: 'Complete' },
  { value: 'cancel', label: 'Cancel' },
];
const FLAGS = [
  { value: 'none', label: 'No flag' },
  { value: 'review', label: 'Review' },
  { value: 'urgent', label: 'Urgent' },
];

/** One frozen request per attempt; a lost response retries with the same key. */
export function FollowUpActionForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const frozen = useRef<{ taskId: string; action: string; reason: string; redFlag: string; idempotencyKey: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'pending'; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    frozen.current ||= { taskId, action: String(form.get('action')), reason: String(form.get('reason') || '').trim(), redFlag: String(form.get('redFlag')), idempotencyKey: crypto.randomUUID() };
    setBusy(true); setMessage(null);
    try {
      const result = await appendFollowUpStep(frozen.current);
      if (result.success) { frozen.current = null; (event.target as HTMLFormElement).reset(); router.refresh(); }
      else if (result.error) { frozen.current = null; setMessage({ tone: 'error', text: result.error }); }
      else setMessage({ tone: 'pending', text: 'Not confirmed. Retry sends the same request.' });
    } catch {
      setMessage({ tone: 'pending', text: 'Not confirmed. Retry sends the same request.' });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <fieldset disabled={busy || Boolean(frozen.current)} className="grid gap-3 sm:grid-cols-[10rem_8rem_minmax(0,1fr)]">
        <label className={fieldLabelClass}>Action<select name="action" className={inputClass}>{ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className={fieldLabelClass}>Flag<select name="redFlag" className={inputClass}>{FLAGS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className={fieldLabelClass}>Note<input name="reason" required maxLength={1000} className={inputClass} /></label>
      </fieldset>
      {message ? <p role={message.tone === 'error' ? 'alert' : 'status'} className="flex items-center gap-2 text-sm text-muted-foreground"><StatusDot tone={message.tone === 'error' ? 'rose' : 'amber'} />{message.text}</p> : null}
      <div className={cn(trackClass, 'self-start')}><button type="submit" disabled={busy} className={pillClass('primary', 'sm')}>{busy ? 'Saving' : frozen.current ? 'Retry' : 'Record'}</button></div>
    </form>
  );
}
