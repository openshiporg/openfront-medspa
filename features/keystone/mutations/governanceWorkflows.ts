import { graphql } from "@keystone-6/core";
import type { Context, MembershipLedgerEntryTypeType, PatientRightsActionActionType, PatientRightsRequestStatusType, PatientRightsRequestTypeType } from ".keystone/types";
import { permissions } from "../access";
import { assertActiveActor, assertPracticeRecord, bounded, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";
import { resolveEffectiveHoldsForAsset } from "./clinicalAssetWorkflows";
import { LEGAL_HOLD_LOCK_NAMESPACE } from "../legalHoldPolicy";

type Result = { success: boolean; recordId: string | null; status: string | null; error: string | null };
const denied = { success: false, recordId: null, status: null };
const fail = (error: unknown): Result => ({ ...denied, error: error instanceof Error ? error.message : "Governance workflow failed" });

export async function acceptMembershipAgreementTransaction(context: Context, args: { clientMembershipId: string; termsVersion: string; terms: unknown; benefitSnapshot: unknown; renewalDisclosure: unknown; cancellationDisclosure: unknown; signatureEvidence: string; idempotencyKey: string }): Promise<Result> {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.termsVersion.trim() || !args.signatureEvidence.trim()) return { ...denied, error: "Membership agreement evidence is invalid" };
  try {
    const membership = await assertPracticeRecord(context, "ClientMembership", args.clientMembershipId, "id practice { id } status client { id } membership { id monthlyPrice discountPercent isActive practice { id } includedServices { id } } agreements(orderBy: { acceptedAt: desc }, take: 1) { id effectiveUntil } ");
    const finance = permissions.canManageFinance({ session: context.session as any }); if (!finance && membership.client?.id !== context.session.itemId) throw new Error("Membership agreement ownership could not be verified");
    const plan = membership.membership; if (!plan?.isActive || (plan.practice?.id && plan.practice.id !== membership.practice.id)) throw new Error("Membership offer is not currently published");
    const benefitSnapshot = { membershipId: plan.id, discountPercent: Number(plan.discountPercent || 0), includedServiceIds: (plan.includedServices || []).map((service: { id: string }) => service.id).sort() };
    const supplied = args.benefitSnapshot && typeof args.benefitSnapshot === "object" ? args.benefitSnapshot as Record<string, unknown> : {}; const suppliedIds = Array.isArray(supplied.includedServiceIds) ? supplied.includedServiceIds.filter((id): id is string => typeof id === "string").sort() : [];
    if (Number(supplied.discountPercent) !== benefitSnapshot.discountPercent || suppliedIds.join(",") !== benefitSnapshot.includedServiceIds.join(",")) throw new Error("Membership benefits do not match the published offer");
    const acceptedAt = new Date().toISOString(); const termsHash = evidenceHash(args.terms); const evidence = { membershipId: membership.id, termsVersion: args.termsVersion, termsHash, benefitSnapshot, renewalDisclosure: args.renewalDisclosure, cancellationDisclosure: args.cancellationDisclosure, affirmativeConsentHash: evidenceHash(args.signatureEvidence), actorId: context.session.itemId, acceptedAt }; const hash = evidenceHash(evidence);
    return await serializableWorkflow(context, "medspa-membership-agreement", [`membership:${membership.id}`, `idempotency:${args.idempotencyKey}`], async tx => {
      const agreement = await tx.sudo().query.MembershipAgreement.createOne({ data: { practice: { connect: { id: membership.practice.id } }, clientMembership: { connect: { id: membership.id } }, client: { connect: { id: membership.client.id } }, membership: { connect: { id: membership.membership.id } }, termsVersion: args.termsVersion.trim(), termsHash, priceMinorSnapshot: membership.membership.monthlyPrice || 0, currencyCode: "USD", benefitSnapshot, renewalDisclosure: bounded(args.renewalDisclosure), cancellationDisclosure: bounded(args.cancellationDisclosure), affirmativeConsentHash: evidence.affirmativeConsentHash, acceptedAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id" });
      await tx.sudo().query.ClientMembership.updateOne({ where: { id: membership.id }, data: { status: "active" }, query: "id" });
      await tx.sudo().query.MembershipLedgerEntry.createOne({ data: { practice: { connect: { id: membership.practice.id } }, clientMembership: { connect: { id: membership.id } }, agreement: { connect: { id: agreement.id } }, actor: { connect: { id: context.session!.itemId } }, type: "activate", amountMinor: 0, benefitDelta: 0, reason: "Versioned membership agreement accepted", evidence: { agreementEvidenceHash: hash }, occurredAt: acceptedAt, evidenceHash: hash, idempotencyKey: `${args.idempotencyKey}:activate` }, query: "id" });
      return { success: true, recordId: agreement.id, status: "active", error: null };
    });
  } catch (error) { return fail(error); }
}

export async function transitionMembershipTransaction(context: Context, args: { clientMembershipId: string; action: Exclude<MembershipLedgerEntryTypeType, 'activate'>; reason: string; amountMinor?: number; benefitDelta?: number; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageFinance); } catch (error) { return fail(error); }
  const actions = new Set(["renewal_due","charge_authorized","charge_settled","charge_failed","benefit_issue","benefit_use","benefit_reverse","freeze","resume","nonrenew","cancel","expire"]);
  if (!actions.has(args.action) || !validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || !Number.isInteger(args.amountMinor || 0) || !Number.isInteger(args.benefitDelta || 0)) return { ...denied, error: "Membership ledger action is invalid" };
  try {
    const membership = await assertPracticeRecord(context, "ClientMembership", args.clientMembershipId, "id practice { id } status agreements(orderBy: { acceptedAt: desc }, take: 1) { id termsVersion effectiveUntil }"); const agreement = membership.agreements?.[0]; if (!agreement || (agreement.effectiveUntil && new Date(agreement.effectiveUntil) <= new Date())) throw new Error("An effective membership agreement is required");
    const allowed: Record<string,string[]> = { active: ["renewal_due","charge_authorized","charge_settled","charge_failed","benefit_issue","benefit_use","benefit_reverse","freeze","nonrenew","cancel","expire"], paused: ["charge_settled","charge_failed","benefit_reverse","resume","nonrenew","cancel","expire"] }; if (!allowed[membership.status]?.includes(args.action)) throw new Error("Membership transition is invalid"); const transitions: Record<string,string> = { freeze: "paused", resume: "active", nonrenew: "active", cancel: "cancelled", expire: "cancelled" }; const next = transitions[args.action] || membership.status; const occurredAt = new Date().toISOString(); const hash = evidenceHash({ ...args, fromStatus: membership.status, next, agreementId: agreement.id, actorId: actor.actorId, occurredAt });
    await context.sudo().query.MembershipLedgerEntry.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientMembership: { connect: { id: membership.id } }, agreement: { connect: { id: agreement.id } }, actor: { connect: { id: actor.actorId } }, type: args.action, amountMinor: args.amountMinor || 0, benefitDelta: args.benefitDelta || 0, reason: args.reason.trim(), evidence: { fromStatus: membership.status, toStatus: next }, occurredAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id" });
    if (next !== membership.status) await context.sudo().query.ClientMembership.updateOne({ where: { id: membership.id }, data: { status: next, pausedUntil: args.action === "freeze" ? undefined : null }, query: "id" });
    return { success: true, recordId: membership.id, status: next, error: null };
  } catch (error) { return fail(error); }
}

export async function requestPatientRightsTransaction(context: Context, args: { clientId: string; type: PatientRightsRequestTypeType; scope: unknown; idempotencyKey: string }): Promise<Result> {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey)) return { ...denied, error: "Authenticated request evidence is required" };
  try {
    const client = await assertPracticeRecord(context, "Client", args.clientId, "id practice { id } user { id }"); const privileged = permissions.canManageSensitiveRecords({ session: context.session as any }); if (!privileged && client.user?.id !== context.session.itemId) throw new Error("Patient-rights ownership could not be verified");
    const configuredDays = Number(process.env.PATIENT_RIGHTS_RESPONSE_DAYS); const responseDays = Number.isInteger(configuredDays) && configuredDays >= 1 ? configuredDays : 30; /* HIPAA access window unless a practice pins a shorter one */ const requestedAt = new Date().toISOString(); const dueAt = new Date(Date.now() + responseDays * 86_400_000); const hash = evidenceHash({ ...args, actorId: context.session.itemId, requestedAt });
    const request = await context.sudo().query.PatientRightsRequest.createOne({ data: { practice: { connect: { id: client.practice.id } }, client: { connect: { id: client.id } }, requestedBy: { connect: { id: context.session.itemId } }, type: args.type, status: "received", scope: bounded(args.scope), requestedAt, dueAt: dueAt.toISOString(), idempotencyKey: args.idempotencyKey }, query: "id status" });
    await context.sudo().query.PatientRightsAction.createOne({ data: { practice: { connect: { id: client.practice.id } }, request: { connect: { id: request.id } }, actor: { connect: { id: context.session.itemId } }, action: "receive", reason: "Authenticated patient-rights request received", evidence: bounded(args.scope), evidenceHash: hash, occurredAt: requestedAt, idempotencyKey: `${args.idempotencyKey}:receive` }, query: "id" });
    return { success: true, recordId: request.id, status: request.status, error: null };
  } catch (error) { return fail(error); }
}

