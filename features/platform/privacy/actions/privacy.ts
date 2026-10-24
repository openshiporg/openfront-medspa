'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { getRecordCapabilities } from '@/features/platform/forms/actions/capabilities';
import type { WorkflowResult } from '@/features/platform/forms/types';
import type { BreakGlassRow, LegalHoldRow, PrivacyOverview, RetentionPolicyRow, RightsRequestDetail, RightsRequestRow } from '../types';

const REQUEST_FIELDS = `id type status requestedAt dueAt completedAt legalBasis actionEntriesCount
  client { id user { name } } requestedBy { name } assignedTo { name }`;

type GovernanceResult = { success: boolean; recordId: string | null; error: string | null };

export async function getPrivacyOverview(): Promise<PrivacyOverview> {
  const capabilities = await getRecordCapabilities();
  if (!capabilities) return { status: 'unavailable' };
  if (!capabilities.canManageSensitiveRecords) return { status: 'restricted' };
  const response = await keystoneClient<{ patientRightsRequests: RightsRequestRow[]; legalHolds: LegalHoldRow[]; retentionPolicies: RetentionPolicyRow[]; breakGlassEvents: BreakGlassRow[]; clients: any[]; incidents: any[] }>(`
    query PrivacyOverview {
      patientRightsRequests(orderBy: { requestedAt: desc }, take: 100) { ${REQUEST_FIELDS} }
      legalHolds(orderBy: { placedAt: desc }, take: 100) {
        id status reason authorityReference placedAt releasedAt releaseReason
        client { user { name } } incident { summary } asset { category originalFilename } placedBy { name } releasedBy { name }
      }
      retentionPolicies(orderBy: { effectiveFrom: desc }, take: 100) { id jurisdiction recordClass version retainMonths minorsRule dispositionRule sourceCitations effectiveFrom effectiveUntil approvedBy { name } }
      breakGlassEvents(orderBy: { openedAt: desc }, take: 50) { id status emergencyReason openedAt expiresAt reviewedAt client { user { name } } actor { name } reviewer { name } }
      clients(orderBy: { updatedAt: desc }, take: 300) { id user { name email } }
      incidents(where: { status: { not: { equals: closed } } }, orderBy: { occurredAt: desc }, take: 100) { id summary }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const data = response.data;
  return {
    status: 'loaded',
    canApprove: capabilities.canManagePractice,
    requests: data.patientRightsRequests || [],
    holds: data.legalHolds || [],
    policies: data.retentionPolicies || [],
    breakGlass: data.breakGlassEvents || [],
    clients: (data.clients || []).filter((client) => client.user?.name).map((client) => ({ value: client.id, label: client.user.email ? `${client.user.name} · ${client.user.email}` : client.user.name })),
    incidents: (data.incidents || []).map((incident) => ({ value: incident.id, label: incident.summary })),
  };
}

export async function getRightsRequest(id: string): Promise<RightsRequestDetail | null> {
  const capabilities = await getRecordCapabilities();
  if (!capabilities?.canManageSensitiveRecords) return null;
  const response = await keystoneClient<{ patientRightsRequest: RightsRequestDetail | null }>(`
    query RightsRequestDetail($id: ID!) {
      patientRightsRequest(where: { id: $id }) {
        ${REQUEST_FIELDS} scope
        actionEntries(orderBy: { occurredAt: asc }, take: 200) { id action reason occurredAt actor { name } }
      }
    }
  `, { id }, { cache: 'no-store' }).catch(() => null);
  return response?.success ? response.data.patientRightsRequest : null;
}

function settle(result: GovernanceResult | undefined, fallback: string, paths: string[]): WorkflowResult {
  if (!result) return { success: false, error: fallback };
  if (result.success) for (const path of paths) revalidatePath(path);
  return result;
}

export async function createRightsRequest(input: { clientId: string; type: string; details: string; idempotencyKey: string }): Promise<WorkflowResult> {
  const response = await keystoneClient<{ requestPatientRights: GovernanceResult }>(`
    mutation CreateRightsRequest($clientId: ID!, $type: String!, $scope: JSON!, $idempotencyKey: String!) {
      requestPatientRights(clientId: $clientId, type: $type, scope: $scope, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { clientId: input.clientId, type: input.type, scope: { details: input.details.trim() }, idempotencyKey: input.idempotencyKey });
  return settle(response.success ? response.data.requestPatientRights : undefined, 'Request not recorded.', ['/dashboard/platform/privacy']);
}

export async function appendRightsStep(input: { requestId: string; action: string; reason: string; notes: string; legalBasis?: string | null; idempotencyKey: string }): Promise<WorkflowResult> {
  const response = await keystoneClient<{ appendPatientRightsAction: GovernanceResult }>(`
    mutation AppendRightsStep($requestId: ID!, $action: String!, $reason: String!, $evidence: JSON!, $legalBasis: String, $idempotencyKey: String!) {
      appendPatientRightsAction(requestId: $requestId, action: $action, reason: $reason, evidence: $evidence, legalBasis: $legalBasis, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { requestId: input.requestId, action: input.action, reason: input.reason, evidence: { notes: input.notes.trim() }, legalBasis: input.legalBasis || null, idempotencyKey: input.idempotencyKey });
  return settle(response.success ? response.data.appendPatientRightsAction : undefined, 'Step not saved.', ['/dashboard/platform/privacy', `/dashboard/platform/privacy/requests/${input.requestId}`]);
}

export async function placeHold(input: { clientId?: string | null; incidentId?: string | null; reason: string; authorityReference: string; idempotencyKey: string }): Promise<WorkflowResult> {
  if (!input.clientId && !input.incidentId) return { success: false, error: 'Choose a client or an incident.' };
  const response = await keystoneClient<{ placeLegalHold: GovernanceResult }>(`
    mutation PlaceHold($clientId: ID, $incidentId: ID, $reason: String!, $authorityReference: String!, $idempotencyKey: String!) {
      placeLegalHold(clientId: $clientId, incidentId: $incidentId, reason: $reason, authorityReference: $authorityReference, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { ...input, clientId: input.clientId || null, incidentId: input.incidentId || null });
  return settle(response.success ? response.data.placeLegalHold : undefined, 'Hold not placed.', ['/dashboard/platform/privacy']);
}

export async function releaseHold(input: { legalHoldId: string; reason: string; authorityReference: string; idempotencyKey: string }): Promise<WorkflowResult> {
  const response = await keystoneClient<{ releaseLegalHold: GovernanceResult }>(`
    mutation ReleaseHold($legalHoldId: ID!, $reason: String!, $authorityReference: String!, $idempotencyKey: String!) {
      releaseLegalHold(legalHoldId: $legalHoldId, reason: $reason, authorityReference: $authorityReference, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, input);
  return settle(response.success ? response.data.releaseLegalHold : undefined, 'Hold not released.', ['/dashboard/platform/privacy']);
}

export async function publishRetention(input: { jurisdiction: string; recordClass: string; version: string; retainMonths: number; minorsRule?: string | null; dispositionRule: string; sourceCitations: string; effectiveFrom: string; effectiveUntil?: string | null; idempotencyKey: string }): Promise<WorkflowResult> {
  if (!Number.isInteger(input.retainMonths) || input.retainMonths < 1) return { success: false, error: 'Retention must be at least 1 month.' };
  const response = await keystoneClient<{ publishRetentionPolicy: GovernanceResult }>(`
    mutation PublishRetention($jurisdiction: String!, $recordClass: String!, $version: String!, $retainMonths: Int!, $minorsRule: String, $dispositionRule: String!, $sourceCitations: String!, $effectiveFrom: String!, $effectiveUntil: String, $idempotencyKey: String!) {
      publishRetentionPolicy(jurisdiction: $jurisdiction, recordClass: $recordClass, version: $version, retainMonths: $retainMonths, minorsRule: $minorsRule, dispositionRule: $dispositionRule, sourceCitations: $sourceCitations, effectiveFrom: $effectiveFrom, effectiveUntil: $effectiveUntil, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, { ...input, minorsRule: input.minorsRule || null, effectiveUntil: input.effectiveUntil || null });
  return settle(response.success ? response.data.publishRetentionPolicy : undefined, 'Policy not published.', ['/dashboard/platform/privacy']);
}
