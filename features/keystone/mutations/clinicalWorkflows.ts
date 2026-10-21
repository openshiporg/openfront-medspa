import { graphql } from "@keystone-6/core";
import type { ConsentRecordSignerRoleType, ConsultationCandidacyDecisionType, ConsultationStatusType, Context, ContraindicationDecisionDispositionType, ContraindicationFindingSeverityType } from ".keystone/types";
import { permissions } from "../access";
import { evaluateProviderAuthority, recordAuthorityDecision } from "../clinicalAuthority";
import { assertPracticeRecord, assertProviderActor, bounded, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";
import { assertCurrentClinicalExecutionReadiness, assertCurrentClinicalStartReadiness, assertCurrentIntakeEvidence, assertResourceIntervalReady, loadRequiredIntakeManifest, reservationCovers, supervisorReservationCovers } from "./clinicalExecutionReadiness";
import { recordInventoryMovement } from "./inventoryWorkflows";
import { assertApprovedPlanClinicalAppointment } from "./planBookingEvidence";
import { assertPlanStaffMembership } from './treatmentPlanApproval';
import { lockBookingCapacity } from './bookAppointment';

type Result = { success: boolean; recordId: string | null; evidenceHash: string | null; error: string | null };
const denied = { success: false, recordId: null, evidenceHash: null };
const now = () => new Date().toISOString();
function fail(error: unknown, fallback: string): Result { return { ...denied, error: error instanceof Error ? error.message : fallback }; }

export async function recordConsultationTransaction(context: Context, args: {
  clientId: string; appointmentId?: string | null; providerId: string; locationId: string; serviceId: string; status: ConsultationStatusType;
  history: unknown; examination: unknown; goals: unknown; alternatives: unknown; contraindicationReview: unknown; summary: string; indication: string; candidacyDecision: ConsultationCandidacyDecisionType;
  protocolVersion: string; supersedesId?: string | null; idempotencyKey: string;
}): Promise<Result> {
  let actor;
  try { actor = requireActorPractice(context, permissions.canManageClinical, "Clinical authority is required"); } catch (error) { return fail(error, "Clinical authority is required"); }
  if (!validIdempotencyKey(args.idempotencyKey) || !new Set(["completed","needs_follow_up","closed"]).has(args.status)
    || !new Set(["candidate","deferred","declined","referred"]).has(args.candidacyDecision) || !args.summary.trim() || !args.protocolVersion.trim() || !args.contraindicationReview || typeof args.contraindicationReview !== "object") return { ...denied, error: "Consultation evidence is invalid" };
  try {
    bounded(args.history); bounded(args.examination); bounded(args.goals); bounded(args.alternatives); bounded(args.contraindicationReview);
    const [_client, _provider, _location, _service, appointment] = await Promise.all([
      assertPracticeRecord(context, "Client", args.clientId), assertProviderActor(context, args.providerId, actor.actorId),
      assertPracticeRecord(context, "Location", args.locationId), assertPracticeRecord(context, "Service", args.serviceId),
      args.appointmentId ? assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id } location { id } lineItems { service { id } }") : Promise.resolve(null),
      args.supersedesId ? assertPracticeRecord(context, "Consultation", args.supersedesId) : Promise.resolve(null),
    ]);
    if (appointment && (appointment.client?.id !== args.clientId || appointment.location?.id !== args.locationId || !appointment.lineItems?.some((line: any) => line.service?.id === args.serviceId))) throw new Error("Consultation appointment does not match client, location, and service");
    return await serializableWorkflow(context, "medspa-consultation", [`client:${args.clientId}`, `idempotency:${args.idempotencyKey}`], async tx => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.Consultation.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      if (args.supersedesId) {
        const prior = await sudo.query.Consultation.findOne({ where: { id: args.supersedesId }, query: "id client { id } supersededBy { id }" });
        if (!prior || prior.client?.id !== args.clientId || prior.supersededBy?.id) throw new Error("Consultation supersession is invalid");
      }
      const signedAt = now();
      const evidence = { ...args, actorId: actor.actorId, practiceId: actor.practiceId, signedAt };
      const hash = evidenceHash(evidence);
      const record = await sudo.query.Consultation.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, location: { connect: { id: args.locationId } }, client: { connect: { id: args.clientId } },
        appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : undefined, provider: { connect: { id: args.providerId } }, service: { connect: { id: args.serviceId } },
        status: args.status, historySnapshot: bounded(args.history), examinationSnapshot: bounded(args.examination), goalsSnapshot: bounded(args.goals), alternativesSnapshot: bounded(args.alternatives),
        summary: args.summary.trim(), indication: args.indication.trim(), candidacyDecision: args.candidacyDecision, staffDecisionRecorded: true, reviewedAt: signedAt, signedAt,
        protocolVersion: args.protocolVersion.trim(), contraindicationProtocolVersion: args.protocolVersion.trim(), contraindicationReviewHash: evidenceHash(args.contraindicationReview), evidenceHash: hash, idempotencyKey: args.idempotencyKey,
        supersedes: args.supersedesId ? { connect: { id: args.supersedesId } } : undefined,
      }, query: "id evidenceHash" });
      return { success: true, recordId: record.id, evidenceHash: record.evidenceHash, error: null };
    });
  } catch (error) { return fail(error, "Consultation recording failed"); }
}

export async function recordContraindicationFindingTransaction(context: Context, args: {
  consultationId: string; clientId: string; serviceId: string; ruleCode: string; ruleVersion: string; severity: ContraindicationFindingSeverityType; sourceEvidence: unknown; idempotencyKey: string;
}): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageClinical); } catch (error) { return fail(error, "Clinical authority is required"); }
  if (!validIdempotencyKey(args.idempotencyKey) || !new Set(["information","precaution","clinician_review","hard_stop"]).has(args.severity) || !args.ruleCode.trim() || !args.ruleVersion.trim()) return { ...denied, error: "Contraindication evidence is invalid" };
  try {
    await Promise.all([assertPracticeRecord(context, "Consultation", args.consultationId), assertPracticeRecord(context, "Client", args.clientId), assertPracticeRecord(context, "Service", args.serviceId)]);
    return await serializableWorkflow(context, "medspa-contraindication", [`consultation:${args.consultationId}`, `idempotency:${args.idempotencyKey}`], async tx => {
      const consultation = await assertPracticeRecord(tx, "Consultation", args.consultationId, "id practice { id } client { id } service { id }");
      if (consultation.client?.id !== args.clientId || consultation.service?.id !== args.serviceId) throw new Error("Contraindication finding must match the consultation patient and service");
      const sudo = tx.sudo(); const existing = (await sudo.query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id sourceEvidenceHash" }))[0];
      if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.sourceEvidenceHash, error: null };
      const sourceHash = evidenceHash(args.sourceEvidence); const record = await sudo.query.ContraindicationFinding.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, consultation: { connect: { id: args.consultationId } }, client: { connect: { id: args.clientId } }, service: { connect: { id: args.serviceId } },
        ruleCode: args.ruleCode.trim(), ruleVersion: args.ruleVersion.trim(), severity: args.severity, sourceEvidence: bounded(args.sourceEvidence), sourceEvidenceHash: sourceHash, detectedAt: now(), idempotencyKey: args.idempotencyKey,
      }, query: "id sourceEvidenceHash" }); return { success: true, recordId: record.id, evidenceHash: record.sourceEvidenceHash, error: null };
    });
  } catch (error) { return fail(error, "Contraindication recording failed"); }
}

