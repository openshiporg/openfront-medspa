import { graphql } from "@keystone-6/core";
import type { AppointmentResourceReservationPurposeType, Context } from ".keystone/types";
import { permissions } from "../access";
import { evaluateProviderAuthority, recordAuthorityDecision } from "../clinicalAuthority";
import { assertPracticeRecord, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";

type Result = { success: boolean; appointmentId: string | null; reservationCount: number; revision: number | null; error: string | null };
type Segment = { segmentKey: string; serviceId: string; providerId: string; supervisorId?: string | null; resourceId: string; purpose: AppointmentResourceReservationPurposeType; units: number; startsAt: string; endsAt: string };
const denied = { success: false, appointmentId: null, reservationCount: 0, revision: null };
const resourcePurposes = ["room", "device", "equipment", "recovery"] as const satisfies readonly AppointmentResourceReservationPurposeType[];
const isResourcePurpose = (value: string): value is typeof resourcePurposes[number] => resourcePurposes.some(purpose => purpose === value);
function parse(value: unknown): Segment[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) throw new Error("Choose between 1 and 100 resource segments");
  return value.map(raw => {
    const input = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const purpose = String(input.purpose || "");
    if (!isResourcePurpose(purpose)) throw new Error("Resource segment is invalid");
    const segment: Segment = {
      segmentKey: String(input.segmentKey || ""), serviceId: String(input.serviceId || ""), providerId: String(input.providerId || ""),
      supervisorId: input.supervisorId ? String(input.supervisorId) : null, resourceId: String(input.resourceId || ""), purpose,
      units: Number(input.units), startsAt: String(input.startsAt || ""), endsAt: String(input.endsAt || ""),
    };
    const start = new Date(segment.startsAt), end = new Date(segment.endsAt);
    if (!segment.segmentKey || !segment.serviceId || !segment.providerId || !segment.resourceId || !Number.isInteger(segment.units) || segment.units < 1 || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error("Resource segment is invalid");
    return segment;
  });
}

export async function scheduleAppointmentResourcesTransaction(context: Context,args:{appointmentId:string;segments:unknown;reason:string;idempotencyKey:string}):Promise<Result>{
  let actor;try{actor=requireActorPractice(context,permissions.canSchedule,"Authorized scheduling access is required");await assertPracticeRecord(context,"Appointment",args.appointmentId);}catch(error){return{...denied,error:error instanceof Error?error.message:"Appointment not found"};}
  if(!validIdempotencyKey(args.idempotencyKey)||!args.reason.trim())return{...denied,error:"Schedule evidence is invalid"};let segments:Segment[];try{segments=parse(args.segments);}catch(error){return{...denied,error:error instanceof Error?error.message:"Resource segments are invalid"};}
  try{
    for(const segment of segments)await Promise.all([assertPracticeRecord(context,"Service",segment.serviceId),assertPracticeRecord(context,"Provider",segment.providerId),assertPracticeRecord(context,"Resource",segment.resourceId),segment.supervisorId?assertPracticeRecord(context,"Provider",segment.supervisorId):Promise.resolve(null)]);
    return await serializableWorkflow(context,"medspa-resource-reservation",[`appointment:${args.appointmentId}`,...segments.map(s=>`resource:${s.resourceId}`),`idempotency:${args.idempotencyKey}`],async tx=>{
      const sudo=tx.sudo();const appointment=await sudo.query.Appointment.findOne({where:{id:args.appointmentId},query:"id status metadata practice { id } location { id } client { id } revision lineItems { service { id } } resourceReservations { id status revision } supervisorReservations { id status }"});if(!appointment||["completed","cancelled","no_show"].includes(appointment.status))throw new Error("Appointment is not schedulable");
      if ((appointment.metadata as any)?.planBooking) throw new Error("Approved-plan reservations require the exact versioned plan reschedule workflow; generic segment replacement cannot change their evidence");
      const bookedServices=new Set(appointment.lineItems.map((line:any)=>line.service?.id));if(segments.some(segment=>!bookedServices.has(segment.serviceId)))throw new Error("Resource segment service is not booked on this appointment");
      const revision=Math.max(Number(appointment.revision||1),...appointment.resourceReservations.map((item:any)=>Number(item.revision||0)))+1;
      const authorities=[];for(const segment of segments)authorities.push(await evaluateProviderAuthority(sudo,{providerId:segment.providerId,serviceId:segment.serviceId,locationId:appointment.location.id,at:new Date(segment.startsAt),stage:"scheduling",supervisorId:segment.supervisorId}));
      for(const segment of segments){
        if(segment.supervisorId){const conflicts=await sudo.query.AppointmentSupervisorReservation.findMany({where:{supervisor:{id:{equals:segment.supervisorId}},status:{equals:"reserved"},startsAt:{lt:segment.endsAt},endsAt:{gt:segment.startsAt},NOT:{appointment:{id:{equals:appointment.id}}}},take:1,query:"id"});if(conflicts.length)throw new Error("Required supervisor capacity is unavailable");}
        const resource=await sudo.query.Resource.findOne({where:{id:segment.resourceId},query:"id type capacity isActive readinessStatus maintenanceDueAt calibrationDueAt location { id }"});if(!resource||resource.location?.id!==appointment.location.id||resource.isActive===false)throw new Error("Segment resource is unavailable");if(["device","equipment"].includes(resource.type)&&(resource.readinessStatus!=="available"||(resource.maintenanceDueAt&&new Date(resource.maintenanceDueAt)<=new Date(segment.startsAt))||(resource.calibrationDueAt&&new Date(resource.calibrationDueAt)<=new Date(segment.startsAt))))throw new Error("Segment device is not ready");
        const overlaps=await sudo.query.AppointmentResourceReservation.findMany({where:{resource:{id:{equals:resource.id}},status:{in:["reserved","in_use"]},startsAt:{lt:segment.endsAt},endsAt:{gt:segment.startsAt},NOT:{appointment:{id:{equals:appointment.id}}}},take:500,query:"id units"});
        const requestedParallel=segments.filter(other=>other!==segment&&other.resourceId===segment.resourceId&&other.startsAt<segment.endsAt&&other.endsAt>segment.startsAt).reduce((sum,other)=>sum+other.units,0);if(overlaps.reduce((sum:number,item:any)=>sum+Number(item.units||0),0)+requestedParallel+segment.units>Number(resource.capacity||1))throw new Error("Segment resource capacity is unavailable");
      }
      for(const existing of appointment.resourceReservations.filter((item:any)=>["reserved","in_use"].includes(item.status)))await sudo.query.AppointmentResourceReservation.updateOne({where:{id:existing.id},data:{status:"superseded"},query:"id"});
      for(const existing of appointment.supervisorReservations.filter((item:any)=>item.status==="reserved"))await sudo.query.AppointmentSupervisorReservation.updateOne({where:{id:existing.id},data:{status:"superseded"},query:"id"});
      for(const [index,segment]of segments.entries()){const authority=authorities[index];if(segment.supervisorId)await sudo.query.AppointmentSupervisorReservation.createOne({data:{practice:{connect:{id:actor.practiceId}},location:{connect:{id:appointment.location.id}},appointment:{connect:{id:appointment.id}},supervisor:{connect:{id:segment.supervisorId}},service:{connect:{id:segment.serviceId}},startsAt:new Date(segment.startsAt).toISOString(),endsAt:new Date(segment.endsAt).toISOString(),status:"reserved",evidenceHash:authority.evidenceHash,idempotencyKey:`${args.idempotencyKey}:supervisor:${index}`},query:"id"});const hash=evidenceHash({appointmentId:appointment.id,revision,segment,authorityHash:authority.evidenceHash,reason:args.reason,actorId:actor.actorId});await sudo.query.AppointmentResourceReservation.createOne({data:{practice:{connect:{id:actor.practiceId}},location:{connect:{id:appointment.location.id}},appointment:{connect:{id:appointment.id}},resource:{connect:{id:segment.resourceId}},segmentKey:segment.segmentKey,purpose:segment.purpose,units:segment.units,startsAt:new Date(segment.startsAt).toISOString(),endsAt:new Date(segment.endsAt).toISOString(),status:"reserved",revision,assignmentEvidence:{segmentKey:segment.segmentKey,serviceId:segment.serviceId,providerId:segment.providerId,supervisorId:segment.supervisorId||null,authorityHash:authority.evidenceHash,reason:args.reason},evidenceHash:hash,idempotencyKey:`${args.idempotencyKey}:segment:${index}`},query:"id"});await recordAuthorityDecision(tx,authority,{clientId:appointment.client?.id,appointmentId:appointment.id},`${args.idempotencyKey}:authority:${index}`);}
      await sudo.query.Appointment.updateOne({where:{id:appointment.id},data:{revision},query:"id"});return{success:true,appointmentId:appointment.id,reservationCount:segments.length,revision,error:null};
    });
  }catch(error){return{...denied,error:error instanceof Error?error.message:"Resource scheduling failed"};}
}
const resultType=graphql.object<Result>()({name:"ResourceReservationWorkflowResult",fields:{success:graphql.field({type:graphql.nonNull(graphql.Boolean)}),appointmentId:graphql.field({type:graphql.ID}),reservationCount:graphql.field({type:graphql.nonNull(graphql.Int)}),revision:graphql.field({type:graphql.Int}),error:graphql.field({type:graphql.String})}});
export const scheduleAppointmentResources=graphql.field({type:resultType,args:{appointmentId:graphql.arg({type:graphql.nonNull(graphql.ID)}),segments:graphql.arg({type:graphql.nonNull(graphql.JSON)}),reason:graphql.arg({type:graphql.nonNull(graphql.String)}),idempotencyKey:graphql.arg({type:graphql.nonNull(graphql.String)})},resolve(_s,args,context:Context){return scheduleAppointmentResourcesTransaction(context,args);}});
