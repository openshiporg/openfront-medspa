import { graphql } from "@keystone-6/core";
import type { Context, DeviceReadinessEventActionType, IncidentActionActionType, IncidentSeverityType, IncidentStatusType, RecallActionActionType, RecallCaseStatusType, ResourceReadinessStatusType } from ".keystone/types";
import { permissions } from "../access";
import { assertPracticeRecord, assertProviderActor, bounded, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";
import { hasBlockingDeviceSafetyCase } from "../deviceSafetyReleasePolicy";

type Result = { success: boolean; recordId: string | null; affectedCount: number; status: string | null; error: string | null };
const denied = { success: false, recordId: null, affectedCount: 0, status: null };
const fail = (error: unknown): Result => ({ ...denied, error: error instanceof Error ? error.message : "Safety workflow failed" });

export async function reportIncidentTransaction(context: Context, args: {
  clientId: string; locationId: string; appointmentId?: string | null; treatmentSessionId?: string | null; administrationId?: string | null; suspectLotId?: string | null; suspectDeviceId?: string | null;
  occurredAt: string; onsetAt?: string | null; severity: IncidentSeverityType; summary: string; symptoms: unknown; immediateActions: unknown; idempotencyKey: string;
}): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageSensitiveRecords); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !new Set(["low","moderate","high","critical"]).has(args.severity) || !args.summary.trim()) return { ...denied, error: "Incident evidence is invalid" };
  try {
    const records = await Promise.all([assertPracticeRecord(context, "Client", args.clientId), assertPracticeRecord(context, "Location", args.locationId), args.appointmentId ? assertPracticeRecord(context, "Appointment", args.appointmentId, "id practice { id } client { id } location { id }") : null, args.treatmentSessionId ? assertPracticeRecord(context, "TreatmentSession", args.treatmentSessionId, "id practice { id } client { id } appointment { id } location { id } device { id }") : null, args.administrationId ? assertPracticeRecord(context, "TreatmentAdministration", args.administrationId, "id practice { id } client { id } appointment { id } treatmentSession { id } device { id }") : null, args.suspectLotId ? assertPracticeRecord(context, "InventoryLot", args.suspectLotId) : null, args.suspectDeviceId ? assertPracticeRecord(context, "Resource", args.suspectDeviceId) : null]);
    const appointment = records[2], session = records[3], administration = records[4];
    if ((appointment && (appointment.client?.id !== args.clientId || appointment.location?.id !== args.locationId)) || (session && (session.client?.id !== args.clientId || session.location?.id !== args.locationId || (args.appointmentId && session.appointment?.id !== args.appointmentId))) || (administration && (administration.client?.id !== args.clientId || (args.appointmentId && administration.appointment?.id !== args.appointmentId) || (args.treatmentSessionId && administration.treatmentSession?.id !== args.treatmentSessionId))) || (args.suspectDeviceId && ((administration?.device?.id || session?.device?.id) && (administration?.device?.id || session?.device?.id) !== args.suspectDeviceId))) throw new Error("Incident evidence links do not match");
    return await serializableWorkflow(context, "medspa-incident", [`client:${args.clientId}`, ...(args.suspectDeviceId ? [`device:${args.suspectDeviceId}`] : []), `idempotency:${args.idempotencyKey}`], async tx => {
      const occurredAt = new Date(args.occurredAt).toISOString(); const symptoms = bounded(args.symptoms); const immediateActions = bounded(args.immediateActions); const evidence = { ...args, symptoms, immediateActions, actorId: actor.actorId, reportedAt: new Date().toISOString() }; const hash = evidenceHash(evidence);
      const incident = await tx.sudo().query.Incident.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: args.locationId } }, client: { connect: { id: args.clientId } }, appointment: args.appointmentId ? { connect: { id: args.appointmentId } } : undefined, treatmentSession: args.treatmentSessionId ? { connect: { id: args.treatmentSessionId } } : undefined, administration: args.administrationId ? { connect: { id: args.administrationId } } : undefined, suspectLot: args.suspectLotId ? { connect: { id: args.suspectLotId } } : undefined, suspectDevice: args.suspectDeviceId ? { connect: { id: args.suspectDeviceId } } : undefined, reportedBy: { connect: { id: actor.actorId } }, occurredAt, summary: args.summary.trim(), severity: args.severity, status: args.severity === "critical" ? "under_review" : "open", triageDisposition: args.severity === "critical" ? "immediate_clinician_and_emergency_escalation_required" : "awaiting_clinical_triage", interventions: { symptoms, immediateActions, onsetAt: args.onsetAt || null }, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id status" });
      await tx.sudo().query.IncidentAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, incident: { connect: { id: incident.id } }, actor: { connect: { id: actor.actorId } }, action: "report", toStatus: incident.status, severity: args.severity, rationale: args.summary.trim(), evidence: bounded(evidence), evidenceHash: hash, occurredAt: evidence.reportedAt, idempotencyKey: `${args.idempotencyKey}:report` }, query: "id" });
      if (args.suspectDeviceId && ["high","critical"].includes(args.severity)) await tx.sudo().query.Resource.updateOne({ where: { id: args.suspectDeviceId }, data: { readinessStatus: "incident_lockout", isActive: false }, query: "id" });
      if (args.suspectLotId && ["high","critical"].includes(args.severity)) await tx.sudo().query.InventoryLot.updateOne({ where: { id: args.suspectLotId }, data: { status: "quarantined" }, query: "id" });
      return { success: true, recordId: incident.id, affectedCount: 1, status: incident.status, error: null };
    });
  } catch (error) { return fail(error); }
}