export async function decideContraindicationTransaction(context: Context, args: { findingId: string; providerId: string; disposition: ContraindicationDecisionDispositionType; rationale: string; expiresAt?: string | null; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageClinical); } catch (error) { return fail(error, "Clinical authority is required"); }
  const expiresAt = args.expiresAt ? new Date(args.expiresAt) : null;
  if (!validIdempotencyKey(args.idempotencyKey) || !new Set(["cleared_with_rationale","deferred","hard_stop","referred","reopened"]).has(args.disposition) || !args.rationale.trim() || (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()))) return { ...denied, error: "Contraindication decision is invalid" };
  try {
    const [finding] = await Promise.all([assertPracticeRecord(context, "ContraindicationFinding", args.findingId, "id practice { id } service { id } client { id }"), assertProviderActor(context, args.providerId, actor.actorId)]);
    const evidence = { findingId: args.findingId, providerId: args.providerId, disposition: args.disposition, rationale: args.rationale.trim(), expiresAt: expiresAt?.toISOString() || null, actorId: actor.actorId, decidedAt: now() };
    const hash = evidenceHash(evidence); return await serializableWorkflow(context, "medspa-contraindication-decision", [`finding:${args.findingId}`, `idempotency:${args.idempotencyKey}`], async tx => { const sudo = tx.sudo(), existing = (await sudo.query.ContraindicationDecision.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash finding { id }" }))[0]; if (existing) { if (existing.finding?.id !== args.findingId) throw new Error("Idempotency key was already used"); return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null }; } const record = await sudo.query.ContraindicationDecision.createOne({ data: {
      practice: { connect: { id: actor.practiceId } }, finding: { connect: { id: args.findingId } }, decidedBy: { connect: { id: args.providerId } }, disposition: args.disposition,
      rationale: args.rationale.trim(), authorityEvidence: { configuredClinicalDecision: true, serviceId: finding.service?.id }, evidenceHash: hash, decidedAt: evidence.decidedAt, expiresAt: expiresAt?.toISOString(), idempotencyKey: args.idempotencyKey,
    }, query: "id evidenceHash" }); return { success: true, recordId: record.id, evidenceHash: record.evidenceHash, error: null }; });
  } catch (error) { return fail(error, "Contraindication decision failed"); }
}