export async function appendPatientRightsActionTransaction(context: Context, args: { requestId: string; action: Exclude<PatientRightsActionActionType, 'receive'>; reason: string; evidence: unknown; legalBasis?: string | null; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageSensitiveRecords); } catch (error) { return fail(error); }
  const map: Record<Exclude<PatientRightsActionActionType, 'receive'>, PatientRightsRequestStatusType> = { verify_identity: "identity_review", assign: "in_progress", collect_records: "in_progress", approve: "fulfilled", partial: "partially_fulfilled", deny_with_basis: "denied_with_basis", deliver: "fulfilled", close: "closed" };
  if (!map[args.action] || !validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || (args.action === "deny_with_basis" && !args.legalBasis?.trim())) return { ...denied, error: "Patient-rights action is invalid" };
  try {
    const request = await assertPracticeRecord(context, "PatientRightsRequest", args.requestId, "id practice { id } status dueAt"); const occurredAt = new Date().toISOString(); const hash = evidenceHash({ ...args, fromStatus: request.status, toStatus: map[args.action], actorId: actor.actorId, occurredAt });
    await context.sudo().query.PatientRightsAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, request: { connect: { id: request.id } }, actor: { connect: { id: actor.actorId } }, action: args.action, reason: args.reason.trim(), evidence: bounded(args.evidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
    await context.sudo().query.PatientRightsRequest.updateOne({ where: { id: request.id }, data: { status: map[args.action], legalBasis: args.legalBasis || undefined, responseEvidenceHash: hash, completedAt: ["fulfilled","partially_fulfilled","denied_with_basis","closed"].includes(map[args.action]) ? occurredAt : undefined }, query: "id" });
    return { success: true, recordId: request.id, status: map[args.action], error: null };
  } catch (error) { return fail(error); }
}