export async function appendIncidentActionTransaction(context: Context, args: { incidentId: string; clinicianId?: string | null; action: Exclude<IncidentActionActionType, 'report'>; toStatus: IncidentStatusType; severity?: IncidentSeverityType | null; rationale: string; evidence: unknown; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageSensitiveRecords); } catch (error) { return fail(error); }
  const actions = new Set(["triage","clinical_review","intervention","referral","emergency_transfer","manufacturer_notice","regulatory_decision","regulatory_submit","capa_assign","capa_verify","clinical_resolve","close"]);
  if (!validIdempotencyKey(args.idempotencyKey) || !actions.has(args.action) || !new Set(["open","under_review","closed"]).has(args.toStatus) || !args.rationale.trim()) return { ...denied, error: "Incident action evidence is invalid" };
  try {
    const incident = await assertPracticeRecord(context, "Incident", args.incidentId, "id practice { id } status severity revision closedAt"); if (args.clinicianId) await assertProviderActor(context, args.clinicianId, actor.actorId);
    if (["triage","clinical_review","intervention","referral","emergency_transfer","clinical_resolve","close"].includes(args.action) && (!args.clinicianId || !permissions.canManageClinical({ session: context.session as any }))) throw new Error("Qualified clinical authority is required for this action");
    if (args.severity && !new Set(["low","moderate","high","critical"]).has(args.severity)) throw new Error("Incident severity is invalid");
    return await serializableWorkflow(context, "medspa-incident-transition", [`incident:${incident.id}`, `idempotency:${actor.practiceId}:${args.idempotencyKey}`], async tx => {
      const sudo = tx.sudo();
      const prior = (await sudo.query.IncidentAction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1, query: "id incident { id } action fromStatus toStatus occurredAt evidenceHash" }))[0];
      if (prior) {
        const retryHash = prior.incident?.id === incident.id ? evidenceHash({ ...args, incidentId: incident.id, fromStatus: prior.fromStatus, actorId: actor.actorId, occurredAt: new Date(prior.occurredAt).toISOString() }) : null;
        if (retryHash !== prior.evidenceHash || prior.action !== args.action || prior.toStatus !== args.toStatus) throw new Error("Incident action key was already used with different evidence");
        return { success: true, recordId: incident.id, affectedCount: 1, status: prior.toStatus, error: null };
      }
      const current = await sudo.query.Incident.findOne({ where: { id: incident.id }, query: "id practice { id } status severity revision closedAt" });
      if (!current || current.practice?.id !== actor.practiceId) throw new Error("Incident not found");
      if (current.status === "closed") throw new Error("Closed incidents cannot be changed without an explicit reopen workflow");
      if (args.action === "close") {
        if (args.toStatus !== "closed" || current.status !== "under_review" || !args.clinicianId || !permissions.canManageClinical({ session: context.session as any })) throw new Error("Closing requires a reviewed incident and qualified clinical authority");
        await assertProviderActor(tx, args.clinicianId, actor.actorId);
      } else {
        if (args.toStatus === "closed") throw new Error("Only the qualified close action can close an incident");
        if (args.toStatus === "open" && current.status !== "open") throw new Error("Incident cannot be reopened without an explicit reopen workflow");
        if (args.toStatus === "under_review" && !["open","under_review"].includes(current.status)) throw new Error("Incident state transition is invalid");
      }
      const occurredAt = new Date().toISOString();
      const evidence = { ...args, incidentId: incident.id, fromStatus: current.status, actorId: actor.actorId, occurredAt };
      const hash = evidenceHash(evidence);
      await sudo.query.IncidentAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, incident: { connect: { id: incident.id } }, actor: { connect: { id: actor.actorId } }, clinician: args.clinicianId ? { connect: { id: args.clinicianId } } : undefined, action: args.action, fromStatus: current.status, toStatus: args.toStatus, severity: args.severity || current.severity, rationale: args.rationale.trim(), evidence: bounded(args.evidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      await sudo.query.Incident.updateOne({ where: { id: incident.id }, data: { status: args.toStatus, severity: args.severity || current.severity, closedAt: args.action === "close" ? occurredAt : undefined, revision: Number(current.revision || 1) + 1 }, query: "id" });
      return { success: true, recordId: incident.id, affectedCount: 1, status: args.toStatus, error: null };
    });
  } catch (error) { return fail(error); }
}