export async function createClinicalOrderTransaction(context: Context, args: {
  consultationId: string; planId?: string | null; clientId: string; locationId: string; serviceId: string; orderedById: string; authorizedPerformerId?: string | null; supervisorId?: string | null;
  indication: string; protocolVersion: string; instruction: unknown; anatomicSite?: string | null; doseRange?: string | null; performerConstraints?: string | null; validUntil: string; supersedesId?: string | null; idempotencyKey: string;
}): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageClinical); } catch (error) { return fail(error, "Clinical authority is required"); }
  const until = new Date(args.validUntil); if (!validIdempotencyKey(args.idempotencyKey) || !args.indication.trim() || !args.protocolVersion.trim() || Number.isNaN(until.getTime()) || until <= new Date()) return { ...denied, error: "Clinical order is invalid" };
  try {
    const [consultation, client, _location, service] = await Promise.all([
      assertPracticeRecord(context, "Consultation", args.consultationId, "id practice { id } status candidacyDecision contraindicationProtocolVersion contraindicationReviewHash client { id } appointment { id } service { id } supersededBy { id }"),
      assertPracticeRecord(context, "Client", args.clientId, "id practice { id } user { id }"), assertPracticeRecord(context, "Location", args.locationId), assertPracticeRecord(context, "Service", args.serviceId, "id practice { id } requiresIntakeReview requiresConsultation staffAuthorizationRequired requiresLotTraceability cleanupBufferMinutes clinicalProducts { id } category { id practice { id } }"), assertProviderActor(context, args.orderedById, actor.actorId),
      args.authorizedPerformerId ? assertPracticeRecord(context, "Provider", args.authorizedPerformerId) : Promise.resolve(null), args.supervisorId ? assertPracticeRecord(context, "Provider", args.supervisorId) : Promise.resolve(null),
      args.planId ? assertPracticeRecord(context, "TreatmentPlan", args.planId) : Promise.resolve(null), args.supersedesId ? assertPracticeRecord(context, "ClinicalOrder", args.supersedesId) : Promise.resolve(null),
    ]);
    const priorOrder = args.supersedesId ? await context.sudo().query.ClinicalOrder.findOne({ where: { id: args.supersedesId }, query: "id status client { id } service { id } supersededBy { id }" }) : null;
    if (priorOrder && (priorOrder.status !== "active" || priorOrder.client?.id !== args.clientId || priorOrder.service?.id !== args.serviceId || priorOrder.supersededBy?.id)) throw new Error("Clinical order supersession is invalid");
    if (consultation.status !== "completed" || consultation.supersededBy?.id || !consultation.contraindicationProtocolVersion || !consultation.contraindicationReviewHash || consultation.candidacyDecision !== "candidate" || consultation.client?.id !== args.clientId || consultation.service?.id !== args.serviceId) throw new Error("A completed candidate consultation is required");
    const requiredIntakeForms = await loadRequiredIntakeManifest(context.sudo(), actor.practiceId, service);
    if (service.requiresIntakeReview === true) {
      if (!consultation.appointment?.id || !client.user?.id || !service.category?.id) throw new Error("Appointment-specific reviewed intake evidence is unavailable");
      await assertCurrentIntakeEvidence(context.sudo(), { practiceId: actor.practiceId, clientUserId: client.user.id, appointmentId: consultation.appointment.id, categoryId: service.category.id, requiredForms: requiredIntakeForms });
    }
    const findings = await context.sudo().query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: actor.practiceId } }, consultation: { id: { equals: args.consultationId } }, severity: { in: ["hard_stop","clinician_review"] } }, take: 101, query: "id severity decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt }" });
    if (findings.length > 100) throw new Error("Contraindication review exceeds the safe verification bound");
    if (findings.some((finding: any) => !finding.decisions?.[0] || ["hard_stop","deferred","referred","reopened"].includes(finding.decisions[0].disposition) || (finding.decisions[0].expiresAt && new Date(finding.decisions[0].expiresAt) <= new Date()))) throw new Error("Unresolved contraindication review blocks this order");
    const signedAt = new Date();
    const serviceRequirements = {
      snapshotVersion: 1,
      serviceId: args.serviceId,
      categoryId: service.category?.id || null,
      requiredIntakeForms,
      requiresConsultation: service.requiresConsultation === true,
      requiresIntakeReview: service.requiresIntakeReview === true,
      staffAuthorizationRequired: service.staffAuthorizationRequired !== false,
      requiresLotTraceability: service.requiresLotTraceability === true,
      cleanupBufferMinutes: Math.max(0, Number(service.cleanupBufferMinutes) || 0),
      clinicalProductIds: (service.clinicalProducts || []).map((product: any) => product.id).sort(),
      capturedAt: signedAt.toISOString(),
    };
    const scopedOrderKey = `${actor.practiceId}:clinical-order:${args.idempotencyKey}`;
    // Acceptance/capture timestamps belong to the result, not caller request identity.
    const { capturedAt: _capturedAt, ...stableRequirements } = serviceRequirements;
    const orderRequestHash = evidenceHash({ ...args, actorId: actor.actorId, serviceRequirements: stableRequirements });
    return await serializableWorkflow(context, "medspa-clinical-order", [`client:${args.clientId}`, `service:${args.serviceId}`, `idempotency:${scopedOrderKey}`], async tx => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.ClinicalOrder.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedOrderKey } }, take: 1, query: "id evidenceHash instructionSnapshot" }))[0];
      if (existing) {
        if ((existing.instructionSnapshot as any)?.requestHash !== orderRequestHash) throw new Error("Idempotency key was reused for a different clinical order request");
        return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      }
      const currentService = await sudo.query.Service.findOne({ where: { id: args.serviceId }, query: "id status practice { id } category { id practice { id } } requiresIntakeReview requiresConsultation staffAuthorizationRequired requiresLotTraceability cleanupBufferMinutes clinicalProducts { id }" });
      if (!currentService || currentService.practice?.id !== actor.practiceId || currentService.status !== "active") throw new Error("Clinical service is no longer active in this practice");
      const currentManifest = await loadRequiredIntakeManifest(sudo, actor.practiceId, currentService);
      const currentProductIds = (currentService.clinicalProducts || []).map((product: any) => product.id).sort();
      if ((currentService.category?.id || null) !== serviceRequirements.categoryId
        || JSON.stringify(currentManifest) !== JSON.stringify(requiredIntakeForms)
        || currentService.requiresIntakeReview !== serviceRequirements.requiresIntakeReview
        || currentService.requiresConsultation !== serviceRequirements.requiresConsultation
        || currentService.staffAuthorizationRequired !== serviceRequirements.staffAuthorizationRequired
        || currentService.requiresLotTraceability !== serviceRequirements.requiresLotTraceability
        || Math.max(0, Number(currentService.cleanupBufferMinutes) || 0) !== serviceRequirements.cleanupBufferMinutes
        || JSON.stringify(currentProductIds) !== JSON.stringify(serviceRequirements.clinicalProductIds)) throw new Error("Clinical service requirements changed while this order was being issued");
      if (serviceRequirements.requiresIntakeReview === true) {
        if (!consultation.appointment?.id || !client.user?.id || !serviceRequirements.categoryId) throw new Error("Appointment-specific reviewed intake evidence is unavailable");
        await assertCurrentIntakeEvidence(sudo, { practiceId: actor.practiceId, clientUserId: client.user.id, appointmentId: consultation.appointment.id, categoryId: serviceRequirements.categoryId, requiredForms: requiredIntakeForms });
      }
      const currentConsultation = await sudo.query.Consultation.findOne({ where: { id: args.consultationId }, query: "id status candidacyDecision contraindicationProtocolVersion contraindicationReviewHash client { id } appointment { id } service { id } supersededBy { id }" });
      if (!currentConsultation || currentConsultation.status !== "completed" || currentConsultation.candidacyDecision !== "candidate" || currentConsultation.supersededBy?.id
        || !currentConsultation.contraindicationProtocolVersion || !currentConsultation.contraindicationReviewHash || currentConsultation.client?.id !== args.clientId
        || currentConsultation.service?.id !== args.serviceId || currentConsultation.appointment?.id !== consultation.appointment?.id) throw new Error("Current matching candidate consultation is required");
      const currentFindings = await sudo.query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: actor.practiceId } }, consultation: { id: { equals: args.consultationId } }, severity: { in: ["hard_stop", "clinician_review"] } }, take: 101, query: "id decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt }" });
      if (currentFindings.length > 100 || currentFindings.some((finding: any) => !finding.decisions?.[0] || ["hard_stop", "deferred", "referred", "reopened"].includes(finding.decisions[0].disposition) || (finding.decisions[0].expiresAt && new Date(finding.decisions[0].expiresAt) <= new Date()))) throw new Error("Current contraindication review blocks this order");
      const authority = await evaluateProviderAuthority(sudo, { providerId: args.orderedById, serviceId: args.serviceId, locationId: args.locationId, at: signedAt, stage: "order", supervisorId: args.supervisorId });
      const evidence = { ...args, actorId: actor.actorId, signedAt: signedAt.toISOString(), authorityHash: authority.evidenceHash, serviceRequirements };
      const hash = evidenceHash(evidence);
      const record = await sudo.query.ClinicalOrder.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, location: { connect: { id: args.locationId } }, client: { connect: { id: args.clientId } }, consultation: { connect: { id: args.consultationId } }, plan: args.planId ? { connect: { id: args.planId } } : undefined,
        service: { connect: { id: args.serviceId } }, orderedBy: { connect: { id: args.orderedById } }, authorizedPerformer: args.authorizedPerformerId ? { connect: { id: args.authorizedPerformerId } } : undefined, requiredSupervisor: args.supervisorId ? { connect: { id: args.supervisorId } } : undefined,
        status: "active", instructionSnapshot: { snapshotVersion: 1, instructions: bounded(args.instruction), serviceRequirements, requestHash: orderRequestHash }, protocolVersion: args.protocolVersion.trim(), indication: args.indication.trim(), anatomicSite: args.anatomicSite || "", doseRange: args.doseRange || "", performerConstraints: args.performerConstraints || "", supervisionSnapshot: args.supervisorId ? `configured:${args.supervisorId}` : "none configured",
        signedAt: signedAt.toISOString(), validFrom: signedAt.toISOString(), validUntil: until.toISOString(), evidenceHash: hash, idempotencyKey: scopedOrderKey, supersedes: args.supersedesId ? { connect: { id: args.supersedesId } } : undefined,
      }, query: "id evidenceHash" });
      if (priorOrder) { const actionHash = evidenceHash({ priorOrderId: priorOrder.id, replacementId: record.id, actorId: actor.actorId, signedAt: signedAt.toISOString() }); await sudo.query.ClinicalOrderAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, order: { connect: { id: priorOrder.id } }, actor: { connect: { id: args.orderedById } }, action: "revoke", fromStatus: "active", toStatus: "revoked", reason: "Replacement clinical order signed", evidence: { replacementId: record.id }, evidenceHash: actionHash, occurredAt: signedAt.toISOString(), idempotencyKey: `${scopedOrderKey}:supersede` }, query: "id" }); await sudo.query.ClinicalOrder.updateOne({ where: { id: priorOrder.id }, data: { status: "revoked" }, query: "id" }); }
      await recordAuthorityDecision(tx, authority, { clientId: args.clientId }, `${scopedOrderKey}:authority`);
      return { success: true, recordId: record.id, evidenceHash: record.evidenceHash, error: null };
    });
  } catch (error) { return fail(error, "Clinical order failed"); }
}

