import { graphql } from "@keystone-6/core";
import { aggregateIdempotencyKey } from "../aggregateIdempotencyKey";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { paymentRecordStatus } from "../payment-lifecycle";
import { createProviderPaymentSession, paymentProviderFromRecord } from "../utils/paymentProviderAdapter";
import { serializableWorkflow } from "./serializableWorkflow";
import { assertPracticeRecord, bounded, evidenceHash, requireActorPractice, validIdempotencyKey } from "../workflowAuth";
import { assertAppointmentSchedulingAuthority } from '../appointmentSchedulingAuthority';
import type { AppointmentScheduleScope, AppointmentTransitionInput, AppointmentTransitionReceipt } from '../../platform/appointments/types/appointmentSchedule';

type AppointmentTransition = "confirmed" | "in_progress" | "cancelled" | "no_show";
type WorkflowResult = { success: boolean; appointmentId: string | null; status: string | null; error: string | null; receipt?: AppointmentTransitionReceipt | null };

const transitions: Record<string, AppointmentTransition[]> = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["in_progress", "cancelled", "no_show"],
  in_progress: ["cancelled"],
};

export function appointmentTransitionRequestHash(args: AppointmentTransitionInput, actorId: string) {
  return evidenceHash({ appointmentId: args.appointmentId, status: args.status, reason: args.reason?.trim() || '', expectedRevision: args.expectedRevision, actorId, ...(args.expectedScope ? { expectedScope: args.expectedScope } : {}) });
}

export function assertExpectedSchedulingScope(expected: unknown, actual: AppointmentScheduleScope) {
  if (expected != null && evidenceHash(expected) !== evidenceHash(actual)) throw new Error('Original scheduling actor, purpose or parent scope changed');
}

/** Immutable receipts are historical truth, but recovery always requires CURRENT header authority. */
export async function loadAppointmentTransitionReceipt(sudo: ReturnType<Context['sudo']>, args: AppointmentTransitionInput, scope: AppointmentScheduleScope, planBooking: unknown): Promise<AppointmentTransitionReceipt | null> {
  if (!args.idempotencyKey || !validIdempotencyKey(args.idempotencyKey)) throw new Error('A stable appointment transition key is required');
  const rows = await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: scope.practiceId } }, resourceType: { equals: 'Appointment' }, action: { in: ['treatment_plan.transitioned.v1', 'appointment.transitioned.v1'] }, correlationId: { equals: args.idempotencyKey } }, take: 2, query: 'id practice { id } actor { id } resourceId correlationId evidence evidenceHash' });
  if (!rows.length) return null;
  const row = rows[0];
  const receipt = row.evidence as Record<string, unknown> | null;
  if (rows.length !== 1 || !receipt || Array.isArray(receipt) || row.practice?.id !== scope.practiceId || row.actor?.id !== scope.actorId || row.resourceId !== scope.appointmentId || row.correlationId !== args.idempotencyKey
    || evidenceHash(receipt) !== row.evidenceHash || receipt.requestHash !== appointmentTransitionRequestHash(args, scope.actorId) || receipt.actorId !== scope.actorId
    || receipt.toStatus !== args.status || receipt.fromRevision !== args.expectedRevision || !Number.isSafeInteger(receipt.fromRevision) || Number(receipt.toRevision) !== Number(receipt.fromRevision) + 1
    || (receipt.scope ? evidenceHash(receipt.scope) !== evidenceHash(scope) : evidenceHash(receipt.planBooking) !== evidenceHash(planBooking))) throw new Error('Original transition receipt is ambiguous or does not match this command and authority');
  return { version: 1, scope, idempotencyKey: args.idempotencyKey, requestHash: String(receipt.requestHash), receiptId: row.id, evidenceHash: row.evidenceHash, fromRevision: Number(receipt.fromRevision), toRevision: Number(receipt.toRevision), status: String(receipt.toStatus) };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Appointment workflow failed";
}

