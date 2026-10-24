'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { TreatmentStepName, TreatmentStepResult, TreatmentWorkspace, TreatmentWorkspaceRead } from '../types';

const WORKSPACE_QUERY = `
  query TreatmentWorkspace($id: ID!) {
    authenticatedItem { ... on User { id role { canManageClinical } providerProfile { id } } }
    appointment(where: { id: $id }) {
      id status startTime duration
      location { id name timezone }
      client { id user { name } }
      provider { id user { name } }
      lineItems { service { id name requiresConsultation requiresLotTraceability clinicalProducts { id } } }
      consents(orderBy: { createdAt: desc }, take: 50) { id status signerName signedAt effectiveUntil service { id } }
      treatmentSessions(orderBy: { createdAt: desc }, take: 50) {
        id status serviceTitle durationMinutes startedAt completedAt administrationsCount
        service { id } order { id } consent { id } room { id } device { id } supervisor { id } provider { id }
      }
      administrations(orderBy: { createdAt: desc }, take: 50) { id status completedAt immediateOutcome lotsCount treatmentSession { id } }
    }
  }
`;

const CLIENT_QUERY = `
  query TreatmentClientRecords($clientId: ID!, $appointmentId: ID!, $serviceIds: [ID!]!, $productIds: [ID!]!, $locationId: ID!) {
    consultations(where: { client: { id: { equals: $clientId } } }, orderBy: { createdAt: desc }, take: 20) {
      id status candidacyDecision summary signedAt service { id } supersededBy { id }
      findings(orderBy: { detectedAt: desc }, take: 50) {
        id ruleCode ruleVersion severity detectedAt
        decisions(orderBy: { decidedAt: desc }, take: 1) { disposition rationale decidedAt expiresAt }
      }
    }
    clinicalOrders(where: { client: { id: { equals: $clientId } } }, orderBy: { createdAt: desc }, take: 30) {
      id status indication validUntil signedAt service { id } plan { id }
    }
    treatmentPlans(where: { client: { id: { equals: $clientId } } }, orderBy: { createdAt: desc }, take: 20) {
      id title status items { status service { id } }
    }
    consentTemplateVersions(where: { service: { id: { in: $serviceIds } } }, orderBy: { effectiveFrom: desc }, take: 50) {
      id version language jurisdiction effectiveFrom effectiveUntil service { id }
    }
    inventoryLots(where: { product: { id: { in: $productIds } }, location: { id: { equals: $locationId } } }, orderBy: { expiresAt: asc }, take: 100) {
      id lotNumber remainingQuantity expiresAt status product { id name }
    }
    resources(where: { location: { id: { equals: $locationId } } }, orderBy: { name: asc }, take: 100) {
      id name type isActive readinessStatus
    }
    providers(orderBy: { createdAt: asc }, take: 100) { id status isActive user { id name } }
    clientNotes(where: { appointment: { id: { equals: $appointmentId } } }, orderBy: { createdAt: desc }, take: 50) { id type content signedAt }
    followUpTasks(where: { appointment: { id: { equals: $appointmentId } } }, orderBy: { dueAt: asc }, take: 50) { id title status dueAt }
  }
`;

const str = (value: unknown) => (typeof value === 'string' ? value : null);

