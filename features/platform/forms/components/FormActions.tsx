'use client';

import { publishConsentVersion, reviewFormSubmission } from '../actions/forms';
import type { ConsentTemplateRow, Option, SubmissionRow } from '../types';
import { WorkflowSheet } from './WorkflowSheet';

const today = () => new Date().toISOString().slice(0, 10);

function bodyOf(content: unknown, key: 'title' | 'body') {
  return content && typeof content === 'object' && typeof (content as any)[key] === 'string' ? (content as any)[key] as string : '';
}

/** Publish a consent version; with `supersede`, the new version replaces that one from its effective date. */
export function ConsentPublishSheet({ services, supersede }: { services: Option[]; supersede?: ConsentTemplateRow }) {
  return (
    <WorkflowSheet
      triggerLabel={supersede ? 'New version' : 'Publish consent'}
      triggerVariant={supersede ? 'raised' : 'primary'}
      triggerSize="sm"
      title={supersede ? `New version · ${supersede.service?.name || 'Consent'}` : 'Publish consent'}
      submitLabel="Publish"
      fields={[
        { name: 'serviceId', label: 'Treatment', type: 'select', required: true, options: services, defaultValue: supersede?.service?.id || '', wide: true },
        { name: 'version', label: 'Version', type: 'text', required: true, maxLength: 40 },
        { name: 'language', label: 'Language', type: 'text', required: true, maxLength: 20, defaultValue: supersede?.language || 'en' },
        { name: 'jurisdiction', label: 'Jurisdiction', type: 'text', required: true, maxLength: 80, defaultValue: supersede?.jurisdiction || '' },
        { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true, defaultValue: today() },
        { name: 'effectiveUntil', label: 'Effective until', type: 'date' },
        { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 200, defaultValue: bodyOf(supersede?.contentSnapshot, 'title'), wide: true },
        { name: 'body', label: 'Consent text', type: 'textarea', required: true, maxLength: 20000, defaultValue: bodyOf(supersede?.contentSnapshot, 'body') },
      ]}
      onSubmit={(values, idempotencyKey) => publishConsentVersion({
        serviceId: String(values.serviceId), version: String(values.version), language: String(values.language), jurisdiction: String(values.jurisdiction),
        effectiveFrom: new Date(`${values.effectiveFrom}T00:00:00`).toISOString(),
        effectiveUntil: values.effectiveUntil ? new Date(`${values.effectiveUntil}T00:00:00`).toISOString() : null,
        title: String(values.title), body: String(values.body), supersedesId: supersede?.id || null, idempotencyKey,
      })}
    />
  );
}

function answer(value: unknown) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function SubmissionReviewSheet({ submission }: { submission: SubmissionRow }) {
  const fields = submission.template?.fields || [];
  const data = submission.data || {};
  const known = new Set(fields.map((field) => field.id));
  const extra = Object.keys(data).filter((key) => !known.has(key));
  return (
    <WorkflowSheet
      triggerLabel="Review"
      triggerSize="sm"
      title={`Review · ${submission.client?.name || 'Client'}`}
      submitLabel="Save review"
      fields={[
        { name: 'disposition', label: 'Outcome', type: 'select', required: true, wide: true, options: [{ value: 'reviewed', label: 'Reviewed' }, { value: 'needs_clarification', label: 'Needs clarification' }, { value: 'escalated', label: 'Escalate to clinician' }] },
        { name: 'rationale', label: 'Rationale', type: 'textarea', required: true, maxLength: 2000 },
        { name: 'notes', label: 'Findings', type: 'textarea', maxLength: 4000 },
      ]}
      onSubmit={(values, idempotencyKey) => reviewFormSubmission({ submissionId: submission.id, disposition: String(values.disposition), rationale: String(values.rationale), notes: String(values.notes || ''), idempotencyKey })}
    >
      <dl className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
        {[...fields.map((field) => ({ key: field.id, label: field.label })), ...extra.map((key) => ({ key, label: key }))].map((item) => (
          <div key={item.key} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words font-medium">{answer(data[item.key])}</dd>
          </div>
        ))}
        {submission.acknowledgement ? <div><dt className="text-xs text-muted-foreground">Acknowledgement</dt><dd className="mt-0.5 break-words">{submission.acknowledgement}</dd></div> : null}
        {!fields.length && !extra.length ? <p className="text-muted-foreground">No answers recorded</p> : null}
      </dl>
    </WorkflowSheet>
  );
}