export async function signConsentTransaction(context: Context, args: {
  clientId: string; appointmentId: string; serviceId: string; templateVersionId: string; presentedById: string; signerName: string; signerRole: ConsentRecordSignerRoleType; representativeAuthority?: string | null;
  interpreter?: string | null; witness?: string | null; discussionEvidence: unknown; signatureEvidence: string; effectiveUntil?: string | null; supersedesId?: string | null; idempotencyKey: string;
}): Promise<Result> {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.signerName.trim() || !args.signatureEvidence.trim()) return { ...denied, error: "Authenticated consent evidence is required" };
  try {
    const [client, appointment, template, _service, presenter, priorConsent] = await Promise.all([
      assertPracticeRecord(context, "Client", args.clientId, "id practice { id } user { id }"), assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id } provider { id } location { id }"),
      assertPracticeRecord(context, "ConsentTemplateVersion", args.templateVersionId, "id practice { id } service { id } contentHash effectiveFrom effectiveUntil"), assertPracticeRecord(context, "Service", args.serviceId), assertPracticeRecord(context, "Provider", args.presentedById, "id practice { id } user { id }"),
      args.supersedesId ? assertPracticeRecord(context, "ConsentRecord", args.supersedesId, "id practice { id } status client { id } service { id } supersededBy { id }") : Promise.resolve(null),
    ]);
    const clinicalActor = permissions.canManageClinical({ session: context.session as any }); const owner = client.user?.id === context.session.itemId;
    if (!clinicalActor && !owner) throw new Error("Consent ownership could not be verified");
    if (clinicalActor && presenter.user?.id !== context.session.itemId) throw new Error("The presenting provider must match the authenticated clinical actor");
    if (owner && appointment.provider?.id !== presenter.id) throw new Error("Consent presenter does not match the assigned provider");
    if (appointment.client?.id !== client.id || template.service?.id !== args.serviceId) throw new Error("Consent does not match this appointment and service");
    if (priorConsent && (priorConsent.status !== "effective" || priorConsent.client?.id !== client.id || priorConsent.service?.id !== args.serviceId || priorConsent.supersededBy?.id)) throw new Error("Consent supersession is invalid");
    const signedAt = new Date(); if (!appointment.location?.id) throw new Error("Consent appointment location is unavailable"); const consentAuthority = await evaluateProviderAuthority(context.sudo(), { providerId: presenter.id, serviceId: args.serviceId, locationId: appointment.location.id, at: signedAt, stage: "consent" }); if (new Date(template.effectiveFrom) > signedAt || (template.effectiveUntil && new Date(template.effectiveUntil) <= signedAt)) throw new Error("Consent template is not effective");
    if (args.signerRole !== "self" && !args.representativeAuthority?.trim()) throw new Error("Representative authority evidence is required");
    const evidence = { templateHash: template.contentHash, clientId: client.id, appointmentId: appointment.id, serviceId: args.serviceId, signerName: args.signerName.trim(), signerRole: args.signerRole, representativeAuthority: args.representativeAuthority || null, discussionEvidence: bounded(args.discussionEvidence), signatureEvidenceHash: evidenceHash(args.signatureEvidence), presentedById: args.presentedById, signedAt: signedAt.toISOString() };
    const hash = evidenceHash(evidence); return await serializableWorkflow(context, "medspa-consent", [`client:${client.id}`, `service:${args.serviceId}`, `idempotency:${args.idempotencyKey}`], async tx => {
      const acceptedAppointment = await assertPracticeRecord(tx, "Appointment", args.appointmentId, "id practice { id } client { id } lineItems { service { id } }");
      if (acceptedAppointment.client?.id !== client.id || !acceptedAppointment.lineItems?.some((line: any) => line.service?.id === args.serviceId)) throw new Error("Consent service must belong to the accepted appointment");
      const sudo = tx.sudo(); const existing = (await sudo.query.ConsentRecord.findMany({ where: { practice: { id: { equals: client.practice.id } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id evidenceHash" }))[0]; if (existing) return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null }; const record = await sudo.query.ConsentRecord.createOne({ data: {
      practice: { connect: { id: client.practice.id } }, client: { connect: { id: client.id } }, appointment: { connect: { id: appointment.id } }, service: { connect: { id: args.serviceId } }, templateVersion: { connect: { id: template.id } }, presentedBy: { connect: { id: args.presentedById } },
      status: "effective", signerName: args.signerName.trim(), signerRole: args.signerRole, representativeAuthority: args.representativeAuthority || "", interpreter: args.interpreter || "", witness: args.witness || "", discussionEvidence: bounded(args.discussionEvidence),
      signatureEvidenceHash: evidence.signatureEvidenceHash, evidenceHash: hash, signedAt: signedAt.toISOString(), effectiveUntil: args.effectiveUntil || undefined, supersedes: args.supersedesId ? { connect: { id: args.supersedesId } } : undefined, idempotencyKey: args.idempotencyKey,
    }, query: "id evidenceHash" });
    await recordAuthorityDecision(tx, consentAuthority, { clientId: client.id, appointmentId: appointment.id }, `${args.idempotencyKey}:authority`);
    if (priorConsent) { const actionHash = evidenceHash({ priorConsentId: priorConsent.id, replacementId: record.id, actorId: context.session.itemId, signedAt: signedAt.toISOString() }); await sudo.query.ConsentAction.createOne({ data: { practice: { connect: { id: client.practice.id } }, consent: { connect: { id: priorConsent.id } }, actor: { connect: { id: context.session.itemId } }, action: "supersede", fromStatus: "effective", toStatus: "superseded", reason: "Replacement consent signed", evidence: { replacementId: record.id }, evidenceHash: actionHash, occurredAt: signedAt.toISOString(), idempotencyKey: `${args.idempotencyKey}:supersede` }, query: "id" }); await sudo.query.ConsentRecord.updateOne({ where: { id: priorConsent.id }, data: { status: "superseded" }, query: "id" }); }
    return { success: true, recordId: record.id, evidenceHash: record.evidenceHash, error: null }; });
  } catch (error) { return fail(error, "Consent signing failed"); }
}

