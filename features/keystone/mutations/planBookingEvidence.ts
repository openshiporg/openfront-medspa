import type { Context } from '.keystone/types';
import { assertPracticeRecord } from '../workflowAuth';
import { assertCurrentIntakeEvidence, loadRequiredIntakeManifest } from './clinicalExecutionReadiness';
import { assertPlanStaffMembership, loadPlanApprovalReceipt, planServiceRequirementsHash } from './treatmentPlanApproval';

export type PlanBookingInput = { planId?: string | null; planItemId?: string | null; planClientId?: string | null; expectedPlanHash?: string | null };

/** Narrow privileged read after the existing scheduling actor/practice check. No identity creation. */
export async function loadPlanBookingEvidence(context: Context, input: PlanBookingInput, selection: { practiceId: string; providerId: string; locationId: string; serviceIds: string[] }) {
  if (!input.planId || !input.planItemId || !input.planClientId || !/^[a-f0-9]{64}$/.test(input.expectedPlanHash || '')) throw new Error('Exact approved plan, item, patient, and version are required');
  const plan = await assertPracticeRecord(context, 'TreatmentPlan', input.planId, 'id status revision signedAt evidenceHash practice { id } consultation { id } client { id } createdBy { id } startsAt endsAt supersededBy { id } items { id status service { id } plannedSessions completedSessions serviceTitle intervalNotes }');
  const { receipt, evidenceHash: hash } = await loadPlanApprovalReceipt(context.sudo(), selection.practiceId, plan.id);
  const item = plan.items?.find((value: any) => value.id === input.planItemId);
  const accepted = receipt.items?.find((value: any) => value.itemId === input.planItemId);
  const client = await assertPracticeRecord(context, 'Client', input.planClientId, 'id practice { id } user { id status name email phone practice { id } }');
  if (!item || !accepted || hash !== input.expectedPlanHash || plan.evidenceHash !== hash || receipt.revision !== plan.revision || receipt.signedAt !== new Date(plan.signedAt || '').toISOString()
    || plan.client?.id !== client.id || receipt.clientId !== client.id || receipt.clientUserId !== client.user?.id || client.user?.status !== 'active' || client.user.practice?.id !== selection.practiceId
    || plan.createdBy?.id !== receipt.providerId || plan.consultation?.id !== receipt.consultationId || receipt.locationId !== selection.locationId || receipt.providerId !== selection.providerId
    || selection.serviceIds.length !== 1 || selection.serviceIds[0] !== accepted.serviceId || item.service?.id !== accepted.serviceId || item.plannedSessions !== accepted.plannedSessions || item.serviceTitle !== accepted.serviceTitle || item.intervalNotes !== accepted.intervalNotes) throw new Error('Patient, provider, plan item, or approved version changed');
  const provider = await assertPracticeRecord(context, "Provider", receipt.providerId, "id status isActive practice { id } user { id status practice { id } } locations { id }");
  if (provider.status !== "active" || provider.isActive !== true || provider.user?.id !== receipt.actorId || provider.user.status !== "active" || provider.user.practice?.id !== selection.practiceId || !provider.locations?.some((value: any) => value.id === selection.locationId)) throw new Error("Approving provider identity or location assignment is no longer active");
  for (const userId of [...new Set([context.session!.itemId, provider.user.id])]) await assertPlanStaffMembership(context.sudo(), selection.practiceId, userId, selection.locationId);
  return { plan, receipt, accepted, item, client, hash };
}

