'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { approvePlan, bookPlan, getPlanSlots } from '../actions/planJourney';
import { AppointmentSchedulingPanel } from './AppointmentSchedulingPanel';
import type { PlanJourney, PlanSlot, WorkflowAttemptResult } from '../types/planJourney';

const field = 'mt-1 w-full rounded border bg-background px-3 py-2 text-sm';
const button = 'rounded border px-3 py-2 text-sm font-medium disabled:opacity-50';
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);

/** Freeze the original payload and key after first send, including an unknown acknowledgement. */
function AttemptForm({ children, makeInput, send, label, onAttemptChange }: { children: ReactNode; makeInput: (form: FormData, key: string) => Record<string, unknown>; send: (input: any) => Promise<WorkflowAttemptResult>; label: string; onAttemptChange?: (frozen: boolean) => void }) {
  const router = useRouter();
  const original = useRef<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WorkflowAttemptResult | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      original.current ||= makeInput(new FormData(event.currentTarget), crypto.randomUUID());
      onAttemptChange?.(true);
      const response = await send(original.current);
      setResult(response);
      if (response.success) router.refresh();
    } catch { setResult({ success: false, error: 'Acknowledgement unavailable. Retry the unchanged command or reload authoritative history before starting another.' }); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="grid gap-3 rounded border bg-muted/20 p-4">
    <fieldset disabled={busy || Boolean(original.current)} className="grid gap-3">{children}</fieldset>
    {original.current && <p className="break-all text-xs text-muted-foreground">Original command key: {String(original.current.idempotencyKey)}. Retries use the frozen payload, not edited fields. Reloading loses this in-memory command: inspect history/readback before any new attempt.</p>}
    {result && <p role={result.success ? 'status' : 'alert'} className="text-sm">{result.success ? `Recorded ${result.recordId || result.appointmentId}. See authoritative readback below.` : result.error || 'Request not acknowledged.'}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={busy} className={button}>{busy ? 'Sending…' : original.current ? 'Retry original command' : label}</button>
      {original.current && <button type="button" disabled={busy} className={button} onClick={() => { router.refresh(); }}>Reload readback</button>}
      {original.current && <p className="text-sm">This update remains locked until its outcome is verified. Do not start another update after an uncertain response.</p>}
    </div>
  </form>;
}

export function PlanJourneyClient({ data }: { data: PlanJourney }) {
  const consultation = data.consultation;
  return <div className="grid gap-6">
    <header className="rounded border bg-background p-5"><Link href="/dashboard/platform/appointments/plans" className="text-sm underline">Consultations & plans</Link><h1 className="mt-3 text-2xl font-semibold">{consultation.serviceName} · {consultation.clientName}</h1><p className="mt-2 text-sm">Consultation {consultation.status} · human disposition {consultation.candidacyDecision} · revision {consultation.revision}{consultation.superseded ? ' · superseded' : ''}</p><p className="mt-3 text-sm text-muted-foreground">Approval and booking are operational records, not consent, treatment completion, clinical clearance, or payment settlement. No patient notification is dispatched by this plan workflow. Current staff membership, human review, service versions, and capacity are checked again by the server.</p></header>
    {consultation.canApprove ? <section className="grid gap-3"><h2 className="text-lg font-semibold">Human-approved plan / superseding revision</h2><AttemptForm label="Approve reviewed plan" send={approvePlan} makeInput={(form, idempotencyKey) => ({ clientId: consultation.clientId, consultationId: consultation.id, providerId: consultation.providerId, expectedConsultationHash: consultation.evidenceHash, title: String(form.get('title')), goals: String(form.get('goals')), supersedesId: String(form.get('supersedesId')) || null, items: [{ serviceId: consultation.serviceId, plannedSessions: Number(form.get('sessions')), intervalNotes: String(form.get('intervalNotes')) }], idempotencyKey })}>
      <label className="text-sm">Plan title<input className={field} name="title" maxLength={200} required /></label>
      <label className="text-sm">Reviewed goals<textarea className={field} name="goals" maxLength={4000} required /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Planned sessions<input className={field} name="sessions" type="number" min={1} step={1} defaultValue={1} required /></label><label className="text-sm">Human-reviewed intervals<input className={field} name="intervalNotes" maxLength={1000} required /></label></div>
      <label className="text-sm">Prior active plan to supersede<select className={field} name="supersedesId"><option value="">New plan</option>{data.plans.filter(plan => plan.status === 'active').map(plan => <option key={plan.id} value={plan.id}>{plan.title} · revision {plan.revision}</option>)}</select></label>
    </AttemptForm></section> : <p role="status" className="rounded border p-4 text-sm">Approval unavailable: only the current consultation provider may approve a signed, nonsuperseded candidate consultation. No clinical recommendation is inferred.</p>}
    <section className="grid gap-4"><h2 className="text-lg font-semibold">Approved plan readback</h2>{!data.plans.length && <p>No approved plans recorded.</p>}{data.plans.map(plan => <article key={plan.id} className="grid gap-3 rounded border bg-background p-4"><h3 className="font-semibold">{plan.title} · {plan.status} · revision {plan.revision}</h3><p className="break-all text-xs text-muted-foreground">Approval hash: {plan.evidenceHash || 'not recorded'}</p>{!plan.receiptAvailable && <p role="status">Legacy approval has no versioned receipt. Review a superseding plan; historical evidence is not rewritten.</p>}{plan.items.map(item => <div key={item.id} className="grid gap-3"><p className="text-sm">{item.title} · {item.plannedSessions} approved sessions · {item.completedSessions} documented · accepted price {item.price === null ? 'unavailable' : money(item.price)}</p>{data.canSchedule && plan.status === 'active' && plan.receiptAvailable && item.duration && <BookingForm data={data} plan={plan} item={item} />}</div>)}</article>)}</section>
    <section className="grid gap-4"><h2 className="text-lg font-semibold">Owned appointment detail / correction</h2>{!data.appointments.length && <p>No plan-backed appointments recorded.</p>}{data.appointments.map(appointment => {
      const plan = data.plans.find(value => value.id === appointment.planId)!;
      const item = plan?.items.find(value => value.id === appointment.itemId);
      return <article key={appointment.id} className="grid gap-3 rounded border bg-background p-4"><Link className="font-medium underline" href={`/dashboard/platform/appointments/${appointment.id}`}>{new Date(appointment.startTime).toLocaleString()} · {appointment.status}</Link><p className="text-sm">Appointment revision {appointment.revision} · accepted {money(appointment.price)} · {appointment.resourceIds.length} active resource reservations · {appointment.supervisorIds.length} supervisor reservations</p>{data.canSchedule && appointment.correctable && plan && item && <>
        <AppointmentSchedulingPanel appointmentId={appointment.id} />
        {plan.status === 'active' && plan.receiptAvailable && <BookingForm data={data} plan={plan} item={item} moving={appointment} />}
      </>}{!appointment.correctable && !['cancelled', 'no_show'].includes(appointment.status) && <p className="text-sm text-muted-foreground">Clinical/financial documentation or current state prevents this simple correction path. A reviewed compensation workflow is required; original evidence and allocations stay intact.</p>}</article>;
    })}</section>
    <HistoryPagination data={data} />
    <section className="grid gap-3"><h2 className="text-lg font-semibold">Immutable history for the records on this page</h2>{!data.history.length && <p>No versioned workflow events recorded.</p>}{data.history.map(event => <div key={event.id} className="break-all rounded border p-3 text-xs"><p>{event.action} · {new Date(event.occurredAt).toLocaleString()}</p><p>Record {event.resourceId} · command {event.correlationId}</p><p>Evidence {event.evidenceHash}</p></div>)}</section>
  </div>;
}

function HistoryPagination({ data }: { data: PlanJourney }) {
  const href = (kind: 'plans' | 'appointments' | 'history', next: number) => `/dashboard/platform/appointments/plans/${data.consultation.id}?planPage=${kind === 'plans' ? next : data.pages.plans}&appointmentPage=${kind === 'appointments' ? next : data.pages.appointments}&historyPage=${kind === 'history' ? next : data.pages.history}`;
  return <nav aria-label="Plan and history pagination" className="grid gap-2 rounded border p-3 text-sm">{(['plans', 'appointments', 'history'] as const).map(kind => <div key={kind} className="flex flex-wrap gap-3"><span>{kind === 'appointments' ? 'Patient appointment history' : kind} page {data.pages[kind] + 1}</span>{data.pages[kind] > 0 && <Link href={href(kind, data.pages[kind] - 1)}>Previous</Link>}{data.pages[kind === 'plans' ? 'morePlans' : kind === 'appointments' ? 'moreAppointments' : 'moreHistory'] && <Link href={href(kind, data.pages[kind] + 1)}>Next</Link>}</div>)}</nav>;
}

function BookingForm({ data, plan, item, moving }: { data: PlanJourney; plan: PlanJourney['plans'][number]; item: PlanJourney['plans'][number]['items'][number]; moving?: PlanJourney['appointments'][number] }) {
  const [attempted, setAttempted] = useState(false);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<PlanSlot[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await getPlanSlots({ providerId: data.consultation.providerId, serviceId: item.serviceId, locationId: data.consultation.locationId, serviceDuration: item.duration!, date: String(new FormData(event.currentTarget).get('date')) });
      setSlots(result.slots); setError(result.error || '');
    } catch { setSlots(null); setError('Availability unavailable; no reservation was made.'); } finally { setBusy(false); }
  }
  return <div className="grid gap-3"><h4 className="text-sm font-semibold">{moving ? 'Reschedule without replacing original price/evidence' : 'Book exact approved item'}</h4><form onSubmit={search} className="flex flex-wrap items-end gap-2"><label className="text-sm">Location-local date<input className={field} name="date" type="date" value={date} onChange={event => { setDate(event.target.value); setSlots(null); setError(''); }} disabled={busy || attempted} required /></label><button className={button} disabled={busy || attempted}>{busy ? 'Loading…' : 'Check authoritative capacity'}</button></form>{error && <p role="alert">{error}</p>}{slots && !slots.some(slot => slot.available) && <p role="status">No available slots for this date. Existing appointment remains unchanged.</p>}{slots?.some(slot => slot.available) && <AttemptForm key={`${data.consultation.providerId}:${item.serviceId}:${data.consultation.locationId}:${date}`} onAttemptChange={setAttempted} label={moving ? 'Reschedule exact appointment' : 'Reserve reviewed slot'} send={bookPlan} makeInput={(form, idempotencyKey) => {
    const slot = slots.find(value => value.startTime === form.get('startTime'))!;
    return { planId: plan.id, planItemId: item.id, planClientId: data.consultation.clientId, expectedPlanHash: plan.evidenceHash, serviceIds: [item.serviceId], providerId: data.consultation.providerId, locationId: data.consultation.locationId, clientName: data.consultation.clientName, clientEmail: data.consultation.clientEmail, clientPhone: data.consultation.clientPhone, startTime: slot.startTime, expectedResourceIds: slot.resourceIds, expectedSupervisorIds: slot.supervisorIds, ...(moving ? { rescheduleAppointmentId: moving.id, expectedAppointmentRevision: moving.revision, rescheduleReason: String(form.get('reason')) } : {}), idempotencyKey };
  }}><label className="text-sm">Reviewed slot<select className={field} name="startTime" required>{slots.filter(slot => slot.available).map(slot => <option key={slot.startTime} value={slot.startTime}>{slot.time} · {slot.resourceIds.length} resources · {slot.supervisorIds.length} supervisors</option>)}</select></label>{moving && <label className="text-sm">Reschedule reason<input className={field} name="reason" maxLength={1000} required /></label>}<p className="text-xs text-muted-foreground">Assignments must remain exact at commit. Existing clinical evidence is never retimed by this form. Overlapping original-slot moves may be rejected by the read-only availability preview; the original reservation is not released to preview.</p></AttemptForm>}</div>;
}