export async function openBreakGlassTransaction(context: Context, args: { clientId: string; emergencyReason: string; requestedScope: unknown; minutes: number; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageClinical); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.emergencyReason.trim() || !Number.isInteger(args.minutes) || args.minutes < 1 || args.minutes > 60) return { ...denied, error: "Break-glass request is invalid" };
  try {
    await assertPracticeRecord(context, "Client", args.clientId); const openedAt = new Date(); const expiresAt = new Date(openedAt.getTime() + args.minutes * 60_000); const hash = evidenceHash({ ...args, actorId: actor.actorId, openedAt: openedAt.toISOString(), expiresAt: expiresAt.toISOString() });
    const record = await context.sudo().query.BreakGlassEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, client: { connect: { id: args.clientId } }, actor: { connect: { id: actor.actorId } }, status: "opened", emergencyReason: args.emergencyReason.trim(), requestedScope: bounded(args.requestedScope), openedAt: openedAt.toISOString(), expiresAt: expiresAt.toISOString(), evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id status" });
    await context.sudo().query.AuditEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action: "clinical.break_glass.opened", resourceType: "Client", resourceId: args.clientId, correlationId: args.idempotencyKey, evidence: { breakGlassId: record.id, reasonHash: evidenceHash(args.emergencyReason), expiresAt: expiresAt.toISOString() }, evidenceHash: hash, occurredAt: openedAt.toISOString() }, query: "id" });
    return { success: true, recordId: record.id, status: record.status, error: null };
  } catch (error) { return fail(error); }
}