export async function recordTreatmentAdministrationTransaction(context: Context, args: {
  treatmentSessionId: string; orderId: string; consentId: string; performerId: string; supervisorId?: string | null; roomId: string; deviceId?: string | null;
  protocolVersion: string; timeOutEvidence: unknown; anatomicMap: unknown; deviceSettings?: unknown; technique?: string | null; immediateOutcome: string; aftercare: unknown;
  startedAt: string; completedAt: string; lots: unknown; status: "completed" | "aborted"; idempotencyKey: string;
}): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageClinical); } catch (error) { return fail(error, "Clinical authority is required"); }
  if (!validIdempotencyKey(args.idempotencyKey) || !new Set(["completed","aborted"]).has(args.status) || !args.immediateOutcome.trim() || !Array.isArray(args.lots) || args.lots.length > 25 || !args.protocolVersion.trim()) return { ...denied, error: "Administration evidence is invalid" };
  try {
    const started = new Date(args.startedAt);
    const completed = new Date(args.completedAt);
    if (Number.isNaN(started.getTime()) || Number.isNaN(completed.getTime()) || completed < started || completed.getTime() > Date.now()) throw new Error("Administration times are invalid");
    const lotInputs = (args.lots as any[]).map((item, index) => ({ lotId: String(item?.lotId || ""), quantity: Number(item?.quantity), unit: String(item?.unit || ""), anatomicSite: String(item?.anatomicSite || ""), concentration: String(item?.concentration || ""), doseSnapshot: item?.doseSnapshot || {}, wasteQuantity: Number(item?.wasteQuantity || 0), wasteReason: String(item?.wasteReason || ""), index }));
    if (lotInputs.some(item => !item.lotId || !Number.isInteger(item.quantity) || item.quantity <= 0 || !item.unit || !item.anatomicSite || !Number.isInteger(item.wasteQuantity) || item.wasteQuantity < 0)) throw new Error("Lot administration input is invalid");
    if (new Set(lotInputs.map(item => item.lotId)).size !== lotInputs.length) throw new Error("Each lot must be entered once per administration until split-site lot allocation is supported");
    return await serializableWorkflow(context, "medspa-administration", [`session:${args.treatmentSessionId}`, ...lotInputs.map(item => `lot:${item.lotId}`), `idempotency:${args.idempotencyKey}`], async tx => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.TreatmentAdministration.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } },
        take: 1, query: "id evidenceHash treatmentSession { id }",
      }))[0];
      if (existing) {
        const priorAuthority = (await sudo.query.ClinicalAuthorityEvent.findMany({
          where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: `${args.idempotencyKey}:authority` } },
          take: 1, query: "id evidenceHash treatmentSession { id }",
        }))[0];
        const retryHash = priorAuthority?.treatmentSession?.id === args.treatmentSessionId
          ? evidenceHash({ ...args, actorId: actor.actorId, authorityHash: priorAuthority.evidenceHash, lots: lotInputs })
          : null;
        if (existing.treatmentSession?.id !== args.treatmentSessionId || retryHash !== existing.evidenceHash) throw new Error("Administration idempotency key was already used with different evidence");
        return { success: true, recordId: existing.id, evidenceHash: existing.evidenceHash, error: null };
      }
      const session = await sudo.query.TreatmentSession.findOne({ where: { id: args.treatmentSessionId }, query: `
        id status durationMinutes practice { id } location { id } plan { id status }
        client { id user { id } } provider { id } supervisor { id } service { id requiresIntakeReview requiresLotTraceability }
        appointment { id startTime endTime metadata practice { id } location { id } resourceReservations(where: { status: { equals: reserved } }) { status startsAt endsAt practice { id } location { id } appointment { id } segmentKey purpose assignmentEvidence resource { id } } supervisorReservations(where: { status: { equals: reserved } }) { status startsAt endsAt practice { id } location { id } appointment { id } service { id } supervisor { id } } }
        room { id isActive } device { id readinessStatus maintenanceDueAt calibrationDueAt }
        order { id practice { id } status validFrom validUntil protocolVersion client { id } authorizedPerformer { id } requiredSupervisor { id }
          service { id }
          consultation { id status candidacyDecision supersededBy { id } client { id } service { id } }
          instructionSnapshot
        }
        consent { id practice { id } status signedAt effectiveUntil client { id } appointment { id } service { id } }
      ` });
      if (!session?.order || !session.consent || session.order.id !== args.orderId || session.consent.id !== args.consentId
        || session.provider?.id !== args.performerId || (session.supervisor?.id || null) !== (args.supervisorId || null)
        || session.room?.id !== args.roomId || (session.device?.id || null) !== (args.deviceId || null)
        || session.order.service?.id !== session.service?.id || (session.order.requiredSupervisor?.id || null) !== (args.supervisorId || null)
        || (session.order.authorizedPerformer?.id && session.order.authorizedPerformer.id !== args.performerId)) {
        throw new Error("Administration does not match the current prepared treatment session");
      }
      const order = session.order;
      const consent = session.consent;
      await assertProviderActor(tx, args.performerId, actor.actorId);
      await Promise.all([
        assertPracticeRecord(tx, "Resource", args.roomId),
        args.deviceId ? assertPracticeRecord(tx, "Resource", args.deviceId) : Promise.resolve(null),
        args.supervisorId ? assertPracticeRecord(tx, "Provider", args.supervisorId) : Promise.resolve(null),
        ...lotInputs.map(item => assertPracticeRecord(tx, "InventoryLot", item.lotId)),
      ]);
      if (!session.appointment?.location?.id || session.practice?.id !== actor.practiceId || session.appointment.practice?.id !== actor.practiceId || session.location?.id !== session.appointment.location.id) throw new Error("Treatment location is unavailable");
      await assertCurrentClinicalExecutionReadiness(sudo, session, session.order, session.consent, started, completed);
      const reservationScope = { practiceId: session.practice.id, locationId: session.appointment.location.id, appointmentId: session.appointment.id, serviceId: session.service.id, providerId: args.performerId, supervisorId: args.supervisorId || null };
      if (!reservationCovers(session.appointment.resourceReservations || [], { ...reservationScope, resourceId: args.roomId, purpose: "room" }, started, completed)
        || (args.deviceId && !reservationCovers(session.appointment.resourceReservations || [], { ...reservationScope, resourceId: args.deviceId, purpose: "device" }, started, completed))) {
        throw new Error("Treatment resources are not reserved for the full administration interval");
      }
      if (args.supervisorId && !supervisorReservationCovers(session.appointment.supervisorReservations || [], { ...reservationScope, supervisorId: args.supervisorId }, started, completed)) {
        throw new Error("Required supervisor capacity is not reserved for the full administration interval");
      }
      if (session.room.isActive !== true) throw new Error("Treatment room is not active");
      const device = args.deviceId ? await sudo.query.Resource.findOne({ where: { id: args.deviceId }, query: "id practice { id } isActive readinessStatus maintenanceDueAt calibrationDueAt" }) : null;
      if (args.deviceId && (!device || device.practice?.id !== actor.practiceId || device.isActive !== true || device.readinessStatus !== "available"
        || (device.maintenanceDueAt && new Date(device.maintenanceDueAt) <= started) || (device.calibrationDueAt && new Date(device.calibrationDueAt) <= started))) {
        throw new Error("Device is not released and ready for treatment");
      }
      await assertResourceIntervalReady(sudo, args.roomId, started, completed);
      if (args.deviceId) await assertResourceIntervalReady(sudo, args.deviceId, started, completed);
      if (order.instructionSnapshot?.serviceRequirements?.requiresLotTraceability === true && lotInputs.length === 0) throw new Error("This service requires patient-level lot traceability");
      const authority = await evaluateProviderAuthority(sudo, { providerId: args.performerId, serviceId: session.order.service.id, locationId: session.appointment.location.id, at: started, stage: "administration", supervisorId: args.supervisorId });
      const completionAuthority = await evaluateProviderAuthority(sudo, { providerId: args.performerId, serviceId: session.order.service.id, locationId: session.appointment.location.id, at: completed, stage: "completion", supervisorId: args.supervisorId });
      const lots = await sudo.query.InventoryLot.findMany({ where: { id: { in: lotInputs.map(item => item.lotId) }, practice: { id: { equals: actor.practiceId } } }, take: 25, query: "id lotNumber remainingQuantity expiresAt status location { id } product { id }" });
      for (const item of lotInputs) { const lot = lots.find((candidate: any) => candidate.id === item.lotId); if (!lot || lot.location?.id !== session.appointment.location.id || !order.instructionSnapshot?.serviceRequirements?.clinicalProductIds?.includes(lot.product?.id) || lot.status !== "available" || !lot.expiresAt || new Date(lot.expiresAt) <= started || lot.remainingQuantity < item.quantity + item.wasteQuantity) throw new Error("A selected lot is expired, quarantined, recalled, unavailable, or insufficient"); }
      const evidence = { ...args, actorId: actor.actorId, authorityHash: authority.evidenceHash, lots: lotInputs }; const hash = evidenceHash(evidence);
      const administration = await sudo.query.TreatmentAdministration.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, location: { connect: { id: session.appointment.location.id } }, client: { connect: { id: session.client.id } }, appointment: { connect: { id: session.appointment.id } }, treatmentSession: { connect: { id: session.id } }, order: { connect: { id: order.id } }, consent: { connect: { id: consent.id } },
        performer: { connect: { id: args.performerId } }, supervisor: args.supervisorId ? { connect: { id: args.supervisorId } } : undefined, service: { connect: { id: order.service.id } }, room: { connect: { id: args.roomId } }, device: args.deviceId ? { connect: { id: args.deviceId } } : undefined,
        status: args.status, protocolVersion: args.protocolVersion, timeOutEvidence: bounded(args.timeOutEvidence), anatomicMap: bounded(args.anatomicMap), deviceSettings: bounded(args.deviceSettings || {}), technique: args.technique || "", immediateOutcome: args.immediateOutcome.trim(), aftercareSnapshot: bounded(args.aftercare),
        startedAt: started.toISOString(), completedAt: completed.toISOString(), signedAt: now(), evidenceHash: hash, idempotencyKey: args.idempotencyKey,
      }, query: "id evidenceHash" });
      for (const item of lotInputs) {
        const lot = lots.find((candidate: any) => candidate.id === item.lotId)!; const consumed = item.quantity + item.wasteQuantity; const after = lot.remainingQuantity - consumed;
        await sudo.query.AdministrationLot.createOne({ data: { practice: { connect: { id: actor.practiceId } }, administration: { connect: { id: administration.id } }, lot: { connect: { id: lot.id } }, product: { connect: { id: lot.product.id } }, quantity: String(item.quantity), unit: item.unit, doseSnapshot: item.doseSnapshot, anatomicSite: item.anatomicSite, lotNumberSnapshot: lot.lotNumber, expirationSnapshot: lot.expiresAt, concentration: item.concentration, wasteQuantity: String(item.wasteQuantity), wasteReason: item.wasteReason, evidenceHash: evidenceHash({ administrationId: administration.id, ...item, lotNumber: lot.lotNumber, expiresAt: lot.expiresAt }) }, query: "id" });
        await sudo.query.InventoryLot.updateOne({ where: { id: lot.id }, data: { remainingQuantity: after, status: after === 0 ? "depleted" : "available" }, query: "id" });
        await sudo.query.StockMovement.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: session.appointment.location.id } }, lot: { connect: { id: lot.id } }, product: { connect: { id: lot.product.id } }, type: "consume", delta: -consumed, balanceBefore: lot.remainingQuantity, balanceAfter: after, idempotencyKey: `${actor.practiceId}:${args.idempotencyKey}:lot:${lot.id}`, reason: `Patient administration ${administration.id}`, actor: { connect: { id: actor.actorId } }, treatmentSession: { connect: { id: session.id } }, metadata: { administrationId: administration.id, administeredQuantity: item.quantity, wasteQuantity: item.wasteQuantity } }, query: "id" });
        const inventoryMovement = await recordInventoryMovement(tx, { practiceId: actor.practiceId, productId: lot.product.id, locationId: session.appointment.location.id, type: "adjustment", delta: -consumed, reason: `Patient administration ${administration.id}`, idempotencyKey: `${actor.practiceId}:administration:${args.idempotencyKey}:lot:${lot.id}`, metadata: { treatmentSessionId: session.id, administrationId: administration.id, lotId: lot.id, quantity: item.quantity, waste: item.wasteQuantity } });
        if (!inventoryMovement.success) throw new Error(inventoryMovement.error || "Clinical stock movement failed");
      }
      await sudo.query.TreatmentSession.updateOne({ where: { id: session.id }, data: { status: args.status === "completed" ? "completed" : "stopped", staffAuthorizationConfirmed: true, protocolVersion: args.protocolVersion, timeOutEvidence: bounded(args.timeOutEvidence), signedAt: now(), completedAt: completed.toISOString(), evidenceHash: hash }, query: "id" });
      await recordAuthorityDecision(tx, authority, { clientId: session.client.id, appointmentId: session.appointment.id, treatmentSessionId: session.id }, `${args.idempotencyKey}:authority`);
      await recordAuthorityDecision(tx, completionAuthority, { clientId: session.client.id, appointmentId: session.appointment.id, treatmentSessionId: session.id }, `${args.idempotencyKey}:completion-authority`);
      return { success: true, recordId: administration.id, evidenceHash: administration.evidenceHash, error: null };
    });
  } catch (error) { return fail(error, "Treatment administration failed"); }
}