export async function assertNewPlanBooking(context: Context, binding: Awaited<ReturnType<typeof loadPlanBookingEvidence>>, service: any, start: Date, end: Date, excludeAppointmentId?: string) {
  const { plan, receipt, accepted, item } = binding;
  if (plan.status !== 'active' || plan.supersededBy?.id || item.status !== 'planned' || (plan.startsAt && Date.parse(plan.startsAt) > start.getTime()) || (plan.endsAt && Date.parse(plan.endsAt) < end.getTime())) throw new Error('Plan item is not currently bookable for this interval');
  if (planServiceRequirementsHash(service) !== accepted.requirementsHash) throw new Error('Service requirements changed; review a superseding plan before booking');
  const consultation = await assertPracticeRecord(context, 'Consultation', receipt.consultationId, 'id practice { id } client { id } provider { id } service { id } status candidacyDecision staffDecisionRecorded signedAt evidenceHash revision appointment { id } supersededBy { id }');
  if (consultation.evidenceHash !== receipt.consultationHash || consultation.revision !== receipt.consultationRevision || consultation.client?.id !== receipt.clientId || consultation.provider?.id !== receipt.providerId || consultation.service?.id !== accepted.serviceId || consultation.status !== 'completed' || consultation.candidacyDecision !== 'candidate' || consultation.staffDecisionRecorded !== true || !consultation.signedAt || consultation.supersededBy?.id) throw new Error('Consultation approval is no longer current');
  const forms = await loadRequiredIntakeManifest(context.sudo(), receipt.practiceId, service);
  if (JSON.stringify(forms) !== JSON.stringify(accepted.requiredIntakeForms)) throw new Error("Required intake versions changed since plan approval");
  if (forms.length) await assertCurrentIntakeEvidence(context.sudo(), { practiceId: receipt.practiceId, clientUserId: receipt.clientUserId, appointmentId: consultation.appointment?.id || "", categoryId: service.category?.id || "", requiredForms: forms });
  const findings = await context.sudo().query.ContraindicationFinding.findMany({ where: { practice: { id: { equals: receipt.practiceId } }, consultation: { id: { equals: consultation.id } }, severity: { in: ["hard_stop", "clinician_review"] } }, take: 101, query: "id decisions(orderBy: { decidedAt: desc }, take: 1) { disposition expiresAt evidenceHash }" });
  if (findings.length > 100 || findings.some((value: any) => value.decisions?.[0]?.disposition !== "cleared_with_rationale" || !value.decisions[0].evidenceHash || !Number.isFinite(Date.parse(value.decisions[0].expiresAt)) || Date.parse(value.decisions[0].expiresAt) <= Date.now())) throw new Error("Current human contraindication decisions are required");
  if (!Number.isSafeInteger(item.completedSessions) || item.completedSessions < 0) throw new Error('Documented session balance is invalid');
  // Bounded pages in this serializable snapshot, not a permanent 1,000-visit product ceiling.
  let claims = 0;
  for (let skip = 0; ; skip += 1000) {
    const page = await context.sudo().query.Appointment.findMany({ where: { practice: { id: { equals: receipt.practiceId } }, client: { id: { equals: receipt.clientId } } }, skip, take: 1000, orderBy: { id: 'asc' }, query: 'id status metadata' });
    claims += page.filter((value: any) => value.id !== excludeAppointmentId && !['cancelled', 'no_show'].includes(value.status) && value.metadata?.planBooking?.planId === plan.id && value.metadata.planBooking.itemId === item.id).length;
    if (claims >= accepted.plannedSessions || item.completedSessions >= accepted.plannedSessions) throw new Error('All approved sessions are already booked or completed');
    if (page.length < 1000) break;
  }
  // Completed encounters still consume the approved entitlement; cancellations preserve history but release it.
}

export async function assertApprovedPlanClinicalAppointment(context: Context, planId: string, appointmentId: string, serviceId: string, providerId: string) {
  const plan = await assertPracticeRecord(context, "TreatmentPlan", planId, "id practice { id } consultation { id }");
  const receipts = await context.sudo().query.AuditEvent.findMany({ where: { practice: { id: { equals: plan.practice!.id } }, action: { equals: "treatment_plan.approved.v1" }, resourceType: { equals: "TreatmentPlan" }, resourceId: { equals: planId } }, take: 1, query: "id" });
  const appointment = await assertPracticeRecord(context, "Appointment", appointmentId, "id metadata client { id } practice { id } location { id } provider { id }");
  const booking = (appointment.metadata as any)?.planBooking;
  if (!booking && !receipts.length) return; // Existing legacy evidence stays historical, not rewritten or upgraded.
  if (!booking || booking.planId !== planId || booking.serviceId !== serviceId || booking.providerId !== providerId || appointment.provider?.id !== providerId || booking.clientId !== appointment.client?.id) throw new Error("Clinical preparation requires the exact appointment-owned approved plan item");
  await loadPlanBookingEvidence(context, { planId, planItemId: booking.itemId, planClientId: booking.clientId, expectedPlanHash: booking.planHash }, { practiceId: plan.practice!.id, providerId, locationId: appointment.location!.id, serviceIds: [serviceId] });
}

export function planBookingSnapshot(binding: Awaited<ReturnType<typeof loadPlanBookingEvidence>>) {
  return { version: 1, planId: binding.plan.id, itemId: binding.item.id, planHash: binding.hash, planRevision: binding.plan.revision, consultationId: binding.receipt.consultationId, consultationHash: binding.receipt.consultationHash, clientId: binding.client.id, providerId: binding.receipt.providerId, locationId: binding.receipt.locationId, serviceId: binding.accepted.serviceId, serviceTitle: binding.accepted.serviceTitle, price: binding.accepted.price, duration: binding.accepted.duration };
}