export async function publishRetentionPolicyTransaction(context: Context, args: { jurisdiction: string; recordClass: string; version: string; retainMonths: number; minorsRule?: string | null; dispositionRule: string; sourceCitations: string; effectiveFrom: string; effectiveUntil?: string | null; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageSensitiveRecords); const fresh = await assertActiveActor(context); if (fresh.role?.canManagePractice !== true || fresh.role?.canManageSensitiveRecords !== true) throw new Error("Practice-owner approval is required"); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.sourceCitations.trim() || !Number.isInteger(args.retainMonths) || args.retainMonths < 1) return { ...denied, error: "Retention policy pack is incomplete" };
  try {
    const hash = evidenceHash({ ...args, approvedBy: actor.actorId }); const policy = await context.sudo().query.RetentionPolicy.createOne({ data: { practice: { connect: { id: actor.practiceId } }, jurisdiction: args.jurisdiction.trim(), recordClass: args.recordClass.trim(), version: args.version.trim(), retainMonths: args.retainMonths, minorsRule: args.minorsRule || "", dispositionRule: args.dispositionRule.trim(), sourceCitations: args.sourceCitations.trim(), approvedBy: { connect: { id: actor.actorId } }, effectiveFrom: new Date(args.effectiveFrom).toISOString(), effectiveUntil: args.effectiveUntil ? new Date(args.effectiveUntil).toISOString() : undefined, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id" }); return { success: true, recordId: policy.id, status: "effective", error: null };
  } catch (error) { return fail(error); }
}

export async function placeLegalHoldTransaction(context: Context, args: { clientId?: string | null; assetId?: string | null; incidentId?: string | null; reason: string; authorityReference: string; idempotencyKey: string }): Promise<Result> {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
    const fresh = await assertActiveActor(context);
    if (fresh.role?.canManagePractice !== true || fresh.role?.canManageSensitiveRecords !== true) throw new Error("Practice-owner approval is required");
  } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || (!args.clientId && !args.assetId && !args.incidentId) || !args.reason.trim() || args.reason.length > 1_000 || !args.authorityReference.trim() || args.authorityReference.length > 500) return { ...denied, error: "Legal-hold evidence is incomplete" };
  try {
    const scopedKey = `${actor.practiceId}:legal-hold:${evidenceHash(args.idempotencyKey)}`;
    const requestHash = evidenceHash({ practiceId: actor.practiceId, clientId: args.clientId || null, assetId: args.assetId || null, incidentId: args.incidentId || null, reason: args.reason.trim(), authorityReference: args.authorityReference.trim(), actorId: actor.actorId });
    const lockKeys = [`idempotency:${scopedKey}`, ...(args.clientId ? [`client:${args.clientId}`] : []), ...(args.assetId ? [`asset:${args.assetId}`] : []), ...(args.incidentId ? [`incident:${args.incidentId}`] : [])];
    return await serializableWorkflow(context, LEGAL_HOLD_LOCK_NAMESPACE, lockKeys, async tx => {
      const sudo = tx.sudo();
      const prior = (await sudo.query.LegalHold.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedKey } }, take: 1, query: "id status evidenceHash" }))[0];
      if (prior) {
        if (prior.evidenceHash !== requestHash) throw new Error("Legal-hold key was reused with different evidence");
        return { success: true, recordId: prior.id, status: prior.status, error: null };
      }
      const [client, asset, incident] = await Promise.all([
        args.clientId ? assertPracticeRecord(tx, "Client", args.clientId, "id practice { id }") : Promise.resolve(null),
        args.assetId ? assertPracticeRecord(tx, "ClientAsset", args.assetId, "id practice { id } client { id } incident { id }") : Promise.resolve(null),
        args.incidentId ? assertPracticeRecord(tx, "Incident", args.incidentId, "id practice { id } client { id }") : Promise.resolve(null),
      ]);
      if (asset && ((client && asset.client?.id !== client.id) || (incident && asset.incident?.id !== incident.id))) throw new Error("Legal-hold targets do not describe the same record scope");
      if (client && incident && incident.client?.id !== client.id) throw new Error("Legal-hold client and incident do not match");
      const placedAt = new Date().toISOString();
      const hold = await sudo.query.LegalHold.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, client: client ? { connect: { id: client.id } } : undefined,
        asset: asset ? { connect: { id: asset.id } } : undefined, incident: incident ? { connect: { id: incident.id } } : undefined,
        status: "active", reason: args.reason.trim(), authorityReference: args.authorityReference.trim(), placedBy: { connect: { id: actor.actorId } },
        placedAt, evidenceHash: requestHash, idempotencyKey: scopedKey,
      }, query: "id status" });
      if (asset) await sudo.query.ClientAsset.updateOne({ where: { id: asset.id }, data: { legalHold: true }, query: "id" });
      return { success: true, recordId: hold.id, status: hold.status, error: null };
    });
  } catch (error) { return fail(error); }
}

