import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { aggregateIdempotencyKey } from "../aggregateIdempotencyKey";
import { confirmProviderPayment, createProviderPaymentSession, paymentProviderFromRecord } from "../utils/paymentProviderAdapter";
import { serializableWorkflow } from "./serializableWorkflow";
import { recordInventoryMovement } from "./inventoryWorkflows";
import { getRuntimeLocation } from "../scheduling/availability";
import { assertPracticeRecord, evidenceHash, requireActorPractice } from "../workflowAuth";

import { configuredTaxRate, parseRetail, type RetailInput } from "../checkoutInput";
import { commissionMinor } from "../commissionAmount";

type CheckoutResult = { success: boolean; transactionId: string | null; paymentId: string | null; error: string | null };

export async function completeAppointmentCheckoutTransaction(
  context: Context,
  args: {
    appointmentId: string; paymentMethod: string; tipAmount: number; discountAmount: number; discountReason?: string | null;
    retailItems?: unknown; clientPackageId?: string | null; clientMembershipId?: string | null; idempotencyKey: string;
  },
): Promise<CheckoutResult> {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
    await assertPracticeRecord(context, "Appointment", args.appointmentId);
  } catch (error) {
    return { success: false, transactionId: null, paymentId: null, error: error instanceof Error ? error.message : "Appointment not found" };
  }
  if (!args.idempotencyKey?.trim() || args.idempotencyKey.length < 12) {
    return { success: false, transactionId: null, paymentId: null, error: "A valid idempotency key is required" };
  }
  let retail: RetailInput[];
  try {
    retail = parseRetail(args.retailItems);
    if (args.paymentMethod !== "cash") throw new Error("Controlled checkout currently supports operator-recorded cash only");
    if (args.discountAmount > 0 && (!permissions.canManagePractice({ session: context.session as any }) || !args.discountReason?.trim() || args.discountReason.length > 1_000)) throw new Error("Discretionary discounts require current practice-manager authority and a reason");
    if (!Number.isInteger(args.tipAmount) || !Number.isInteger(args.discountAmount)
      || args.tipAmount < 0 || args.discountAmount < 0 || args.tipAmount > 10_000_000 || args.discountAmount > 10_000_000) {
      throw new Error("Checkout amounts must be nonnegative integer cents");
    }
  } catch (error) {
    return { success: false, transactionId: null, paymentId: null, error: error instanceof Error ? error.message : "Invalid checkout input" };
  }

  const scopedCheckoutKey = aggregateIdempotencyKey(actor.practiceId, `checkout:${evidenceHash(args.idempotencyKey)}`);
  const checkoutRequestHash = evidenceHash({ practiceId: actor.practiceId, appointmentId: args.appointmentId, paymentMethod: args.paymentMethod, tipAmount: args.tipAmount, discountAmount: args.discountAmount, discountReason: args.discountReason?.trim() || null, retail, clientPackageId: args.clientPackageId || null, clientMembershipId: args.clientMembershipId || null });
  try {
    return await serializableWorkflow(context, "medspa-domain-resource", [
      `appointment:${args.appointmentId}`,
      scopedCheckoutKey,
      ...(args.clientPackageId ? [`package:${args.clientPackageId}`] : []),
      ...(args.clientMembershipId ? [`membership:${args.clientMembershipId}`] : []),
      ...retail.map((item) => `product:${item.productId}`),
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const existing = (await sudo.query.PaymentSession.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedCheckoutKey } }, take: 1,
        query: "id data payment { id appointment { id transaction { id } } }",
      }))[0];
      if (existing?.payment?.id) {
        if (existing.payment.appointment?.id !== args.appointmentId || existing.data?.checkoutRequestHash !== checkoutRequestHash) throw new Error("Idempotency key was already used for another checkout request");
        return { success: true, transactionId: existing.payment.appointment?.transaction?.id || null, paymentId: existing.payment.id, error: null };
      }

      const appointment = await sudo.query.Appointment.findOne({
        where: { id: args.appointmentId },
        query: `
          id status depositAmount depositPaid payment { id } transaction { id } practice { id } location { id name isActive }
          client { id lifetimeValue totalVisits user { id email } }
          provider { id baseCommissionRate user { id } }
          consultation { id status staffDecisionRecorded service { id } }
          treatmentSessions { id status staffAuthorizationConfirmed service { id } order { id } consent { id } administrations { id status evidenceHash lotsCount service { id } treatmentSession { id } consent { id } order { id } } }
          lineItems {
            id serviceTitle serviceImagePath price quantity duration metadata
            service { id }
            staff { id baseCommissionRate }
          }
        `,
      });
      if (!appointment) throw new Error("Appointment not found");
      const checkoutLocationId = appointment.location?.id && appointment.location.isActive !== false
        ? appointment.location.id
        : (await getRuntimeLocation(sudo)).locationId;
      if (!appointment.location?.id && checkoutLocationId) {
        await sudo.query.Appointment.updateOne({ where: { id: appointment.id }, data: { location: { connect: { id: checkoutLocationId } } }, query: "id" });
      }
      if (!checkoutLocationId) throw new Error("Appointment location is unavailable");
      if (!['confirmed', 'in_progress'].includes(appointment.status || '')) throw new Error("Appointment is not eligible for checkout");
      if (appointment.payment?.id || appointment.transaction?.id) throw new Error("Appointment is already checked out");
      if (!appointment.lineItems.length) throw new Error("Appointment has no payable line items");

      const requirementsByLine = appointment.lineItems.map((line: any) => {
        const requirements = line.metadata?.requirements;
        if (!requirements || requirements.snapshotVersion !== 1 || !requirements.serviceId || requirements.serviceId !== line.service?.id) {
          throw new Error("Immutable service requirement snapshot is missing or inconsistent; checkout is blocked");
        }
        return { line, requirements };
      });
      const restrictedLines = requirementsByLine.filter(({ requirements }: any) => requirements.staffAuthorizationRequired === true || requirements.requiresConsultation === true || requirements.requiresIntakeReview === true || requirements.requiresLotTraceability === true);
      if (restrictedLines.length) {
        if (appointment.consultation?.status !== "completed" || appointment.consultation.staffDecisionRecorded !== true) throw new Error("Clinical services require a completed authorized consultation before checkout");
        for (const { line, requirements } of restrictedLines as any[]) {
          const serviceId = requirements.serviceId;
          if (appointment.consultation.service?.id !== serviceId) throw new Error("Each restricted service requires matching consultation evidence");
          const completedAuthorizedSessions = appointment.treatmentSessions?.filter((session: any) => session.service?.id === serviceId && session.status === "completed" && session.staffAuthorizationConfirmed === true && session.administrations?.some((administration: any) => administration.service?.id === serviceId && administration.status === "completed" && administration.evidenceHash && administration.treatmentSession?.id === session.id && administration.order?.id === session.order?.id && administration.consent?.id === session.consent?.id)) || [];
          if (completedAuthorizedSessions.length < Number(line.quantity || 1)) throw new Error("Each restricted service requires matching completed treatment evidence before checkout");
        }
      }

      const products = retail.length ? await sudo.query.Product.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, id: { in: retail.map((item) => item.productId) }, isActive: { equals: true } },
        query: "id name sku price quantity trackLots image { imagePath image { url } }",
      }) : [];
      const retailLines = retail.map((requested) => {
        const product = products.find((item: any) => item.id === requested.productId);
        if (!product || (product.quantity || 0) < requested.quantity) throw new Error("Retail product is unavailable");
        return { ...requested, product, unitPrice: product.price || 0 };
      });

      const lineAmounts = new Map<string, number>(appointment.lineItems.map((item: any) => [item.id, Math.max(0, Number(item.price || 0) * Number(item.quantity || 1))]));
      const serviceSubtotal = [...lineAmounts.values()].reduce((sum, amount) => sum + amount, 0);
      const retailSubtotal = retailLines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const membershipDiscountByLine = new Map<string, number>();
      let membershipDiscount = 0;
      if (args.clientMembershipId && appointment.client?.user?.id) {
        const membership = (await sudo.query.ClientMembership.findMany({
          where: { id: { equals: args.clientMembershipId }, practice: { id: { equals: actor.practiceId } } }, take: 1,
          query: "id status pausedUntil client { id } agreements(orderBy: { acceptedAt: desc }, take: 1) { id effectiveUntil termsHash evidenceHash benefitSnapshot membership { id discountPercent includedServices { id } } }",
        }))[0];
        const paused = membership?.pausedUntil && new Date(membership.pausedUntil).getTime() > Date.now();
        if (!membership || membership.status !== "active" || paused || membership.client?.id !== appointment.client.user.id) throw new Error("Membership is not available for this client");
        const agreement = membership.agreements?.[0];
        if (!agreement || !agreement.evidenceHash || !agreement.termsHash || (agreement.effectiveUntil && new Date(agreement.effectiveUntil) <= new Date())) throw new Error("Membership agreement is not effective");
        const benefits = agreement.benefitSnapshot && typeof agreement.benefitSnapshot === "object" ? agreement.benefitSnapshot as Record<string, any> : {};
        // Agreement snapshots are bounded by the merchant-published plan so stored terms never grant more than the offer.
        const publishedServiceIds = new Set<string>((agreement.membership?.includedServices || []).map((service: { id: string }) => service.id));
        const includedServiceIds = Array.isArray(benefits.includedServiceIds) ? benefits.includedServiceIds.filter((id: unknown): id is string => typeof id === "string" && publishedServiceIds.has(id)) : [];
        const discountPercent = Math.min(Number(benefits.discountPercent), Number(agreement.membership?.discountPercent ?? 0));
        if (!includedServiceIds.length || !Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) throw new Error("Immutable membership benefit evidence is unavailable");
        const included = new Set(includedServiceIds);
        const eligibleLines = appointment.lineItems.filter((line: any) => included.has(line.service?.id));
        if (!eligibleLines.length) throw new Error("Membership does not cover any service line in this appointment");
        for (const line of eligibleLines) {
          const amount = lineAmounts.get(line.id) || 0;
          const lineDiscount = Math.min(amount, Math.round(amount * discountPercent / 100));
          membershipDiscountByLine.set(line.id, lineDiscount);
          membershipDiscount += lineDiscount;
        }
      }
      let packageCredit = 0;
      let packageServiceLine: any = null;
      let clientPackage: any = null;
      const packageDiscountByLine = new Map<string, number>();
      if (args.clientPackageId && appointment.client?.user?.id) {
        clientPackage = (await sudo.query.ClientPackage.findMany({
          where: { id: { equals: args.clientPackageId }, practice: { id: { equals: actor.practiceId } } }, take: 1,
          query: "id status expiresAt totalValue usedValue metadata client { id }",
        }))[0];
        if (!clientPackage || clientPackage.status !== "active" || clientPackage.client?.id !== appointment.client.user.id
          || (clientPackage.expiresAt && new Date(clientPackage.expiresAt) <= new Date())) throw new Error("Package is unavailable, expired, or assigned to another client");
        const entitlement = clientPackage.metadata?.entitlementSnapshot;
        const packageServiceIds = Array.isArray(entitlement?.serviceIds) ? entitlement.serviceIds.filter((id: unknown): id is string => typeof id === "string") : [];
        if (entitlement?.snapshotVersion !== 1 || !packageServiceIds.length) throw new Error("Immutable package entitlement snapshot is unavailable");
        const included = new Set(packageServiceIds);
        packageServiceLine = appointment.lineItems.find((line: any) => included.has(line.service?.id)) || null;
        if (!packageServiceLine) throw new Error("Package does not cover any service line in this appointment");
        const remaining = Math.max(0, Number(clientPackage.totalValue || 0) - Number(clientPackage.usedValue || 0));
        const eligibleLineRemainder = Math.max(0, (lineAmounts.get(packageServiceLine.id) || 0) - (membershipDiscountByLine.get(packageServiceLine.id) || 0));
        packageCredit = Math.min(remaining, eligibleLineRemainder);
        packageDiscountByLine.set(packageServiceLine.id, packageCredit);
      }
      const manualDiscount = Math.max(0, args.discountAmount || 0);
      const lineDiscounts = new Map<string, number>();
      const lineDiscountComponents = new Map<string, { manual: number; membership: number; package: number }>();
      let remainingManualDiscount = manualDiscount;
      for (const line of appointment.lineItems) {
        const amount = lineAmounts.get(line.id) || 0;
        const membership = membershipDiscountByLine.get(line.id) || 0;
        const packageAmount = packageDiscountByLine.get(line.id) || 0;
        const manual = Math.min(Math.max(0, amount - membership - packageAmount), remainingManualDiscount);
        remainingManualDiscount -= manual;
        lineDiscounts.set(line.id, manual + membership + packageAmount);
        lineDiscountComponents.set(line.id, { manual, membership, package: packageAmount });
      }
      if (remainingManualDiscount > 0) throw new Error("Discounts and benefits cannot exceed eligible service-line value");
      const discount = manualDiscount + membershipDiscount + packageCredit;
      const subtotal = serviceSubtotal + retailSubtotal;
      const taxable = Math.max(0, subtotal - discount);
      if (discount > serviceSubtotal) throw new Error("Discounts and benefits cannot exceed the service subtotal");
      const tax = Math.round(taxable * configuredTaxRate());
      const tip = Math.max(0, args.tipAmount || 0);
      if (appointment.depositPaid) throw new Error("Deposit allocation is unavailable until payment-allocation reconciliation is implemented");
      const depositCredit = 0;
      const total = Math.max(0, taxable + tax + tip - depositCredit);
      const now = new Date().toISOString();

      const transaction = await sudo.query.MedSpaTransaction.createOne({
        data: {
          idempotencyKey: aggregateIdempotencyKey(scopedCheckoutKey, "transaction"),
          practice: { connect: { id: actor.practiceId } }, type: "appointment", location: { connect: { id: checkoutLocationId } },
          client: appointment.client?.id ? { connect: { id: appointment.client.id } } : undefined,
          appointment: { connect: { id: appointment.id } }, staff: appointment.provider?.id ? { connect: { id: appointment.provider.id } } : undefined,
          tip, paymentMethod: packageCredit ? "split" : "cash",
          paymentStatus: "paid", status: "completed", completedAt: now,
          metadata: { source: "controlled_checkout", serviceSubtotal, retailSubtotal, discount, discountReason: args.discountReason?.trim() || null, membershipDiscount, packageCredit, discountAllocations: appointment.lineItems.map((line: any) => ({ lineItemId: line.id, serviceId: line.service?.id || null, ...(lineDiscountComponents.get(line.id) || { manual: 0, membership: 0, package: 0 }) })), tax, depositCredit, total },
        }, query: "id",
      });

      for (const item of appointment.lineItems) {
        await sudo.query.MedSpaTransactionLineItem.createOne({
          data: {
            practice: { connect: { id: actor.practiceId } }, transaction: { connect: { id: transaction.id } }, itemType: "service",
            service: item.service?.id ? { connect: { id: item.service.id } } : undefined,
            staff: item.staff?.id ? { connect: { id: item.staff.id } } : appointment.provider?.id ? { connect: { id: appointment.provider.id } } : undefined,
            quantity: item.quantity || 1, unitPrice: item.price || 0,
            discount: lineDiscounts.get(item.id) || 0,
            commissionRate: item.staff?.baseCommissionRate ?? appointment.provider?.baseCommissionRate ?? 0,
            metadata: { snapshotType: "settled_service", title: item.serviceTitle, imagePath: item.serviceImagePath, duration: item.duration, discountComponents: lineDiscountComponents.get(item.id) || { manual: 0, membership: 0, package: 0 } },
          }, query: "id",
        });
      }
      for (const item of retailLines) {
        const imagePath = item.product.image?.image?.url || item.product.image?.imagePath || "";
        const transactionLine = await sudo.query.MedSpaTransactionLineItem.createOne({
          data: {
            practice: { connect: { id: actor.practiceId } }, transaction: { connect: { id: transaction.id } }, itemType: "product",
            product: { connect: { id: item.product.id } }, staff: appointment.provider?.id ? { connect: { id: appointment.provider.id } } : undefined,
            quantity: item.quantity, unitPrice: item.unitPrice, discount: 0, commissionRate: 0,
            metadata: { snapshotType: "settled_product", title: item.product.name, sku: item.product.sku, imagePath },
          }, query: "id",
        });
        if (item.product.trackLots) {
          const lots = await sudo.query.InventoryLot.findMany({ where: { practice: { id: { equals: actor.practiceId } }, location: { id: { equals: checkoutLocationId } }, product: { id: { equals: item.product.id } }, status: { equals: "available" }, expiresAt: { gt: now }, remainingQuantity: { gt: 0 } }, take: 100, orderBy: { expiresAt: "asc" }, query: "id lotNumber remainingQuantity expiresAt" });
          let required = item.quantity;
          for (const lot of lots) {
            if (required <= 0) break;
            const used = Math.min(required, Number(lot.remainingQuantity || 0)); if (used <= 0) continue;
            const after = Number(lot.remainingQuantity) - used;
            await sudo.query.InventoryLot.updateOne({ where: { id: lot.id }, data: { remainingQuantity: after, status: after === 0 ? "depleted" : "available" }, query: "id" });
            await sudo.query.StockMovement.createOne({ data: { practice: { connect: { id: actor.practiceId } }, location: { connect: { id: checkoutLocationId } }, lot: { connect: { id: lot.id } }, product: { connect: { id: item.product.id } }, type: "retail_sale", delta: -used, balanceBefore: lot.remainingQuantity, balanceAfter: after, idempotencyKey: `${scopedCheckoutKey}:retail-lot:${item.product.id}:${lot.id}`, reason: `Retail sale ${transaction.id}`, actor: { connect: { id: actor.actorId } }, transactionLine: { connect: { id: transactionLine.id } }, metadata: { appointmentId: appointment.id, lotNumber: lot.lotNumber, expiration: lot.expiresAt } }, query: "id" });
            required -= used;
          }
          if (required > 0) throw new Error("Released unexpired retail lot inventory is insufficient");
        }
        const movement = await recordInventoryMovement(transactionContext, {
          productId: item.product.id,
          locationId: checkoutLocationId,
          practiceId: actor.practiceId,
          appointmentId: appointment.id,
          type: "sale",
          delta: -item.quantity,
          reason: `Retail sale at appointment checkout ${appointment.id}`,
          idempotencyKey: `${scopedCheckoutKey}:inventory:${item.product.id}`,
          metadata: { source: "controlled_checkout", transactionId: transaction.id, lotTracked: item.product.trackLots === true },
        });
        if (!movement.success) throw new Error(movement.error || "Inventory movement failed");
      }

      const providers = await sudo.query.PaymentProvider.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, adapter: { equals: "manual" }, isInstalled: { equals: true } }, take: 1,
        query: "id code adapter config",
      });
      const provider = providers[0];
      if (!provider) throw new Error("Operator payment provider is unavailable");
      const providerConfig = paymentProviderFromRecord(provider as any);
      const initiated = await createProviderPaymentSession({ provider: providerConfig, amount: total, currency: "usd", idempotencyKey: scopedCheckoutKey, metadata: { appointmentId: appointment.id, operatorId: context.session!.itemId } });
      const confirmed = await confirmProviderPayment({ provider: providerConfig, providerReference: initiated.providerReference, amount: total, idempotencyKey: `${scopedCheckoutKey}:confirm` });
      if (confirmed.status !== "completed") throw new Error("Operator payment was not completed");
      const session = await sudo.query.PaymentSession.createOne({
        data: { practice: { connect: { id: actor.practiceId } }, appointment: { connect: { id: appointment.id } }, provider: { connect: { id: provider.id } }, idempotencyKey: scopedCheckoutKey, amount: total, currency: "usd", status: "completed", providerReference: initiated.providerReference, completedAt: now, data: { source: "controlled_checkout", purpose: "controlled_checkout", settlementMethod: "operator_recorded_cash", checkoutRequestHash, discountReason: args.discountReason?.trim() || null, ...(initiated.data || {}), ...(confirmed.data || {}) } },
        query: "id",
      });
      const payment = await sudo.query.Payment.createOne({
        data: { idempotencyKey: aggregateIdempotencyKey(scopedCheckoutKey, "payment"), practice: { connect: { id: actor.practiceId } }, appointment: { connect: { id: appointment.id } }, session: { connect: { id: session.id } }, subtotal, tax, tip, discount, totalAmount: total, paymentMethod: args.paymentMethod, status: "completed", processedAt: now, processedBy: { connect: { id: context.session!.itemId } }, receiptEmail: appointment.client?.user?.email || "", notes: "Recorded by controlled appointment checkout" },
        query: "id",
      });
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { payment: { connect: { id: payment.id } } }, query: "id" });

      if (retailLines.length) {
        await sudo.query.ProductSale.createOne({
          data: { practice: { connect: { id: actor.practiceId } }, appointment: { connect: { id: appointment.id } }, products: retailLines.map((item) => ({ productId: item.product.id, name: item.product.name, sku: item.product.sku, quantity: item.quantity, price: item.unitPrice, subtotal: item.unitPrice * item.quantity })), total: retailSubtotal, soldBy: appointment.provider?.user?.id ? { connect: { id: appointment.provider.user.id } } : undefined },
          query: "id",
        });
      }
      for (const item of appointment.lineItems) {
        const providerId = item.staff?.id || appointment.provider?.id;
        const rate = item.staff?.baseCommissionRate ?? appointment.provider?.baseCommissionRate ?? 0;
        if (!providerId || !item.service?.id || rate <= 0) continue;
        const grossSaleAmount = (item.price || 0) * (item.quantity || 1);
        const saleAmount = Math.max(0, grossSaleAmount - (lineDiscounts.get(item.id) || 0));
        await sudo.query.Commission.createOne({ data: { practice: { connect: { id: actor.practiceId } }, provider: { connect: { id: providerId } }, service: { connect: { id: item.service.id } }, payment: { connect: { id: payment.id } }, saleAmount, commissionRate: rate, commissionAmount: commissionMinor(saleAmount, rate), isPaid: false, notes: "Generated by controlled checkout" }, query: "id" });
      }
      if (args.clientMembershipId && membershipDiscount > 0) {
        const membership = (await sudo.query.ClientMembership.findMany({ where: { id: { equals: args.clientMembershipId }, practice: { id: { equals: actor.practiceId } } }, take: 1, query: "id agreements(orderBy: { acceptedAt: desc }, take: 1) { id }" }))[0];
        await sudo.query.MembershipLedgerEntry.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientMembership: { connect: { id: args.clientMembershipId } }, agreement: membership?.agreements?.[0]?.id ? { connect: { id: membership.agreements[0].id } } : undefined, actor: { connect: { id: actor.actorId } }, type: "benefit_use", amountMinor: -membershipDiscount, benefitDelta: -1, reason: "Controlled checkout membership benefit", evidence: { appointmentId: appointment.id, transactionId: transaction.id }, occurredAt: now, evidenceHash: evidenceHash({ membershipId: args.clientMembershipId, membershipDiscount, transactionId: transaction.id }), idempotencyKey: `${scopedCheckoutKey}:membership-benefit` }, query: "id" });
      }
      if (clientPackage && packageCredit > 0 && packageServiceLine?.service?.id) {
        const usedValue = (clientPackage.usedValue || 0) + packageCredit;
        await sudo.query.ClientPackage.updateOne({ where: { id: clientPackage.id }, data: { usedValue, status: usedValue >= (clientPackage.totalValue || 0) ? "fully-used" : "active" }, query: "id" });
        const usage = await sudo.query.ClientPackageUsage.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientPackage: { connect: { id: clientPackage.id } }, appointment: { connect: { id: appointment.id } }, service: { connect: { id: packageServiceLine.service.id } }, quantityUsed: 1, valueUsed: packageCredit, idempotencyKey: `${scopedCheckoutKey}:package` }, query: "id" });
        await sudo.query.ClientPackageAdjustment.createOne({ data: { practice: { connect: { id: actor.practiceId } }, clientPackage: { connect: { id: clientPackage.id } }, usage: { connect: { id: usage.id } }, actor: { connect: { id: actor.actorId } }, type: "consume", valueDelta: -packageCredit, reason: "Controlled checkout package consumption", evidence: { appointmentId: appointment.id, transactionId: transaction.id }, occurredAt: now, evidenceHash: evidenceHash({ usageId: usage.id, packageCredit, transactionId: transaction.id }), idempotencyKey: `${scopedCheckoutKey}:package-adjustment` }, query: "id" });
      }
      if (appointment.client?.id) {
        await sudo.query.Client.updateOne({ where: { id: appointment.client.id }, data: { lifetimeValue: (appointment.client.lifetimeValue || 0) + total, totalVisits: (appointment.client.totalVisits || 0) + 1, lastVisit: now }, query: "id" });
      }
      await sudo.query.Appointment.updateOne({ where: { id: appointment.id }, data: { status: "completed" }, query: "id" });
      return { success: true, transactionId: transaction.id, paymentId: payment.id, error: null };
    });
  } catch (error) {
    console.error("Controlled appointment checkout failed", error);
    return { success: false, transactionId: null, paymentId: null, error: error instanceof Error ? error.message : "Checkout failed" };
  }
}

const resultType = graphql.object<CheckoutResult>()({
  name: "CompleteAppointmentCheckoutResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    transactionId: graphql.field({ type: graphql.ID }), paymentId: graphql.field({ type: graphql.ID }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const completeAppointmentCheckout = graphql.field({
  type: resultType,
  args: {
    appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), paymentMethod: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    tipAmount: graphql.arg({ type: graphql.nonNull(graphql.Int) }), discountAmount: graphql.arg({ type: graphql.nonNull(graphql.Int) }), discountReason: graphql.arg({ type: graphql.String }),
    retailItems: graphql.arg({ type: graphql.JSON }), clientPackageId: graphql.arg({ type: graphql.ID }), clientMembershipId: graphql.arg({ type: graphql.ID }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) { return completeAppointmentCheckoutTransaction(context, args); },
});
