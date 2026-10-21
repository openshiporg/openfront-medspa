import { randomUUID } from "node:crypto";
import { graphql } from "@keystone-6/core";
import type { ClientAssetCategoryType, Context, PhotoConsentPurposeType } from ".keystone/types";
import { permissions } from "../access";
import { assertPracticeRecord, bounded, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";
import { effectiveHoldsForAsset, LEGAL_HOLD_LOCK_NAMESPACE } from "../legalHoldPolicy";

type Result = { success: boolean; recordId: string | null; status: string | null; error: string | null };
const denied = { success: false, recordId: null, status: null };
function fail(error: unknown): Result { return { ...denied, error: error instanceof Error ? error.message : "Clinical asset workflow failed" }; }

export async function resolveEffectiveHoldsForAsset(sudo: Context, practiceId: string, asset: any, at = new Date()) {
  if (!practiceId || !asset?.id || asset.practice?.id !== practiceId) throw new Error("Asset practice scope is required to resolve legal holds");
  const query = (where: Record<string, unknown>) => sudo.query.LegalHold.findMany({
    where: { practice: { id: { equals: practiceId } }, ...where },
    take: 101,
    query: "id status placedAt releasedAt releaseEvidenceHash releaseReason releaseAuthorityReference releasedBy { id } practice { id } client { id } asset { id } incident { id }",
  });
  const sets = await Promise.all([
    query({ asset: { id: { equals: asset.id } } }),
    asset.client?.id ? query({ client: { id: { equals: asset.client.id } } }) : Promise.resolve([]),
    asset.incident?.id ? query({ incident: { id: { equals: asset.incident.id } } }) : Promise.resolve([]),
  ]);
  if (sets.some((rows) => rows.length > 100)) throw new Error("Legal-hold evidence exceeds the safe verification bound");
  const unique = new Map<string, any>();
  for (const hold of sets.flat()) {
    if (!hold.id) throw new Error("Legal-hold identity is unavailable");
    unique.set(hold.id, hold);
  }
  if (unique.size > 100) throw new Error("Combined legal-hold evidence exceeds the safe verification bound");
  return effectiveHoldsForAsset([...unique.values()], asset, at);
}

export async function grantPhotoConsentTransaction(context: Context, args: {
  clientId: string; appointmentId?: string | null; purpose: PhotoConsentPurposeType; mediaScope: unknown; audienceScope: unknown; signerName: string; signerRole: string; signatureEvidence: string;
  effectiveUntil?: string | null; idempotencyKey: string;
}): Promise<Result> {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !new Set(["clinical_care","measurement","education","marketing"]).has(args.purpose) || !args.signerName.trim() || !args.signatureEvidence.trim()) return { ...denied, error: "Photo-consent evidence is invalid" };
  try {
    const client = await assertPracticeRecord(context, "Client", args.clientId, "id practice { id } user { id }");
    if (args.appointmentId) { const appointment = await assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id }"); if (appointment.client?.id !== client.id) throw new Error("Photo consent appointment does not match the client"); }
    const privileged = permissions.canManageSensitiveRecords({ session: context.session as any });
    if (!privileged && client.user?.id !== context.session.itemId) throw new Error("Photo-consent ownership could not be verified");
    const occurredAt = new Date().toISOString(); const mediaScope = bounded(args.mediaScope); const audienceScope = bounded(args.audienceScope); const evidence = { ...args, mediaScope, audienceScope, signatureEvidenceHash: evidenceHash(args.signatureEvidence), actorId: context.session.itemId, occurredAt }; const hash = evidenceHash(evidence);
    return await serializableWorkflow(context, "medspa-photo-consent", [`client:${client.id}`, `idempotency:${args.idempotencyKey}`], async tx => {
      const consent = await tx.sudo().query.PhotoConsent.createOne({ data: { practice: { connect: { id: client.practice.id } }, client: { connect: { id: client.id } }, appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : undefined, purpose: args.purpose, status: "granted", mediaScope, audienceScope, signerName: args.signerName.trim(), signerRole: args.signerRole.trim(), signatureEvidenceHash: evidence.signatureEvidenceHash, effectiveFrom: occurredAt, effectiveUntil: args.effectiveUntil || undefined, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id status" });
      await tx.sudo().query.PhotoConsentAction.createOne({ data: { practice: { connect: { id: client.practice.id } }, consent: { connect: { id: consent.id } }, actor: { connect: { id: context.session!.itemId } }, action: "grant", reason: "Purpose-specific authorization recorded", scope: { mediaScope, audienceScope }, occurredAt, evidenceHash: hash, idempotencyKey: `${args.idempotencyKey}:grant` }, query: "id" });
      return { success: true, recordId: consent.id, status: consent.status, error: null };
    });
  } catch (error) { return fail(error); }
}

export async function withdrawPhotoConsentTransaction(context: Context, args: { consentId: string; scope?: unknown; reason: string; idempotencyKey: string }): Promise<Result> {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.reason.trim()) return { ...denied, error: "Withdrawal evidence is invalid" };
  try {
    const consent = await assertPracticeRecord(context, "PhotoConsent", args.consentId, "id practice { id } status client { user { id } } purpose");
    const privileged = permissions.canManageSensitiveRecords({ session: context.session as any }); if (!privileged && consent.client?.user?.id !== context.session.itemId) throw new Error("Photo-consent ownership could not be verified");
    if (!["granted","partially_withdrawn"].includes(consent.status)) throw new Error("Photo consent is not withdrawable");
    const normalizedScope = bounded(args.scope || {}); const partial = !Array.isArray(normalizedScope) && normalizedScope !== null && Object.keys(normalizedScope).length > 0; const next = partial ? "partially_withdrawn" : "withdrawn"; const occurredAt = new Date().toISOString(); const hash = evidenceHash({ consentId: consent.id, next, scope: args.scope || null, reason: args.reason.trim(), actorId: context.session.itemId, occurredAt });
    await context.sudo().query.PhotoConsentAction.createOne({ data: { practice: { connect: { id: consent.practice.id } }, consent: { connect: { id: consent.id } }, actor: { connect: { id: context.session.itemId } }, action: partial ? "partial_withdrawal" : "withdrawal", reason: args.reason.trim(), scope: normalizedScope, occurredAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id" });
    await context.sudo().query.PhotoConsent.updateOne({ where: { id: consent.id }, data: { status: next }, query: "id" });
    return { success: true, recordId: consent.id, status: next, error: null };
  } catch (error) { return fail(error); }
}

export async function createClinicalAssetIntentTransaction(context: Context, args: {
  clientId: string; appointmentId?: string | null; treatmentSessionId?: string | null; incidentId?: string | null; noteId?: string | null; photoConsentId?: string | null;
  category: ClientAssetCategoryType; purpose: string; originalFilename: string; contentType: string; byteSize: number; retentionClass: string; retainUntil?: string | null; idempotencyKey: string;
}): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageSensitiveRecords); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.purpose.trim() || !args.contentType.match(/^image\/(jpeg|png|webp)$/) && args.category === "photo" || !Number.isInteger(args.byteSize) || args.byteSize < 1 || args.byteSize > 25_000_000) return { ...denied, error: "Clinical asset metadata is invalid" };
  try {
    const links = await Promise.all([assertPracticeRecord(context, "Client", args.clientId), args.appointmentId ? assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id }") : null, args.treatmentSessionId ? assertPracticeRecord(context, "TreatmentSession", args.treatmentSessionId, "id practice { id } client { id }") : null, args.incidentId ? assertPracticeRecord(context, "Incident", args.incidentId, "id practice { id } client { id }") : null, args.noteId ? assertPracticeRecord(context, "ClientNote", args.noteId, "id practice { id } client { id }") : null, args.photoConsentId ? assertPracticeRecord(context, "PhotoConsent", args.photoConsentId, "id practice { id } client { id }") : null]);
    if (links.slice(1).some((record: any) => record && record.client?.id !== args.clientId)) throw new Error("Clinical asset links do not identify the same client");
    const objectId = randomUUID(); const storageKey = `clinical/${actor.practiceId}/${args.clientId}/${objectId}`; const encryptionKeyReference = process.env.CLINICAL_ASSET_KMS_KEY_ID || "UNCONFIGURED_FAIL_CLOSED";
    if (encryptionKeyReference === "UNCONFIGURED_FAIL_CLOSED") throw new Error("Private clinical object encryption is not configured");
    const asset = await context.sudo().query.ClientAsset.createOne({ data: { practice: { connect: { id: actor.practiceId } }, client: { connect: { id: args.clientId } }, appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : undefined, treatmentSession: args.treatmentSessionId ? { connect: { id: args.treatmentSessionId } } : undefined, incident: args.incidentId ? { connect: { id: args.incidentId } } : undefined, note: args.noteId ? { connect: { id: args.noteId } } : undefined, photoConsent: args.photoConsentId ? { connect: { id: args.photoConsentId } } : undefined, category: args.category, purpose: args.purpose.trim(), storageKey, encryptionKeyReference, storageRegion: process.env.CLINICAL_ASSET_REGION || "private", originalFilename: args.originalFilename, contentType: args.contentType, byteSize: String(args.byteSize), status: "quarantined", accessClass: "clinical_restricted", retentionClass: args.retentionClass, retainUntil: args.retainUntil || undefined, legalHold: false, releasedToClient: false, uploadedBy: { connect: { id: actor.actorId } }, metadata: { privateObject: true, publicUrl: null, uploadIntentOnly: true, idempotencyKey: args.idempotencyKey } }, query: "id status" });
    const eventHash = evidenceHash({ assetId: asset.id, action: "upload_intent", actorId: actor.actorId, purpose: args.purpose, storageKeyHash: evidenceHash(storageKey) });
    await context.sudo().query.AssetAccessEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, asset: { connect: { id: asset.id } }, actor: { connect: { id: actor.actorId } }, action: "upload_intent", purpose: args.purpose, outcome: "pending_private_upload", evidence: { storageKeyHash: evidenceHash(storageKey), encryptionConfigured: true }, evidenceHash: eventHash, occurredAt: new Date().toISOString(), idempotencyKey: args.idempotencyKey }, query: "id" });
    return { success: true, recordId: asset.id, status: asset.status, error: null };
  } catch (error) { return fail(error); }
}

