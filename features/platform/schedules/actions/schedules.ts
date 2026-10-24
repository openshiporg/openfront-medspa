'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { WorkflowActionResult } from '@/features/platform/staff/types';
import type { PlatformProviderSchedule, ScheduleLocation, ScheduleOperationsData, ScheduleSaveInput } from '../types';

const SCHEDULE_FIELDS = `
  id type dayOfWeek localDate startTime endTime isAvailable isPublic breakStart breakEnd reason effectiveFrom effectiveTo revision
  location { id name timezone }
`;

export async function getScheduleOperations(providerId?: string | null): Promise<ScheduleOperationsData> {
  const where = providerId
    ? `{ id: { equals: $providerId }, isActive: { equals: true } }`
    : `{ isActive: { equals: true } }`;
  const response = await keystoneClient<{ providers: PlatformProviderSchedule[]; locations: ScheduleLocation[]; blockedCount: number }>(`
    query ScheduleOperations${providerId ? '($providerId: ID!)' : ''} {
      providers(where: ${where}, orderBy: { status: asc }, take: 100) {
        id role title isPublic
        user { id name email }
        locations(orderBy: { name: asc }) { id name }
        schedules(orderBy: [{ dayOfWeek: asc }, { startTime: asc }], take: 200) { ${SCHEDULE_FIELDS} }
        appointments(where: { status: { in: [pending, confirmed, in_progress] } }, orderBy: { startTime: asc }, take: 5) {
          id startTime location { timezone } client { user { name } } lineItems { serviceTitle }
        }
      }
      locations(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 100) { id name timezone hours }
      blockedCount: providerSchedulesCount(where: { isAvailable: { equals: false } })
    }
  `, providerId ? { providerId } : {}, { cache: 'no-store' }).catch(() => null);

  if (!response?.success) return { availability: 'unavailable' };
  return {
    availability: 'loaded',
    providers: response.data.providers || [],
    locations: response.data.locations || [],
    blockedCount: response.data.blockedCount || 0,
  };
}

const UPSERT = `
  mutation UpsertProviderSchedule($scheduleId: ID, $providerId: ID!, $locationId: ID!, $type: String!, $dayOfWeek: Int, $localDate: String, $startTime: String!, $endTime: String!, $breakStart: String, $breakEnd: String, $isAvailable: Boolean, $isPublic: Boolean, $reason: String, $effectiveFrom: String, $effectiveTo: String, $idempotencyKey: String, $expectedRevision: Int) {
    upsertProviderSchedule(scheduleId: $scheduleId, providerId: $providerId, locationId: $locationId, type: $type, dayOfWeek: $dayOfWeek, localDate: $localDate, startTime: $startTime, endTime: $endTime, breakStart: $breakStart, breakEnd: $breakEnd, isAvailable: $isAvailable, isPublic: $isPublic, reason: $reason, effectiveFrom: $effectiveFrom, effectiveTo: $effectiveTo, idempotencyKey: $idempotencyKey, expectedRevision: $expectedRevision) { success scheduleId revision error }
  }
`;

/** Saves one or more schedule entries in order; stops at the first refusal. */
export async function saveSchedules(inputs: ScheduleSaveInput[]): Promise<WorkflowActionResult> {
  if (!inputs.length || inputs.length > 7) return { success: false, error: 'Choose at least one day' };
  let saved = 0;
  for (const input of inputs) {
    const response = await keystoneClient<{ upsertProviderSchedule: { success: boolean; scheduleId: string | null; error: string | null } }>(UPSERT, {
      ...input, isAvailable: input.type === 'time_off' ? false : input.isAvailable !== false,
    });
    const result = response.success ? response.data.upsertProviderSchedule : null;
    if (!result?.success) {
      if (saved) revalidatePath('/dashboard/platform/schedules');
      const prefix = saved ? `${saved} saved. ` : '';
      return { success: false, error: prefix + (result?.error || 'Not confirmed. Check the schedule before retrying.') };
    }
    saved += 1;
  }
  revalidatePath('/dashboard/platform/schedules');
  revalidatePath('/dashboard/platform/staff');
  return { success: true };
}

export async function setScheduleAvailability(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString();
  const isAvailable = formData.get('isAvailable')?.toString() === 'true';
  const reason = formData.get('reason')?.toString().trim();
  const expectedRevision = Number(formData.get('revision'));
  if (!id || !Number.isInteger(expectedRevision) || expectedRevision < 1) return;

  const response = await keystoneClient<{ setProviderScheduleAvailability: { success: boolean; error?: string | null } }>(`
    mutation SetScheduleAvailability($scheduleId: ID!, $isAvailable: Boolean!, $reason: String, $expectedRevision: Int!) {
      setProviderScheduleAvailability(scheduleId: $scheduleId, isAvailable: $isAvailable, reason: $reason, expectedRevision: $expectedRevision) { success error }
    }
  `, { scheduleId: id, isAvailable, reason: reason || (isAvailable ? '' : 'Blocked'), expectedRevision });

  if (response.success && response.data.setProviderScheduleAvailability.success) {
    revalidatePath('/dashboard/platform/schedules');
  }
}
