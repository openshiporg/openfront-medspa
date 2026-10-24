'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from '@/features/platform/components/pill';
import { Chip, Fact, humanize, Notice, Panel, StatusDot, type Tone } from '@/features/platform/components/medspa-ui';
import { submitTreatmentStep } from '../actions/treatment';
import { StepAttemptForm } from '../components/StepAttemptForm';
import type { TreatmentStepName, TreatmentWorkspace } from '../types';

const CANDIDACY = ['candidate', 'deferred', 'declined', 'referred'];
const CONSULT_STATUS = ['completed', 'needs_follow_up', 'closed'];
const SEVERITY = ['information', 'precaution', 'clinician_review', 'hard_stop'];
const DISPOSITION = ['cleared_with_rationale', 'deferred', 'hard_stop', 'referred', 'reopened'];
const SIGNER_ROLES = ['self', 'parent', 'guardian', 'representative'];
const NOTE_TYPES = ['progress', 'procedure', 'addendum'];
const ORDER_ACTIONS: Record<string, string[]> = {
  active: ['hold', 'partially_fulfill', 'fulfill', 'revoke', 'expire', 'enter_in_error'],
  held: ['release', 'revoke', 'expire', 'enter_in_error'],
  partially_fulfilled: ['hold', 'fulfill', 'revoke', 'expire', 'enter_in_error'],
};
const BLOCKING = new Set(['hard_stop', 'clinician_review']);
const UNRESOLVED = new Set(['hard_stop', 'deferred', 'referred', 'reopened']);

const text = (form: FormData, name: string) => String(form.get(name) || '').trim();
const optional = (form: FormData, name: string) => text(form, name) || null;
const iso = (value: string) => (value ? new Date(value).toISOString() : null);
const notes = (form: FormData, name: string) => ({ notes: text(form, name) });

function when(value: string | null, timeZone: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', { timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function localInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={cn(fieldLabelClass, wide && 'sm:col-span-2')}>{label}{children}</label>;
}