export async function releaseLegalHoldTransaction(context: Context, args: { legalHoldId: string; reason: string; authorityReference: string; idempotencyKey: string }): Promise<Result> {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageSensitiveRecords);
    const fresh = await assertActiveActor(context);
    if (fresh.role?.canManagePractice !== true || fresh.role?.canManageSensitiveRecords !== true) throw new Error("Practice-owner approval is required");
  } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || args.reason.length > 1_000 || !args.authorityReference.trim() || args.authorityReference.length > 500) return { ...denied, error: "Legal-hold release evidence is incomplete" };
  try {
    const initial = await assertPracticeRecord(context, "LegalHold", args.legalHoldId, "id practice { id } status asset { id client { id } incident { id } } client { id } incident { id } placedAt releasedAt releaseEvidenceHash");
    const requestHash = evidenceHash({ practiceId: actor.practiceId, holdId: initial.id, reason: args.reason.trim(), authorityReference: args.authorityReference.trim(), actorId: actor.actorId });
    const lockKeys = [`hold:${initial.id}`, ...(initial.asset?.id ? [`asset:${initial.asset.id}`] : []), ...(initial.asset?.client?.id ? [`client:${initial.asset.client.id}`] : []), ...(initial.asset?.incident?.id ? [`incident:${initial.asset.incident.id}`] : []), ...(initial.client?.id ? [`client:${initial.client.id}`] : []), ...(initial.incident?.id ? [`incident:${initial.incident.id}`] : [])];
    return await serializableWorkflow(context, LEGAL_HOLD_LOCK_NAMESPACE, lockKeys, async tx => {
      const sudo = tx.sudo();
      const hold = await sudo.query.LegalHold.findOne({ where: { id: initial.id }, query: "id status practice { id } asset { id client { id } incident { id } } client { id } incident { id } placedAt releasedAt releaseEvidenceHash" });
      if (!hold || hold.practice?.id !== actor.practiceId) throw new Error("Legal hold is unavailable");
      const refreshAssetHoldMirror = async () => {
        if (!hold.asset?.id) return;
        const asset = await sudo.query.ClientAsset.findOne({ where: { id: hold.asset.id }, query: "id practice { id } client { id } incident { id }" });
        if (!asset || asset.practice?.id !== actor.practiceId) return;
        const remainingHolds = await resolveEffectiveHoldsForAsset(sudo, actor.practiceId, asset);
        await sudo.query.ClientAsset.updateOne({ where: { id: asset.id }, data: { legalHold: remainingHolds.length > 0 }, query: "id" });
      };
      if (hold.status === "released") {
        if (hold.releaseEvidenceHash !== requestHash) throw new Error("Legal hold was released with different evidence");
        await refreshAssetHoldMirror();
        return { success: true, recordId: hold.id, status: "released", error: null };
      }
      if (hold.status !== "active") throw new Error("Legal hold is not releasable");
      const releasedAt = new Date().toISOString();
      await sudo.query.LegalHold.updateOne({ where: { id: hold.id }, data: {
        status: "released", releasedBy: { connect: { id: actor.actorId } }, releasedAt, releaseReason: args.reason.trim(),
        releaseAuthorityReference: args.authorityReference.trim(), releaseEvidenceHash: requestHash,
      }, query: "id" });
      await refreshAssetHoldMirror();
      return { success: true, recordId: hold.id, status: "released", error: null };
    });
  } catch (error) { return fail(error); }
}