export { approveTreatmentPlanTransaction } from './treatmentPlanApproval';
import { approveTreatmentPlanTransaction } from './treatmentPlanApproval';

export async function prepareTreatmentSessionTransaction(context:Context,args:{planId:string;appointmentId:string;orderId:string;consentId:string;providerId:string;supervisorId?:string|null;serviceId:string;roomId:string;deviceId?:string|null;durationMinutes:number;idempotencyKey:string}):Promise<Result>{
  let actor;try{actor=requireActorPractice(context,permissions.canManageClinical);}catch(error){return fail(error,"Clinical authority is required");}
  if(!validIdempotencyKey(args.idempotencyKey)||!Number.isInteger(args.durationMinutes)||args.durationMinutes<1)return{...denied,error:"Treatment-session input is invalid"};
  try{const [plan,appointment,order,consent,service]=await Promise.all([assertPracticeRecord(context,"TreatmentPlan",args.planId,"id practice { id } status client { id } items { service { id } status }"),assertPracticeRecord(context,"Appointment",args.appointmentId,"id practice { id } client { id } location { id }"),assertPracticeRecord(context,"ClinicalOrder",args.orderId,"id practice { id } status client { id } service { id } plan { id }"),assertPracticeRecord(context,"ConsentRecord",args.consentId,"id practice { id } client { id } service { id } appointment { id }"),assertPracticeRecord(context,"Service",args.serviceId,"id practice { id } name"),assertProviderActor(context,args.providerId,actor.actorId),assertPracticeRecord(context,"Resource",args.roomId),args.deviceId?assertPracticeRecord(context,"Resource",args.deviceId):Promise.resolve(null),args.supervisorId?assertPracticeRecord(context,"Provider",args.supervisorId):Promise.resolve(null)]);if(plan.status!=="active"||!plan.items?.some((item:any)=>item.service?.id===service.id&&item.status==="planned")||order.plan?.id!==plan.id||order.status!=="active"||plan.client?.id!==appointment.client?.id||order.client?.id!==appointment.client?.id||consent.client?.id!==appointment.client?.id||order.service?.id!==service.id||consent.service?.id!==service.id||consent.appointment?.id!==appointment.id)throw new Error("Treatment-session evidence relationships do not match");const hash=evidenceHash({...args,actorId:actor.actorId,preparedAt:now()});return await serializableWorkflow(context,"medspa-treatment-session-prepare",[`appointment:${args.appointmentId}`,`idempotency:${args.idempotencyKey}`],async tx=>{const sudo=tx.sudo(),existing=(await sudo.query.TreatmentSession.findMany({where:{practice:{id:{equals:actor.practiceId}},idempotencyKey:{equals:args.idempotencyKey}},take:1,query:"id evidenceHash"}))[0];if(existing)return{success:true,recordId:existing.id,evidenceHash:existing.evidenceHash,error:null};await assertApprovedPlanClinicalAppointment(tx, args.planId, args.appointmentId, args.serviceId, args.providerId);const session=await sudo.query.TreatmentSession.createOne({data:{practice:{connect:{id:actor.practiceId}},location:{connect:{id:appointment.location.id}},plan:{connect:{id:plan.id}},appointment:{connect:{id:appointment.id}},client:{connect:{id:appointment.client.id}},provider:{connect:{id:args.providerId}},supervisor:args.supervisorId?{connect:{id:args.supervisorId}}:undefined,service:{connect:{id:service.id}},order:{connect:{id:order.id}},consent:{connect:{id:consent.id}},room:{connect:{id:args.roomId}},device:args.deviceId?{connect:{id:args.deviceId}}:undefined,serviceTitle:service.name,durationMinutes:args.durationMinutes,status:"planned",staffAuthorizationConfirmed:false,evidenceHash:hash,idempotencyKey:args.idempotencyKey},query:"id evidenceHash"});return{success:true,recordId:session.id,evidenceHash:session.evidenceHash,error:null};});}catch(error){return fail(error,"Treatment-session preparation failed");}
}

