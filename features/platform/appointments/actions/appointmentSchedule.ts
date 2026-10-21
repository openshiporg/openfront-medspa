'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { AppointmentScheduleReadback, AppointmentScheduleScope, AppointmentTransitionInput, AppointmentTransitionReceipt } from '../types/appointmentSchedule';

export async function getAppointmentSchedule(appointmentId: string, original?: AppointmentTransitionInput, purpose?: AppointmentScheduleScope['purpose']): Promise<AppointmentScheduleReadback | null> {
  const result = await keystoneClient<{ medspaAppointmentSchedule: AppointmentScheduleReadback }>('query AppointmentSchedule($appointmentId: ID!, $original: JSON, $purpose: String) { medspaAppointmentSchedule(appointmentId: $appointmentId, original: $original, purpose: $purpose) }', { appointmentId, original: original || null, purpose: purpose || null });
  return result.success ? result.data.medspaAppointmentSchedule : null;
}
export async function sendAppointmentTransition(original: AppointmentTransitionInput): Promise<{ success: boolean; receipt: AppointmentTransitionReceipt | null; error: string | null }> {
  const result = await keystoneClient<{ transitionAppointment: { success: boolean; receipt: AppointmentTransitionReceipt | null; error: string | null } }>(`mutation ScopedAppointmentTransition($appointmentId: ID!, $status: String!, $reason: String, $expectedRevision: Int, $idempotencyKey: String, $expectedScope: JSON) {
    transitionAppointment(appointmentId: $appointmentId, status: $status, reason: $reason, expectedRevision: $expectedRevision, idempotencyKey: $idempotencyKey, expectedScope: $expectedScope) { success receipt error }
  }`, original);
  return result.success ? result.data.transitionAppointment : { success: false, receipt: null, error: 'Acknowledgement unavailable. Keep and recover the original command.' };
}