export async function getTreatmentWorkspace(appointmentId: string): Promise<TreatmentWorkspaceRead> {
  const head = await keystoneClient<any>(WORKSPACE_QUERY, { id: appointmentId }, { cache: 'no-store' }).catch(() => null);
  if (!head?.success) return { status: 'unavailable' };
  const actor = head.data.authenticatedItem;
  if (actor?.role?.canManageClinical !== true) return { status: 'restricted' };
  const appointment = head.data.appointment;
  if (!appointment?.client?.id || !appointment.location?.id) return { status: 'unavailable' };

  const servicesById = new Map<string, TreatmentWorkspace['services'][number]>();
  for (const line of appointment.lineItems || []) {
    const service = line.service;
    if (!service?.id || servicesById.has(service.id)) continue;
    servicesById.set(service.id, {
      id: service.id,
      name: service.name || 'Treatment',
      requiresConsultation: service.requiresConsultation === true,
      requiresLotTraceability: service.requiresLotTraceability === true,
      clinicalProductIds: (service.clinicalProducts || []).map((product: any) => product.id),
    });
  }
  const services = [...servicesById.values()];
  const productIds = [...new Set(services.flatMap((service) => service.clinicalProductIds))];

  const records = await keystoneClient<any>(CLIENT_QUERY, {
    clientId: appointment.client.id,
    appointmentId,
    serviceIds: services.map((service) => service.id),
    productIds,
    locationId: appointment.location.id,
  }, { cache: 'no-store' }).catch(() => null);
  if (!records?.success) return { status: 'unavailable' };
  const r = records.data;
  const now = Date.now();
  const resources = (r.resources || []).filter((item: any) => item.isActive === true);

  const data: TreatmentWorkspace = {
    appointment: {
      id: appointment.id,
      status: appointment.status || 'pending',
      startTime: str(appointment.startTime),
      duration: appointment.duration ?? null,
      timezone: appointment.location.timezone || 'UTC',
      locationId: appointment.location.id,
      locationName: appointment.location.name || null,
      clientId: appointment.client.id,
      clientName: appointment.client.user?.name || 'Client',
      providerId: appointment.provider?.id || null,
      providerName: appointment.provider?.user?.name || null,
    },
    actorProviderId: actor.providerProfile?.id || null,
    services,
    consultations: (r.consultations || []).map((item: any) => ({
      id: item.id,
      status: item.status || 'requested',
      candidacyDecision: item.candidacyDecision || null,
      summary: item.summary || null,
      signedAt: str(item.signedAt),
      serviceId: item.service?.id || null,
      superseded: Boolean(item.supersededBy?.id),
      findings: (item.findings || []).map((finding: any) => ({
        id: finding.id,
        ruleCode: finding.ruleCode || '',
        ruleVersion: finding.ruleVersion || '',
        severity: finding.severity || 'information',
        detectedAt: str(finding.detectedAt),
        decision: finding.decisions?.[0] ? {
          disposition: finding.decisions[0].disposition,
          rationale: finding.decisions[0].rationale || null,
          decidedAt: str(finding.decisions[0].decidedAt),
          expiresAt: str(finding.decisions[0].expiresAt),
        } : null,
      })),
    })),
    plans: (r.treatmentPlans || []).map((item: any) => ({
      id: item.id,
      title: item.title || 'Treatment plan',
      status: item.status || 'draft',
      plannedServiceIds: (item.items || []).filter((plan: any) => plan.status === 'planned').map((plan: any) => plan.service?.id).filter(Boolean),
    })),
    orders: (r.clinicalOrders || []).map((item: any) => ({
      id: item.id,
      status: item.status || 'active',
      serviceId: item.service?.id || null,
      planId: item.plan?.id || null,
      indication: item.indication || null,
      validUntil: str(item.validUntil),
      signedAt: str(item.signedAt),
    })),
    templates: (r.consentTemplateVersions || []).map((item: any) => ({
      id: item.id,
      serviceId: item.service?.id || null,
      version: item.version || '',
      language: item.language || '',
      jurisdiction: item.jurisdiction || '',
      effectiveFrom: str(item.effectiveFrom),
      effectiveUntil: str(item.effectiveUntil),
    })).filter((item: any) => (!item.effectiveFrom || new Date(item.effectiveFrom).getTime() <= now) && (!item.effectiveUntil || new Date(item.effectiveUntil).getTime() > now)),
    consents: (appointment.consents || []).map((item: any) => ({
      id: item.id,
      status: item.status || 'effective',
      serviceId: item.service?.id || null,
      signerName: item.signerName || null,
      signedAt: str(item.signedAt),
      effectiveUntil: str(item.effectiveUntil),
    })),
    sessions: (appointment.treatmentSessions || []).map((item: any) => ({
      id: item.id,
      status: item.status || 'planned',
      serviceId: item.service?.id || null,
      serviceTitle: item.serviceTitle || null,
      durationMinutes: item.durationMinutes ?? null,
      orderId: item.order?.id || null,
      consentId: item.consent?.id || null,
      roomId: item.room?.id || null,
      deviceId: item.device?.id || null,
      supervisorId: item.supervisor?.id || null,
      providerId: item.provider?.id || null,
      startedAt: str(item.startedAt),
      completedAt: str(item.completedAt),
      administrationCount: item.administrationsCount || 0,
    })),
    administrations: (appointment.administrations || []).map((item: any) => ({
      id: item.id,
      status: item.status || 'completed',
      sessionId: item.treatmentSession?.id || null,
      completedAt: str(item.completedAt),
      immediateOutcome: item.immediateOutcome || null,
      lotCount: item.lotsCount || 0,
    })),
    lots: (r.inventoryLots || [])
      .filter((lot: any) => lot.status === 'available' && lot.remainingQuantity > 0 && (!lot.expiresAt || new Date(lot.expiresAt).getTime() > now))
      .map((lot: any) => ({ id: lot.id, lotNumber: lot.lotNumber || '', productId: lot.product?.id || null, productName: lot.product?.name || 'Product', remainingQuantity: lot.remainingQuantity || 0, expiresAt: str(lot.expiresAt) })),
    rooms: resources.filter((item: any) => item.type === 'room').map((item: any) => ({ id: item.id, name: item.name, type: item.type, readinessStatus: item.readinessStatus || null })),
    devices: resources.filter((item: any) => item.type !== 'room').map((item: any) => ({ id: item.id, name: item.name, type: item.type, readinessStatus: item.readinessStatus || null })),
    providers: (r.providers || []).filter((item: any) => item.status === 'active' && item.isActive === true).map((item: any) => ({ id: item.id, name: item.user?.name || 'Provider' })),
    staffUsers: (r.providers || []).filter((item: any) => item.user?.id).map((item: any) => ({ id: item.user.id, name: item.user.name || 'Staff' })),
    notes: (r.clientNotes || []).map((item: any) => ({ id: item.id, type: item.type || null, content: item.content || null, signedAt: str(item.signedAt) })),
    followUps: (r.followUpTasks || []).map((item: any) => ({ id: item.id, title: item.title || 'Follow-up', status: item.status || 'open', dueAt: str(item.dueAt) })),
  };
  return { status: 'loaded', data };
}