export async function transitionAppointmentTransaction(
  context: Context,
  args: AppointmentTransitionInput,
): Promise<WorkflowResult> {
  const reason = args.reason?.trim() || "";
  if (!context.session?.itemId) return { success: false, appointmentId: null, status: null, error: "You must be signed in" };
  if (!(args.status in { confirmed: 1, in_progress: 1, cancelled: 1, no_show: 1 })) {
    return { success: false, appointmentId: null, status: null, error: "Unsupported appointment transition" };
  }
  if (reason.length > 1_000) return { success: false, appointmentId: null, status: null, error: "Transition reason is too long" };
  if (args.status === "cancelled" && !reason) return { success: false, appointmentId: null, status: null, error: "A cancellation reason is required" };

  try {
    return await serializableWorkflow(context, "medspa-appointment-transition", [`appointment:${args.appointmentId}`, `idempotency:${context.session.data.practice?.id}:${args.idempotencyKey || args.appointmentId}`], async (transactionContext) => {
      const authority = await assertAppointmentSchedulingAuthority(transactionContext, args.appointmentId, { cancellationOnly: args.status === 'cancelled', purpose: args.expectedScope?.purpose });
      assertExpectedSchedulingScope(args.expectedScope, authority.scope);
      const sudo = transactionContext.sudo();
      const appointment = await sudo.query.Appointment.findOne({
        where: { id: args.appointmentId },
        query: "id practice { id } revision status metadata consentsCount treatmentSessionsCount client { id user { id } } payment { id status refundedAmount totalAmount } transaction { id } resourceReservations(where: { status: { in: [reserved, in_use] } }) { id } supervisorReservations(where: { status: { equals: reserved } }) { id }",
      });
      if (!appointment || appointment.practice?.id !== authority.scope.practiceId || appointment.client?.id !== authority.scope.clientId) throw new Error("Appointment not found");
      const planBooking = (appointment.metadata as any)?.planBooking;
      const requestHash = appointmentTransitionRequestHash(args, authority.scope.actorId);
      const receipted = authority.scope.purpose === 'scheduler' || Boolean(planBooking || args.idempotencyKey || args.expectedScope || args.expectedRevision != null);
      if (receipted) {
        if (!Number.isSafeInteger(args.expectedRevision) || Number(args.expectedRevision) < 1) throw new Error('An original appointment revision is required');
        if (!args.idempotencyKey || !validIdempotencyKey(args.idempotencyKey)) throw new Error("A stable appointment transition key is required");
        const receipt = await loadAppointmentTransitionReceipt(sudo, args, authority.scope, planBooking);
        if (receipt) return { success: true, appointmentId: appointment.id, status: receipt.status, receipt, error: null };
        if (appointment.revision !== args.expectedRevision) throw new Error("Appointment version changed; review the current state");
      }
      if (["cancelled", "no_show"].includes(args.status) && (appointment.payment?.id || appointment.transaction?.id || appointment.treatmentSessionsCount || appointment.consentsCount)) throw new Error("Documented clinical or financial evidence requires a reviewed correction workflow before cancellation");
      if (appointment.status === args.status) {
        if (receipted) throw new Error("This state is already recorded; read back history rather than create an unreceipted new command");
        return { success: true, appointmentId: appointment.id, status: appointment.status, error: null };
      }
      if (!(transitions[appointment.status || ""] || []).includes(args.status)) {
        throw new Error(`Cannot transition appointment from ${appointment.status || "unknown"} to ${args.status}`);
      }
      if (args.status === "in_progress" && appointment.transaction?.id) throw new Error("Checked-out appointments cannot be restarted");

      const now = new Date().toISOString();
      const metadata = appointment.metadata && typeof appointment.metadata === "object" ? appointment.metadata as Record<string, any> : {};
      const history = Array.isArray(metadata.transitionHistory) ? metadata.transitionHistory.slice(-49) : [];
      const data: Record<string, any> = {
        status: args.status,
        revision: Number(appointment.revision || 1) + 1,
        metadata: {
          ...metadata,
          transitionHistory: [...history, {
            from: appointment.status,
            to: args.status,
            reason: reason || null,
            actorId: context.session!.itemId,
            at: now,
          }],
        },
      };
      if (args.status === "confirmed") data.confirmedAt = now;
      if (args.status === "cancelled") {
        data.cancelledAt = now;
        data.cancellationReason = reason;
      }
      await sudo.query.Appointment.updateOne({ where: { id: appointment.id }, data, query: "id" });
      if (["cancelled", "no_show"].includes(args.status)) {
        for (const reservation of appointment.resourceReservations || []) await sudo.query.AppointmentResourceReservation.updateOne({ where: { id: reservation.id }, data: { status: "cancelled" }, query: "id" });
        for (const reservation of appointment.supervisorReservations || []) await sudo.query.AppointmentSupervisorReservation.updateOne({ where: { id: reservation.id }, data: { status: "cancelled" }, query: "id" });
      }
      let receipt: AppointmentTransitionReceipt | null = null;
      if (receipted) {
        const evidence = { version: 2, requestHash, scope: authority.scope, membershipId: authority.membershipId, delegation: authority.delegation, planBooking: planBooking || null, fromStatus: appointment.status, toStatus: args.status, fromRevision: appointment.revision, toRevision: Number(appointment.revision || 1) + 1, actorId: authority.scope.actorId, reason, occurredAt: now };
        const hash = evidenceHash(evidence);
        const event = await sudo.query.AuditEvent.createOne({ data: { practice: { connect: { id: appointment.practice!.id } }, location: { connect: { id: authority.scope.locationId } }, actor: { connect: { id: authority.scope.actorId } }, action: planBooking ? 'treatment_plan.transitioned.v1' : 'appointment.transitioned.v1', resourceType: "Appointment", resourceId: appointment.id, correlationId: args.idempotencyKey!, evidence: bounded(evidence), evidenceHash: hash, occurredAt: now }, query: "id" });
        receipt = { version: 1, scope: authority.scope, idempotencyKey: args.idempotencyKey!, requestHash, receiptId: event.id, evidenceHash: hash, fromRevision: appointment.revision, toRevision: evidence.toRevision, status: args.status };
      }
      return { success: true, appointmentId: appointment.id, status: args.status, receipt, error: null };
    });
  } catch (error) {
    return { success: false, appointmentId: null, status: null, error: errorMessage(error) };
  }
}

