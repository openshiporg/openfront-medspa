import { graphql } from '@keystone-6/core';
import type { Context } from '.keystone/types';
import type { ConsultationQueue, PlanJourney } from '../../platform/appointments/types/planJourney';
import { permissions } from '../access';
import { assertActiveActor, assertPracticeRecord, requireActorPractice } from '../workflowAuth';
import { assertPlanStaffMembership, loadPlanApprovalReceipt } from '../mutations/treatmentPlanApproval';

export async function loadMedspaPlanJourney(context: Context, consultationId: string, pages: { planPage?: number | null; appointmentPage?: number | null; historyPage?: number | null } = {}): Promise<PlanJourney> {
  const offsets = [pages.planPage ?? 0, pages.appointmentPage ?? 0, pages.historyPage ?? 0];
  if (offsets.some(value => !Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(value * 20))) throw new Error("Invalid history page");
  const [planPage, appointmentPage, historyPage] = offsets;
  const actor = requireActorPractice(context, permissions.canManageClinical);
  const fresh = await assertActiveActor(context);
  const header = await assertPracticeRecord(context, 'Consultation', consultationId, 'id practice { id } location { id }');
  await assertPlanStaffMembership(context.sudo(), actor.practiceId, actor.actorId, header.location?.id || '');
  const consultation = await assertPracticeRecord(context, 'Consultation', consultationId, 'id status candidacyDecision evidenceHash revision staffDecisionRecorded signedAt supersededBy { id } practice { id } provider { id user { id } } location { id } service { id name } client { id user { name email phone } }');
  if (consultation.location?.id !== header.location?.id) throw new Error('Current clinical location scope changed');
  const patient = await assertPracticeRecord(context, "Client", consultation.client?.id || "", "id practice { id } user { id status name email phone practice { id } }");
  if (patient.user?.status !== "active" || patient.user.practice?.id !== actor.practiceId) throw new Error("Current patient practice authority is unavailable");
  const sudo = context.sudo();
  const planRows = await sudo.query.TreatmentPlan.findMany({ where: { practice: { id: { equals: actor.practiceId } }, consultation: { id: { equals: consultation.id } } }, orderBy: [{ revision: 'desc' }, { id: 'desc' }], skip: planPage * 20, take: 21, query: 'id title status revision evidenceHash signedAt items(take: 51) { id serviceTitle service { id } plannedSessions completedSessions }' });
  const plans = planRows.slice(0, 20);
  if (plans.some(plan => plan.items.length > 50)) throw new Error('Plan history exceeds the safe detail bound; use a paginated clinical history view');
  const projectedPlans = [];
  for (const plan of plans) {
    let receipt: any = null;
    // A legacy row is visibly unbookable, not silently certified with a fabricated receipt.
    if (plan.evidenceHash) {
      const receipts = await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, action: { equals: 'treatment_plan.approved.v1' }, resourceType: { equals: 'TreatmentPlan' }, resourceId: { equals: plan.id } }, take: 2, query: 'id' });
      if (receipts.length) receipt = (await loadPlanApprovalReceipt(sudo, actor.practiceId, plan.id)).receipt;
    }
    projectedPlans.push({ id: plan.id, title: plan.title, status: plan.status, revision: plan.revision, evidenceHash: plan.evidenceHash, signedAt: plan.signedAt ? new Date(plan.signedAt).toISOString() : null, receiptAvailable: Boolean(receipt), items: plan.items.map((item: { id: string; serviceTitle: string; service?: { id: string } | null; plannedSessions: number; completedSessions: number }) => {
      const accepted = receipt?.items.find((value: any) => value.itemId === item.id);
      return { id: item.id, serviceId: item.service?.id || '', title: item.serviceTitle, plannedSessions: item.plannedSessions, completedSessions: item.completedSessions, price: accepted?.price ?? null, duration: accepted?.duration ?? null };
    }) });
  }
  const rows = await sudo.query.Appointment.findMany({ where: { practice: { id: { equals: actor.practiceId } }, client: { id: { equals: consultation.client!.id } } }, skip: appointmentPage * 20, take: 21, orderBy: { startTime: 'desc' }, query: 'id status revision startTime endTime metadata payment { id } transaction { id } consentsCount treatmentSessionsCount resourceReservations(where: { status: { in: [reserved, in_use] } }, take: 101) { resource { id } } supervisorReservations(where: { status: { equals: reserved } }, take: 101) { supervisor { id } }' });
  if (rows.some(value => value.resourceReservations.length > 100 || value.supervisorReservations.length > 100)) throw new Error('Appointment detail history exceeds the safe bound');
  const planIds = new Set(plans.map(plan => plan.id));
  const appointments = rows.slice(0, 20).filter(value => (value.metadata as any)?.planBooking?.consultationId === consultation.id).map(value => {
    const binding = (value.metadata as any).planBooking;
    return { id: value.id, planId: binding.planId, itemId: binding.itemId, status: value.status!, revision: value.revision, startTime: new Date(value.startTime!).toISOString(), endTime: value.endTime ? new Date(value.endTime).toISOString() : null, price: binding.price, resourceIds: value.resourceReservations.map((row: { resource: { id: string } }) => row.resource.id), supervisorIds: value.supervisorReservations.map((row: { supervisor: { id: string } }) => row.supervisor.id), correctable: ['pending', 'confirmed'].includes(value.status!) && !value.payment?.id && !value.transaction?.id && !value.consentsCount && !value.treatmentSessionsCount };
  });
  const history = planIds.size ? await sudo.query.AuditEvent.findMany({ where: { practice: { id: { equals: actor.practiceId } }, OR: [{ resourceType: { equals: 'TreatmentPlan' }, resourceId: { in: [...planIds] } }, { resourceType: { equals: 'Appointment' }, resourceId: { in: appointments.map(value => value.id) } }], action: { startsWith: 'treatment_plan.' } }, skip: historyPage * 20, take: 21, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], query: 'id action resourceId occurredAt evidenceHash correlationId' }) : [];
  return { consultation: { id: consultation.id, clientId: consultation.client!.id, clientName: patient.user?.name || '', clientEmail: patient.user?.email || '', clientPhone: patient.user?.phone || '', providerId: consultation.provider?.id || '', locationId: consultation.location?.id || '', serviceId: consultation.service?.id || '', serviceName: consultation.service?.name || '', status: consultation.status!, candidacyDecision: consultation.candidacyDecision!, evidenceHash: consultation.evidenceHash, revision: consultation.revision, superseded: Boolean(consultation.supersededBy?.id), canApprove: consultation.provider?.user?.id === actor.actorId && consultation.status === 'completed' && consultation.candidacyDecision === 'candidate' && consultation.staffDecisionRecorded === true && Boolean(consultation.signedAt) && !consultation.supersededBy?.id }, canSchedule: fresh.role.canSchedule === true, pages: { plans: planPage, appointments: appointmentPage, history: historyPage, morePlans: planRows.length > 20, moreAppointments: rows.length > 20, moreHistory: history.length > 20 }, plans: projectedPlans, appointments, history: history.slice(0, 20).map(value => ({ id: value.id, action: value.action, resourceId: value.resourceId, occurredAt: new Date(value.occurredAt!).toISOString(), evidenceHash: value.evidenceHash, correlationId: value.correlationId })) };
}