export async function markClinicalAssetReadyTransaction(context: Context, args: { assetId: string; checksum: string; validationEvidence: unknown; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageSensitiveRecords); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !/^[a-f0-9]{64}$/i.test(args.checksum)) return { ...denied, error: "Asset validation evidence is invalid" };
  try {
    const asset = await assertPracticeRecord(context, "ClientAsset", args.assetId, "id practice { id } status contentType byteSize"); if (asset.status !== "quarantined") throw new Error("Only quarantined assets can be validated");
    const occurredAt = new Date().toISOString(); const hash = evidenceHash({ assetId: asset.id, checksum: args.checksum, validationEvidence: args.validationEvidence, actorId: actor.actorId, occurredAt });
    await context.sudo().query.ClientAsset.updateOne({ where: { id: asset.id }, data: { status: "ready", checksum: args.checksum, readyAt: occurredAt }, query: "id" });
    await context.sudo().query.AssetAccessEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, asset: { connect: { id: asset.id } }, actor: { connect: { id: actor.actorId } }, action: "validate", purpose: "private clinical object validation", outcome: "ready", evidence: bounded(args.validationEvidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
    return { success: true, recordId: asset.id, status: "ready", error: null };
  } catch (error) { return fail(error); }
}

export async function authorizeClinicalAssetAccessTransaction(context: Context, args: { assetId: string; action: "view" | "download"; purpose: string; reason: string; idempotencyKey: string }): Promise<Result> {
  if (!context.session?.itemId || !validIdempotencyKey(args.idempotencyKey) || !args.purpose.trim() || !args.reason.trim()) return { ...denied, error: "Asset access purpose and reason are required" };
  try {
    const asset = await assertPracticeRecord(context, "ClientAsset", args.assetId, "id practice { id } status accessClass releasedToClient retainUntil legalHold client { user { id } } appointment { provider { user { id } } } photoConsent { purpose status effectiveUntil }");
    if (asset.status !== "ready") throw new Error("Asset is not available");
    const sensitive = permissions.canManageSensitiveRecords({ session: context.session as any }); const assignedProvider = asset.appointment?.provider?.user?.id === context.session.itemId; const clientOwner = asset.releasedToClient && asset.client?.user?.id === context.session.itemId;
    if (!sensitive && !assignedProvider && !clientOwner) throw new Error("Asset access is not authorized");
    if (asset.accessClass === "marketing_authorized" && (asset.photoConsent?.purpose !== "marketing" || !["granted"].includes(asset.photoConsent.status) || (asset.photoConsent.effectiveUntil && new Date(asset.photoConsent.effectiveUntil) <= new Date()))) throw new Error("Marketing photo authorization is not effective");
    const occurredAt = new Date().toISOString(); const hash = evidenceHash({ assetId: asset.id, action: args.action, purpose: args.purpose, reason: args.reason, actorId: context.session.itemId, occurredAt });
    await context.sudo().query.AssetAccessEvent.createOne({ data: { practice: { connect: { id: asset.practice.id } }, asset: { connect: { id: asset.id } }, actor: { connect: { id: context.session.itemId } }, action: args.action, purpose: args.purpose.trim(), outcome: "authorized_for_private_delivery", reason: args.reason.trim(), evidence: { storageKeyDisclosed: false, publicUrlIssued: false }, evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
    // This operation intentionally returns no object key or URL. A private storage
    // adapter may exchange the audited authorization for a short-lived response.
    return { success: true, recordId: asset.id, status: "authorized_for_private_delivery", error: null };
  } catch (error) { return fail(error); }
}

export async function releaseClinicalAssetTransaction(context: Context, args: { assetId: string; audience: "client" | "marketing"; photoConsentId?: string | null; reason: string; idempotencyKey: string }): Promise<Result> {
  let actor;
  try { actor = requireActorPractice(context, permissions.canManageSensitiveRecords); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || !new Set(["client", "marketing"]).has(args.audience)) return { ...denied, error: "Asset release evidence is invalid" };
  try {
    const initialAsset = await assertPracticeRecord(context, "ClientAsset", args.assetId, "id practice { id } client { id } incident { id }");
    const lockKeys = [
      `asset:${initialAsset.id}`,
      ...(initialAsset.client?.id ? [`client:${initialAsset.client.id}`] : []),
      ...(initialAsset.incident?.id ? [`incident:${initialAsset.incident.id}`] : []),
      `idempotency:${actor.practiceId}:asset-release:${args.idempotencyKey}`,
    ];
    return await serializableWorkflow(context, LEGAL_HOLD_LOCK_NAMESPACE, lockKeys, async tx => {
      const sudo = tx.sudo();
      const asset = await sudo.query.ClientAsset.findOne({
        where: { id: initialAsset.id },
        query: "id practice { id } status legalHold client { id } incident { id }",
      });
      if (!asset || asset.practice?.id !== actor.practiceId
        || asset.client?.id !== initialAsset.client?.id || asset.incident?.id !== initialAsset.incident?.id) {
        throw new Error("Asset scope changed; retry the release request");
      }
      if (asset.status !== "ready") throw new Error("Only validated assets can be released");
      const now = new Date();
      const holds = await resolveEffectiveHoldsForAsset(sudo, actor.practiceId, asset, now);
      if (asset.legalHold || holds.length) throw new Error("Asset, client, or incident is under an effective legal hold");

      let consent: any = null;
      if (args.audience === "marketing") {
        if (!args.photoConsentId) throw new Error("Marketing release requires separate photo authorization");
        consent = await assertPracticeRecord(tx, "PhotoConsent", args.photoConsentId, "id practice { id } purpose status effectiveUntil client { id }");
        if (consent.client?.id !== asset.client?.id || consent.purpose !== "marketing" || consent.status !== "granted"
          || (consent.effectiveUntil && new Date(consent.effectiveUntil) <= now)) throw new Error("Marketing photo authorization is not effective");
      }
      const occurredAt = now.toISOString();
      const hash = evidenceHash({ assetId: asset.id, audience: args.audience, consentId: consent?.id || null, reason: args.reason, actorId: actor.actorId, occurredAt });
      await sudo.query.ClientAsset.updateOne({
        where: { id: asset.id },
        data: { releasedToClient: args.audience === "client", accessClass: args.audience === "client" ? "client_released" : "marketing_authorized", photoConsent: consent ? { connect: { id: consent.id } } : undefined },
        query: "id",
      });
      await sudo.query.AssetAccessEvent.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, asset: { connect: { id: asset.id } }, actor: { connect: { id: actor.actorId } },
        action: "release", purpose: `release to ${args.audience}`, outcome: "authorized_without_public_url", reason: args.reason.trim(),
        evidence: { consentId: consent?.id || null, publicUrlIssued: false }, evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey,
      }, query: "id" });
      return { success: true, recordId: asset.id, status: args.audience === "client" ? "client_released" : "marketing_authorized", error: null };
    });
  } catch (error) { return fail(error); }
}

