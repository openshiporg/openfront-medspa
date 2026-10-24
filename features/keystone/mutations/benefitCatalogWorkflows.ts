import { createHash } from "node:crypto";
import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { aggregateIdempotencyKey } from "../aggregateIdempotencyKey";
import { assertActiveActor, assertPracticeRecord, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { serializableWorkflow } from "./serializableWorkflow";

type Result = { success: boolean; recordId: string | null; error: string | null };
const denied = { success: false, recordId: null };
const fail = (error: unknown, fallback: string): Result => ({ ...denied, error: error instanceof Error ? error.message : fallback });

const MAX_MINOR = 10_000_000;
const cents = (value: unknown) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_MINOR;

async function financeActor(context: Context) {
  const actor = requireActorPractice(context, permissions.canManageFinance, "Finance access is required");
  await assertActiveActor(context);
  return actor;
}

/** A prior AuditEvent with the same correlation id makes the command a replay. */
async function priorCommand(sudo: any, practiceId: string, action: string, key: string) {
  const rows = await sudo.query.AuditEvent.findMany({
    where: { practice: { id: { equals: practiceId } }, action: { equals: action }, correlationId: { equals: key } },
    take: 1, query: "id resourceId evidenceHash",
  });
  return rows[0] || null;
}

async function audit(sudo: any, actor: { actorId: string; practiceId: string }, action: string, resourceType: string, resourceId: string, key: string, evidence: Record<string, unknown>) {
  const occurredAt = new Date().toISOString();
  await sudo.query.AuditEvent.createOne({
    data: {
      practice: { connect: { id: actor.practiceId } }, actor: { connect: { id: actor.actorId } }, action, resourceType, resourceId,
      correlationId: key, evidence, evidenceHash: evidenceHash({ action, resourceId, evidence }), occurredAt,
    },
    query: "id",
  });
}

async function practiceServiceIds(sudo: any, practiceId: string, ids: readonly string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length > 100) throw new Error("Choose at most 100 treatments");
  if (!unique.length) return [];
  const found = await sudo.query.Service.findMany({ where: { id: { in: unique }, practice: { id: { equals: practiceId } } }, take: 100, query: "id" });
  if (found.length !== unique.length) throw new Error("A selected treatment was not found");
  return unique;
}

async function recordCashPayment(sudo: any, actor: { actorId: string; practiceId: string }, key: string, amount: number, note: string, receiptEmail?: string | null) {
  if (amount <= 0) return null;
  const now = new Date().toISOString();
  return sudo.query.Payment.createOne({
    data: {
      practice: { connect: { id: actor.practiceId } }, idempotencyKey: aggregateIdempotencyKey(actor.practiceId, `${key}:payment`),
      subtotal: amount, tax: 0, tip: 0, discount: 0, totalAmount: amount, paymentMethod: "cash", status: "completed",
      processedBy: { connect: { id: actor.actorId } }, processedAt: now, receiptEmail: receiptEmail || "", notes: note,
    },
    query: "id",
  });
}