export async function openRecallCaseTransaction(context: Context, args: { locationId: string; lotId?: string | null; deviceId?: string | null; sourceReference: string; scopeReason: string; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canManageSensitiveRecords); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || (!args.lotId && !args.deviceId) || (args.lotId && args.deviceId) || !args.sourceReference.trim() || !args.scopeReason.trim()) return { ...denied, error: "Recall scope is invalid" };
  try {
    await Promise.all([assertPracticeRecord(context, "Location", args.locationId), args.lotId ? assertPracticeRecord(context, "InventoryLot", args.lotId) : Promise.resolve(null), args.deviceId ? assertPracticeRecord(context, "Resource", args.deviceId) : Promise.resolve(null)]);
    return await serializableWorkflow(context, "medspa-recall", [...(args.lotId ? [`lot:${args.lotId}`] : [`device:${args.deviceId}`]), `idempotency:${args.idempotencyKey}`], async tx => {
      const sudo = tx.sudo(); const openedAt = new Date().toISOString(); const hash = evidenceHash({ ...args, actorId: actor.actorId, openedAt });
      if (args.lotId) await sudo.query.InventoryLot.updateOne({ where: { id: args.lotId }, data: { status: "recalled" }, query: "id" });
      if (args.deviceId) await sudo.query.Resource.updateOne({ where: { id: args.deviceId }, data: { readinessStatus: "recall_quarantine", isActive: false }, query: "id" });
      const recall = await sudo.query.RecallCase.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: args.locationId } }, lot: args.lotId ? { connect: { id: args.lotId } } : undefined, device: args.deviceId ? { connect: { id: args.deviceId } } : undefined, openedBy: { connect: { id: actor.actorId } }, sourceReference: args.sourceReference.trim(), scopeReason: args.scopeReason.trim(), status: "quarantined", openedAt, evidenceHash: hash, idempotencyKey: args.idempotencyKey }, query: "id status" });
      await sudo.query.RecallAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, recall: { connect: { id: recall.id } }, actor: { connect: { id: actor.actorId } }, action: "quarantine", reason: args.scopeReason.trim(), evidence: { lotId: args.lotId || null, deviceId: args.deviceId || null }, evidenceHash: hash, occurredAt: openedAt, idempotencyKey: `${args.idempotencyKey}:quarantine` }, query: "id" });
      const administrations = args.lotId
        ? await sudo.query.AdministrationLot.findMany({ where: { lot: { id: { equals: args.lotId } } }, take: 5000, query: "id evidenceHash administration { id client { id } }" })
        : await sudo.query.TreatmentAdministration.findMany({ where: { device: { id: { equals: args.deviceId! } } }, take: 5000, query: "id evidenceHash client { id }" });
      let affectedCount = 0;
      for (const row of administrations as any[]) {
        const administration = args.lotId ? row.administration : row; if (!administration?.id || !administration.client?.id) continue;
        const exposureHash = evidenceHash({ recallId: recall.id, administrationId: administration.id, administrationLotId: args.lotId ? row.id : null, sourceEvidenceHash: row.evidenceHash });
        await sudo.query.RecallExposure.createOne({ data: { practice: { connect: { id: actor.practiceId } }, recall: { connect: { id: recall.id } }, client: { connect: { id: administration.client.id } }, administration: { connect: { id: administration.id } }, administrationLot: args.lotId ? { connect: { id: row.id } } : undefined, status: "identified", identifiedAt: openedAt, notificationDueAt: openedAt, evidenceHash: exposureHash }, query: "id" }); affectedCount += 1;
      }
      await sudo.query.RecallAction.createOne({ data: { practice: { connect: { id: actor.practiceId } }, recall: { connect: { id: recall.id } }, actor: { connect: { id: actor.actorId } }, action: "identify_exposure", reason: "Patient exposure cohort generated from immutable administration evidence", evidence: { affectedCount }, evidenceHash: evidenceHash({ recallId: recall.id, affectedCount, openedAt }), occurredAt: openedAt, idempotencyKey: `${args.idempotencyKey}:cohort` }, query: "id" });
      await sudo.query.RecallCase.updateOne({ where: { id: recall.id }, data: { status: "patients_identified" }, query: "id" });
      return { success: true, recordId: recall.id, affectedCount, status: "patients_identified", error: null };
    });
  } catch (error) { return fail(error); }
}

