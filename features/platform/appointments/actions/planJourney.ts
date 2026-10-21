'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { PlanApprovalInput } from '@/features/keystone/mutations/treatmentPlanApproval';
import type { BookingInput } from '@/features/keystone/mutations/bookAppointment';
import type { ConsultationQueue, PlanJourney, PlanSlot, WorkflowAttemptResult } from '../types/planJourney';

export async function getPlanJourney(consultationId: string, pages: { planPage?: number; appointmentPage?: number; historyPage?: number } = {}): Promise<PlanJourney | null> {
  const response = await keystoneClient<{ medspaPlanJourney: PlanJourney }>('query PlanJourney($consultationId: ID!, $planPage: Int, $appointmentPage: Int, $historyPage: Int) { medspaPlanJourney(consultationId: $consultationId, planPage: $planPage, appointmentPage: $appointmentPage, historyPage: $historyPage) }', { consultationId, ...pages });
  return response.success ? response.data.medspaPlanJourney : null;
}
export async function getConsultationQueue(page: number, search: string): Promise<ConsultationQueue | null> {
  const response = await keystoneClient<{ medspaConsultationQueue: ConsultationQueue }>('query ConsultationQueue($page: Int, $search: String) { medspaConsultationQueue(page: $page, search: $search) }', { page, search });
  return response.success ? response.data.medspaConsultationQueue : null;
}
export async function approvePlan(input: PlanApprovalInput): Promise<WorkflowAttemptResult> {
  const response = await keystoneClient<{ approveTreatmentPlan: WorkflowAttemptResult }>(`mutation ApprovePlan($clientId: ID!, $consultationId: ID!, $providerId: ID!, $expectedConsultationHash: String, $title: String!, $goals: String!, $items: JSON!, $supersedesId: ID, $idempotencyKey: String!) {
    approveTreatmentPlan(clientId: $clientId, consultationId: $consultationId, providerId: $providerId, expectedConsultationHash: $expectedConsultationHash, title: $title, goals: $goals, items: $items, supersedesId: $supersedesId, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, input);
  return response.success ? response.data.approveTreatmentPlan : { success: false, error: response.error || 'Approval acknowledgement unavailable; retry the original command or reload readback.' };
}
export async function getPlanSlots(input: { providerId: string; serviceId: string; locationId: string; serviceDuration: number; date: string }): Promise<{ slots: PlanSlot[] | null; error?: string }> {
  const response = await keystoneClient<{ checkAvailability: { slots: PlanSlot[] } }>(`query PlanSlots($providerId: ID!, $serviceId: ID!, $locationId: ID!, $serviceDuration: Int!, $date: String!) {
    checkAvailability(providerId: $providerId, serviceId: $serviceId, locationId: $locationId, serviceDuration: $serviceDuration, date: $date) { slots { startTime time available resourceIds roomId deviceId supervisorIds blockedReason } }
  }`, input);
  return response.success ? { slots: response.data.checkAvailability.slots } : { slots: null, error: response.error || 'Availability unavailable.' };
}
export async function bookPlan(input: BookingInput): Promise<WorkflowAttemptResult> {
  const response = await keystoneClient<{ bookAppointment: WorkflowAttemptResult }>(`mutation BookPlan($planId: ID, $planItemId: ID, $planClientId: ID, $expectedPlanHash: String, $expectedResourceIds: [ID!], $expectedSupervisorIds: [ID!], $rescheduleAppointmentId: ID, $expectedAppointmentRevision: Int, $rescheduleReason: String, $serviceIds: [ID!]!, $providerId: ID!, $locationId: ID, $startTime: String!, $clientName: String!, $clientEmail: String!, $clientPhone: String, $idempotencyKey: String!) {
    bookAppointment(planId: $planId, planItemId: $planItemId, planClientId: $planClientId, expectedPlanHash: $expectedPlanHash, expectedResourceIds: $expectedResourceIds, expectedSupervisorIds: $expectedSupervisorIds, rescheduleAppointmentId: $rescheduleAppointmentId, expectedAppointmentRevision: $expectedAppointmentRevision, rescheduleReason: $rescheduleReason, serviceIds: $serviceIds, providerId: $providerId, locationId: $locationId, startTime: $startTime, clientName: $clientName, clientEmail: $clientEmail, clientPhone: $clientPhone, idempotencyKey: $idempotencyKey) { success appointmentId error }
  }`, input);
  return response.success ? response.data.bookAppointment : { success: false, error: response.error || 'Booking acknowledgement unavailable; retry the original command or reload readback.' };
}
export async function transitionPlanAppointment(input: { appointmentId: string; status: string; reason: string; expectedRevision: number; idempotencyKey: string }): Promise<WorkflowAttemptResult> {
  const response = await keystoneClient<{ transitionAppointment: WorkflowAttemptResult }>(`mutation TransitionPlanAppointment($appointmentId: ID!, $status: String!, $reason: String, $expectedRevision: Int, $idempotencyKey: String) {
    transitionAppointment(appointmentId: $appointmentId, status: $status, reason: $reason, expectedRevision: $expectedRevision, idempotencyKey: $idempotencyKey) { success appointmentId error }
  }`, input);
  return response.success ? response.data.transitionAppointment : { success: false, error: response.error || 'Transition acknowledgement unavailable; retry the original command or reload readback.' };
}
