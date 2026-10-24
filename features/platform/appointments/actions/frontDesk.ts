'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export interface FrontDeskService { id: string; name: string; baseDuration: number | null; price: number | null; specialists: Array<{ id: string; user: { name: string } | null }> }
export interface FrontDeskLocation { id: string; name: string; timezone: string | null }
export interface FrontDeskClient { id: string; user: { name: string; email: string; phone: string | null } | null }
export type FrontDeskOptions =
  | { status: 'loaded'; services: FrontDeskService[]; locations: FrontDeskLocation[]; clients: FrontDeskClient[] }
  | { status: 'unavailable' };

export async function getFrontDeskOptions(): Promise<FrontDeskOptions> {
  const response = await keystoneClient<{ services: FrontDeskService[]; locations: FrontDeskLocation[] }>(`
    query FrontDeskOptions {
      services(where: { status: { equals: active } }, orderBy: { name: asc }, take: 200) {
        id name baseDuration price
        specialists(where: { status: { equals: active }, isActive: { equals: true } }, take: 50) { id user { name } }
      }
      locations(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 50) { id name timezone }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  // Client lookup is optional: roles without client access can still book by contact details.
  // The directory reads names through the practice-scoped projection, so front-desk roles see them too.
  const directory = await keystoneClient<{ medspaClientDirectory: { items: Array<{ id: string; name: string | null; email: string | null; phone: string | null }> } }>(`
    query FrontDeskClients { medspaClientDirectory(page: 0) }
  `, {}, { cache: 'no-store' }).catch(() => null);
  const clients: FrontDeskClient[] = directory?.success
    ? (directory.data.medspaClientDirectory?.items || []).filter((item) => item.email).map((item) => ({ id: item.id, user: { name: item.name || item.email!, email: item.email!, phone: item.phone } }))
    : [];
  return {
    status: 'loaded',
    services: response.data.services || [],
    locations: response.data.locations || [],
    clients,
  };
}

export interface FrontDeskBookingInput {
  serviceIds: string[]; providerId: string; locationId: string; startTime: string;
  clientName: string; clientEmail: string; clientPhone?: string | null; clientNotes?: string | null; idempotencyKey: string;
}

export async function bookFromFrontDesk(input: FrontDeskBookingInput): Promise<{ success: boolean; appointmentId?: string | null; error?: string | null }> {
  const response = await keystoneClient<{ bookAppointment: { success: boolean; appointmentId: string | null; error: string | null } }>(`
    mutation FrontDeskBook($serviceIds: [ID!]!, $providerId: ID!, $locationId: ID, $startTime: String!, $clientName: String!, $clientEmail: String!, $clientPhone: String, $clientNotes: String, $idempotencyKey: String!) {
      bookAppointment(serviceIds: $serviceIds, providerId: $providerId, locationId: $locationId, startTime: $startTime, clientName: $clientName, clientEmail: $clientEmail, clientPhone: $clientPhone, clientNotes: $clientNotes, idempotencyKey: $idempotencyKey) { success appointmentId error }
    }
  `, { ...input });
  return response.success ? response.data.bookAppointment : { success: false, error: 'Booking not confirmed. Check the appointments list before retrying.' };
}

/** Server-side client search for the front-desk picker (name, email or phone). */
export async function searchFrontDeskClients(search: string): Promise<FrontDeskClient[]> {
  const term = search.trim().slice(0, 100);
  if (term.length < 2) return [];
  const response = await keystoneClient<{ medspaClientDirectory: { items: Array<{ id: string; name: string | null; email: string | null; phone: string | null }> } }>(`
    query FrontDeskClientSearch($search: String) { medspaClientDirectory(search: $search, page: 0) }
  `, { search: term }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return [];
  return (response.data.medspaClientDirectory?.items || []).filter((item) => item.email).slice(0, 8)
    .map((item) => ({ id: item.id, user: { name: item.name || item.email!, email: item.email!, phone: item.phone } }));
}