export async function appendRecallActionTransaction(context: Context,args:{recallId:string;exposureId?:string|null;action:Exclude<RecallActionActionType, 'open'>;reason:string;evidence:unknown;idempotencyKey:string}):Promise<Result>{
  let actor;try{actor=requireActorPractice(context,permissions.canManageSensitiveRecords);}catch(error){return fail(error);}
  const nextByAction:Record<Exclude<RecallActionActionType, 'open'>, RecallCaseStatusType>={assess:"applicability_review",quarantine:"quarantined",identify_exposure:"patients_identified",notify:"notifications_in_progress",clinical_assessment:"notifications_in_progress",dispose:"disposition_complete",close:"closed"};
  if(!nextByAction[args.action]||!validIdempotencyKey(args.idempotencyKey)||!args.reason.trim())return{...denied,error:"Recall action is invalid"};
  try{const recall=await assertPracticeRecord(context,"RecallCase",args.recallId,"id practice { id } status exposures { id status }");const exposure=args.exposureId?await assertPracticeRecord(context,"RecallExposure",args.exposureId,"id practice { id } recall { id } status"):null;if(exposure&&exposure.recall?.id!==recall.id)throw new Error("Recall exposure does not match");if(["clinical_assessment","close"].includes(args.action)&&!permissions.canManageClinical({session:context.session as any}))throw new Error("Qualified clinical authority is required");if(args.action==="close"&&recall.exposures?.some((item:any)=>!["assessed","closed"].includes(item.status)))throw new Error("Recall exposures require documented assessment before closure");const occurredAt=new Date().toISOString();const hash=evidenceHash({...args,fromStatus:recall.status,toStatus:nextByAction[args.action],actorId:actor.actorId,occurredAt});await context.sudo().query.RecallAction.createOne({data:{practice:{connect:{id:actor.practiceId}},recall:{connect:{id:recall.id}},exposure:exposure?{connect:{id:exposure.id}}:undefined,actor:{connect:{id:actor.actorId}},action:args.action,reason:args.reason.trim(),evidence:bounded(args.evidence),evidenceHash:hash,occurredAt,idempotencyKey:args.idempotencyKey},query:"id"});await context.sudo().query.RecallCase.updateOne({where:{id:recall.id},data:{status:nextByAction[args.action],closedAt:args.action==="close"?occurredAt:undefined},query:"id"});if(exposure){const exposureStatus=args.action==="notify"?"notified":args.action==="clinical_assessment"?"assessed":args.action==="close"?"closed":exposure.status;await context.sudo().query.RecallExposure.updateOne({where:{id:exposure.id},data:{status:exposureStatus},query:"id"});}return{success:true,recordId:recall.id,affectedCount:exposure?1:0,status:nextByAction[args.action],error:null};}catch(error){return fail(error);}
}