/* Fixed documents only: the client chooses a step, never a mutation string. */
const STEP_DOCUMENTS: Record<TreatmentStepName, { field: string; document: string }> = {
  consultation: { field: 'recordConsultation', document: `mutation($clientId: ID!, $appointmentId: ID, $providerId: ID!, $locationId: ID!, $serviceId: ID!, $status: String!, $history: JSON!, $examination: JSON!, $goals: JSON!, $alternatives: JSON!, $contraindicationReview: JSON!, $summary: String!, $indication: String!, $candidacyDecision: String!, $protocolVersion: String!, $supersedesId: ID, $idempotencyKey: String!) {
    recordConsultation(clientId: $clientId, appointmentId: $appointmentId, providerId: $providerId, locationId: $locationId, serviceId: $serviceId, status: $status, history: $history, examination: $examination, goals: $goals, alternatives: $alternatives, contraindicationReview: $contraindicationReview, summary: $summary, indication: $indication, candidacyDecision: $candidacyDecision, protocolVersion: $protocolVersion, supersedesId: $supersedesId, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  finding: { field: 'recordContraindicationFinding', document: `mutation($consultationId: ID!, $clientId: ID!, $serviceId: ID!, $ruleCode: String!, $ruleVersion: String!, $severity: String!, $sourceEvidence: JSON!, $idempotencyKey: String!) {
    recordContraindicationFinding(consultationId: $consultationId, clientId: $clientId, serviceId: $serviceId, ruleCode: $ruleCode, ruleVersion: $ruleVersion, severity: $severity, sourceEvidence: $sourceEvidence, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  decision: { field: 'decideContraindication', document: `mutation($findingId: ID!, $providerId: ID!, $disposition: String!, $rationale: String!, $expiresAt: String, $idempotencyKey: String!) {
    decideContraindication(findingId: $findingId, providerId: $providerId, disposition: $disposition, rationale: $rationale, expiresAt: $expiresAt, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  order: { field: 'issueClinicalOrder', document: `mutation($consultationId: ID!, $planId: ID, $clientId: ID!, $locationId: ID!, $serviceId: ID!, $orderedById: ID!, $authorizedPerformerId: ID, $supervisorId: ID, $indication: String!, $protocolVersion: String!, $instruction: JSON!, $anatomicSite: String, $doseRange: String, $performerConstraints: String, $validUntil: String!, $supersedesId: ID, $idempotencyKey: String!) {
    issueClinicalOrder(consultationId: $consultationId, planId: $planId, clientId: $clientId, locationId: $locationId, serviceId: $serviceId, orderedById: $orderedById, authorizedPerformerId: $authorizedPerformerId, supervisorId: $supervisorId, indication: $indication, protocolVersion: $protocolVersion, instruction: $instruction, anatomicSite: $anatomicSite, doseRange: $doseRange, performerConstraints: $performerConstraints, validUntil: $validUntil, supersedesId: $supersedesId, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  orderAction: { field: 'transitionClinicalOrder', document: `mutation($orderId: ID!, $providerId: ID!, $action: String!, $reason: String!, $evidence: JSON!, $idempotencyKey: String!) {
    transitionClinicalOrder(orderId: $orderId, providerId: $providerId, action: $action, reason: $reason, evidence: $evidence, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  consent: { field: 'signTreatmentConsent', document: `mutation($clientId: ID!, $appointmentId: ID!, $serviceId: ID!, $templateVersionId: ID!, $presentedById: ID!, $signerName: String!, $signerRole: String!, $representativeAuthority: String, $interpreter: String, $witness: String, $discussionEvidence: JSON!, $signatureEvidence: String!, $effectiveUntil: String, $supersedesId: ID, $idempotencyKey: String!) {
    signTreatmentConsent(clientId: $clientId, appointmentId: $appointmentId, serviceId: $serviceId, templateVersionId: $templateVersionId, presentedById: $presentedById, signerName: $signerName, signerRole: $signerRole, representativeAuthority: $representativeAuthority, interpreter: $interpreter, witness: $witness, discussionEvidence: $discussionEvidence, signatureEvidence: $signatureEvidence, effectiveUntil: $effectiveUntil, supersedesId: $supersedesId, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  withdrawConsent: { field: 'withdrawTreatmentConsent', document: `mutation($consentId: ID!, $reason: String!, $idempotencyKey: String!) {
    withdrawTreatmentConsent(consentId: $consentId, reason: $reason, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  prepareSession: { field: 'prepareTreatmentSession', document: `mutation($planId: ID!, $appointmentId: ID!, $orderId: ID!, $consentId: ID!, $providerId: ID!, $supervisorId: ID, $serviceId: ID!, $roomId: ID!, $deviceId: ID, $durationMinutes: Int!, $idempotencyKey: String!) {
    prepareTreatmentSession(planId: $planId, appointmentId: $appointmentId, orderId: $orderId, consentId: $consentId, providerId: $providerId, supervisorId: $supervisorId, serviceId: $serviceId, roomId: $roomId, deviceId: $deviceId, durationMinutes: $durationMinutes, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  startSession: { field: 'startTreatmentSession', document: `mutation($treatmentSessionId: ID!, $protocolVersion: String!, $timeOutEvidence: JSON!, $idempotencyKey: String!) {
    startTreatmentSession(treatmentSessionId: $treatmentSessionId, protocolVersion: $protocolVersion, timeOutEvidence: $timeOutEvidence, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  administration: { field: 'recordTreatmentAdministration', document: `mutation($treatmentSessionId: ID!, $orderId: ID!, $consentId: ID!, $performerId: ID!, $supervisorId: ID, $roomId: ID!, $deviceId: ID, $protocolVersion: String!, $timeOutEvidence: JSON!, $anatomicMap: JSON!, $deviceSettings: JSON, $technique: String, $immediateOutcome: String!, $aftercare: JSON!, $startedAt: String!, $completedAt: String!, $lots: JSON!, $status: String!, $idempotencyKey: String!) {
    recordTreatmentAdministration(treatmentSessionId: $treatmentSessionId, orderId: $orderId, consentId: $consentId, performerId: $performerId, supervisorId: $supervisorId, roomId: $roomId, deviceId: $deviceId, protocolVersion: $protocolVersion, timeOutEvidence: $timeOutEvidence, anatomicMap: $anatomicMap, deviceSettings: $deviceSettings, technique: $technique, immediateOutcome: $immediateOutcome, aftercare: $aftercare, startedAt: $startedAt, completedAt: $completedAt, lots: $lots, status: $status, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  note: { field: 'appendSignedClinicalNote', document: `mutation($clientId: ID!, $appointmentId: ID, $providerId: ID!, $type: String!, $content: String!, $supersedesId: ID, $reason: String, $idempotencyKey: String!) {
    appendSignedClinicalNote(clientId: $clientId, appointmentId: $appointmentId, providerId: $providerId, type: $type, content: $content, supersedesId: $supersedesId, reason: $reason, idempotencyKey: $idempotencyKey) { success recordId error } }` },
  followUp: { field: 'scheduleFollowUp', document: `mutation($treatmentSessionId: ID!, $assignedToId: ID!, $dueAt: String!, $title: String!, $instructions: String!, $idempotencyKey: String!) {
    scheduleFollowUp(treatmentSessionId: $treatmentSessionId, assignedToId: $assignedToId, dueAt: $dueAt, title: $title, instructions: $instructions, idempotencyKey: $idempotencyKey) { success recordId error } }` },
};

export async function submitTreatmentStep(step: TreatmentStepName, appointmentId: string, input: Record<string, unknown>): Promise<TreatmentStepResult> {
  const entry = STEP_DOCUMENTS[step];
  if (!entry) return { success: false, error: 'Unknown step' };
  const response = await keystoneClient<Record<string, TreatmentStepResult>>(entry.document, input).catch(() => null);
  if (!response?.success) return { success: false, error: 'Not confirmed. Reload before retrying.' };
  const result = response.data[entry.field];
  if (result?.success) revalidatePath(`/dashboard/platform/appointments/${appointmentId}/treatment`);
  return result || { success: false, error: 'Not confirmed. Reload before retrying.' };
}