export async function startTreatmentSessionTransaction(context: Context, args: { treatmentSessionId: string; protocolVersion: string; timeOutEvidence: unknown; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageClinical); const scoped = await assertPracticeRecord(context, 'TreatmentSession', args.treatmentSessionId, 'id practice { id } provider { id }'); await assertProviderActor(context, scoped.provider.id, actor.actorId) } catch (error) { return fail(error, 'Clinical authority is required') }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.protocolVersion.trim()) return { ...denied, error: 'Treatment-start evidence is invalid' }
  try { return await serializableWorkflow(context, 'medspa-treatment-start', [`session:${args.treatmentSessionId}`, `idempotency:${args.idempotencyKey}`], async tx => {
    const header = await assertPracticeRecord(tx, 'TreatmentSession', args.treatmentSessionId, 'id practice { id } location { id } provider { id } client { id } plan { id } room { id } device { id } supervisor { id }');
    await assertProviderActor(tx, header.provider?.id || '', actor.actorId);
    await assertPlanStaffMembership(tx.sudo(), actor.practiceId, actor.actorId, header.location?.id || '');
    const patient = await assertPracticeRecord(tx, 'Client', header.client?.id || '', 'id practice { id } user { id status practice { id } }');
    if (patient.user?.status !== 'active' || patient.user?.practice?.id !== actor.practiceId) throw new Error('Current patient practice authority is unavailable');
    const sudo = tx.sudo();
    const requestHash = evidenceHash({ ...args, actorId: actor.actorId, practiceId: actor.practiceId, locationId: header.location.id, providerId: header.provider.id, clientId: header.client.id, planId: header.plan?.id });
    const receipts = await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, action: { equals: 'treatment_session.started.v1' }, correlationId: { equals: args.idempotencyKey } }, take: 2, query: 'id resourceId actor { id } evidence evidenceHash' });
    if (receipts.length) {
      const evidence = receipts[0].evidence as Record<string, unknown> | null;
      if (receipts.length !== 1 || !evidence || evidenceHash(evidence) !== receipts[0].evidenceHash || evidence.requestHash !== requestHash || receipts[0].resourceId !== args.treatmentSessionId || receipts[0].actor?.id !== actor.actorId || typeof evidence.resultHash !== 'string') throw new Error('Start key was already used with different or unattributable evidence');
      return { success: true, recordId: args.treatmentSessionId, evidenceHash: evidence.resultHash, error: null };
    }
    const legacy = await sudo.query.ClinicalAuthorityEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: `${args.idempotencyKey}:authority` } }, take: 1, query: 'id' });
    if (legacy.length) throw new Error('Legacy start evidence has no original-command receipt; retain it for read-only review');
    const resourceIds = [header.room?.id, header.device?.id].filter((id): id is string => typeof id === 'string' && Boolean(id));
    const resources = await Promise.all(resourceIds.map(id => assertPracticeRecord(tx, 'Resource', id, 'id type practice { id } location { id }')));
    if (!header.room?.id || resources.some(resource => resource.location?.id !== header.location.id)) throw new Error('Current treatment resource location scope is unavailable');
    await lockBookingCapacity(tx, header.provider.id, [{ requiredResources: resources }], header.supervisor?.id ? [header.supervisor.id] : []);
    const session = await sudo.query.TreatmentSession.findOne({ where: { id: args.treatmentSessionId }, query: `
      id status durationMinutes practice { id } location { id } plan { id status practice { id } client { id } } client { id user { id } }
      appointment { id startTime endTime metadata practice { id } location { id } resourceReservations(where: { status: { equals: reserved } }) { status startsAt endsAt practice { id } location { id } appointment { id } segmentKey purpose assignmentEvidence resource { id } } supervisorReservations(where: { status: { equals: reserved } }) { status startsAt endsAt practice { id } location { id } appointment { id } service { id } supervisor { id } } }
      provider { id } supervisor { id } service { id requiresIntakeReview requiresLotTraceability }
      order { id status evidenceHash practice { id } location { id } plan { id } validFrom validUntil protocolVersion instructionSnapshot client { id } service { id } supersededBy { id } authorizedPerformer { id } requiredSupervisor { id }
        consultation { id status candidacyDecision staffDecisionRecorded signedAt evidenceHash contraindicationProtocolVersion contraindicationReviewHash practice { id } location { id } supersededBy { id } client { id } service { id } }
      }
      consent { id status evidenceHash practice { id } signedAt effectiveUntil client { id } appointment { id } service { id } supersededBy { id } }
      room { id type isActive practice { id } location { id } } device { id type isActive practice { id } location { id } readinessStatus maintenanceDueAt calibrationDueAt }
    ` })
    if (!session || !['planned','ready'].includes(session.status) || !session.order || !session.consent || !session.appointment?.location?.id || session.practice?.id !== actor.practiceId || session.appointment.practice?.id !== actor.practiceId || session.location?.id !== session.appointment.location.id || !session.room?.id || session.room.isActive !== true) throw new Error('Treatment session is not startable')
    if (session.provider?.id !== header.provider.id || session.client?.id !== header.client.id || session.plan?.id !== header.plan?.id || session.room?.id !== header.room?.id || (session.device?.id || null) !== (header.device?.id || null) || (session.supervisor?.id || null) !== (header.supervisor?.id || null)
      || session.room?.type !== 'room' || session.room.practice?.id !== actor.practiceId || session.room.location?.id !== header.location.id
      || (session.device && (!['device', 'equipment'].includes(session.device.type) || session.device.practice?.id !== actor.practiceId || session.device.location?.id !== header.location.id))) throw new Error('Prepared treatment scope or assignments changed');
    const startedAt = new Date();
    const expectedEnd = new Date(startedAt.getTime() + Number(session.durationMinutes) * 60_000);
    await assertCurrentClinicalStartReadiness(sudo, session, session.order, session.consent, startedAt, expectedEnd);
    const reservationScope = { practiceId: session.practice.id, locationId: session.appointment.location.id, appointmentId: session.appointment.id, serviceId: session.service.id, providerId: session.provider.id, supervisorId: session.supervisor?.id || null }
    if (!reservationCovers(session.appointment.resourceReservations || [], { ...reservationScope, resourceId: session.room.id, purpose: 'room' }, startedAt, expectedEnd)
      || (session.device?.id && !reservationCovers(session.appointment.resourceReservations || [], { ...reservationScope, resourceId: session.device.id, purpose: 'device' }, startedAt, expectedEnd))) throw new Error('Prepared treatment resources are not reserved for the full session interval')
    if (session.supervisor?.id && !supervisorReservationCovers(session.appointment.supervisorReservations || [], { ...reservationScope, supervisorId: session.supervisor.id }, startedAt, expectedEnd)) throw new Error('Required supervisor capacity is not reserved for the full session interval')
    if (session.order.protocolVersion !== args.protocolVersion) throw new Error('Effective treatment protocol is required')
    await assertProviderActor(tx, session.provider.id, actor.actorId)
    await Promise.all([assertPracticeRecord(tx, 'Resource', session.room.id), session.device?.id ? assertPracticeRecord(tx, 'Resource', session.device.id) : Promise.resolve(null)])
    if (session.device && (session.device.isActive !== true || session.device.readinessStatus !== 'available'
      || (session.device.maintenanceDueAt && (!Number.isFinite(Date.parse(session.device.maintenanceDueAt)) || new Date(session.device.maintenanceDueAt) <= expectedEnd))
      || (session.device.calibrationDueAt && (!Number.isFinite(Date.parse(session.device.calibrationDueAt)) || new Date(session.device.calibrationDueAt) <= expectedEnd)))) throw new Error('Device is not ready')
    await assertResourceIntervalReady(sudo, session.room.id, startedAt, expectedEnd)
    if (session.device?.id) await assertResourceIntervalReady(sudo, session.device.id, startedAt, expectedEnd)
    const authorityDecision = await evaluateProviderAuthority(sudo, { providerId: session.provider.id, serviceId: session.service.id, locationId: session.appointment.location.id, at: startedAt, stage: 'treatment_start', supervisorId: session.supervisor?.id })
    const endAuthority = await evaluateProviderAuthority(sudo, { providerId: session.provider.id, serviceId: session.service.id, locationId: session.appointment.location.id, at: expectedEnd, stage: 'treatment_start', supervisorId: session.supervisor?.id });
    const endAuthorityHash = endAuthority.evidenceHash;
    if (evidenceHash({ ...authorityDecision, decidedAt: null, evidenceHash: null }) !== evidenceHash({ ...endAuthority, decidedAt: null, evidenceHash: null })) throw new Error('Provider authority changes within the prepared treatment interval');
    const hash = evidenceHash({ sessionId: session.id, protocolVersion: args.protocolVersion, timeOutEvidence: bounded(args.timeOutEvidence), authorityHash: authorityDecision.evidenceHash, endAuthorityHash, actorId: actor.actorId, startedAt: startedAt.toISOString() })
    await sudo.query.TreatmentSession.updateOne({ where: { id: session.id }, data: { status: 'in_progress', protocolVersion: args.protocolVersion, timeOutEvidence: bounded(args.timeOutEvidence), startedAt: startedAt.toISOString(), evidenceHash: hash, staffAuthorizationConfirmed: true }, query: 'id' })
    await recordAuthorityDecision(tx, authorityDecision, { clientId: session.client.id, appointmentId: session.appointment.id, treatmentSessionId: session.id }, `${args.idempotencyKey}:authority`)
    const evidence = { version: 1, requestHash, resultHash: hash, actorId: actor.actorId, practiceId: actor.practiceId, locationId: session.location.id, treatmentSessionId: session.id, orderId: session.order.id, consentId: session.consent.id, planId: session.plan.id, startedAt: startedAt.toISOString() };
    await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: session.location.id } }, actor: { connect: { id: actor.actorId } }, action: 'treatment_session.started.v1', resourceType: 'TreatmentSession', resourceId: session.id, correlationId: args.idempotencyKey, evidence: bounded(evidence), evidenceHash: evidenceHash(evidence), occurredAt: startedAt.toISOString() }, query: 'id' });
    return { success: true, recordId: session.id, evidenceHash: hash, error: null }
  }) } catch (error) { return fail(error, 'Treatment start failed') }
}

