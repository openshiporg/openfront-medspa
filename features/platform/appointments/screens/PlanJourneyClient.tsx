'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { approvePlan, bookPlan, getPlanSlots } from '../actions/planJourney';
import { AppointmentSchedulingPanel } from './AppointmentSchedulingPanel';
import type { PlanJourney, PlanSlot, WorkflowAttemptResult } from '../types/planJourney';
import { Chip, EmptyState, Notice, PageHeader, Panel, StatusDot, TitleStatus, humanize, statusTone } from '@/features/platform/components/medspa-ui';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from '@/features/platform/components/pill';
import { ClipboardList } from 'lucide-react';

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
    } catch { setResult({ success: false, error: 'No acknowledgement. Retry the same request or reload history first.' }); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="grid min-w-0 gap-4 rounded-[6px] border bg-muted/30 p-4">
    <fieldset disabled={busy || Boolean(original.current)} className="grid min-w-0 gap-3 disabled:opacity-70">{children}</fieldset>
    {original.current && <p className="break-all text-xs text-muted-foreground">Request key {String(original.current.idempotencyKey)} · retries resend the original values</p>}
    {result && <p role={result.success ? 'status' : 'alert'} className="text-sm">{result.success ? `Recorded ${result.recordId || result.appointmentId}.` : result.error || 'Request not acknowledged.'}</p>}
    <div className={`${trackClass} w-fit flex-wrap`}>
      <button disabled={busy} className={pillClass('primary')}>{busy ? 'Sending…' : original.current ? 'Retry original request' : label}</button>
      {original.current && <button type="button" disabled={busy} className={pillClass('quiet')} onClick={() => { router.refresh(); }}>Reload</button>}
    </div>
  </form>;
}