export async function tombstoneClinicalAssetTransaction(context: Context, args: { assetId: string; reason: string; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageSensitiveRecords); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim() || args.reason.length > 1_000) return { ...denied, error: "Retention disposition evidence is invalid" };
  try {
    const initialAsset = await assertPracticeRecord(context, "ClientAsset", args.assetId, "id practice { id } client { id } incident { id }");
    const scopedKey = `${actor.practiceId}:asset-tombstone:${evidenceHash(args.idempotencyKey)}`;
    const requestHash = evidenceHash({ practiceId: actor.practiceId, assetId: args.assetId, reason: args.reason.trim(), actorId: actor.actorId });
    const lockKeys = [`asset:${initialAsset.id}`, ...(initialAsset.client?.id ? [`client:${initialAsset.client.id}`] : []), ...(initialAsset.incident?.id ? [`incident:${initialAsset.incident.id}`] : []), `idempotency:${scopedKey}`];
    return await serializableWorkflow(context, LEGAL_HOLD_LOCK_NAMESPACE, lockKeys, async tx => {
      const sudo = tx.sudo();
      const prior = (await sudo.query.AssetAccessEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedKey } }, take: 1, query: "id action evidence" }))[0];
      if (prior) {
        if (prior.action !== "tombstone" || prior.evidence?.requestHash !== requestHash) throw new Error("Retention disposition key was reused with different evidence");
        return { success: true, recordId: args.assetId, status: "tombstoned", error: null };
      }
      const asset = await sudo.query.ClientAsset.findOne({ where: { id: args.assetId }, query: "id practice { id } status legalHold retainUntil client { id } incident { id }" });
      if (!asset || asset.practice?.id !== actor.practiceId
        || asset.client?.id !== initialAsset.client?.id || asset.incident?.id !== initialAsset.incident?.id) throw new Error("Clinical asset is unavailable");
      if (asset.status === "tombstoned") throw new Error("Asset metadata is already tombstoned under another request");
      const holds = await resolveEffectiveHoldsForAsset(sudo, actor.practiceId, asset);
      if (asset.legalHold || holds.length) throw new Error("Asset, client, or incident is under an effective legal hold");
      const now = new Date();
      if (!asset.retainUntil || new Date(asset.retainUntil) > now) throw new Error("Asset retention period has not ended");
      const occurredAt = now.toISOString();
      const hash = evidenceHash({ requestHash, occurredAt });
      await sudo.query.ClientAsset.updateOne({ where: { id: asset.id }, data: { status: "tombstoned", tombstonedAt: occurredAt, deletionRequestedAt: occurredAt }, query: "id" });
      await sudo.query.AssetAccessEvent.createOne({ data: {
        practice: { connect: { id: actor.practiceId } }, asset: { connect: { id: asset.id } }, actor: { connect: { id: actor.actorId } },
        action: "tombstone", purpose: "retention disposition", outcome: "metadata_tombstoned_external_object_deletion_not_performed",
        reason: args.reason.trim(), evidence: { requestHash, retentionElapsed: true, legalHold: false, externalObjectDeletion: "not_performed" },
        evidenceHash: hash, occurredAt, idempotencyKey: scopedKey,
      }, query: "id" });
      return { success: true, recordId: asset.id, status: "tombstoned", error: null };
    });
  } catch (error) { return fail(error); }
}

