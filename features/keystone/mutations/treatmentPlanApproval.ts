import type { Context } from '.keystone/types';
import { permissions } from '../access';
import { assertActiveActor, assertPracticeRecord, bounded, evidenceHash, requireActorPractice, validIdempotencyKey } from '../workflowAuth';
import { serializableWorkflow } from './serializableWorkflow';
import { assertCurrentIntakeEvidence, loadRequiredIntakeManifest } from './clinicalExecutionReadiness';
import { evaluateProviderAuthority } from '../clinicalAuthority';

export const PLAN_APPROVAL_ACTION = 'treatment_plan.approved.v1';
export type PlanApprovalInput = {
  clientId: string; consultationId: string; providerId: string; title: string; goals: string;
  startsAt?: string | null; endsAt?: string | null; items: unknown; supersedesId?: string | null;
  expectedConsultationHash?: string | null; idempotencyKey: string;
};
export type PlanApprovalResult = { success: boolean; recordId: string | null; evidenceHash: string | null; error: string | null };

export function normalizedPlanApproval(args: PlanApprovalInput) {
  if (!validIdempotencyKey(args.idempotencyKey) || !args.title?.trim() || args.title.length > 200 || args.goals.length > 4000
    || !/^[a-f0-9]{64}$/.test(args.expectedConsultationHash || '') || !Array.isArray(args.items) || !args.items.length || args.items.length > 50) throw new Error('Treatment-plan evidence and reviewed consultation hash are required');
  const items = args.items.map((value: any) => {
    if (!value?.serviceId || !Number.isSafeInteger(value.plannedSessions) || value.plannedSessions < 1 || value.plannedSessions > 2147483647 || typeof value.intervalNotes !== 'string' || value.intervalNotes.length > 1000) throw new Error('Planned service, session count, and interval notes are invalid');
    return { serviceId: String(value.serviceId), plannedSessions: value.plannedSessions, intervalNotes: value.intervalNotes.trim() };
  });
  if (new Set(items.map(item => item.serviceId)).size !== items.length) throw new Error('Each service may appear only once in a plan');
  const date = (value?: string | null) => value ? new Date(value).toISOString() : null;
  const startsAt = date(args.startsAt), endsAt = date(args.endsAt);
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error('Plan end must follow plan start');
  return { clientId: args.clientId, consultationId: args.consultationId, providerId: args.providerId, title: args.title.trim(), goals: args.goals.trim(), startsAt, endsAt, items, supersedesId: args.supersedesId || null, expectedConsultationHash: args.expectedConsultationHash! };
}

export async function loadPlanApprovalReceipt(sudo: ReturnType<Context['sudo']>, practiceId: string, planId: string) {
  const events = await sudo.query.AuditEvent.findMany({
    where: { practice: { id: { equals: practiceId } }, action: { equals: PLAN_APPROVAL_ACTION }, resourceType: { equals: 'TreatmentPlan' }, resourceId: { equals: planId } },
    take: 2, query: 'id evidence evidenceHash actor { id }',
  });
  if (events.length !== 1) throw new Error('Plan has no unambiguous versioned approval receipt; review and supersede legacy evidence');
  const receipt = events[0].evidence as any;
  if (receipt?.version !== 1 || receipt.practiceId !== practiceId || receipt.planId !== planId || evidenceHash(receipt) !== events[0].evidenceHash || receipt.actorId !== events[0].actor?.id) throw new Error('Plan approval receipt is invalid');
  return { receipt, evidenceHash: events[0].evidenceHash };
}