export async function loadMedspaConsultationQueue(context: Context, input: { page?: number | null; search?: string | null }): Promise<ConsultationQueue> {
  const actor = requireActorPractice(context, permissions.canManageClinical);
  await assertActiveActor(context);
  const page = input.page ?? 0;
  const search = input.search?.trim() || '';
  if (!Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(page * 20) || search.length > 100) throw new Error('Invalid queue page or search');
  const memberships = await context.sudo().query.PracticeMembership.findMany({ where: { practice: { id: { equals: actor.practiceId } }, user: { id: { equals: actor.actorId } } }, take: 2, query: "id status locations(take: 101) { id isActive practice { id } }" });
  if (memberships.length !== 1 || memberships[0].status !== "active" || !memberships[0].locations?.length || memberships[0].locations.length > 100 || memberships[0].locations.some((location: any) => location.practice?.id !== actor.practiceId || location.isActive !== true)) throw new Error("Current clinical membership and location authority are unavailable");
  const items = await context.sudo().query.Consultation.findMany({ where: { location: { id: { in: memberships[0].locations.map((location: any) => location.id) } }, client: { practice: { id: { equals: actor.practiceId } }, user: { practice: { id: { equals: actor.practiceId } }, status: { equals: "active" } } }, practice: { id: { equals: actor.practiceId } }, ...(search ? { service: { name: { contains: search, mode: 'insensitive' } } } : {}) }, skip: page * 20, take: 21, orderBy: [{ signedAt: 'desc' }, { id: 'desc' }], query: 'id status candidacyDecision client { user { name } } service { name }' });
  return { page, hasMore: items.length > 20, items: items.slice(0, 20).map(value => ({ id: value.id, status: value.status!, candidacyDecision: value.candidacyDecision!, clientName: value.client?.user?.name || 'Client', serviceName: value.service?.name || 'Service' })) };
}

export async function assertAppointmentClinicalHeader(context: Context, appointmentId: string) {
  const actor = requireActorPractice(context, permissions.canManageClinical);
  await assertActiveActor(context);
  const header = await assertPracticeRecord(context, 'Appointment', appointmentId, 'id practice { id } location { id }');
  await assertPlanStaffMembership(context.sudo(), actor.practiceId, actor.actorId, header.location?.id || '');
  const location = await context.sudo().query.Location.findOne({ where: { id: header.location.id }, query: 'id isActive practice { id }' });
  if (!location || location.practice?.id !== actor.practiceId || location.isActive !== true) throw new Error('Current clinical location scope is unavailable');
  return { appointmentId: header.id, actorId: actor.actorId, practiceId: actor.practiceId, locationId: location.id };
}
export const medspaAppointmentClinicalHeader = graphql.field({ type: graphql.JSON, args: { appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }) }, resolve(_source, args, context: Context) { return assertAppointmentClinicalHeader(context, args.appointmentId); } });

// Allowlisted bounded DTOs; never raw AuditEvent evidence, narratives, credentials, or custody URLs.
export const medspaPlanJourney = graphql.field({ type: graphql.JSON, args: { consultationId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), planPage: graphql.arg({ type: graphql.Int }), appointmentPage: graphql.arg({ type: graphql.Int }), historyPage: graphql.arg({ type: graphql.Int }) }, resolve(_source, args, context: Context) { return loadMedspaPlanJourney(context, args.consultationId, args); } });
export const medspaConsultationQueue = graphql.field({ type: graphql.JSON, args: { page: graphql.arg({ type: graphql.Int }), search: graphql.arg({ type: graphql.String }) }, resolve(_source, args, context: Context) { return loadMedspaConsultationQueue(context, args); } });
