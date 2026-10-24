'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { getRecordCapabilities } from '@/features/platform/forms/actions/capabilities';
import type { WorkflowResult } from '@/features/platform/forms/types';
import type { DeviceEventRow, IncidentDetail, IncidentRow, RecallDetail, RecallRow, SafetyOverview } from '../types';

const INCIDENT_FIELDS = `id summary severity status occurredAt closedAt actionsCount
  client { id user { name } } location { name } suspectLot { lotNumber } suspectDevice { name } reportedBy { name }`;
const RECALL_FIELDS = `id status sourceReference scopeReason openedAt closedAt exposuresCount
  lot { lotNumber product { name } } device { name } location { name }`;

type SafetyResult = { success: boolean; recordId: string | null; error: string | null };

export async function getSafetyOverview(): Promise<SafetyOverview> {
  const capabilities = await getRecordCapabilities();
  if (!capabilities) return { status: 'unavailable' };
  const access = { canManageClinical: capabilities.canManageClinical, canActAsClinician: capabilities.canManageClinical && Boolean(capabilities.providerId) };

  let records: Extract<SafetyOverview, { status: 'loaded' }>['records'] = 'restricted';
  if (capabilities.canManageSensitiveRecords) {
    const response = await keystoneClient<{ incidents: IncidentRow[]; recallCases: RecallRow[]; clients: any[]; locations: any[]; inventoryLots: any[]; resources: any[] }>(`
      query SafetyRecords {
        incidents(orderBy: { occurredAt: desc }, take: 100) { ${INCIDENT_FIELDS} }
        recallCases(orderBy: { openedAt: desc }, take: 50) { ${RECALL_FIELDS} }
        clients(orderBy: { updatedAt: desc }, take: 300) { id user { name email } }
        locations(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 50) { id name }
        inventoryLots(where: { status: { in: [available, quarantined] } }, orderBy: { expiresAt: asc }, take: 200) { id lotNumber product { name } }
        resources(where: { type: { in: [device, equipment] } }, orderBy: { name: asc }, take: 100) { id name }
      }
    `, {}, { cache: 'no-store' }).catch(() => null);
    if (!response?.success) return { status: 'unavailable' };
    const data = response.data;
    records = {
      incidents: data.incidents || [],
      recalls: data.recallCases || [],
      options: {
        clients: (data.clients || []).filter((client) => client.user?.name).map((client) => ({ value: client.id, label: client.user.email ? `${client.user.name} · ${client.user.email}` : client.user.name })),
        locations: (data.locations || []).map((location) => ({ value: location.id, label: location.name })),
        lots: (data.inventoryLots || []).map((lot) => ({ value: lot.id, label: `${lot.product?.name || 'Product'} · lot ${lot.lotNumber}` })),
        devices: (data.resources || []).map((resource) => ({ value: resource.id, label: resource.name })),
      },
    };
  }

  const events = await keystoneClient<{ deviceReadinessEvents: DeviceEventRow[] }>(`
    query DeviceReadinessEvents {
      deviceReadinessEvents(orderBy: { occurredAt: desc }, take: 50) { id action fromStatus toStatus reason occurredAt resource { name } actor { name } qualifiedReleaseBy { user { name } } }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);

  return { status: 'loaded', access, records, deviceEvents: events?.success ? events.data.deviceReadinessEvents || [] : 'restricted' };
}

export async function getIncident(id: string): Promise<{ incident: IncidentDetail; canActAsClinician: boolean } | null> {
  const capabilities = await getRecordCapabilities();
  if (!capabilities?.canManageSensitiveRecords) return null;
  const response = await keystoneClient<{ incident: IncidentDetail | null }>(`
    query IncidentDetail($id: ID!) {
      incident(where: { id: $id }) {
        ${INCIDENT_FIELDS} triageDisposition interventions appointment { id startTime }
        actions(orderBy: { occurredAt: asc }, take: 200) { id action fromStatus toStatus severity rationale occurredAt actor { name } clinician { user { name } } }
      }
    }
  `, { id }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success || !response.data.incident) return null;
  return { incident: response.data.incident, canActAsClinician: capabilities.canManageClinical && Boolean(capabilities.providerId) };
}

export async function getRecall(id: string): Promise<{ recall: RecallDetail; canManageClinical: boolean } | null> {
  const capabilities = await getRecordCapabilities();
  if (!capabilities?.canManageSensitiveRecords) return null;
  const response = await keystoneClient<{ recallCase: RecallDetail | null }>(`
    query RecallDetail($id: ID!) {
      recallCase(where: { id: $id }) {
        ${RECALL_FIELDS}
        exposures(orderBy: { identifiedAt: asc }, take: 500) { id status identifiedAt notificationDueAt client { id user { name } } administration { id completedAt service { name } } }
        actions(orderBy: { occurredAt: asc }, take: 200) { id action reason occurredAt actor { name } exposure { id } }
      }
    }
  `, { id }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success || !response.data.recallCase) return null;
  return { recall: response.data.recallCase, canManageClinical: capabilities.canManageClinical };
}

function settle(result: SafetyResult | undefined, fallback: string, paths: string[]): WorkflowResult {
  if (!result) return { success: false, error: fallback };
  if (result.success) for (const path of paths) revalidatePath(path);
  return result;
}

export async function reportIncidentFromPlatform(input: { clientId: string; locationId: string; occurredAt: string; severity: string; summary: string; symptoms: string; immediateActions: string; suspectLotId?: string | null; suspectDeviceId?: string | null; idempotencyKey: string }): Promise<WorkflowResult> {
  const response = await keystoneClient<{ reportIncident: SafetyResult }>(`
    mutation ReportIncident($clientId: ID!, $locationId: ID!, $occurredAt: String!, $severity: String!, $summary: String!, $symptoms: JSON!, $immediateActions: JSON!, $suspectLotId: ID, $suspectDeviceId: ID, $idempotencyKey: String!) {
      reportIncident(clientId: $clientId, locationId: $locationId, occurredAt: $occurredAt, severity: $severity, summary: $summary, symptoms: $symptoms, immediateActions: $immediateActions, suspectLotId: $suspectLotId, suspectDeviceId: $suspectDeviceId, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { ...input, symptoms: { notes: input.symptoms.trim() }, immediateActions: { notes: input.immediateActions.trim() }, suspectLotId: input.suspectLotId || null, suspectDeviceId: input.suspectDeviceId || null });
  return settle(response.success ? response.data.reportIncident : undefined, 'Incident not reported.', ['/dashboard/platform/safety']);
}

const CLINICAL_INCIDENT_ACTIONS = new Set(['triage', 'clinical_review', 'intervention', 'referral', 'emergency_transfer', 'clinical_resolve', 'close']);

export async function appendIncidentStep(input: { incidentId: string; action: string; severity?: string | null; rationale: string; notes: string; idempotencyKey: string }): Promise<WorkflowResult> {
  const capabilities = await getRecordCapabilities();
  // Clinical steps are attributed to the signed-in clinician's own provider profile.
  const clinicianId = CLINICAL_INCIDENT_ACTIONS.has(input.action) ? capabilities?.providerId || null : null;
  const response = await keystoneClient<{ appendIncidentAction: SafetyResult }>(`
    mutation AppendIncidentStep($incidentId: ID!, $clinicianId: ID, $action: String!, $toStatus: String!, $severity: String, $rationale: String!, $evidence: JSON!, $idempotencyKey: String!) {
      appendIncidentAction(incidentId: $incidentId, clinicianId: $clinicianId, action: $action, toStatus: $toStatus, severity: $severity, rationale: $rationale, evidence: $evidence, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { incidentId: input.incidentId, clinicianId, action: input.action, toStatus: input.action === 'close' ? 'closed' : 'under_review', severity: input.severity || null, rationale: input.rationale, evidence: { notes: input.notes.trim() }, idempotencyKey: input.idempotencyKey });
  return settle(response.success ? response.data.appendIncidentAction : undefined, 'Step not saved.', ['/dashboard/platform/safety', `/dashboard/platform/safety/incidents/${input.incidentId}`]);
}

export async function openRecallFromPlatform(input: { locationId: string; lotId?: string | null; deviceId?: string | null; sourceReference: string; scopeReason: string; idempotencyKey: string }): Promise<WorkflowResult> {
  if (Boolean(input.lotId) === Boolean(input.deviceId)) return { success: false, error: 'Choose either a lot or a device.' };
  const response = await keystoneClient<{ openRecallCase: SafetyResult }>(`
    mutation OpenRecall($locationId: ID!, $lotId: ID, $deviceId: ID, $sourceReference: String!, $scopeReason: String!, $idempotencyKey: String!) {
      openRecallCase(locationId: $locationId, lotId: $lotId, deviceId: $deviceId, sourceReference: $sourceReference, scopeReason: $scopeReason, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { ...input, lotId: input.lotId || null, deviceId: input.deviceId || null });
  return settle(response.success ? response.data.openRecallCase : undefined, 'Recall not opened.', ['/dashboard/platform/safety']);
}

export async function appendRecallStep(input: { recallId: string; exposureId?: string | null; action: string; reason: string; notes: string; idempotencyKey: string }): Promise<WorkflowResult> {
  const response = await keystoneClient<{ appendRecallAction: SafetyResult }>(`
    mutation AppendRecallStep($recallId: ID!, $exposureId: ID, $action: String!, $reason: String!, $evidence: JSON!, $idempotencyKey: String!) {
      appendRecallAction(recallId: $recallId, exposureId: $exposureId, action: $action, reason: $reason, evidence: $evidence, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { recallId: input.recallId, exposureId: input.exposureId || null, action: input.action, reason: input.reason, evidence: { notes: input.notes.trim() }, idempotencyKey: input.idempotencyKey });
  return settle(response.success ? response.data.appendRecallAction : undefined, 'Step not saved.', ['/dashboard/platform/safety', `/dashboard/platform/safety/recalls/${input.recallId}`]);
}