function Select({ name, options, required = true, defaultValue, empty }: { name: string; options: Array<{ value: string; label: string }>; required?: boolean; defaultValue?: string; empty?: string }) {
  return (
    <select name={name} required={required} defaultValue={defaultValue ?? (empty ? '' : options[0]?.value)} className={inputClass}>
      {empty !== undefined ? <option value="">{empty}</option> : null}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

const enumOptions = (values: string[]) => values.map((value) => ({ value, label: humanize(value) }));

function Step({ index, title, tone, status, children }: { index: number; title: string; tone: Tone; status: string; children: ReactNode }) {
  return (
    <Panel title={<span className="flex flex-wrap items-center gap-2"><span className="tabular-nums text-muted-foreground">{index}</span>{title}<span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={tone} />{status}</span></span>}>
      <div className="grid gap-5">{children}</div>
    </Panel>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function TreatmentWorkspaceClient({ data }: { data: TreatmentWorkspace }) {
  const [serviceId, setServiceId] = useState(data.services[0]?.id || '');
  const service = data.services.find((item) => item.id === serviceId);
  const tz = data.appointment.timezone;
  const actor = data.actorProviderId;
  const appointmentId = data.appointment.id;
  const send = (step: TreatmentStepName) => (input: Record<string, unknown>) => submitTreatmentStep(step, appointmentId, input);

  const consultations = data.consultations.filter((item) => item.serviceId === serviceId);
  const consultation = consultations.find((item) => !item.superseded) || null;
  const candidate = consultation && consultation.status === 'completed' && consultation.candidacyDecision === 'candidate' ? consultation : null;
  const findings = consultation?.findings || [];
  const openFindings = findings.filter((finding) => BLOCKING.has(finding.severity) && (!finding.decision || UNRESOLVED.has(finding.decision.disposition) || (finding.decision.expiresAt && new Date(finding.decision.expiresAt) <= new Date())));
  const orders = data.orders.filter((item) => item.serviceId === serviceId);
  const activeOrders = orders.filter((item) => ['active', 'partially_fulfilled'].includes(item.status));
  const plans = data.plans.filter((plan) => plan.status === 'active' && plan.plannedServiceIds.includes(serviceId));
  const consents = data.consents.filter((item) => item.serviceId === serviceId);
  const effectiveConsents = consents.filter((item) => item.status === 'effective');
  const templates = data.templates.filter((item) => item.serviceId === serviceId);
  const sessions = data.sessions.filter((item) => item.serviceId === serviceId);
  const liveSession = sessions.find((item) => item.status === 'in_progress') || null;
  const readySession = sessions.find((item) => ['planned', 'ready'].includes(item.status)) || null;
  const sessionIds = new Set(sessions.map((item) => item.id));
  const administrations = data.administrations.filter((item) => item.sessionId && sessionIds.has(item.sessionId));
  const lots = useMemo(() => data.lots.filter((lot) => lot.productId && service?.clinicalProductIds.includes(lot.productId)), [data.lots, service]);
  const providerOptions = data.providers.map((item) => ({ value: item.id, label: item.name }));
  const roomOptions = data.rooms.map((item) => ({ value: item.id, label: `${item.name}${item.readinessStatus && item.readinessStatus !== 'available' ? ` · ${humanize(item.readinessStatus)}` : ''}` }));
  const deviceOptions = data.devices.map((item) => ({ value: item.id, label: `${item.name}${item.readinessStatus ? ` · ${humanize(item.readinessStatus)}` : ''}` }));
  const [lotRows, setLotRows] = useState(1);

  if (!service) return <Notice tone="zinc" title="No treatment on this appointment" />;

  return (
    <div className="grid gap-4">
      {data.services.length > 1 ? (
        <nav aria-label="Treatment" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <div className={cn(trackClass, 'w-max max-w-none')}>
            {data.services.map((item) => (
              <button key={item.id} type="button" aria-pressed={item.id === serviceId} onClick={() => setServiceId(item.id)} className={pillClass(item.id === serviceId ? 'raised' : 'quiet')}>{item.name}</button>
            ))}
          </div>
        </nav>
      ) : null}
      {!actor ? <Notice tone="amber" title="Your account has no provider profile" /> : null}

      <Step index={1} title="Consultation" tone={candidate ? 'emerald' : consultation ? 'amber' : 'zinc'} status={consultation ? `${humanize(consultation.status)} · ${humanize(consultation.candidacyDecision)}` : 'Not recorded'}>
        {consultation ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            <Fact label="Signed">{when(consultation.signedAt, tz)}</Fact>
            <Fact label="Decision">{humanize(consultation.candidacyDecision)}</Fact>
            <Fact label="Summary" wrap>{consultation.summary || '—'}</Fact>
          </dl>
        ) : null}
        {consultation ? (
          <div className={cn(trackClass, 'self-start')}>
            <Link href={`/dashboard/platform/appointments/plans/${consultation.id}`} className={pillClass()}>Plan</Link>
          </div>
        ) : null}
        <StepAttemptForm label={consultation ? 'Record new consultation' : 'Record consultation'} disabled={!actor} send={send('consultation')} build={(form) => ({
          clientId: data.appointment.clientId, appointmentId, providerId: actor, locationId: data.appointment.locationId, serviceId,
          status: text(form, 'status'), candidacyDecision: text(form, 'candidacyDecision'),
          history: notes(form, 'history'), examination: notes(form, 'examination'), goals: notes(form, 'goals'), alternatives: notes(form, 'alternatives'),
          contraindicationReview: { reviewed: true, notes: text(form, 'contraindicationReview') },
          summary: text(form, 'summary'), indication: text(form, 'indication'), protocolVersion: text(form, 'protocolVersion'),
          supersedesId: consultation?.id || null,
        })}>
          <Grid>
            <Field label="Status"><Select name="status" options={enumOptions(CONSULT_STATUS)} /></Field>
            <Field label="Candidacy"><Select name="candidacyDecision" options={enumOptions(CANDIDACY)} /></Field>
            <Field label="Indication"><input name="indication" required maxLength={500} className={inputClass} /></Field>
            <Field label="Protocol version"><input name="protocolVersion" required maxLength={100} className={inputClass} /></Field>
            <Field label="History" wide><textarea name="history" maxLength={4000} className={textareaClass} /></Field>
            <Field label="Examination" wide><textarea name="examination" maxLength={4000} className={textareaClass} /></Field>
            <Field label="Goals"><textarea name="goals" maxLength={2000} className={textareaClass} /></Field>
            <Field label="Alternatives discussed"><textarea name="alternatives" maxLength={2000} className={textareaClass} /></Field>
            <Field label="Contraindication review" wide><textarea name="contraindicationReview" required maxLength={4000} className={textareaClass} /></Field>
            <Field label="Summary" wide><textarea name="summary" required maxLength={4000} className={textareaClass} /></Field>
          </Grid>
        </StepAttemptForm>
      </Step>

      <Step index={2} title="Contraindications" tone={!consultation ? 'zinc' : openFindings.length ? 'rose' : 'emerald'} status={!consultation ? 'Needs consultation' : findings.length ? `${findings.length} finding${findings.length === 1 ? '' : 's'} · ${openFindings.length} open` : 'None recorded'}>
        {findings.map((finding) => (
          <div key={finding.id} className="grid gap-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{finding.ruleCode} <span className="text-muted-foreground">v{finding.ruleVersion}</span></span>
              <Chip tone={finding.severity === 'hard_stop' ? 'rose' : finding.severity === 'clinician_review' ? 'amber' : 'zinc'}>{humanize(finding.severity)}</Chip>
              {finding.decision ? <Chip tone={UNRESOLVED.has(finding.decision.disposition) ? 'rose' : 'emerald'}>{humanize(finding.decision.disposition)}</Chip> : null}
            </div>
            {finding.decision?.rationale ? <p className="text-sm text-muted-foreground">{finding.decision.rationale}</p> : null}
            {!finding.decision || UNRESOLVED.has(finding.decision.disposition) ? (
              <StepAttemptForm label="Record decision" disabled={!actor} send={send('decision')} build={(form) => ({
                findingId: finding.id, providerId: actor, disposition: text(form, 'disposition'), rationale: text(form, 'rationale'), expiresAt: iso(text(form, 'expiresAt')),
              })}>
                <Grid>
                  <Field label="Disposition"><Select name="disposition" options={enumOptions(DISPOSITION)} /></Field>
                  <Field label="Expires"><input name="expiresAt" type="datetime-local" className={inputClass} /></Field>
                  <Field label="Rationale" wide><textarea name="rationale" required maxLength={2000} className={textareaClass} /></Field>
                </Grid>
              </StepAttemptForm>
            ) : null}
          </div>
        ))}
        {consultation ? (
          <StepAttemptForm label="Add finding" send={send('finding')} build={(form) => ({
            consultationId: consultation.id, clientId: data.appointment.clientId, serviceId,
            ruleCode: text(form, 'ruleCode'), ruleVersion: text(form, 'ruleVersion'), severity: text(form, 'severity'), sourceEvidence: notes(form, 'sourceEvidence'),
          })}>
            <Grid>
              <Field label="Rule code"><input name="ruleCode" required maxLength={100} className={inputClass} /></Field>
              <Field label="Rule version"><input name="ruleVersion" required maxLength={50} className={inputClass} /></Field>
              <Field label="Severity"><Select name="severity" options={enumOptions(SEVERITY)} /></Field>
              <Field label="Source"><input name="sourceEvidence" maxLength={1000} className={inputClass} /></Field>
            </Grid>
          </StepAttemptForm>
        ) : null}
      </Step>

      <Step index={3} title="Clinical order" tone={activeOrders.length ? 'emerald' : orders.length ? 'amber' : 'zinc'} status={activeOrders.length ? humanize(activeOrders[0].status) : orders.length ? humanize(orders[0].status) : 'None'}>
        {orders.map((order) => (
          <div key={order.id} className="grid gap-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{order.indication || 'Order'}</span>
              <Chip tone={['active', 'partially_fulfilled'].includes(order.status) ? 'emerald' : order.status === 'held' ? 'amber' : 'zinc'}>{humanize(order.status)}</Chip>
              <span className="text-xs text-muted-foreground">Valid until {when(order.validUntil, tz)}</span>
            </div>
            {ORDER_ACTIONS[order.status] ? (
              <StepAttemptForm label="Apply" disabled={!actor} send={send('orderAction')} build={(form) => ({
                orderId: order.id, providerId: actor, action: text(form, 'action'), reason: text(form, 'reason'), evidence: { recordedFrom: 'treatment-workspace' },
              })}>
                <Grid>
                  <Field label="Action"><Select name="action" options={enumOptions(ORDER_ACTIONS[order.status])} /></Field>
                  <Field label="Reason"><input name="reason" required maxLength={1000} className={inputClass} /></Field>
                </Grid>
              </StepAttemptForm>
            ) : null}
          </div>
        ))}
        {candidate && !openFindings.length ? (
          <StepAttemptForm label="Issue order" disabled={!actor} send={send('order')} build={(form) => {
            const validUntil = iso(text(form, 'validUntil'));
            if (!validUntil) return 'Valid until is required';
            return {
              consultationId: candidate.id, planId: optional(form, 'planId'), clientId: data.appointment.clientId, locationId: data.appointment.locationId, serviceId,
              orderedById: actor, authorizedPerformerId: optional(form, 'authorizedPerformerId'), supervisorId: optional(form, 'supervisorId'),
              indication: text(form, 'indication'), protocolVersion: text(form, 'protocolVersion'), instruction: notes(form, 'instruction'),
              anatomicSite: optional(form, 'anatomicSite'), doseRange: optional(form, 'doseRange'), performerConstraints: optional(form, 'performerConstraints'), validUntil,
            };
          }}>
            <Grid>
              <Field label="Plan"><Select name="planId" required={false} empty="No plan" options={plans.map((plan) => ({ value: plan.id, label: plan.title }))} /></Field>
              <Field label="Valid until"><input name="validUntil" type="datetime-local" required className={inputClass} /></Field>
              <Field label="Authorized performer"><Select name="authorizedPerformerId" required={false} empty="Any" options={providerOptions} /></Field>
              <Field label="Supervisor"><Select name="supervisorId" required={false} empty="None" options={providerOptions} /></Field>
              <Field label="Indication"><input name="indication" required maxLength={500} className={inputClass} /></Field>
              <Field label="Protocol version"><input name="protocolVersion" required maxLength={100} className={inputClass} /></Field>
              <Field label="Anatomic site"><input name="anatomicSite" maxLength={200} className={inputClass} /></Field>
              <Field label="Dose range"><input name="doseRange" maxLength={200} className={inputClass} /></Field>
              <Field label="Instructions" wide><textarea name="instruction" required maxLength={4000} className={textareaClass} /></Field>
              <Field label="Performer constraints" wide><input name="performerConstraints" maxLength={500} className={inputClass} /></Field>
            </Grid>
          </StepAttemptForm>
        ) : <p className="text-sm text-muted-foreground">{!candidate ? 'Needs a completed candidate consultation' : 'Resolve open contraindications first'}</p>}
      </Step>

      <Step index={4} title="Consent" tone={effectiveConsents.length ? 'emerald' : consents.length ? 'amber' : 'zinc'} status={effectiveConsents.length ? 'Effective' : consents.length ? humanize(consents[0].status) : 'Not signed'}>
        {consents.map((consent) => (
          <div key={consent.id} className="grid gap-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{consent.signerName || 'Signer'}</span>
              <Chip tone={consent.status === 'effective' ? 'emerald' : 'zinc'}>{humanize(consent.status)}</Chip>
              <span className="text-xs text-muted-foreground">Signed {when(consent.signedAt, tz)}</span>
            </div>
            {consent.status === 'effective' ? (
              <StepAttemptForm label="Withdraw" send={send('withdrawConsent')} build={(form) => ({ consentId: consent.id, reason: text(form, 'reason') })}>
                <Field label="Reason"><input name="reason" required maxLength={1000} className={inputClass} /></Field>
              </StepAttemptForm>
            ) : null}
          </div>
        ))}
        {templates.length ? (
          <StepAttemptForm label={effectiveConsents.length ? 'Sign new consent' : 'Sign consent'} disabled={!actor} send={send('consent')} build={(form) => {
            const signerRole = text(form, 'signerRole');
            if (signerRole !== 'self' && !text(form, 'representativeAuthority')) return 'Representative authority is required';
            return {
              clientId: data.appointment.clientId, appointmentId, serviceId, templateVersionId: text(form, 'templateVersionId'), presentedById: actor,
              signerName: text(form, 'signerName'), signerRole, representativeAuthority: optional(form, 'representativeAuthority'),
              interpreter: optional(form, 'interpreter'), witness: optional(form, 'witness'), discussionEvidence: notes(form, 'discussion'),
              signatureEvidence: text(form, 'signatureEvidence'), effectiveUntil: iso(text(form, 'effectiveUntil')), supersedesId: effectiveConsents[0]?.id || null,
            };
          }}>
            <Grid>
              <Field label="Consent form"><Select name="templateVersionId" options={templates.map((item) => ({ value: item.id, label: `v${item.version} · ${item.language} · ${item.jurisdiction}` }))} /></Field>
              <Field label="Signer role"><Select name="signerRole" options={enumOptions(SIGNER_ROLES)} /></Field>
              <Field label="Signer name"><input name="signerName" required defaultValue={data.appointment.clientName} maxLength={200} className={inputClass} /></Field>
              <Field label="Typed signature"><input name="signatureEvidence" required maxLength={200} className={inputClass} /></Field>
              <Field label="Representative authority"><input name="representativeAuthority" maxLength={500} className={inputClass} /></Field>
              <Field label="Effective until"><input name="effectiveUntil" type="datetime-local" className={inputClass} /></Field>
              <Field label="Interpreter"><input name="interpreter" maxLength={200} className={inputClass} /></Field>
              <Field label="Witness"><input name="witness" maxLength={200} className={inputClass} /></Field>
              <Field label="Discussion" wide><textarea name="discussion" required maxLength={4000} className={textareaClass} /></Field>
            </Grid>
          </StepAttemptForm>
        ) : <p className="text-sm text-muted-foreground">No effective consent form for this treatment</p>}
      </Step>

      <Step index={5} title="Session" tone={liveSession ? 'blue' : readySession ? 'amber' : sessions.some((item) => item.status === 'completed') ? 'emerald' : 'zinc'} status={sessions[0] ? humanize(sessions[0].status) : 'Not prepared'}>
        {sessions.map((session) => (
          <div key={session.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm">
            <span className="font-medium">{session.serviceTitle || service.name}</span>
            <Chip tone={session.status === 'in_progress' ? 'blue' : session.status === 'completed' ? 'emerald' : session.status === 'stopped' || session.status === 'cancelled' ? 'rose' : 'amber'}>{humanize(session.status)}</Chip>
            <span className="text-xs text-muted-foreground">{session.durationMinutes || 0} min · started {when(session.startedAt, tz)}</span>
          </div>
        ))}
        {readySession ? (
          <StepAttemptForm label="Start session" disabled={!actor} send={send('startSession')} build={(form) => {
            if (form.get('identity') !== 'on' || form.get('site') !== 'on' || form.get('consentCheck') !== 'on') return 'Complete the time-out checks';
            return { treatmentSessionId: readySession.id, protocolVersion: text(form, 'protocolVersion'), timeOutEvidence: { identityConfirmed: true, siteConfirmed: true, consentConfirmed: true, notes: text(form, 'timeOutNotes') } };
          }}>
            <Grid>
              <Field label="Protocol version"><input name="protocolVersion" required maxLength={100} className={inputClass} /></Field>
              <Field label="Time-out notes"><input name="timeOutNotes" maxLength={1000} className={inputClass} /></Field>
            </Grid>
            <TimeOutChecks />
          </StepAttemptForm>
        ) : null}
        {!readySession && !liveSession ? (
          plans.length && activeOrders.some((order) => order.planId) && effectiveConsents.length ? (
            <StepAttemptForm label="Prepare session" disabled={!actor} send={send('prepareSession')} build={(form) => ({
              planId: text(form, 'planId'), appointmentId, orderId: text(form, 'orderId'), consentId: text(form, 'consentId'), providerId: actor,
              supervisorId: optional(form, 'supervisorId'), serviceId, roomId: text(form, 'roomId'), deviceId: optional(form, 'deviceId'),
              durationMinutes: Number(form.get('durationMinutes')),
            })}>
              <Grid>
                <Field label="Plan"><Select name="planId" options={plans.map((plan) => ({ value: plan.id, label: plan.title }))} /></Field>
                <Field label="Order"><Select name="orderId" options={activeOrders.filter((order) => order.planId).map((order) => ({ value: order.id, label: `${order.indication || 'Order'} · ${humanize(order.status)}` }))} /></Field>
                <Field label="Consent"><Select name="consentId" options={effectiveConsents.map((consent) => ({ value: consent.id, label: `${consent.signerName || 'Consent'} · ${when(consent.signedAt, tz)}` }))} /></Field>
                <Field label="Room">{roomOptions.length ? <Select name="roomId" options={roomOptions} /> : <p className="text-sm text-rose-700 dark:text-rose-300">No active room</p>}</Field>
                <Field label="Device"><Select name="deviceId" required={false} empty="None" options={deviceOptions} /></Field>
                <Field label="Supervisor"><Select name="supervisorId" required={false} empty="None" options={providerOptions} /></Field>
                <Field label="Duration (min)"><input name="durationMinutes" type="number" min={1} step={1} required defaultValue={data.appointment.duration || 60} className={inputClass} /></Field>
              </Grid>
            </StepAttemptForm>
          ) : <p className="text-sm text-muted-foreground">Needs an active plan, a plan order and effective consent</p>
        ) : null}
      </Step>

      <Step index={6} title="Administration" tone={administrations.length ? 'emerald' : liveSession ? 'amber' : 'zinc'} status={administrations.length ? `${administrations.length} recorded` : liveSession ? 'Ready to record' : 'Needs a started session'}>
        {administrations.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm">
            <Chip tone={item.status === 'completed' ? 'emerald' : 'rose'}>{humanize(item.status)}</Chip>
            <span className="text-muted-foreground">{when(item.completedAt, tz)} · {item.lotCount} lot{item.lotCount === 1 ? '' : 's'}</span>
            {item.immediateOutcome ? <span className="w-full text-muted-foreground">{item.immediateOutcome}</span> : null}
          </div>
        ))}
        {liveSession && liveSession.orderId && liveSession.consentId && liveSession.roomId ? (
          <StepAttemptForm label="Record administration" disabled={!actor} send={send('administration')} build={(form) => {
            if (form.get('identity') !== 'on' || form.get('site') !== 'on' || form.get('consentCheck') !== 'on') return 'Complete the time-out checks';
            const startedAt = iso(text(form, 'startedAt'));
            const completedAt = iso(text(form, 'completedAt'));
            if (!startedAt || !completedAt) return 'Start and end times are required';
            const lotsInput = Array.from({ length: lotRows }, (_, index) => ({
              lotId: text(form, `lot-${index}`), quantity: Number(form.get(`qty-${index}`)), unit: text(form, `unit-${index}`),
              anatomicSite: text(form, `site-${index}`), wasteQuantity: Number(form.get(`waste-${index}`) || 0), wasteReason: text(form, `wasteReason-${index}`),
            })).filter((row) => row.lotId);
            if (service.requiresLotTraceability && !lotsInput.length) return 'This treatment needs at least one lot';
            return {
              treatmentSessionId: liveSession.id, orderId: liveSession.orderId, consentId: liveSession.consentId, performerId: actor,
              supervisorId: liveSession.supervisorId, roomId: liveSession.roomId, deviceId: liveSession.deviceId,
              protocolVersion: text(form, 'protocolVersion'),
              timeOutEvidence: { identityConfirmed: true, siteConfirmed: true, consentConfirmed: true },
              anatomicMap: notes(form, 'anatomicMap'), deviceSettings: text(form, 'deviceSettings') ? notes(form, 'deviceSettings') : null,
              technique: optional(form, 'technique'), immediateOutcome: text(form, 'immediateOutcome'), aftercare: { instructions: text(form, 'aftercare') },
              startedAt, completedAt, lots: lotsInput, status: text(form, 'status'),
            };
          }}>
            <Grid>
              <Field label="Status"><Select name="status" options={enumOptions(['completed', 'aborted'])} /></Field>
              <Field label="Protocol version"><input name="protocolVersion" required maxLength={100} className={inputClass} /></Field>
              <Field label="Started"><input name="startedAt" type="datetime-local" required defaultValue={liveSession.startedAt ? localInput(new Date(liveSession.startedAt)) : ''} className={inputClass} /></Field>
              <Field label="Completed"><input name="completedAt" type="datetime-local" required defaultValue={localInput(new Date())} className={inputClass} /></Field>
              <Field label="Treatment areas" wide><textarea name="anatomicMap" required maxLength={2000} className={textareaClass} /></Field>
              <Field label="Technique"><input name="technique" maxLength={500} className={inputClass} /></Field>
              <Field label="Device settings"><input name="deviceSettings" maxLength={1000} className={inputClass} /></Field>
              <Field label="Immediate outcome" wide><textarea name="immediateOutcome" required maxLength={2000} className={textareaClass} /></Field>
              <Field label="Aftercare" wide><textarea name="aftercare" required maxLength={2000} className={textareaClass} /></Field>
            </Grid>
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-xs font-medium text-muted-foreground">Lots</legend>
              {lots.length ? Array.from({ length: lotRows }, (_, index) => (
                <div key={index} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-3">
                  <Field label="Lot"><Select name={`lot-${index}`} required={false} empty="—" options={lots.map((lot) => ({ value: lot.id, label: `${lot.productName} · ${lot.lotNumber} · ${lot.remainingQuantity} left` }))} /></Field>
                  <Field label="Quantity"><input name={`qty-${index}`} type="number" min={1} step={1} className={inputClass} /></Field>
                  <Field label="Unit"><input name={`unit-${index}`} maxLength={30} placeholder="units" className={inputClass} /></Field>
                  <Field label="Site"><input name={`site-${index}`} maxLength={200} className={inputClass} /></Field>
                  <Field label="Waste"><input name={`waste-${index}`} type="number" min={0} step={1} defaultValue={0} className={inputClass} /></Field>
                  <Field label="Waste reason"><input name={`wasteReason-${index}`} maxLength={500} className={inputClass} /></Field>
                </div>
              )) : <p className="text-sm text-muted-foreground">No available lots for this treatment</p>}
              {lots.length ? (
                <div className={cn(trackClass, 'self-start')}>
                  <button type="button" className={pillClass('raised', 'sm')} onClick={() => setLotRows(Math.min(lotRows + 1, 25))}>Add lot</button>
                  {lotRows > 1 ? <button type="button" className={pillClass('quiet', 'sm')} onClick={() => setLotRows(lotRows - 1)}>Remove lot</button> : null}
                </div>
              ) : null}
            </fieldset>
            <TimeOutChecks />
          </StepAttemptForm>
        ) : null}
      </Step>

      <Step index={7} title="Signed note" tone={data.notes.length ? 'emerald' : 'zinc'} status={data.notes.length ? `${data.notes.length} signed` : 'None'}>
        {data.notes.map((note) => (
          <div key={note.id} className="grid gap-1 rounded-xl border p-3 text-sm">
            <span className="text-xs font-medium text-muted-foreground">{humanize(note.type)} · {when(note.signedAt, tz)}</span>
            <p className="whitespace-pre-wrap">{note.content}</p>
          </div>
        ))}
        <StepAttemptForm label="Sign note" disabled={!actor} send={send('note')} build={(form) => ({
          clientId: data.appointment.clientId, appointmentId, providerId: actor, type: text(form, 'type'), content: text(form, 'content'),
        })}>
          <Grid>
            <Field label="Type"><Select name="type" options={enumOptions(NOTE_TYPES)} /></Field>
            <Field label="Note" wide><textarea name="content" required maxLength={8000} className={textareaClass} /></Field>
          </Grid>
        </StepAttemptForm>
      </Step>

      <Step index={8} title="Follow-up" tone={data.followUps.length ? 'emerald' : 'zinc'} status={data.followUps.length ? `${data.followUps.length} scheduled` : 'None'}>
        {data.followUps.map((task) => (
          <div key={task.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm">
            <span className="font-medium">{task.title}</span>
            <Chip tone={task.status === 'completed' ? 'emerald' : task.status === 'cancelled' ? 'zinc' : 'amber'}>{humanize(task.status)}</Chip>
            <span className="text-xs text-muted-foreground">Due {when(task.dueAt, tz)}</span>
          </div>
        ))}
        {sessions.length ? (
          <StepAttemptForm label="Schedule follow-up" send={send('followUp')} build={(form) => {
            const dueAt = iso(text(form, 'dueAt'));
            if (!dueAt) return 'Due date is required';
            return { treatmentSessionId: text(form, 'treatmentSessionId'), assignedToId: text(form, 'assignedToId'), dueAt, title: text(form, 'title'), instructions: text(form, 'instructions') };
          }}>
            <Grid>
              <Field label="Session"><Select name="treatmentSessionId" options={sessions.map((session) => ({ value: session.id, label: `${session.serviceTitle || service.name} · ${humanize(session.status)}` }))} /></Field>
              <Field label="Assigned to"><Select name="assignedToId" options={data.staffUsers.map((user) => ({ value: user.id, label: user.name }))} /></Field>
              <Field label="Due"><input name="dueAt" type="datetime-local" required className={inputClass} /></Field>
              <Field label="Title"><input name="title" required maxLength={200} defaultValue="Post-treatment check" className={inputClass} /></Field>
              <Field label="Instructions" wide><textarea name="instructions" maxLength={2000} className={textareaClass} /></Field>
            </Grid>
          </StepAttemptForm>
        ) : <p className="text-sm text-muted-foreground">Needs a treatment session</p>}
      </Step>
    </div>
  );
}

function TimeOutChecks() {
  return (
    <fieldset className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">Time-out</legend>
      <label className="flex min-h-9 items-center gap-2"><input type="checkbox" name="identity" className="size-4" />Identity</label>
      <label className="flex min-h-9 items-center gap-2"><input type="checkbox" name="site" className="size-4" />Site</label>
      <label className="flex min-h-9 items-center gap-2"><input type="checkbox" name="consentCheck" className="size-4" />Consent</label>
    </fieldset>
  );
}
