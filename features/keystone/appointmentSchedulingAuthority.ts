import type { Context } from '.keystone/types';
import type { BaseKeystoneTypeInfo, KeystoneContext } from '@keystone-6/core/types';
import { permissions } from './access';
import type { AppointmentScheduleScope } from '../platform/appointments/types/appointmentSchedule';

async function currentMember<TypeInfo extends BaseKeystoneTypeInfo>(sudo: KeystoneContext<TypeInfo>, practiceId: string, actorId: string) {
  const members = await sudo.query.PracticeMembership.findMany({ where: { practice: { id: { equals: practiceId } }, user: { id: { equals: actorId } } }, take: 2, query: 'id status practice { id } user { id } locations(take: 101) { id isActive practice { id } }' });
  const member = members[0];
  if (members.length !== 1 || !member?.id || member.status !== 'active' || member.practice?.id !== practiceId || member.user?.id !== actorId || member.locations.length > 100 || member.locations.some((location: { isActive: boolean; practice?: { id: string } | null }) => location.practice?.id !== practiceId || location.isActive !== true)) throw new Error('Current scheduling membership is unavailable');
  return member;
}

/** Used by ordinary root/count/inverse Appointment read filters BEFORE field resolution. */
export async function currentSchedulerReadScope(context: Context) {
  const actorId = context.session?.itemId, practiceId = context.session?.data.practice?.id;
  if (!actorId || !practiceId || !permissions.canSchedule({ session: context.session })) throw new Error('Scheduling authority is unavailable');
  const actor = await context.sudo().query.User.findOne({ where: { id: actorId }, query: 'id status practice { id } role { practice { id } canSchedule canManagePractice }' });
  if (!actor || actor.id !== actorId || actor.status !== 'active' || actor.practice?.id !== practiceId || actor.role?.practice?.id !== practiceId || actor.role.canSchedule !== true) throw new Error('Scheduling authority is unavailable');
  const member = await currentMember(context.sudo(), practiceId, actorId);
  const locationIds: string[] = member.locations.map((location: { id: string }) => location.id);
  return { practiceId, practiceWide: actor.role.canManagePractice === true, locationIds };
}

/** Generic root/inverse reads must not turn a scheduling grant into access to private narratives. */
export async function canReadAppointmentPrivateFields<TypeInfo extends BaseKeystoneTypeInfo>({ context, item }: { context: KeystoneContext<TypeInfo>; item: { id: { toString(): string } } }, allowOwner = false) {
  try {
    const actorId = context.session?.itemId, practiceId = context.session?.data.practice?.id;
    if (!actorId || !practiceId) return false;
    const sudo = context.sudo();
    const actor = await sudo.query.User.findOne({ where: { id: actorId }, query: 'id status practice { id } role { practice { id } canManageClinical }' });
    if (!actor || actor.status !== 'active' || actor.practice?.id !== practiceId) return false;
    const header = await sudo.query.Appointment.findOne({ where: { id: item.id.toString() }, query: 'id practice { id } location { id } client { id practice { id } user { id } }' });
    if (!header || header.practice?.id !== practiceId || header.client?.practice?.id !== practiceId || !header.location?.id) return false;
    if (allowOwner && header.client.user?.id === actorId) return true;
    if (!permissions.canManageClinical({ session: context.session }) || actor.role?.canManageClinical !== true || actor.role.practice?.id !== practiceId) return false;
    const member = await currentMember(sudo, practiceId, actorId);
    return member.locations.some((location: { id: string }) => location.id === header.location!.id);
  } catch { return false; }
}

/** Scheduling is not permission to retrieve a clinical graph. No claimed purpose grants access. */
export async function assertAppointmentSchedulingAuthority(context: Context, appointmentId: string, options: { cancellationOnly?: boolean; purpose?: AppointmentScheduleScope['purpose'] } = {}) {
  const actorId = context.session?.itemId;
  const practiceId = context.session?.data.practice?.id;
  if (!actorId || !practiceId || !appointmentId) throw new Error('Appointment scheduling access is unavailable');
  const sudo = context.sudo();
  const actor = await sudo.query.User.findOne({ where: { id: actorId }, query: 'id status practice { id } role { id practice { id } canSchedule canManagePractice }' });
  if (!actor || actor.id !== actorId || actor.status !== 'active' || actor.practice?.id !== practiceId) throw new Error('Appointment scheduling access is unavailable');
  // Header only: no metadata, consultation, consent, session, payment or narrative before authority.
  const header = await sudo.query.Appointment.findOne({ where: { id: appointmentId }, query: 'id practice { id } location { id } client { id practice { id } user { id } }' });
  if (!header || header.practice?.id !== practiceId || header.client?.practice?.id !== practiceId || !header.client?.id || !header.location?.id) throw new Error('Appointment scheduling access is unavailable');
  const location = await sudo.query.Location.findOne({ where: { id: header.location.id }, query: 'id isActive practice { id }' });
  if (!location || location.id !== header.location.id || location.practice?.id !== practiceId || location.isActive !== true) throw new Error('Appointment scheduling access is unavailable');
  const owner = header.client.user?.id === actorId;
  const scheduler = permissions.canSchedule({ session: context.session }) && actor.role?.canSchedule === true && actor.role.practice?.id === practiceId;
  // Explicit customer purpose preserves owned cancellation even if that identity also has staff flags.
  if (owner && (options.purpose === 'customer_cancel' || (options.cancellationOnly && options.purpose !== 'scheduler') || !scheduler)) {
    if (!options.cancellationOnly) throw new Error('Owned customer access is limited to cancellation and its readback');
    return { scope: { actorId, practiceId, locationId: location.id, clientId: header.client.id, appointmentId: header.id, purpose: 'customer_cancel' } satisfies AppointmentScheduleScope, membershipId: null, delegation: 'owned_customer', header };
  }
  if (!scheduler || options.purpose === 'customer_cancel') throw new Error('Appointment scheduling access is unavailable');
  const member = await currentMember(sudo, practiceId, actorId);
  const assigned = member.locations.some((value: { id: string }) => value.id === location.id);
  // Existing controlled Role.canManagePractice + canSchedule is a separate practice-wide grant.
  // It never substitutes for active membership and never grants clinical read/perform authority.
  if (!assigned && actor.role?.canManagePractice !== true) throw new Error('Current scheduling location authority is unavailable');
  return { scope: { actorId, practiceId, locationId: location.id, clientId: header.client.id, appointmentId: header.id, purpose: 'scheduler' } satisfies AppointmentScheduleScope, membershipId: member.id, delegation: assigned ? 'location_member' : 'practice_manager', header };
}
