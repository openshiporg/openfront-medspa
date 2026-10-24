import { graphql } from '@keystone-6/core';
import type { Context } from '.keystone/types';
import { appointmentClientKey, assertAppointmentSchedulingAuthority } from '../appointmentSchedulingAuthority';
import { assertExpectedSchedulingScope, loadAppointmentTransitionReceipt } from '../mutations/appointmentWorkflows';
import type { AppointmentScheduleReadback, AppointmentScheduleScope, AppointmentTransitionInput } from '../../platform/appointments/types/appointmentSchedule';

/** Minimal scheduling/recovery DTO. No clinical graph or raw audit evidence is returned. */
export async function loadAppointmentSchedule(context: Context, appointmentId: string, original?: AppointmentTransitionInput | null, purpose?: AppointmentScheduleScope['purpose'] | null): Promise<AppointmentScheduleReadback> {
  if (purpose != null && !['scheduler', 'customer_cancel'].includes(purpose)) throw new Error('Unsupported scheduling purpose');
  if (original && original.appointmentId !== appointmentId) throw new Error('Original appointment intent does not match');
  const authority = await assertAppointmentSchedulingAuthority(context, appointmentId, { cancellationOnly: !original || original.status === 'cancelled', purpose: original?.expectedScope?.purpose || purpose || undefined });
  assertExpectedSchedulingScope(original?.expectedScope, authority.scope);
  const row = await context.sudo().query.Appointment.findOne({ where: { id: appointmentId }, query: 'id practice { id } location { id timezone } client { id } revision status startTime endTime metadata consentsCount treatmentSessionsCount payment { id } transaction { id }' });
  if (!row || row.practice?.id !== authority.scope.practiceId || row.location?.id !== authority.scope.locationId || appointmentClientKey(row) !== authority.scope.clientId) throw new Error('Appointment scheduling access is unavailable');
  const binding = (row.metadata as Record<string, unknown> | null)?.planBooking;
  const receipt = original ? await loadAppointmentTransitionReceipt(context.sudo(), original, authority.scope, binding) : null;
  const simpleCorrectionAllowed = ['pending', 'confirmed'].includes(row.status!) && !row.consentsCount && !row.treatmentSessionsCount && !row.payment?.id && !row.transaction?.id;
  const allowedTransitions: AppointmentTransitionInput['status'][] = [];
  if (authority.scope.purpose === 'scheduler' && row.status === 'pending') allowedTransitions.push('confirmed');
  // Check-in is offered only on the visit's own local day.
  const zone = row.location?.timezone || 'UTC';
  const dayKey = (value: Date) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value); } catch { return value.toISOString().slice(0, 10); } };
  const visitDay = row.startTime ? dayKey(new Date(row.startTime)) === dayKey(new Date()) : false;
  if (authority.scope.purpose === 'scheduler' && row.status === 'confirmed' && !row.transaction?.id && visitDay) allowedTransitions.push('in_progress');
  if (simpleCorrectionAllowed) { allowedTransitions.push('cancelled'); if (authority.scope.purpose === 'scheduler') allowedTransitions.push('no_show'); }
  const guestMeta = (row.metadata as Record<string, any> | null)?.guest;
  const guest = authority.scope.purpose === 'scheduler' && !row.client?.id && guestMeta && typeof guestMeta === 'object'
    ? { name: String(guestMeta.name || '').slice(0, 120), email: String(guestMeta.email || '').slice(0, 254), phone: String(guestMeta.phone || '').slice(0, 40) }
    : null;
  return { guest, scope: authority.scope, timezone: row.location?.timezone || 'UTC', revision: row.revision, status: row.status!, startTime: new Date(row.startTime!).toISOString(), endTime: row.endTime ? new Date(row.endTime).toISOString() : null, simpleCorrectionAllowed, allowedTransitions, receipt };
}
export const medspaAppointmentSchedule = graphql.field({ type: graphql.JSON, args: { appointmentId: graphql.arg({ type: graphql.nonNull(graphql.ID) }), original: graphql.arg({ type: graphql.JSON }), purpose: graphql.arg({ type: graphql.String }) }, resolve(_source, args, context: Context) { return loadAppointmentSchedule(context, args.appointmentId, args.original as AppointmentTransitionInput | null, args.purpose as AppointmentScheduleScope['purpose'] | null); } });
