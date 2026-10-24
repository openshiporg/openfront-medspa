import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { assertActiveActor } from "../workflowAuth";

/** Owner-only projection. It never returns staff notes, raw intake answers, object keys,
 * authority source documents, incident quality files, or payment-provider data. */
export const clientPortal = graphql.field({
  type: graphql.JSON,
  async resolve(_source,_args,context:Context){
    if(!context.session?.itemId)return{authenticated:false,client:null,appointments:[],benefits:[],treatmentPlans:[],followUps:[],photoConsents:[],rightsRequests:[],releasedAssets:[]};
    const actor=await assertActiveActor(context);const clients=await context.query.Client.findMany({where:{user:{id:{equals:actor.actorId}},practice:{id:{equals:actor.practiceId}}},take:1,query:"id totalVisits user { name email phone }"});const client=clients[0];if(!client)return{authenticated:true,client:null,appointments:[],benefits:[],treatmentPlans:[],followUps:[],photoConsents:[],rightsRequests:[],releasedAssets:[]};
    const appointments=await context.query.Appointment.findMany({where:{practice:{id:{equals:actor.practiceId}},client:{id:{equals:client.id}}},take:100,orderBy:{startTime:"desc"},query:`id startTime endTime duration status bookedAt confirmedAt cancelledAt cancellationReason clientNotes
      location { name timezone } provider { user { name } title } lineItems { id serviceTitle serviceImagePath duration price quantity }
      consultation { id status candidacyDecision reviewedAt signedAt }
      treatmentSessions(where: { status: { in: [completed, stopped] } }) { id serviceTitle status startedAt completedAt signedAt }
      consents { id status signedAt effectiveUntil service { name } templateVersion { version language } }
      administrations { id status startedAt completedAt immediateOutcome aftercareSnapshot service { name } performer { user { name } } }
      payment { id subtotal tax tip discount totalAmount refundedAmount paymentMethod status processedAt refundedAt }
      transaction { id status paymentStatus completedAt lineItems { id itemType quantity unitPrice discount metadata } }
    `});
    const sudo=context.sudo();const [packages,memberships,rights,assets,plans,followUps,photoConsents]=await Promise.all([
      context.query.ClientPackage.findMany({where:{client:{id:{equals:actor.actorId}}},take:100,query:"id status purchasedAt expiresAt totalValue usedValue remainingValue package { name } usageHistory { id valueUsed usedAt service { name } }"}),
      context.query.ClientMembership.findMany({where:{client:{id:{equals:actor.actorId}}},take:100,query:"id status startDate nextBillingDate pausedUntil membership { name monthlyPrice }"}),
      sudo.query.PatientRightsRequest.findMany({where:{practice:{id:{equals:actor.practiceId}},client:{id:{equals:client.id}}},take:100,orderBy:{requestedAt:"desc"},query:"id type status requestedAt dueAt completedAt"}),
      sudo.query.ClientAsset.findMany({where:{practice:{id:{equals:actor.practiceId}},client:{id:{equals:client.id}},releasedToClient:{equals:true},status:{equals:"ready"}},take:100,query:"id category purpose contentType byteSize readyAt accessClass retentionClass retainUntil"}),
      sudo.query.TreatmentPlan.findMany({where:{practice:{id:{equals:actor.practiceId}},client:{id:{equals:client.id}},portalVisible:{equals:true}},take:100,query:"id title goals status startsAt endsAt items { serviceTitle plannedSessions completedSessions status }"}),
      sudo.query.FollowUpTask.findMany({where:{practice:{id:{equals:actor.practiceId}},client:{id:{equals:client.id}}},take:100,orderBy:{dueAt:"desc"},query:"id dueAt title instructions status completedAt actions(orderBy: { occurredAt: desc }, take: 20) { action redFlag occurredAt }"}),
      sudo.query.PhotoConsent.findMany({where:{practice:{id:{equals:actor.practiceId}},client:{id:{equals:client.id}}},take:100,orderBy:{effectiveFrom:"desc"},query:"id purpose status mediaScope audienceScope effectiveFrom effectiveUntil actions(orderBy: { occurredAt: desc }) { action reason scope occurredAt }"}),
    ]);
    const reviewedIds=new Set((appointments.length?await sudo.query.Review.findMany({where:{practice:{id:{equals:actor.practiceId}},appointment:{id:{in:appointments.map((appointment:any)=>appointment.id)}}},take:100,query:"appointment { id }"}):[]).map((review:any)=>review.appointment?.id).filter(Boolean));
    return{authenticated:true,client,appointments:appointments.map((appointment:any)=>({...appointment,reviewed:reviewedIds.has(appointment.id),transaction:appointment.transaction?{id:appointment.transaction.id,status:appointment.transaction.status,paymentStatus:appointment.transaction.paymentStatus,completedAt:appointment.transaction.completedAt,lineItems:appointment.transaction.lineItems.map((line:any)=>({id:line.id,itemType:line.itemType,quantity:line.quantity,unitPrice:line.unitPrice,discount:line.discount,title:line.metadata?.title||null}))}:null})),benefits:{packages,memberships},treatmentPlans:plans,followUps,photoConsents,rightsRequests:rights,releasedAssets:assets};
  },
});
