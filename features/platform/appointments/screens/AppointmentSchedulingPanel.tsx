'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getAppointmentSchedule, sendAppointmentTransition } from '../actions/appointmentSchedule';
import type { AppointmentScheduleReadback, AppointmentTransitionInput } from '../types/appointmentSchedule';
import { readTransitionIntent, retainTransitionIntent, resolveTransitionIntent, type TransitionIntent } from '../lib/transitionIntent';
import { fieldLabelClass, inputClass, pillClass, trackClass } from '@/features/platform/components/pill';

/** One tab-private original intent, independent of selected record, filters, form edits or reload. */
export function AppointmentSchedulingPanel({ appointmentId, customerOnly = false }: { appointmentId: string; customerOnly?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<AppointmentScheduleReadback | null>(null);
  const [intent, setIntent] = useState<TransitionIntent | null>(null);
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState('Loading scheduling…');
  const purpose = customerOnly ? 'customer_cancel' : 'scheduler';
  useEffect(() => {
    let alive = true;
    setBusy(true); setData(null);
    (async () => {
      try {
        const saved = readTransitionIntent(window.sessionStorage);
        // The enclosing record and current authenticated purpose never change to a stored target.
        let current = await getAppointmentSchedule(appointmentId, undefined, purpose);
        const matches = Boolean(saved && current && saved.original.appointmentId === appointmentId
          && saved.original.expectedScope?.purpose === purpose
          && saved.original.expectedScope.actorId === current.scope.actorId
          && saved.original.expectedScope.practiceId === current.scope.practiceId);
        if (matches && saved) current = await getAppointmentSchedule(appointmentId, saved.original);
        if (!alive) return;
        setIntent(matches ? saved : null); setData(current); setBlocked(!current || Boolean(saved && !matches));
        setMessage(saved && !matches ? 'An earlier update is pending for another appointment or account. Recover it there first.'
          : current ? matches ? 'Update pending. Refresh status or retry the original update.' : '' : 'Scheduling is unavailable. Retry without replacing a pending update.');
      } catch {
        if (alive) { setBlocked(true); setMessage('Saved update state is unreadable. New updates are blocked in this tab.'); }
      } finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, [appointmentId, purpose]);
  async function complete(original: TransitionIntent, receipt: AppointmentScheduleReadback['receipt']) {
    await resolveTransitionIntent(window.sessionStorage, original, receipt);
    // Only a complete actor/scope/body/key/version-correlated immutable receipt resolves intent.
    const current = await getAppointmentSchedule(original.original.appointmentId, undefined, original.original.expectedScope!.purpose);
    setIntent(null); setData(current); setBlocked(!current);
    setMessage('Status saved. Current scheduling reloaded.');
    router.refresh();
  }
  async function retrieve() {
    if (!intent || busy) return;
    setBusy(true);
    try {
      const saved = readTransitionIntent(window.sessionStorage);
      if (!saved || saved.original.appointmentId !== appointmentId || saved.original.expectedScope?.purpose !== purpose || JSON.stringify(saved) !== JSON.stringify(intent)) throw new Error('Original intent changed');
      const readback = await getAppointmentSchedule(saved.original.appointmentId, saved.original);
      if (readback) { setData(readback); setBlocked(false); }
      if (!readback?.receipt) throw new Error('No attributable receipt yet. Keep this original command pending; no new key.');
      await complete(saved, readback.receipt);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Readback unavailable; original command remains pending.'); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || blocked || !data) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      let saved = readTransitionIntent(window.sessionStorage);
      if (saved && (saved.original.appointmentId !== appointmentId || saved.original.expectedScope?.purpose !== purpose
        || saved.original.expectedScope.actorId !== data.scope.actorId || saved.original.expectedScope.practiceId !== data.scope.practiceId)) {
        throw new Error('Another appointment or account has a pending update. Recover that original update before continuing.');
      }
      if (!saved) {
        if (intent || !data.allowedTransitions.length) throw new Error('Original command/readback requires review');
        const original: AppointmentTransitionInput = { appointmentId: data.scope.appointmentId, expectedScope: data.scope, expectedRevision: data.revision, status: String(form.get('status')) as AppointmentTransitionInput['status'], reason: String(form.get('reason')).trim(), idempotencyKey: crypto.randomUUID() };
        saved = retainTransitionIntent(window.sessionStorage, original);
      }
      setIntent(saved);
      const result = await sendAppointmentTransition(saved.original);
      if (result.success) await complete(saved, result.receipt);
      else setMessage(result.error || 'Uncertain acknowledgement. Original command remains pending.');
    } catch (error) { setBlocked(true); setMessage(error instanceof Error ? error.message : 'Storage or acknowledgement unavailable; no NEW command is allowed.'); }
    finally { setBusy(false); }
  }
  const tone = data ? ({ pending: 'bg-amber-500', confirmed: 'bg-emerald-500', in_progress: 'bg-blue-500', completed: 'bg-zinc-400', cancelled: 'bg-rose-500', no_show: 'bg-orange-500' } as Record<string, string>)[data.status] || 'bg-zinc-400' : 'bg-zinc-300';
  return <section className="grid min-w-0 gap-4 rounded-2xl border bg-background p-4 text-foreground md:p-5" aria-label="Controlled appointment scheduling">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="text-sm font-semibold">{customerOnly ? 'Cancel request' : 'Scheduling'}</h2>
      {data && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span aria-hidden="true" className={`size-2 rounded-full ${tone}`} />{data.status.replaceAll('_', ' ')}</span>}
    </div>
    {data && <p className="text-sm text-muted-foreground">{new Date(data.startTime).toLocaleString('en-US', { timeZone: data.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ({data.timezone}) · revision {data.revision}</p>}
    <p role="status" className="text-sm empty:hidden">{message}</p>
    <form onSubmit={submit} className="grid gap-3">
      <fieldset disabled={busy || blocked || Boolean(intent) || !data?.allowedTransitions.length} className="grid min-w-0 gap-3 disabled:opacity-70 sm:grid-cols-2">
        <label className={fieldLabelClass}>Action<select name="status" className={inputClass}>{data?.allowedTransitions.map(status => <option key={status} value={status}>{{ confirmed: 'Confirm appointment', in_progress: 'Check in client', cancelled: 'Cancel and release reservations', no_show: 'Record no-show and release reservations' }[status]}</option>)}</select></label>
        <label className={fieldLabelClass}>Administrative reason<input name="reason" className={inputClass} maxLength={1000} required /></label>
      </fieldset>
      <div className={`${trackClass} w-fit flex-wrap`}><button className={pillClass('primary')} disabled={busy || blocked || !data || (!intent && !data.allowedTransitions.length)}>{busy ? 'Working…' : intent ? 'Retry pending update' : 'Save status'}</button>{intent && <button type="button" className={pillClass('quiet')} disabled={busy} onClick={retrieve}>Refresh update status</button>}</div>
    </form>
    {data && !data.allowedTransitions.length && !intent && <p className="text-sm text-muted-foreground">No status change available for this appointment.</p>}
  </section>;
}