export async function transitionDeviceReadinessTransaction(context: Context, args: { resourceId: string; action: DeviceReadinessEventActionType; toStatus: ResourceReadinessStatusType; reason: string; qualifiedReleaseProviderId?: string | null; evidence: unknown; idempotencyKey: string }): Promise<Result> {
  let actor; try { actor = requireActorPractice(context, permissions.canSchedule); } catch (error) { return fail(error); }
  if (!validIdempotencyKey(args.idempotencyKey) || !args.reason.trim()) return { ...denied, error: "Device readiness evidence is invalid" };
  if (["maintenance_due", "service", "retire"].includes(args.action) && !permissions.canManageInventory({ session: context.session as any })) return { ...denied, error: "Equipment-custody authority is required" };
  if (args.toStatus === "available" && (!args.qualifiedReleaseProviderId || !permissions.canManageClinical({ session: context.session as any }))) return { ...denied, error: "Qualified clinical release is required" };

  const actionTargets: Record<string, string[]> = { acceptance_test: ["available", "out_of_service"], clean: ["cleaning"], maintenance_due: ["maintenance_due"], lockout: ["incident_lockout"], service: ["out_of_service"], recall_quarantine: ["recall_quarantine"], release: ["available"], retire: ["retired"] };
  if (!actionTargets[args.action]?.includes(args.toStatus)) return { ...denied, error: "Device readiness action does not match the target state" };
  const allowed: Record<string, string[]> = { acceptance_testing: ["available", "out_of_service"], available: ["cleaning", "maintenance_due", "incident_lockout", "recall_quarantine", "retired"], cleaning: ["available", "out_of_service"], maintenance_due: ["out_of_service"], out_of_service: ["available", "retired"], incident_lockout: ["available", "retired"], recall_quarantine: ["available", "retired"] };

  try {
    return await serializableWorkflow(context, "medspa-device-readiness", [`device:${args.resourceId}`, `idempotency:${actor.practiceId}:${args.idempotencyKey}`], async tx => {
      const current = await assertPracticeRecord(tx, "Resource", args.resourceId, "id practice { id } type readinessStatus revision");
      if (!["device", "equipment"].includes(current.type)) throw new Error("Readiness transitions apply only to devices and equipment");
      if (!(allowed[current.readinessStatus] || []).includes(args.toStatus)) throw new Error("Invalid device readiness transition");

      if (args.toStatus === "available") {
        await assertProviderActor(tx, args.qualifiedReleaseProviderId!, actor.actorId);
        const sudo = tx.sudo();
        const [recalls, incidents] = await Promise.all([
          sudo.query.RecallCase.findMany({ where: { practice: { id: { equals: actor.practiceId } }, device: { id: { equals: current.id } }, status: { not: { equals: "closed" } } }, take: 1, query: "id status" }),
          sudo.query.Incident.findMany({ where: { practice: { id: { equals: actor.practiceId } }, suspectDevice: { id: { equals: current.id } }, status: { not: { equals: "closed" } } }, take: 1, query: "id status" }),
        ]);
        if (hasBlockingDeviceSafetyCase(recalls.map((item: any) => item.status), incidents.map((item: any) => item.status))) {
          throw new Error("Device release is blocked by an unresolved recall or incident");
        }
      }

      const occurredAt = new Date().toISOString();
      const hash = evidenceHash({ ...args, fromStatus: current.readinessStatus, actorId: actor.actorId, occurredAt });
      const sudo = tx.sudo();
      await sudo.query.DeviceReadinessEvent.createOne({ data: { practice: { connect: { id: actor.practiceId } }, resource: { connect: { id: current.id } }, actor: { connect: { id: actor.actorId } }, qualifiedReleaseBy: args.qualifiedReleaseProviderId ? { connect: { id: args.qualifiedReleaseProviderId } } : undefined, action: args.action, fromStatus: current.readinessStatus, toStatus: args.toStatus, reason: args.reason.trim(), evidence: bounded(args.evidence), evidenceHash: hash, occurredAt, idempotencyKey: args.idempotencyKey }, query: "id" });
      await sudo.query.Resource.updateOne({ where: { id: current.id }, data: { readinessStatus: args.toStatus, isActive: args.toStatus === "available", releasedAt: args.action === "release" ? occurredAt : undefined, cleanedAt: args.action === "clean" ? occurredAt : undefined, revision: Number(current.revision || 1) + 1 }, query: "id" });
      return { success: true, recordId: current.id, affectedCount: 1, status: args.toStatus, error: null };
    });
  } catch (error) { return fail(error); }
}

