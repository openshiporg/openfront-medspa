'use client';

import { WorkflowSheet } from '@/features/platform/forms/components/WorkflowSheet';
import type { Option } from '@/features/platform/forms/types';
import { appendRightsStep, createRightsRequest, placeHold, publishRetention, releaseHold } from '../actions/privacy';

export const REQUEST_TYPES: Option[] = [
  { value: 'access', label: 'Access to records' }, { value: 'export', label: 'Export records' }, { value: 'amendment', label: 'Amend records' },
  { value: 'restriction', label: 'Restrict use' }, { value: 'disclosure_accounting', label: 'Disclosure accounting' },
  { value: 'representative_update', label: 'Representative update' }, { value: 'deletion_review', label: 'Deletion review' },
];

const day = (value: string | boolean | undefined) => value ? new Date(`${value}T00:00:00`).toISOString() : null;

export function RightsRequestSheet({ clients }: { clients: Option[] }) {
  return (
    <WorkflowSheet
      triggerLabel="Record request"
      triggerVariant="primary"
      title="Record patient-rights request"
      submitLabel="Record"
      fields={[
        { name: 'clientId', label: 'Client', type: 'select', required: true, options: clients, wide: true },
        { name: 'type', label: 'Request', type: 'select', required: true, options: REQUEST_TYPES, wide: true },
        { name: 'details', label: 'Details', type: 'textarea', required: true, maxLength: 4000 },
      ]}
      onSubmit={(values, idempotencyKey) => createRightsRequest({ clientId: String(values.clientId), type: String(values.type), details: String(values.details), idempotencyKey })}
    />
  );
}

const RIGHTS_STEPS: Option[] = [
  { value: 'verify_identity', label: 'Verify identity' }, { value: 'assign', label: 'Assign' }, { value: 'collect_records', label: 'Collect records' },
  { value: 'approve', label: 'Approve' }, { value: 'partial', label: 'Partially fulfil' }, { value: 'deny_with_basis', label: 'Deny with legal basis' },
  { value: 'deliver', label: 'Deliver' }, { value: 'close', label: 'Close' },
];

export function RightsStepSheet({ requestId }: { requestId: string }) {
  return (
    <WorkflowSheet
      triggerLabel="Add step"
      triggerVariant="primary"
      title="Add request step"
      submitLabel="Save step"
      fields={[
        { name: 'action', label: 'Step', type: 'select', required: true, options: RIGHTS_STEPS, wide: true },
        { name: 'reason', label: 'Reason', type: 'textarea', required: true, maxLength: 2000 },
        { name: 'legalBasis', label: 'Legal basis', type: 'text', maxLength: 500, wide: true },
        { name: 'notes', label: 'Evidence notes', type: 'textarea', maxLength: 4000 },
      ]}
      onSubmit={(values, idempotencyKey) => {
        if (values.action === 'deny_with_basis' && !String(values.legalBasis || '').trim()) return Promise.resolve({ success: false, error: 'A denial needs its legal basis.' });
        return appendRightsStep({ requestId, action: String(values.action), reason: String(values.reason), notes: String(values.notes || ''), legalBasis: String(values.legalBasis || '') || null, idempotencyKey });
      }}
    />
  );
}

export function PlaceHoldSheet({ clients, incidents }: { clients: Option[]; incidents: Option[] }) {
  return (
    <WorkflowSheet
      triggerLabel="Place hold"
      triggerVariant="primary"
      title="Place legal hold"
      submitLabel="Place hold"
      fields={[
        { name: 'clientId', label: 'Client', type: 'select', options: clients, wide: true },
        { name: 'incidentId', label: 'Incident', type: 'select', options: incidents, wide: true },
        { name: 'authorityReference', label: 'Authority reference', type: 'text', required: true, maxLength: 500, wide: true },
        { name: 'reason', label: 'Reason', type: 'textarea', required: true, maxLength: 1000 },
      ]}
      onSubmit={(values, idempotencyKey) => placeHold({ clientId: String(values.clientId || '') || null, incidentId: String(values.incidentId || '') || null, reason: String(values.reason), authorityReference: String(values.authorityReference), idempotencyKey })}
    />
  );
}

export function ReleaseHoldSheet({ legalHoldId }: { legalHoldId: string }) {
  return (
    <WorkflowSheet
      triggerLabel="Release"
      triggerSize="sm"
      title="Release legal hold"
      submitLabel="Release hold"
      fields={[
        { name: 'authorityReference', label: 'Authority reference', type: 'text', required: true, maxLength: 500, wide: true },
        { name: 'reason', label: 'Reason', type: 'textarea', required: true, maxLength: 1000 },
      ]}
      onSubmit={(values, idempotencyKey) => releaseHold({ legalHoldId, reason: String(values.reason), authorityReference: String(values.authorityReference), idempotencyKey })}
    />
  );
}

export function RetentionPolicySheet() {
  return (
    <WorkflowSheet
      triggerLabel="Publish policy"
      triggerVariant="primary"
      title="Publish retention policy"
      submitLabel="Publish"
      fields={[
        { name: 'recordClass', label: 'Record class', type: 'text', required: true, maxLength: 120 },
        { name: 'jurisdiction', label: 'Jurisdiction', type: 'text', required: true, maxLength: 120 },
        { name: 'version', label: 'Version', type: 'text', required: true, maxLength: 40 },
        { name: 'retainMonths', label: 'Retain (months)', type: 'number', required: true, min: 1 },
        { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { name: 'effectiveUntil', label: 'Effective until', type: 'date' },
        { name: 'minorsRule', label: 'Minors rule', type: 'text', maxLength: 500, wide: true },
        { name: 'dispositionRule', label: 'Disposition', type: 'textarea', required: true, maxLength: 2000 },
        { name: 'sourceCitations', label: 'Sources', type: 'textarea', required: true, maxLength: 4000 },
      ]}
      onSubmit={(values, idempotencyKey) => publishRetention({
        recordClass: String(values.recordClass), jurisdiction: String(values.jurisdiction), version: String(values.version), retainMonths: Number(values.retainMonths),
        minorsRule: String(values.minorsRule || '') || null, dispositionRule: String(values.dispositionRule), sourceCitations: String(values.sourceCitations),
        effectiveFrom: day(values.effectiveFrom)!, effectiveUntil: day(values.effectiveUntil), idempotencyKey,
      })}
    />
  );
}
