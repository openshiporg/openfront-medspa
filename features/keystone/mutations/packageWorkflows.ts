import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { serializableWorkflow } from "./serializableWorkflow";
import { assertPracticeRecord, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";

type PackageResult = {
  success: boolean; clientPackageId: string | null; usageId: string | null;
  usedValue: number | null; remainingValue: number | null; status: string | null; error: string | null;
};

export async function redeemClientPackageTransaction(
  context: Context,
  args: { clientPackageId: string; appointmentId: string; serviceId: string; valueUsed: number; idempotencyKey: string },
): Promise<PackageResult> {
  const denied = { success: false, clientPackageId: null, usageId: null, usedValue: null, remainingValue: null, status: null };
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
    await Promise.all([assertPracticeRecord(context, "ClientPackage", args.clientPackageId), assertPracticeRecord(context, "Appointment", args.appointmentId), assertPracticeRecord(context, "Service", args.serviceId)]);
  } catch (error) { return { ...denied, error: error instanceof Error ? error.message : "Package record not found" }; }
  if (!Number.isInteger(args.valueUsed) || args.valueUsed <= 0 || args.valueUsed > 10_000_000) return { ...denied, error: "Package usage must be positive integer cents" };
  if (!args.idempotencyKey?.trim() || args.idempotencyKey.length < 12 || args.idempotencyKey.length > 200) return { ...denied, error: "Idempotency key is invalid" };

  try {
    return await serializableWorkflow(context, "medspa-domain-resource", [
      `appointment:${args.appointmentId}`,
      `package:${args.clientPackageId}`,
      `idempotency:${args.idempotencyKey}`,
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.ClientPackageUsage.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: args.idempotencyKey } }, take: 1,
        query: "id valueUsed clientPackage { id totalValue usedValue status } appointment { id } service { id }",
      }))[0];
      if (existing) {
        if (existing.clientPackage?.id !== args.clientPackageId || existing.appointment?.id !== args.appointmentId || existing.service?.id !== args.serviceId || existing.valueUsed !== args.valueUsed) {
          throw new Error("Idempotency key was already used for another package operation");
        }
        return {
          success: true, clientPackageId: args.clientPackageId, usageId: existing.id,
          usedValue: existing.clientPackage.usedValue,
          remainingValue: Math.max(0, existing.clientPackage.totalValue - existing.clientPackage.usedValue),
          status: existing.clientPackage.status, error: null,
        };
      }

      const clientPackage = await sudo.query.ClientPackage.findOne({
        where: { id: args.clientPackageId },
        query: "id status totalValue usedValue expiresAt client { id } package { services { id } }",
      });
      const appointment = await sudo.query.Appointment.findOne({
        where: { id: args.appointmentId },
        query: "id status client { user { id } } lineItems { service { id } price quantity }",
      });
      if (!clientPackage || !appointment) throw new Error("Package or appointment not found");
      if (!new Set(["confirmed", "in_progress"]).has(appointment.status || "")) throw new Error("Appointment is not eligible for package usage");
      if (clientPackage.status !== "active") throw new Error("Package is not active");
      if (clientPackage.expiresAt && new Date(clientPackage.expiresAt).getTime() <= Date.now()) throw new Error("Package has expired");
      if (!appointment.client?.user?.id || clientPackage.client?.id !== appointment.client.user.id) throw new Error("Package does not belong to the appointment client");
      if (!clientPackage.package?.services?.some((service: any) => service.id === args.serviceId)) throw new Error("Package does not cover this service");
      const line = appointment.lineItems.find((item: any) => item.service?.id === args.serviceId);
      if (!line) throw new Error("Service is not part of the appointment");
      const lineValue = Number(line.price || 0) * Number(line.quantity || 1);
      const remaining = Math.max(0, Number(clientPackage.totalValue || 0) - Number(clientPackage.usedValue || 0));
      if (args.valueUsed > remaining || args.valueUsed > lineValue) throw new Error("Package usage exceeds the available value");

      const usedValue = Number(clientPackage.usedValue || 0) + args.valueUsed;
      const status = usedValue >= Number(clientPackage.totalValue || 0) ? "fully-used" : "active";
      await sudo.query.ClientPackage.updateOne({ where: { id: clientPackage.id }, data: { usedValue, status }, query: "id" });
      const usage = await sudo.query.ClientPackageUsage.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } }, clientPackage: { connect: { id: clientPackage.id } }, appointment: { connect: { id: appointment.id } },
          service: { connect: { id: args.serviceId } }, quantityUsed: 1, valueUsed: args.valueUsed,
          idempotencyKey: args.idempotencyKey,
        },
        query: "id",
      });
      await sudo.query.ClientPackageAdjustment.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientPackage: { connect: { id: clientPackage.id } }, usage: { connect: { id: usage.id } }, actor: { connect: { id: actor.actorId } }, type: "consume", valueDelta: -args.valueUsed, reason: "Controlled package redemption", evidence: { appointmentId: appointment.id, serviceId: args.serviceId }, occurredAt: new Date().toISOString(), evidenceHash: evidenceHash({ usageId: usage.id, valueDelta: -args.valueUsed }), idempotencyKey: `${args.idempotencyKey}:adjustment` }, query: "id" });
      return { success: true, clientPackageId: clientPackage.id, usageId: usage.id, usedValue, remainingValue: Math.max(0, Number(clientPackage.totalValue || 0) - usedValue), status, error: null };
    });
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Package usage failed" };
  }
}