const resultType = graphql.object<Result>()({ name: "SafetyWorkflowResult", fields: { success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), recordId: graphql.field({ type: graphql.ID }), affectedCount: graphql.field({ type: graphql.nonNull(graphql.Int) }), status: graphql.field({ type: graphql.String }), error: graphql.field({ type: graphql.String }) } });
const wrap = (fn: any, args: Record<string, any>) => graphql.field({ type: resultType, args, resolve(_s, values, context: Context) { return fn(context, values); } });
export const reportIncident = wrap(reportIncidentTransaction, { clientId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), locationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), appointmentId: graphql.arg({ type: graphql.ID }), treatmentSessionId: graphql.arg({ type: graphql.ID }), administrationId: graphql.arg({ type: graphql.ID }), suspectLotId: graphql.arg({ type: graphql.ID }), suspectDeviceId: graphql.arg({ type: graphql.ID }), occurredAt: graphql.arg({ type: graphql.nonNull(graphql.String) }), onsetAt: graphql.arg({ type: graphql.String }), severity: graphql.arg({ type: graphql.nonNull(graphql.String) }), summary: graphql.arg({ type: graphql.nonNull(graphql.String) }), symptoms: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), immediateActions: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const appendIncidentAction = wrap(appendIncidentActionTransaction, { incidentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), clinicianId: graphql.arg({ type: graphql.ID }), action: graphql.arg({ type: graphql.nonNull(graphql.String) }), toStatus: graphql.arg({ type: graphql.nonNull(graphql.String) }), severity: graphql.arg({ type: graphql.String }), rationale: graphql.arg({ type: graphql.nonNull(graphql.String) }), evidence: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const openRecallCase = wrap(openRecallCaseTransaction, { locationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), lotId: graphql.arg({ type: graphql.ID }), deviceId: graphql.arg({ type: graphql.ID }), sourceReference: graphql.arg({ type: graphql.nonNull(graphql.String) }), scopeReason: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const appendRecallAction = wrap(appendRecallActionTransaction, { recallId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), exposureId: graphql.arg({ type: graphql.ID }), action: graphql.arg({ type: graphql.nonNull(graphql.String) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), evidence: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
export const transitionDeviceReadiness = wrap(transitionDeviceReadinessTransaction, { resourceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), action: graphql.arg({ type: graphql.nonNull(graphql.String) }), toStatus: graphql.arg({ type: graphql.nonNull(graphql.String) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), qualifiedReleaseProviderId: graphql.arg({ type: graphql.ID }), evidence: graphql.arg({ type: graphql.nonNull(graphql.JSON) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) });
