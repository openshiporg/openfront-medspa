'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { WorkflowActionResult } from '@/features/platform/staff/types';
import type { LocationHours, LocationsRead, PracticeLocation } from '../types';

export async function getPracticeLocations(): Promise<LocationsRead> {
  const response = await keystoneClient<{ locations: Array<Omit<PracticeLocation, 'isPrimary'>>; storefrontSettings: Array<{ primaryLocation: { id: string } | null }> }>(`
    query PracticeLocations {
      locations(orderBy: { name: asc }, take: 100) {
        id name address city state zipCode phone email timezone hours isActive providersCount resourcesCount
      }
      storefrontSettings(take: 1) { primaryLocation { id } }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const primaryId = response.data.storefrontSettings?.[0]?.primaryLocation?.id;
  return { status: 'loaded', locations: (response.data.locations || []).map((location) => ({ ...location, isPrimary: location.id === primaryId })) };
}

export async function saveLocation(input: {
  locationId?: string | null; name: string; address: string; city: string; state: string; zipCode: string; phone: string; email: string;
  timezone: string; hours: LocationHours; isActive: boolean; idempotencyKey: string;
}): Promise<WorkflowActionResult> {
  const response = await keystoneClient<{ upsertLocation: WorkflowActionResult }>(`
    mutation UpsertLocation($locationId: ID, $name: String!, $address: String, $city: String, $state: String, $zipCode: String, $phone: String, $email: String, $timezone: String!, $hours: JSON!, $isActive: Boolean!, $idempotencyKey: String!) {
      upsertLocation(locationId: $locationId, name: $name, address: $address, city: $city, state: $state, zipCode: $zipCode, phone: $phone, email: $email, timezone: $timezone, hours: $hours, isActive: $isActive, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, input);
  if (!response.success) return { success: false, error: 'Not confirmed. Check the location before retrying.' };
  if (response.data.upsertLocation.success) {
    revalidatePath('/dashboard/platform/locations');
    revalidatePath('/dashboard/platform/storefront');
    revalidatePath('/contact');
  }
  return response.data.upsertLocation;
}