export function PlanJourneyClient({ data }: { data: PlanJourney }) {
  const consultation = data.consultation;
  return <div className="grid min-w-0 gap-6">
    <PageHeader
      icon={ClipboardList}
      eyebrow={consultation.clientName}
      title={consultation.serviceName}
      status={<TitleStatus tone={statusTone(consultation.status)}>{humanize(consultation.status)}</TitleStatus>}
      meta={<>
        <span className="inline-flex items-center gap-1.5"><StatusDot tone={statusTone(consultation.candidacyDecision)} />{humanize(consultation.candidacyDecision)}</span>
        <span>Revision {consultation.revision}</span>
        {consultation.superseded ? <Chip tone="zinc">Superseded</Chip> : null}
      </>}
    />

    {consultation.canApprove ? (
      <Panel title="Approve plan">
        <AttemptForm label="Approve plan" send={approvePlan} makeInput={(form, idempotencyKey) => ({ clientId: consultation.clientId, consultationId: consultation.id, providerId: consultation.providerId, expectedConsultationHash: consultation.evidenceHash, title: String(form.get('title')), goals: String(form.get('goals')), supersedesId: String(form.get('supersedesId')) || null, items: [{ serviceId: consultation.serviceId, plannedSessions: Number(form.get('sessions')), intervalNotes: String(form.get('intervalNotes')) }], idempotencyKey })}>
          <label className={fieldLabelClass}>Plan title<input className={inputClass} name="title" maxLength={200} required /></label>
          <label className={fieldLabelClass}>Goals<textarea className={textareaClass} name="goals" maxLength={4000} required /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={fieldLabelClass}>Planned sessions<input className={inputClass} name="sessions" type="number" min={1} step={1} defaultValue={1} required /></label>
            <label className={fieldLabelClass}>Session interval<input className={inputClass} name="intervalNotes" maxLength={1000} required /></label>
          </div>
          <label className={fieldLabelClass}>Supersedes<select className={inputClass} name="supersedesId"><option value="">New plan</option>{data.plans.filter(plan => plan.status === 'active').map(plan => <option key={plan.id} value={plan.id}>{plan.title} · revision {plan.revision}</option>)}</select></label>
        </AttemptForm>
      </Panel>
    ) : <Notice title="Approval unavailable" role="status">Only the consultation provider can approve a signed, current consultation.</Notice>}

    <section className="grid min-w-0 gap-3">
      <h2 className="px-1 text-sm font-semibold">Approved plans</h2>
      {!data.plans.length && <EmptyState icon={ClipboardList} title="No approved plans" />}
      {data.plans.map(plan => (
        <Panel key={plan.id} title={<span className="flex flex-wrap items-center gap-x-2.5 gap-y-1"><span className="truncate">{plan.title}</span><TitleStatus tone={statusTone(plan.status)}>{humanize(plan.status)}</TitleStatus></span>} actions={<span className="text-xs text-muted-foreground">Revision {plan.revision}</span>}>
          <div className="grid min-w-0 gap-4">
            <p className="break-all text-xs text-muted-foreground">Approval hash {plan.evidenceHash || 'not recorded'}</p>
            {!plan.receiptAvailable && <Notice title="Legacy approval without receipt">Approve a superseding plan to book from it.</Notice>}
            {plan.items.map(item => (
              <div key={item.id} className="grid min-w-0 gap-3 rounded-[6px] border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">{item.title}</span>
                  <span className="flex flex-wrap gap-1.5">
                    <Chip>{item.completedSessions}/{item.plannedSessions} sessions</Chip>
                    <Chip>{item.price === null ? 'Price unavailable' : money(item.price)}</Chip>
                  </span>
                </div>
                {data.canSchedule && plan.status === 'active' && plan.receiptAvailable && item.duration && <BookingForm data={data} plan={plan} item={item} />}
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </section>

    <section className="grid min-w-0 gap-3">
      <h2 className="px-1 text-sm font-semibold">Plan appointments</h2>
      {!data.appointments.length && <EmptyState icon={ClipboardList} title="No plan appointments" />}
      {data.appointments.map(appointment => {
        const plan = data.plans.find(value => value.id === appointment.planId)!;
        const item = plan?.items.find(value => value.id === appointment.itemId);
        return (
          <Panel key={appointment.id}>
            <div className="grid min-w-0 gap-3">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <Link className="font-semibold underline-offset-4 hover:underline" href={`/dashboard/platform/appointments/${appointment.id}`}>{new Date(appointment.startTime).toLocaleString()}</Link>
                <TitleStatus tone={statusTone(appointment.status)}>{humanize(appointment.status)}</TitleStatus>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip>Revision {appointment.revision}</Chip>
                <Chip>{money(appointment.price)}</Chip>
                <Chip>{appointment.resourceIds.length} resources</Chip>
                <Chip>{appointment.supervisorIds.length} supervisors</Chip>
              </div>
              {data.canSchedule && appointment.correctable && plan && item && <>
                <AppointmentSchedulingPanel appointmentId={appointment.id} />
                {plan.status === 'active' && plan.receiptAvailable && <BookingForm data={data} plan={plan} item={item} moving={appointment} />}
              </>}
              {!appointment.correctable && !['cancelled', 'no_show'].includes(appointment.status) && <p className="text-sm text-muted-foreground">Documented or settled; changes need a reviewed correction.</p>}
            </div>
          </Panel>
        );
      })}
    </section>

    <HistoryPagination data={data} />

    <section className="grid min-w-0 gap-3">
      <h2 className="px-1 text-sm font-semibold">History</h2>
      {!data.history.length ? <EmptyState icon={ClipboardList} title="No history events" /> : (
        <ol className="divide-y overflow-hidden rounded-[6px] border bg-background">
          {data.history.map(event => (
            <li key={event.id} className="grid gap-1 break-all p-3 text-xs md:px-5">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium"><StatusDot tone="violet" />{humanize(event.action)}<span className="text-xs font-normal text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</span></p>
              <p className="text-muted-foreground">Record {event.resourceId} · request {event.correlationId}</p>
              <p className="text-muted-foreground">Evidence {event.evidenceHash}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  </div>;
}

function HistoryPagination({ data }: { data: PlanJourney }) {
  const href = (kind: 'plans' | 'appointments' | 'history', next: number) => `/dashboard/platform/appointments/plans/${data.consultation.id}?planPage=${kind === 'plans' ? next : data.pages.plans}&appointmentPage=${kind === 'appointments' ? next : data.pages.appointments}&historyPage=${kind === 'history' ? next : data.pages.history}`;
  const labels = { plans: 'Plans', appointments: 'Appointments', history: 'History' } as const;
  return <nav aria-label="Plan and history pagination" className="grid gap-2 rounded-[6px] border bg-background p-3 text-sm md:px-5">{(['plans', 'appointments', 'history'] as const).map(kind => {
    const more = data.pages[kind === 'plans' ? 'morePlans' : kind === 'appointments' ? 'moreAppointments' : 'moreHistory'];
    return <div key={kind} className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-muted-foreground">{labels[kind]} · page {data.pages[kind] + 1}</span>
      {(data.pages[kind] > 0 || more) && <span className={trackClass}>
        {data.pages[kind] > 0 && <Link className={pillClass('raised', 'sm')} href={href(kind, data.pages[kind] - 1)}>Previous</Link>}
        {more && <Link className={pillClass('raised', 'sm')} href={href(kind, data.pages[kind] + 1)}>Next</Link>}
      </span>}
    </div>;
  })}</nav>;
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
    } catch { setSlots(null); setError('Availability unavailable. Nothing was reserved.'); } finally { setBusy(false); }
  }
  return <div className="grid min-w-0 gap-3">
    <h4 className="text-sm font-semibold">{moving ? 'Reschedule' : 'Book session'}</h4>
    <form onSubmit={search} className="flex flex-wrap items-end gap-2">
      <label className={fieldLabelClass}>Date (location time)<input className={inputClass} name="date" type="date" value={date} onChange={event => { setDate(event.target.value); setSlots(null); setError(''); }} disabled={busy || attempted} required /></label>
      <span className={trackClass}><button className={pillClass('raised')} disabled={busy || attempted}>{busy ? 'Loading…' : 'Find times'}</button></span>
    </form>
    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    {slots && !slots.some(slot => slot.available) && <p role="status" className="text-sm text-muted-foreground">No available times on this date.</p>}
    {slots?.some(slot => slot.available) && <AttemptForm key={`${data.consultation.providerId}:${item.serviceId}:${data.consultation.locationId}:${date}`} onAttemptChange={setAttempted} label={moving ? 'Reschedule appointment' : 'Reserve time'} send={bookPlan} makeInput={(form, idempotencyKey) => {
      const slot = slots.find(value => value.startTime === form.get('startTime'))!;
      return { planId: plan.id, planItemId: item.id, planClientId: data.consultation.clientId, expectedPlanHash: plan.evidenceHash, serviceIds: [item.serviceId], providerId: data.consultation.providerId, locationId: data.consultation.locationId, clientName: data.consultation.clientName, clientEmail: data.consultation.clientEmail, clientPhone: data.consultation.clientPhone, startTime: slot.startTime, expectedResourceIds: slot.resourceIds, expectedSupervisorIds: slot.supervisorIds, ...(moving ? { rescheduleAppointmentId: moving.id, expectedAppointmentRevision: moving.revision, rescheduleReason: String(form.get('reason')) } : {}), idempotencyKey };
    }}>
      <label className={fieldLabelClass}>Time<select className={inputClass} name="startTime" required>{slots.filter(slot => slot.available).map(slot => <option key={slot.startTime} value={slot.startTime}>{slot.time} · {slot.resourceIds.length} resources · {slot.supervisorIds.length} supervisors</option>)}</select></label>
      {moving && <label className={fieldLabelClass}>Reschedule reason<input className={inputClass} name="reason" maxLength={1000} required /></label>}
    </AttemptForm>}
  </div>;
}