const resultType = graphql.object<Result>()({ name: "ClinicalAssetWorkflowResult", fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), recordId: graphql.field({ type: graphql.ID }), status: graphql.field({ type: graphql.String }), error: graphql.field({ type: graphql.String }) } });
const wrap = (fn: any, args: Record<string, any>) => graphql.field({ type: resultType, args, resolve(_s, values, context: Context) { return fn(context, values); } });
export const grantPhotoConsent = wrap(grantPhotoConsentTransaction, { clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), appointmentId: graphql.arg({ type: graphql.ID }), purpose: graphql.arg({ type: graphql.nonNull(graphql.String) }), mediaScope: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), audienceScope: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), signerName: graphql.arg({ type: graphql.nonNull(graphql.String) }), signerRole: graphql.arg({ type: graphql.nonNull(graphql.String) }), signatureEvidence: graphql.arg({ type: graphql.nonNull(graphql.String) }), effectiveUntil: graphql.arg({ type: graphql.String }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const withdrawPhotoConsent = wrap(withdrawPhotoConsentTransaction, { consentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), scope: graphql.arg({ type: graphql.JSON }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const createClinicalAssetIntent = wrap(createClinicalAssetIntentTransaction, { clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), appointmentId: graphql.arg({ type: graphql.ID }), treatmentSessionId: graphql.arg({ type: graphql.ID }), incidentId: graphql.arg({ type: graphql.ID }), noteId: graphql.arg({ type: graphql.ID }), photoConsentId: graphql.arg({ type: graphql.ID }), category: graphql.arg({ type: graphql.nonNull(graphql.String) }), purpose: graphql.arg({ type: graphql.nonNull(graphql.String) }), originalFilename: graphql.arg({ type: graphql.nonNull(graphql.String) }), contentType: graphql.arg({ type: graphql.nonNull(graphql.String) }), byteSize: graphql.arg({ type: graphql.nonNull(graphql.Int) }), retentionClass: graphql.arg({ type: graphql.nonNull(graphql.String) }), retainUntil: graphql.arg({ type: graphql.String }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const markClinicalAssetReady = wrap(markClinicalAssetReadyTransaction, { assetId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), checksum: graphql.arg({ type: graphql.nonNull(graphql.String) }), validationEvidence: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const authorizeClinicalAssetAccess = wrap(authorizeClinicalAssetAccessTransaction, { assetId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), action: graphql.arg({ type: graphql.nonNull(graphql.String) }), purpose: graphql.arg({ type: graphql.nonNull(graphql.String) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const releaseClinicalAsset = wrap(releaseClinicalAssetTransaction, { assetId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), audience: graphql.arg({ type: graphql.nonNull(graphql.String) }), photoConsentId: graphql.arg({ type: graphql.ID }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const tombstoneClinicalAsset = wrap(tombstoneClinicalAssetTransaction, { assetId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