const resultType = graphql.object<Result>()({ name: "GovernanceWorkflowResult", fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), recordId: graphql.field({ type: graphql.ID }), status: graphql.field({ type: graphql.String }), error: graphql.field({ type: graphql.String }) } });
const wrap = (fn: any, args: Record<string, any>) => graphql.field({ type: resultType, args, resolve(_s, values, context: Context) { return fn(context, values); } });
export const acceptMembershipAgreement = wrap(acceptMembershipAgreementTransaction, { clientMembershipId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), termsVersion: graphql.arg({ type: graphql.nonNull(graphql.String) }), terms: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), benefitSnapshot: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), renewalDisclosure: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), cancellationDisclosure: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), signatureEvidence: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const transitionMembership = wrap(transitionMembershipTransaction, { clientMembershipId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), action: graphql.arg({ type: graphql.nonNull(graphql.String) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), amountMinor: graphql.arg({ type: graphql.Int }), benefitDelta: graphql.arg({ type: graphql.Int }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const requestPatientRights = wrap(requestPatientRightsTransaction, { clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), type: graphql.arg({ type: graphql.nonNull(graphql.String) }), scope: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const appendPatientRightsAction = wrap(appendPatientRightsActionTransaction, { requestId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), action: graphql.arg({ type: graphql.nonNull(graphql.String) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), evidence: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), legalBasis: graphql.arg({ type: graphql.String }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const openBreakGlass = wrap(openBreakGlassTransaction, { clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), emergencyReason: graphql.arg({ type: graphql.nonNull(graphql.String) }), requestedScope: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), minutes: graphql.arg({ type: graphql.nonNull(graphql.Int) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const placeLegalHold = wrap(placeLegalHoldTransaction, { clientId: graphql.arg({ type: graphql.ID }), assetId: graphql.arg({ type: graphql.ID }), incidentId: graphql.arg({ type: graphql.ID }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), authorityReference: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const releaseLegalHold = wrap(releaseLegalHoldTransaction, { legalHoldId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), authorityReference: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const publishRetentionPolicy = wrap(publishRetentionPolicyTransaction, { jurisdiction: graphql.arg({ type: graphql.nonNull(graphql.String) }), recordClass: graphql.arg({ type: graphql.nonNull(graphql.String) }), version: graphql.arg({ type: graphql.nonNull(graphql.String) }), retainMonths: graphql.arg({ type: graphql.nonNull(graphql.Int) }), minorsRule: graphql.arg({ type: graphql.String }), dispositionRule: graphql.arg({ type: graphql.nonNull(graphql.String) }), sourceCitations: graphql.arg({ type: graphql.nonNull(graphql.String) }), effectiveFrom: graphql.arg({ type: graphql.nonNull(graphql.String) }), effectiveUntil: graphql.arg({ type: graphql.String }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