export async function approveTreatmentPlanTransaction(context: Context, args: PlanApprovalInput): Promise<PlanApprovalResult> {
  try {
    const actor = requireActorPractice(context, permissions.canManageClinical);
    const input = normalizedPlanApproval(args);
    const requestHash = evidenceHash({ version: 1, practiceId: actor.practiceId, actorId: actor.actorId, input });
    return await serializableWorkflow(context, 'medspa-treatment-plan', [`client:${input.clientId}`, `idempotency:${actor.practiceId}:${args.idempotencyKey}`], async tx => {
      await assertActiveActor(tx);
      const sudo = tx.sudo();
      const client = await assertPracticeRecord(tx, 'Client', input.clientId, 'id practice { id } user { id status practice { id } }');
      const provider = await assertPracticeRecord(tx, 'Provider', input.providerId, 'id status isActive practice { id } user { id status } locations { id }');
      if (client.user?.status !== 'active' || client.user.practice?.id !== actor.practiceId || provider.user?.id !== actor.actorId || provider.user.status !== 'active' || provider.status !== 'active' || provider.isActive !== true) throw new Error('Current patient and approving provider authority are required');
      const existing = await sudo.query.TreatmentPlan.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 2, query: 'id evidenceHash client { id }' });
      if (existing.length > 1) throw new Error('Plan request identity is ambiguous');
      if (existing[0]) {
        const prior = await loadPlanApprovalReceipt(sudo, actor.practiceId, existing[0].id);
        await assertPlanStaffMembership(sudo, actor.practiceId, actor.actorId, prior.receipt.locationId);
        const replayLocation = await assertPracticeRecord(tx, "Location", prior.receipt.locationId, "id isActive practice { id }");
        if (replayLocation.isActive !== true || !provider.locations?.some((value: any) => value.id === replayLocation.id)) throw new Error("Approving location assignment is no longer active");
        if (prior.receipt.requestHash !== requestHash || prior.evidenceHash !== existing[0].evidenceHash || existing[0].client?.id !== input.clientId) throw new Error('Plan key was already used with different evidence');
        return { success: true, recordId: existing[0].id, evidenceHash: existing[0].evidenceHash, error: null };
      }
      const consultation = await assertPracticeRecord(tx, 'Consultation', input.consultationId, 'id practice { id } location { id } client { id } provider { id } service { id } appointment { id } status candidacyDecision staffDecisionRecorded signedAt evidenceHash revision contraindicationProtocolVersion contraindicationReviewHash supersededBy { id }');
      if (consultation.evidenceHash !== input.expectedConsultationHash || consultation.client?.id !== input.clientId || consultation.provider?.id !== provider.id || consultation.status !== 'completed' || consultation.candidacyDecision !== 'candidate' || consultation.staffDecisionRecorded !== true || !consultation.signedAt || consultation.supersededBy?.id || !consultation.contraindicationProtocolVersion || !consultation.contraindicationReviewHash) throw new Error('Current matching human-reviewed candidate consultation is required');
      const location = await assertPracticeRecord(tx, 'Location', consultation.location?.id || '', 'id isActive practice { id }');
      if (location.isActive !== true || !provider.locations?.some((value: any) => value.id === location.id)) throw new Error('Approving provider location assignment is unavailable');
      await assertPlanStaffMembership(sudo, actor.practiceId, actor.actorId, location.id);
      const findings = await sudo.query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: actor.practiceId } }, consultation: { id: { equals: consultation.id } }, severity: { in: ['hard_stop', 'clinician_review'] } }, take: 101, query: 'id decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt evidenceHash }' });
      if (findings.length > 100 || findings.some((finding: any) => finding.decisions?.[0]?.disposition !== 'cleared_with_rationale' || !finding.decisions[0].evidenceHash || !finding.decisions[0].expiresAt || !Number.isFinite(Date.parse(finding.decisions[0].expiresAt)) || Date.parse(finding.decisions[0].expiresAt) <= Date.now())) throw new Error('Current human contraindication decisions are required');
      const acceptedItems = [];
      for (const item of input.items) {
        if (item.serviceId !== consultation.service?.id) throw new Error('Each planned service requires its matching consultation');
        const service = await assertPracticeRecord(tx, 'Service', item.serviceId, 'id name status baseDuration price depositAmount cleanupBufferMinutes requiresConsultation requiresIntakeReview staffAuthorizationRequired requiresLotTraceability category { id } requiredResources { id } practice { id }');
        if (service.status !== 'active' || !Number.isSafeInteger(service.baseDuration) || service.baseDuration < 1 || !Number.isSafeInteger(service.price) || service.price < 0) throw new Error('Canonical service duration and price are unavailable');
        const forms = await loadRequiredIntakeManifest(sudo, actor.practiceId, service);
        if (forms.length) {
          if (!consultation.appointment?.id) throw new Error('Appointment-specific reviewed intake is required');
          await assertCurrentIntakeEvidence(sudo, { practiceId: actor.practiceId, clientUserId: client.user.id, appointmentId: consultation.appointment.id, categoryId: service.category!.id, requiredForms: forms });
        }
        const authority = service.staffAuthorizationRequired !== false ? await evaluateProviderAuthority(sudo, { providerId: provider.id, serviceId: service.id, locationId: location.id, at: new Date(), stage: 'scheduling' }) : null;
        acceptedItems.push({ ...item, serviceTitle: service.name, duration: service.baseDuration, price: service.price, requirementsHash: planServiceRequirementsHash(service), requiredIntakeForms: forms, authorityHash: authority?.evidenceHash || null });
      }
      const priorPlan = input.supersedesId ? await assertPracticeRecord(tx, 'TreatmentPlan', input.supersedesId, 'id status revision client { id } supersededBy { id } practice { id }') : null;
      if (priorPlan && (priorPlan.status !== 'active' || priorPlan.client?.id !== input.clientId || priorPlan.supersededBy?.id)) throw new Error('Treatment-plan supersession is invalid');
      const signedAt = new Date().toISOString();
      const revision = priorPlan ? Number(priorPlan.revision) + 1 : 1;
      if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Plan revision is invalid');
      const plan = await sudo.query.TreatmentPlan.createOne({ data: { practice: { connect: { id: actor.practiceId } }, client: { connect: { id: input.clientId } }, consultation: { connect: { id: consultation.id } }, createdBy: { connect: { id: provider.id } }, status: 'active', title: input.title, goals: input.goals, startsAt: input.startsAt || undefined, endsAt: input.endsAt || undefined, signedAt, revision, idempotencyKey: args.idempotencyKey, supersedes: priorPlan ? { connect: { id: priorPlan.id } } : undefined }, query: 'id' });
      const items = [];
      for (const item of acceptedItems) {
        const row = await sudo.query.TreatmentPlanItem.createOne({ data: { plan: { connect: { id: plan.id } }, service: { connect: { id: item.serviceId } }, serviceTitle: item.serviceTitle, plannedSessions: item.plannedSessions, completedSessions: 0, intervalNotes: item.intervalNotes, status: 'planned' }, query: 'id' });
        items.push({ ...item, itemId: row.id });
      }
      const receipt = { version: 1, planId: plan.id, practiceId: actor.practiceId, actorId: actor.actorId, clientId: client.id, clientUserId: client.user.id, providerId: provider.id, locationId: location.id, consultationId: consultation.id, consultationHash: consultation.evidenceHash, consultationRevision: consultation.revision, requestHash, revision, signedAt, input, items };
      const hash = evidenceHash(receipt);
      await sudo.query.TreatmentPlan.updateOne({ where: { id: plan.id }, data: { evidenceHash: hash }, query: 'id' });
      if (priorPlan) await sudo.query.TreatmentPlan.updateOne({ where: { id: priorPlan.id }, data: { status: 'cancelled' }, query: 'id' });
      await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: location.id } }, actor: { connect: { id: actor.actorId } }, action: PLAN_APPROVAL_ACTION, resourceType: 'TreatmentPlan', resourceId: plan.id, correlationId: args.idempotencyKey, evidence: bounded(receipt), evidenceHash: hash, occurredAt: signedAt }, query: 'id' });
      return { success: true, recordId: plan.id, evidenceHash: hash, error: null };
    });
  } catch (error) { return { success: false, recordId: null, evidenceHash: null, error: error instanceof Error ? error.message : 'Treatment plan failed' }; }
}

/** Missing membership is configuration, not implicit staff authority. Patient identity remains Client/User scoped. */
export async function assertPlanStaffMembership(sudo: ReturnType<Context['sudo']>, practiceId: string, userId: string, locationId: string) {
  const memberships = await sudo.query.PracticeMembership.findMany({ where: { practice: { id: { equals: practiceId } }, user: { id: { equals: userId } } }, take: 2, query: 'id status locations { id }' });
  if (memberships.length !== 1 || memberships[0].status !== 'active' || !memberships[0].locations?.some((value: any) => value.id === locationId)) throw new Error('An unambiguous active staff membership assigned to this location is required');
}

export function planServiceRequirementsHash(service: any) {
  return evidenceHash({ serviceId: service.id, duration: service.baseDuration, cleanupBufferMinutes: service.cleanupBufferMinutes || 0, requiredResourceIds: (service.requiredResources || []).map((value: any) => value.id).sort(), categoryId: service.category?.id || null, requiresConsultation: service.requiresConsultation === true, requiresIntakeReview: service.requiresIntakeReview === true, staffAuthorizationRequired: service.staffAuthorizationRequired !== false, requiresLotTraceability: service.requiresLotTraceability === true });
}