export async function upsertMembershipPlanTransaction(context: Context, args: {
  membershipId?: string | null; name: string; description?: string | null; monthlyPrice: number; discountPercent: number;
  includedServiceIds: readonly string[]; isActive: boolean; idempotencyKey: string;
}): Promise<Result> {
  let actor;
  try { actor = await financeActor(context); if (args.membershipId) await assertPracticeRecord(context, "Membership", args.membershipId); }
  catch (error) { return fail(error, "Membership plan not found"); }
  const name = args.name.trim();
  if (!name || name.length > 120 || (args.description?.length || 0) > 2_000) return { ...denied, error: "Enter a name up to 120 characters" };
  if (!cents(args.monthlyPrice)) return { ...denied, error: "Monthly price must be whole cents" };
  if (!Number.isInteger(args.discountPercent) || args.discountPercent < 0 || args.discountPercent > 100) return { ...denied, error: "Discount must be 0–100%" };
  if (!validIdempotencyKey(args.idempotencyKey)) return { ...denied, error: "Request key is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-benefit-catalog", [`membership:${args.membershipId || "new"}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const replay = await priorCommand(sudo, actor.practiceId, "membership_plan.saved", args.idempotencyKey);
      if (replay) return { success: true, recordId: replay.resourceId, error: null };
      const serviceIds = await practiceServiceIds(sudo, actor.practiceId, args.includedServiceIds);
      const data = { name, description: args.description?.trim() || "", monthlyPrice: args.monthlyPrice, discountPercent: args.discountPercent, isActive: args.isActive };
      const record = args.membershipId
        ? await sudo.query.Membership.updateOne({ where: { id: args.membershipId }, data: { ...data, includedServices: { set: serviceIds.map((id) => ({ id })) } }, query: "id" })
        : await sudo.query.Membership.createOne({ data: { ...data, practice: { connect: { id: actor.practiceId } }, includedServices: { connect: serviceIds.map((id) => ({ id })) } }, query: "id" });
      await audit(sudo, actor, "membership_plan.saved", "Membership", record.id, args.idempotencyKey, { ...data, serviceIds });
      return { success: true, recordId: record.id, error: null };
    });
  } catch (error) { return fail(error, "Membership plan could not be saved"); }
}

export async function upsertServicePackageTransaction(context: Context, args: {
  packageId?: string | null; name: string; description?: string | null; totalPrice: number; savingsAmount: number; validDays: number;
  serviceIds: readonly string[]; isActive: boolean; idempotencyKey: string;
}): Promise<Result> {
  let actor;
  try { actor = await financeActor(context); if (args.packageId) await assertPracticeRecord(context, "ServicePackage", args.packageId); }
  catch (error) { return fail(error, "Package not found"); }
  const name = args.name.trim();
  if (!name || name.length > 120 || (args.description?.length || 0) > 2_000) return { ...denied, error: "Enter a name up to 120 characters" };
  if (!cents(args.totalPrice) || args.totalPrice <= 0) return { ...denied, error: "Price must be whole cents above zero" };
  if (!cents(args.savingsAmount)) return { ...denied, error: "Savings must be whole cents" };
  if (!Number.isInteger(args.validDays) || args.validDays < 1 || args.validDays > 1_825) return { ...denied, error: "Validity must be 1–1825 days" };
  if (!args.serviceIds.length) return { ...denied, error: "Choose at least one treatment" };
  if (!validIdempotencyKey(args.idempotencyKey)) return { ...denied, error: "Request key is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-benefit-catalog", [`package:${args.packageId || "new"}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const replay = await priorCommand(sudo, actor.practiceId, "service_package.saved", args.idempotencyKey);
      if (replay) return { success: true, recordId: replay.resourceId, error: null };
      const serviceIds = await practiceServiceIds(sudo, actor.practiceId, args.serviceIds);
      const data = { name, description: args.description?.trim() || "", totalPrice: args.totalPrice, savingsAmount: args.savingsAmount, validDays: args.validDays, isActive: args.isActive };
      const record = args.packageId
        ? await sudo.query.ServicePackage.updateOne({ where: { id: args.packageId }, data: { ...data, services: { set: serviceIds.map((id) => ({ id })) } }, query: "id" })
        : await sudo.query.ServicePackage.createOne({ data: { ...data, practice: { connect: { id: actor.practiceId } }, services: { connect: serviceIds.map((id) => ({ id })) } }, query: "id" });
      await audit(sudo, actor, "service_package.saved", "ServicePackage", record.id, args.idempotencyKey, { ...data, serviceIds });
      return { success: true, recordId: record.id, error: null };
    });
  } catch (error) { return fail(error, "Package could not be saved"); }
}

async function clientUser(context: Context, clientId: string) {
  const client = await assertPracticeRecord(context, "Client", clientId, "id practice { id } user { id email name }");
  if (!client.user?.id) throw new Error("Client has no account to hold this benefit");
  return client.user as { id: string; email?: string | null; name?: string | null };
}

