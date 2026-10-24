'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { ClientDirectory, ClientFilter, ClientFormOptions, ClientProfileInput, ClientRecord, WorkflowResult } from '../types';

export async function getClientDirectory(search: string, filter: ClientFilter, page: number): Promise<ClientDirectory | null> {
  const response = await keystoneClient<{ medspaClientDirectory: ClientDirectory }>(`
    query ClientDirectory($search: String, $filter: String, $page: Int) { medspaClientDirectory(search: $search, filter: $filter, page: $page) }
  `, { search, filter, page }, { cache: 'no-store' }).catch(() => null);
  return response?.success ? response.data.medspaClientDirectory : null;
}

/** undefined: request failed. null: no such client in this practice. */
export async function getClientRecord(clientId: string): Promise<ClientRecord | null | undefined> {
  const response = await keystoneClient<{ medspaClientRecord: ClientRecord | null }>(`
    query ClientRecord($clientId: ID!) { medspaClientRecord(clientId: $clientId) }
  `, { clientId }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return undefined;
  return response.data.medspaClientRecord;
}

export async function getClientFormOptions(): Promise<ClientFormOptions> {
  const response = await keystoneClient<{ providers: Array<{ id: string; user: { name: string } | null }>; locations: Array<{ id: string; name: string }> }>(`
    query ClientFormOptions {
      providers(where: { status: { equals: active } }, orderBy: { createdAt: asc }, take: 200) { id user { name } }
      locations(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 50) { id name }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { providers: [], locations: [] };
  return {
    providers: (response.data.providers || []).map((provider) => ({ id: provider.id, name: provider.user?.name || 'Provider' })),
    locations: response.data.locations || [],
  };
}

export async function saveClientProfile(input: ClientProfileInput): Promise<WorkflowResult> {
  const response = await keystoneClient<{ updateClientProfile: WorkflowResult }>(`
    mutation UpdateClientProfile($clientId: ID!, $name: String!, $phone: String, $dateOfBirth: String, $contactPreferences: String, $operationalNotes: String, $preferredProviderId: ID, $homeLocationId: ID, $marketingConsent: Boolean!, $idempotencyKey: String!) {
      updateClientProfile(clientId: $clientId, name: $name, phone: $phone, dateOfBirth: $dateOfBirth, contactPreferences: $contactPreferences, operationalNotes: $operationalNotes, preferredProviderId: $preferredProviderId, homeLocationId: $homeLocationId, marketingConsent: $marketingConsent, idempotencyKey: $idempotencyKey) { success recordId error }
    }
  `, {
    ...input,
    dateOfBirth: input.dateOfBirth || null,
    preferredProviderId: input.preferredProviderId || null,
    homeLocationId: input.homeLocationId || null,
  });
  if (!response.success) return { success: false, error: 'Profile not saved. Try again.' };
  if (response.data.updateClientProfile.success) {
    revalidatePath(`/dashboard/platform/clients/${input.clientId}`);
    revalidatePath('/dashboard/platform/clients');
  }
  return response.data.updateClientProfile;
}