const transitionResult = graphql.object<WorkflowResult>()({
  name: "TransitionAppointmentResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    appointmentId: graphql.field({ type: graphql.ID }),
    status: graphql.field({ type: graphql.String }),
    error: graphql.field({ type: graphql.String }),
    receipt: graphql.field({ type: graphql.JSON }),
  },
});

export const transitionAppointment = graphql.field({
  type: transitionResult,
  args: {
    appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    expectedRevision: graphql.arg({ type: graphql.Int }),
    idempotencyKey: graphql.arg({ type: graphql.String }),
    expectedScope: graphql.arg({ type: graphql.JSON }),
    status: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    reason: graphql.arg({ type: graphql.String }),
  },
  resolve(_source, args, context: Context) {
    return transitionAppointmentTransaction(context, args as AppointmentTransitionInput);
  },
});

type DepositResult = {
  success: boolean; appointmentId: string | null; paymentId: string | null;
  paymentSessionId: string | null; status: string | null; error: string | null;
};

// Re-enable only after the reviewed multi-payment allocation and cancellation-recovery contracts exist.
function depositCollectionEnabled() { return false; }

export async function processAppointmentDepositTransaction(
  context: Context,
  args: { appointmentId: string; paymentMethod: string; providerCode?: string | null; idempotencyKey: string },
): Promise<DepositResult> {
  let actor;
  try {
    actor = requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required");
    await assertPracticeRecord(context, "Appointment", args.appointmentId);
  } catch (error) {
    return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: error instanceof Error ? error.message : "Appointment not found" };
  }
  if (!args.idempotencyKey?.trim() || args.idempotencyKey.length < 12 || args.idempotencyKey.length > 200) {
    return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: "Idempotency key is invalid" };
  }
  if (!new Set(["credit_card", "debit_card", "cash", "apple_pay", "google_pay"]).has(args.paymentMethod)) {
    return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: "Payment method is invalid" };
  }
  if (!depositCollectionEnabled()) return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: "Deposit collection is disabled until multi-payment allocation and cancellation reconciliation are implemented" };

  try {
    return await serializableWorkflow(context, "medspa-appointment-deposit", [
      `appointment:${args.appointmentId}`,
      `idempotency:${actor.practiceId}:${args.idempotencyKey}`,
    ], async (transactionContext) => {
      const sudo = transactionContext.sudo();
      const scopedDepositKey = aggregateIdempotencyKey(actor.practiceId, `deposit:${args.idempotencyKey}`);
      const existing = (await sudo.query.PaymentSession.findMany({
        where: { practice: { id: { equals: actor.practiceId } }, idempotencyKey: { equals: scopedDepositKey } }, take: 1,
        query: "id amount status data appointment { id } payment { id }",
      }))[0];
      if (existing) {
        const data = existing.data && typeof existing.data === "object" ? existing.data as Record<string, any> : {};
        if (existing.appointment?.id !== args.appointmentId || data.purpose !== "appointment_deposit") {
          throw new Error("Idempotency key was already used for another operation");
        }
        return { success: true, appointmentId: args.appointmentId, paymentId: existing.payment?.id || null, paymentSessionId: existing.id, status: existing.status, error: null };
      }

      const appointment = await sudo.query.Appointment.findOne({
        where: { id: args.appointmentId },
        query: "id status depositAmount depositPaid practice { id } client { user { email } }",
      });
      if (!appointment) throw new Error("Appointment not found");
      if (!new Set(["pending", "confirmed"]).has(appointment.status || "")) throw new Error("Appointment is not eligible for a deposit");
      if (appointment.depositPaid) throw new Error("Appointment deposit is already paid");
      const amount = Number(appointment.depositAmount || 0);
      if (!Number.isInteger(amount) || amount <= 0) throw new Error("Appointment does not require a deposit");

      const providers = await sudo.query.PaymentProvider.findMany({
        where: args.providerCode
          ? { practice: { id: { equals: actor.practiceId } }, code: { equals: args.providerCode }, isInstalled: { equals: true } }
          : { practice: { id: { equals: actor.practiceId } }, isInstalled: { equals: true }, isDefault: { equals: true } },
        take: 1,
        query: "id code adapter config",
      });
      const provider = providers[0];
      if (!provider) throw new Error("Payment provider is unavailable");
      const result = await createProviderPaymentSession({
        provider: paymentProviderFromRecord(provider as { code: string; adapter: string; config?: unknown }),
        amount,
        currency: "usd",
        idempotencyKey: scopedDepositKey,
        metadata: { purpose: "appointment_deposit", appointmentId: appointment.id, operatorId: context.session!.itemId },
      });
      const now = new Date().toISOString();
      const session = await sudo.query.PaymentSession.createOne({
        data: {
          practice: { connect: { id: actor.practiceId } }, appointment: { connect: { id: appointment.id } }, provider: { connect: { id: provider.id } },
          idempotencyKey: scopedDepositKey, amount, currency: "usd", status: result.status,
          providerReference: result.providerReference,
          completedAt: result.status === "completed" ? now : undefined,
          data: { ...(result.data || {}), purpose: "appointment_deposit", clientSecret: result.clientSecret || null },
        },
        query: "id",
      });
      const payment = await sudo.query.Payment.createOne({
        data: {
          idempotencyKey: aggregateIdempotencyKey(scopedDepositKey, "payment"),
          practice: { connect: { id: actor.practiceId } }, appointment: { connect: { id: appointment.id } },
          subtotal: amount, tax: 0, tip: 0, discount: 0, totalAmount: amount,
          paymentMethod: args.paymentMethod, status: paymentRecordStatus(result.status),
          session: { connect: { id: session.id } }, processedBy: { connect: { id: context.session!.itemId } },
          processedAt: result.status === "completed" ? now : undefined,
          receiptEmail: appointment.client?.user?.email || "", notes: `Appointment deposit for ${appointment.id}`,
        },
        query: "id",
      });
      await sudo.query.PaymentSession.updateOne({ where: { id: session.id }, data: { payment: { connect: { id: payment.id } } }, query: "id" });
      if (result.status === "completed") {
        await sudo.query.Appointment.updateOne({
          where: { id: appointment.id },
          data: { depositPaid: true, ...(appointment.status === "pending" ? { status: "confirmed", confirmedAt: now } : {}) },
          query: "id",
        });
      }
      return { success: true, appointmentId: appointment.id, paymentId: payment.id, paymentSessionId: session.id, status: result.status, error: null };
    });
  } catch (error) {
    return { success: false, appointmentId: null, paymentId: null, paymentSessionId: null, status: null, error: errorMessage(error) };
  }
}

const depositResult = graphql.object<DepositResult>()({
  name: "ProcessAppointmentDepositResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    appointmentId: graphql.field({ type: graphql.ID }), paymentId: graphql.field({ type: graphql.ID }),
    paymentSessionId: graphql.field({ type: graphql.ID }), status: graphql.field({ type: graphql.String }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const processAppointmentDeposit = graphql.field({
  type: depositResult,
  args: {
    appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    paymentMethod: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    providerCode: graphql.arg({ type: graphql.String }),
    idempotencyKey: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  resolve(_source, args, context: Context) {
    return processAppointmentDepositTransaction(context, args);
  },
});