export async function enrollClientMembershipTransaction(context: Context, args: { clientId: string; membershipId: string; startDate: string; idempotencyKey: string }): Promise<Result> {
  let actor, user;
  try {
    actor = await financeActor(context);
    user = await clientUser(context, args.clientId);
    await assertPracticeRecord(context, "Membership", args.membershipId);
  } catch (error) { return fail(error, "Client or membership not found"); }
  const start = new Date(args.startDate);
  if (Number.isNaN(start.getTime())) return { ...denied, error: "Start date is invalid" };
  if (!validIdempotencyKey(args.idempotencyKey)) return { ...denied, error: "Request key is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-membership-enrollment", [`client:${user.id}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const replay = await priorCommand(sudo, actor.practiceId, "client_membership.enrolled", args.idempotencyKey);
      if (replay) return { success: true, recordId: replay.resourceId, error: null };
      const plan = await sudo.query.Membership.findOne({ where: { id: args.membershipId }, query: "id isActive" });
      if (!plan?.isActive) throw new Error("This membership plan is not active");
      const open = await sudo.query.ClientMembership.count({ where: { practice: { id: { equals: actor.practiceId } }, client: { id: { equals: user.id } }, membership: { id: { equals: args.membershipId } }, status: { in: ["active", "paused"] } } });
      if (open) throw new Error("Client already holds this membership");
      const nextBilling = new Date(start); nextBilling.setMonth(nextBilling.getMonth() + 1);
      const record = await sudo.query.ClientMembership.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } }, client: { connect: { id: user.id } }, membership: { connect: { id: args.membershipId } },
          startDate: start.toISOString(), nextBillingDate: nextBilling.toISOString(), status: "active",
        },
        query: "id",
      });
      await audit(sudo, actor, "client_membership.enrolled", "ClientMembership", record.id, args.idempotencyKey, { clientUserId: user.id, membershipId: args.membershipId, startDate: start.toISOString() });
      return { success: true, recordId: record.id, error: null };
    });
  } catch (error) { return fail(error, "Membership enrollment failed"); }
}

export async function sellClientPackageTransaction(context: Context, args: { clientId: string; packageId: string; paidAmount: number; idempotencyKey: string }): Promise<Result> {
  let actor, user;
  try {
    actor = await financeActor(context);
    user = await clientUser(context, args.clientId);
    await assertPracticeRecord(context, "ServicePackage", args.packageId);
  } catch (error) { return fail(error, "Client or package not found"); }
  if (!cents(args.paidAmount)) return { ...denied, error: "Amount paid must be whole cents" };
  if (!validIdempotencyKey(args.idempotencyKey)) return { ...denied, error: "Request key is invalid" };
  try {
    return await serializableWorkflow(context, "medspa-package-sale", [`client:${user.id}`, `idempotency:${args.idempotencyKey}`], async (tx) => {
      const sudo = tx.sudo();
      const replay = await priorCommand(sudo, actor.practiceId, "client_package.sold", args.idempotencyKey);
      if (replay) return { success: true, recordId: replay.resourceId, error: null };
      const plan = await sudo.query.ServicePackage.findOne({ where: { id: args.packageId }, query: "id name isActive totalPrice savingsAmount validDays services { id }" });
      if (!plan?.isActive) throw new Error("This package is not active");
      const serviceIds = (plan.services || []).map((service: { id: string }) => service.id).sort();
      if (!serviceIds.length) throw new Error("This package covers no treatments");
      if (args.paidAmount > Number(plan.totalPrice || 0)) throw new Error("Amount paid exceeds the package price");
      const purchasedAt = new Date();
      const expiresAt = new Date(purchasedAt.getTime() + Number(plan.validDays || 30) * 86_400_000);
      const totalValue = Number(plan.totalPrice || 0) + Number(plan.savingsAmount || 0);
      // Checkout redeems only against this immutable entitlement snapshot.
      const entitlementSnapshot = { snapshotVersion: 1, packageId: plan.id, packageName: plan.name, serviceIds, totalValue, validDays: plan.validDays };
      const record = await sudo.query.ClientPackage.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } }, client: { connect: { id: user.id } }, package: { connect: { id: plan.id } },
          purchasedAt: purchasedAt.toISOString(), expiresAt: expiresAt.toISOString(), status: "active", totalValue, paidAmount: args.paidAmount, usedValue: 0,
          metadata: { entitlementSnapshot, source: "platform_sale" },
        },
        query: "id",
      });
      const payment = await recordCashPayment(sudo, actor, args.idempotencyKey, args.paidAmount, `Package sale ${record.id}`, user.email);
      await audit(sudo, actor, "client_package.sold", "ClientPackage", record.id, args.idempotencyKey, { clientUserId: user.id, packageId: plan.id, paidAmount: args.paidAmount, paymentId: payment?.id || null, entitlementSnapshot });
      return { success: true, recordId: record.id, error: null };
    });
  } catch (error) { return fail(error, "Package sale failed"); }
}

function giftCardCode(seed: string) {
  return createHash("sha256").update(seed).digest("hex").slice(0, 12).toUpperCase().match(/.{1,4}/g)!.join("-");
}

export async function issueGiftCardTransaction(context: Context, args: { amount: number; recipientName?: string | null; recipientEmail?: string | null; message?: string | null; paymentMethod: string; idempotencyKey: string }): Promise<Result> {
  let actor;
  try { actor = await financeActor(context); } catch (error) { return fail(error, "Finance access is required"); }
  if (args.paymentMethod !== "cash") return { ...denied, error: "In-store gift cards are recorded as cash" };
  if (!Number.isInteger(args.amount) || args.amount < 500 || args.amount > 200_000) return { ...denied, error: "Amount must be $5–$2,000" };
  const recipientEmail = args.recipientEmail?.trim().toLowerCase() || "";
  if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return { ...denied, error: "Recipient email is invalid" };
  if ((args.recipientName?.length || 0) > 120 || (args.message?.length || 0) > 1_000) return { ...denied, error: "Recipient details are too long" };
  if (!validIdempotencyKey(args.idempotencyKey)) return { ...denied, error: "Request key is invalid" };
  const scopedKey = aggregateIdempotencyKey(actor.practiceId, `gift-card-issue:${args.idempotencyKey}`);
  try {
    return await serializableWorkflow(context, "medspa-gift-card", [`issue:${scopedKey}`], async (tx) => {
      const sudo = tx.sudo();
      const existing = (await sudo.query.GiftCardTransaction.findMany({ where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: `${scopedKey}:purchase` } }, take: 1, query: "id amount giftCard { id }" }))[0];
      if (existing) {
        if (existing.amount !== args.amount) throw new Error("Request key was already used for another gift card");
        return { success: true, recordId: existing.giftCard?.id || null, error: null };
      }
      const giftCard = await sudo.query.GiftCard.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } }, code: giftCardCode(scopedKey), initialValue: args.amount, currentBalance: args.amount,
          recipientEmail, recipientName: args.recipientName?.trim() || "", message: args.message?.trim() || "", isActive: true,
        },
        query: "id",
      });
      const payment = await recordCashPayment(sudo, actor, scopedKey, args.amount, `Gift card ${giftCard.id}`, recipientEmail);
      await sudo.query.GiftCardTransaction.createOne({
        data: { practice: { connect: { id: actor.practiceId } }, giftCard: { connect: { id: giftCard.id } }, type: "purchase", amount: args.amount, idempotencyKey: `${scopedKey}:purchase`, notes: `cash · payment ${payment?.id || ""}` },
        query: "id",
      });
      await audit(sudo, actor, "gift_card.issued", "GiftCard", giftCard.id, args.idempotencyKey, { amount: args.amount, paymentId: payment?.id || null });
      return { success: true, recordId: giftCard.id, error: null };
    });
  } catch (error) { return fail(error, "Gift card could not be issued"); }
}

const resultType = graphql.object<Result>()({
  name: "BenefitWorkflowResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    recordId: graphql.field({ type: graphql.ID }),
    error: graphql.field({ type: graphql.String }),
  },
});

const id = () => graphql.arg({ type: graphql.ID });
const nonNullId = () => graphql.arg({ type: graphql.nonNull(graphql.ID) });
const str = () => graphql.arg({ type: graphql.String });
const nonNullStr = () => graphql.arg({ type: graphql.nonNull(graphql.String) });
const nonNullInt = () => graphql.arg({ type: graphql.nonNull(graphql.Int) });
const idList = () => graphql.arg({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) });

export const upsertMembershipPlan = graphql.field({
  type: resultType,
  args: { membershipId: id(), name: nonNullStr(), description: str(), monthlyPrice: nonNullInt(), discountPercent: nonNullInt(), includedServiceIds: idList(), isActive: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }), idempotencyKey: nonNullStr() },
  resolve(_source, args, context: Context) { return upsertMembershipPlanTransaction(context, args); },
});

export const upsertServicePackage = graphql.field({
  type: resultType,
  args: { packageId: id(), name: nonNullStr(), description: str(), totalPrice: nonNullInt(), savingsAmount: nonNullInt(), validDays: nonNullInt(), serviceIds: idList(), isActive: graphql.arg({ type: graphql.nonNull(graphql.Boolean) }), idempotencyKey: nonNullStr() },
  resolve(_source, args, context: Context) { return upsertServicePackageTransaction(context, args); },
});

export const enrollClientMembership = graphql.field({
  type: resultType,
  args: { clientId: nonNullId(), membershipId: nonNullId(), startDate: nonNullStr(), idempotencyKey: nonNullStr() },
  resolve(_source, args, context: Context) { return enrollClientMembershipTransaction(context, args); },
});

export const sellClientPackage = graphql.field({
  type: resultType,
  args: { clientId: nonNullId(), packageId: nonNullId(), paidAmount: nonNullInt(), idempotencyKey: nonNullStr() },
  resolve(_source, args, context: Context) { return sellClientPackageTransaction(context, args); },
});

export const issueGiftCard = graphql.field({
  type: resultType,
  args: { amount: nonNullInt(), recipientName: str(), recipientEmail: str(), message: str(), paymentMethod: nonNullStr(), idempotencyKey: nonNullStr() },
  resolve(_source, args, context: Context) { return issueGiftCardTransaction(context, args); },
});
