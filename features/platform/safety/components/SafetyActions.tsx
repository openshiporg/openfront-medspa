'use client';

import { WorkflowSheet } from '@/features/platform/forms/components/WorkflowSheet';
import type { Option } from '@/features/platform/forms/types';
import { appendIncidentStep, appendRecallStep, openRecallFromPlatform, reportIncidentFromPlatform } from '../actions/safety';
import type { RecallExposure, SafetyOptions } from '../types';

export const SEVERITIES: Option[] = [
  { value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
];

function localNow() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ReportIncidentSheet({ options }: { options: SafetyOptions }) {
  return (
    <WorkflowSheet
      triggerLabel="Report incident"
      triggerVariant="primary"
      title="Report incident"
      submitLabel="Report"
      fields={[
        { name: 'clientId', label: 'Client', type: 'select', required: true, options: options.clients, wide: true },
        { name: 'locationId', label: 'Location', type: 'select', required: true, options: options.locations, defaultValue: options.locations.length === 1 ? options.locations[0].value : '' },
        { name: 'severity', label: 'Severity', type: 'select', required: true, options: SEVERITIES },
        { name: 'occurredAt', label: 'Occurred', type: 'datetime-local', required: true, defaultValue: localNow(), wide: true },
        { name: 'summary', label: 'Summary', type: 'text', required: true, maxLength: 500, wide: true },
        { name: 'symptoms', label: 'Symptoms', type: 'textarea', required: true },
        { name: 'immediateActions', label: 'Immediate actions', type: 'textarea', required: true },
        { name: 'suspectLotId', label: 'Suspect lot', type: 'select', options: options.lots },
        { name: 'suspectDeviceId', label: 'Suspect device', type: 'select', options: options.devices },
      ]}
      onSubmit={(values, idempotencyKey) => reportIncidentFromPlatform({
        clientId: String(values.clientId), locationId: String(values.locationId), severity: String(values.severity),
        occurredAt: new Date(String(values.occurredAt)).toISOString(), summary: String(values.summary), symptoms: String(values.symptoms),
        immediateActions: String(values.immediateActions), suspectLotId: String(values.suspectLotId || '') || null, suspectDeviceId: String(values.suspectDeviceId || '') || null, idempotencyKey,
      })}
    />
  );
}

const OPERATIONAL_STEPS: Option[] = [
  { value: 'manufacturer_notice', label: 'Manufacturer notice' }, { value: 'regulatory_decision', label: 'Regulatory decision' },
  { value: 'regulatory_submit', label: 'Regulatory submission' }, { value: 'capa_assign', label: 'Assign corrective action' }, { value: 'capa_verify', label: 'Verify corrective action' },
];
const CLINICAL_STEPS: Option[] = [
  { value: 'triage', label: 'Triage' }, { value: 'clinical_review', label: 'Clinical review' }, { value: 'intervention', label: 'Intervention' },
  { value: 'referral', label: 'Referral' }, { value: 'emergency_transfer', label: 'Emergency transfer' }, { value: 'clinical_resolve', label: 'Clinically resolved' },
];

export function IncidentStepSheet({ incidentId, status, canActAsClinician }: { incidentId: string; status: string; canActAsClinician: boolean }) {
  const steps = [
    ...(canActAsClinician ? CLINICAL_STEPS : []),
    ...OPERATIONAL_STEPS,
    ...(canActAsClinician && status === 'under_review' ? [{ value: 'close', label: 'Close incident' }] : []),
  ];
  return (
    <WorkflowSheet
      triggerLabel="Add step"
      triggerVariant="primary"
      title="Add incident step"
      submitLabel="Save step"
      fields={[
        { name: 'action', label: 'Step', type: 'select', required: true, options: steps },
        { name: 'severity', label: 'Severity', type: 'select', options: SEVERITIES },
        { name: 'rationale', label: 'Rationale', type: 'textarea', required: true, maxLength: 2000 },
        { name: 'notes', label: 'Evidence notes', type: 'textarea', maxLength: 4000 },
      ]}
      onSubmit={(values, idempotencyKey) => appendIncidentStep({ incidentId, action: String(values.action), severity: String(values.severity || '') || null, rationale: String(values.rationale), notes: String(values.notes || ''), idempotencyKey })}
    />
  );
}

export function OpenRecallSheet({ options }: { options: SafetyOptions }) {
  return (
    <WorkflowSheet
      triggerLabel="Open recall"
      title="Open recall"
      submitLabel="Open recall"
      fields={[
        { name: 'locationId', label: 'Location', type: 'select', required: true, options: options.locations, defaultValue: options.locations.length === 1 ? options.locations[0].value : '', wide: true },
        { name: 'lotId', label: 'Lot', type: 'select', options: options.lots },
        { name: 'deviceId', label: 'Device', type: 'select', options: options.devices },
        { name: 'sourceReference', label: 'Notice reference', type: 'text', required: true, maxLength: 300, wide: true },
        { name: 'scopeReason', label: 'Scope', type: 'textarea', required: true, maxLength: 2000 },
      ]}
      onSubmit={(values, idempotencyKey) => openRecallFromPlatform({ locationId: String(values.locationId), lotId: String(values.lotId || '') || null, deviceId: String(values.deviceId || '') || null, sourceReference: String(values.sourceReference), scopeReason: String(values.scopeReason), idempotencyKey })}
    />
  );
}

export function RecallStepSheet({ recallId, exposures, canManageClinical, closable }: { recallId: string; exposures: RecallExposure[]; canManageClinical: boolean; closable: boolean }) {
  const steps: Option[] = [
    { value: 'assess', label: 'Assess applicability' }, { value: 'quarantine', label: 'Quarantine' }, { value: 'notify', label: 'Notify client' },
    ...(canManageClinical ? [{ value: 'clinical_assessment', label: 'Clinical assessment' }] : []),
    { value: 'dispose', label: 'Disposition complete' },
    ...(canManageClinical && closable ? [{ value: 'close', label: 'Close recall' }] : []),
  ];
  return (
    <WorkflowSheet
      triggerLabel="Add step"
      triggerVariant="primary"
      title="Add recall step"
      submitLabel="Save step"
      fields={[
        { name: 'action', label: 'Step', type: 'select', required: true, options: steps },
        { name: 'exposureId', label: 'Client exposure', type: 'select', options: exposures.filter((item) => item.status !== 'closed').map((item) => ({ value: item.id, label: `${item.client?.user?.name || 'Client'} · ${item.status}` })) },
        { name: 'reason', label: 'Reason', type: 'textarea', required: true, maxLength: 2000 },
        { name: 'notes', label: 'Evidence notes', type: 'textarea', maxLength: 4000 },
      ]}
      onSubmit={(values, idempotencyKey) => appendRecallStep({ recallId, exposureId: String(values.exposureId || '') || null, action: String(values.action), reason: String(values.reason), notes: String(values.notes || ''), idempotencyKey })}
    />
  );
}