const resultType = graphql.object<Result>()({ name: "ClinicalWorkflowResult", fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), recordId: graphql.field({ type: graphql.ID }), evidenceHash: graphql.field({ type: graphql.String }), error: graphql.field({ type: graphql.String }) } });
const field = (resolve: any, args: Record<string, any>) => graphql.field({ type: resultType, args, resolve(_source, values, context: Context) { return resolve(context, values); } });
export const recordConsultation = field(recordConsultationTransaction, { clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), appointmentId: graphql.arg({ type: graphql.ID }), providerId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), locationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), serviceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), status: graphql.arg({ type: graphql.nonNull(graphql.String) }), history: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), examination: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), goals: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), alternatives: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), contraindicationReview: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), summary: graphql.arg({ type: graphql.nonNull(graphql.String) }), indication: graphql.arg({ type: graphql.nonNull(graphql.String) }), candidacyDecision: graphql.arg({ type: graphql.nonNull(graphql.String) }), protocolVersion: graphql.arg({ type: graphql.nonNull(graphql.String) }), supersedesId: graphql.arg({ type: graphql.ID }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const recordContraindicationFinding = field(recordContraindicationFindingTransaction, { consultationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), serviceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), ruleCode: graphql.arg({ type: graphql.nonNull(graphql.String) }), ruleVersion: graphql.arg({ type: graphql.nonNull(graphql.String) }), severity: graphql.arg({ type: graphql.nonNull(graphql.String) }), sourceEvidence: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const decideContraindication = field(decideContraindicationTransaction, { findingId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), providerId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), disposition: graphql.arg({ type: graphql.nonNull(graphql.String) }), rationale: graphql.arg({ type: graphql.nonNull(graphql.String) }), expiresAt: graphql.arg({ type: graphql.String }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const issueClinicalOrder = field(createClinicalOrderTransaction, { consultationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), planId: graphql.arg({ type: graphql.ID }), clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), locationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), serviceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), orderedById: graphql.arg({ type: graphql.nonNull(graphql.ID) }), authorizedPerformerId: graphql.arg({ type: graphql.ID }), supervisorId: graphql.arg({ type: graphql.ID }), indication: graphql.arg({ type: graphql.nonNull(graphql.String) }), protocolVersion: graphql.arg({ type: graphql.nonNull(graphql.String) }), instruction: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), anatomicSite: graphql.arg({ type: graphql.String }), doseRange: graphql.arg({ type: graphql.String }), performerConstraints: graphql.arg({ type: graphql.String }), validUntil: graphql.arg({ type: graphql.nonNull(graphql.String) }), supersedesId: graphql.arg({ type: graphql.ID }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const signTreatmentConsent = field(signConsentTransaction, { clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), serviceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), templateVersionId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), presentedById: graphql.arg({ type: graphql.nonNull(graphql.ID) }), signerName: graphql.arg({ type: graphql.nonNull(graphql.String) }), signerRole: graphql.arg({ type: graphql.nonNull(graphql.String) }), representativeAuthority: graphql.arg({ type: graphql.String }), interpreter: graphql.arg({ type: graphql.String }), witness: graphql.arg({ type: graphql.String }), discussionEvidence: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), signatureEvidence: graphql.arg({ type: graphql.nonNull(graphql.String) }), effectiveUntil: graphql.arg({ type: graphql.String }), supersedesId: graphql.arg({ type: graphql.ID }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const approveTreatmentPlan = field(approveTreatmentPlanTransaction, { expectedConsultationHash: graphql.arg({ type: graphql.String }), clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), consultationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), providerId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), title: graphql.arg({ type: graphql.nonNull(graphql.String) }), goals: graphql.arg({ type: graphql.nonNull(graphql.String) }), startsAt: graphql.arg({ type: graphql.String }), endsAt: graphql.arg({ type: graphql.String }), items: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), supersedesId: graphql.arg({ type: graphql.ID }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const prepareTreatmentSession = field(prepareTreatmentSessionTransaction, { planId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), orderId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), consentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), providerId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), supervisorId: graphql.arg({ type: graphql.ID }), serviceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), roomId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), deviceId: graphql.arg({ type: graphql.ID }), durationMinutes: graphql.arg({ type: graphql.nonNull(graphql.Int) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const startTreatmentSession = field(startTreatmentSessionTransaction, { treatmentSessionId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), protocolVersion: graphql.arg({ type: graphql.nonNull(graphql.String) }), timeOutEvidence: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const recordTreatmentAdministration = field(recordTreatmentAdministrationTransaction, { treatmentSessionId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), orderId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), consentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), performerId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), supervisorId: graphql.arg({ type: graphql.ID }), roomId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), deviceId: graphql.arg({ type: graphql.ID }), protocolVersion: graphql.arg({ type: graphql.nonNull(graphql.String) }), timeOutEvidence: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), anatomicMap: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), deviceSettings: graphql.arg({ type: graphql.JSON }), technique: graphql.arg({ type: graphql.String }), immediateOutcome: graphql.arg({ type: graphql.nonNull(graphql.String) }), aftercare: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), startedAt: graphql.arg({ type: graphql.nonNull(graphql.String) }), completedAt: graphql.arg({ type: graphql.nonNull(graphql.String) }), lots: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), status: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