export async function reverseClientPackageUsageTransaction(context: Context,args:{usageId:string;reason:string;idempotencyKey:string}):Promise<PackageResult>{
  const denied={success:false,clientPackageId:null,usageId:null,usedValue:null,remainingValue:null,status:null};let actor;try{actor=requireActorPractice(context,permissions.canManageFinance);await assertPracticeRecord(context,"ClientPackageUsage",args.usageId);}catch(error){return{...denied,error:error instanceof Error?error.message:"Package usage not found"};}if(!validIdempotencyKey(args.idempotencyKey)||!args.reason.trim())return{...denied,error:"Package reversal evidence is invalid"};try{return await serializableWorkflow(context,"medspa-package-reversal",[`usage:${args.usageId}`,`idempotency:${args.idempotencyKey}`],async tx=>{const sudo=tx.sudo();const usage=await sudo.query.ClientPackageUsage.findOne({where:{id:args.usageId},query:"id valueUsed clientPackage { id totalValue usedValue status }"});if(!usage?.clientPackage)throw new Error("Package usage not found");const existing=await sudo.query.ClientPackageAdjustment.findMany({where:{usage:{id:{equals:usage.id}},type:{equals:"reverse"}},take:1,query:"id"});if(existing.length)throw new Error("Package usage is already reversed");const usedValue=Math.max(0,Number(usage.clientPackage.usedValue||0)-Number(usage.valueUsed||0));await sudo.query.ClientPackage.updateOne({where:{id:usage.clientPackage.id},data:{usedValue,status:"active"},query:"id"});await sudo.query.ClientPackageAdjustment.createOne({data:{practice:{connect:{id:actor.practiceId}},clientPackage:{connect:{id:usage.clientPackage.id}},usage:{connect:{id:usage.id}},actor:{connect:{id:actor.actorId}},type:"reverse",valueDelta:Number(usage.valueUsed||0),reason:args.reason.trim(),evidence:{reversesUsageId:usage.id},occurredAt:new Date().toISOString(),evidenceHash:evidenceHash({usageId:usage.id,valueDelta:Number(usage.valueUsed||0),reason:args.reason}),idempotencyKey:args.idempotencyKey},query:"id"});return{success:true,clientPackageId:usage.clientPackage.id,usageId:usage.id,usedValue,remainingValue:Math.max(0,Number(usage.clientPackage.totalValue||0)-usedValue),status:"active",error:null};});}catch(error){return{...denied,error:error instanceof Error?error.message:"Package reversal failed"};}
}

const resultType = graphql.object<PackageResult>()({
  name: "RedeemClientPackageResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }), clientPackageId: graphql.field({ type: graphql.ID }),
    usageId: graphql.field({ type: graphql.ID }), usedValue: graphql.field({ type: graphql.Int }),
    remainingValue: graphql.field({ type: graphql.Int }), status: graphql.field({ type: graphql.String }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const reverseClientPackageUsage = graphql.field({ type: resultType, args: { usageId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), reason: graphql.arg({ type: graphql.nonNull(graphql.String) }), idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }) }, resolve(_source,args,context:Context){ return reverseClientPackageUsageTransaction(context,args); } });

export const redeemClientPackage = graphql.field({
  type: resultType,
  args: {
    clientPackageId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    serviceId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    valueUsed: graphql.arg({ type: graphql.nonNull(graphql.Int) }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) {
    return redeemClientPackageTransaction(context, args);
  },
});
