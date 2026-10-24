'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type {
  ActionResult, ClientMatch, MessageLogView, MessageStatus, MessageTemplateView, TemplateInput, WaitlistBoard,
  WaitlistInput, WaitlistOptions, WaitlistStatus,
} from '../types';

const PATH = '/dashboard/platform/engagement';

export async function getWaitlistBoard(status: WaitlistStatus): Promise<WaitlistBoard | null> {
  const response = await keystoneClient<{ medspaWaitlistBoard: WaitlistBoard }>(`
    query WaitlistBoard($status: String) { medspaWaitlistBoard(status: $status) }
  `, { status }, { cache: 'no-store' }).catch(() => null);
  return response?.success ? response.data.medspaWaitlistBoard : null;
}

export async function getWaitlistOptions(): Promise<WaitlistOptions> {
  const response = await keystoneClient<{ services: Array<{ id: string; name: string }>; providers: Array<{ id: string; user: { name: string } | null; specializations: Array<{ id: string }> }> }>(`
    query WaitlistOptions {
      services(where: { status: { equals: active } }, orderBy: { name: asc }, take: 200) { id name }
      providers(where: { status: { equals: active }, isActive: { equals: true } }, take: 200) { id user { name } specializations(take: 200) { id } }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { services: [], providers: [] };
  return {
    services: response.data.services || [],
    providers: (response.data.providers || []).map((provider) => ({ id: provider.id, name: provider.user?.name || 'Provider', serviceIds: provider.specializations.map((service) => service.id) })),
  };
}

export async function searchWaitlistClients(search: string): Promise<ClientMatch[]> {
  const query = search.trim().slice(0, 100);
  if (query.length < 2) return [];
  const response = await keystoneClient<{ medspaClientDirectory: { items: Array<{ userId: string | null; name: string | null; email: string | null; phone: string | null }> } }>(`
    query WaitlistClientSearch($search: String) { medspaClientDirectory(search: $search, filter: "all", page: 0) }
  `, { search: query }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return [];
  return response.data.medspaClientDirectory.items
    .filter((item): item is ClientMatch & { userId: string } => Boolean(item.userId))
    .slice(0, 8)
    .map((item) => ({ userId: item.userId, name: item.name, email: item.email, phone: item.phone }));
}

export async function addToWaitlist(input: WaitlistInput): Promise<ActionResult> {
  const response = await keystoneClient<{ joinWaitlist: { success: boolean; error: string | null } }>(`
    mutation AddToWaitlist($clientId: ID, $guestName: String, $guestPhone: String, $serviceId: ID!, $preferredProviderIds: [ID!], $preferredDays: JSON, $preferredTimeRange: String, $dateRangeStart: String, $dateRangeEnd: String, $notes: String, $idempotencyKey: String!) {
      joinWaitlist(clientId: $clientId, guestName: $guestName, guestPhone: $guestPhone, serviceId: $serviceId, preferredProviderIds: $preferredProviderIds, preferredDays: $preferredDays, preferredTimeRange: $preferredTimeRange, dateRangeStart: $dateRangeStart, dateRangeEnd: $dateRangeEnd, notes: $notes, idempotencyKey: $idempotencyKey) { success error }
    }
  `, {
    clientId: input.clientUserId || null,
    guestName: input.clientUserId ? null : input.guestName.trim() || null,
    guestPhone: input.clientUserId ? null : input.guestPhone.trim() || null,
    serviceId: input.serviceId,
    preferredProviderIds: input.preferredProviderIds,
    preferredDays: input.preferredDays,
    preferredTimeRange: input.preferredTimeRange.trim() || null,
    dateRangeStart: input.dateRangeStart ? new Date(`${input.dateRangeStart}T00:00:00`).toISOString() : null,
    dateRangeEnd: input.dateRangeEnd ? new Date(`${input.dateRangeEnd}T23:59:59`).toISOString() : null,
    notes: input.notes.trim() || null,
    idempotencyKey: input.idempotencyKey,
  });
  if (!response.success) return { success: false, error: 'Not added. Check the waitlist before retrying.' };
  if (response.data.joinWaitlist.success) revalidatePath(PATH);
  return response.data.joinWaitlist;
}

export async function transitionWaitlist(waitlistEntryId: string, action: 'notify' | 'remove' | 'reactivate', reason: string): Promise<ActionResult> {
  const response = await keystoneClient<{ transitionWaitlistEntry: { success: boolean; error: string | null } }>(`
    mutation TransitionWaitlistEntry($waitlistEntryId: ID!, $action: String!, $reason: String) {
      transitionWaitlistEntry(waitlistEntryId: $waitlistEntryId, action: $action, reason: $reason) { success error }
    }
  `, { waitlistEntryId, action, reason: reason.trim() || null });
  if (!response.success) return { success: false, error: 'Not updated. Try again.' };
  if (response.data.transitionWaitlistEntry.success) revalidatePath(PATH);
  return response.data.transitionWaitlistEntry;
}

export async function getMessageTemplates(): Promise<MessageTemplateView[] | null> {
  const response = await keystoneClient<{ messageTemplates: Array<{ id: string; name: string; type: MessageTemplateView['type']; content: string | null; variables: unknown; isActive: boolean; updatedAt: string | null }> }>(`
    query MessageTemplates { messageTemplates(orderBy: { name: asc }, take: 200) { id name type content variables isActive updatedAt } }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return null;
  return response.data.messageTemplates.map((template) => ({
    ...template,
    content: template.content || '',
    variables: Array.isArray(template.variables) ? template.variables.map(String) : [],
  }));
}

async function practiceId(): Promise<string | null> {
  const response = await keystoneClient<{ authenticatedItem: { practice: { id: string } | null } | null }>(`
    query TemplatePractice { authenticatedItem { ... on User { practice { id } } } }
  `, {}, { cache: 'no-store' }).catch(() => null);
  return response?.success ? response.data.authenticatedItem?.practice?.id || null : null;
}

export async function saveMessageTemplate(input: TemplateInput): Promise<ActionResult> {
  const name = input.name.trim();
  const content = input.content.trim();
  if (!name || name.length > 120) return { success: false, error: 'Enter a name up to 120 characters.' };
  if (!content || content.length > 5000) return { success: false, error: 'Enter message text up to 5,000 characters.' };
  const variables = [...new Set(input.variables.map((value) => value.trim()).filter((value) => /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(value)))].slice(0, 30);
  const data = { name, type: input.type, content, variables, isActive: input.isActive };

  if (input.id) {
    const response = await keystoneClient<{ updateMessageTemplate: { id: string } | null }>(`
      mutation UpdateMessageTemplate($id: ID!, $data: MessageTemplateUpdateInput!) { updateMessageTemplate(where: { id: $id }, data: $data) { id } }
    `, { id: input.id, data });
    if (!response.success || !response.data.updateMessageTemplate) return { success: false, error: 'Template not saved.' };
  } else {
    const practice = await practiceId();
    if (!practice) return { success: false, error: 'Practice not set up.' };
    const response = await keystoneClient<{ createMessageTemplate: { id: string } | null }>(`
      mutation CreateMessageTemplate($data: MessageTemplateCreateInput!) { createMessageTemplate(data: $data) { id } }
    `, { data: { ...data, practice: { connect: { id: practice } } } });
    if (!response.success || !response.data.createMessageTemplate) return { success: false, error: 'Template not saved.' };
  }
  revalidatePath(PATH);
  return { success: true };
}

export async function getMessageLog(status: MessageStatus, page: number): Promise<MessageLogView | null> {
  const response = await keystoneClient<{ medspaMessageLog: MessageLogView }>(`
    query MessageLog($status: String, $page: Int) { medspaMessageLog(status: $status, page: $page) }
  `, { status, page }, { cache: 'no-store' }).catch(() => null);
  return response?.success ? response.data.medspaMessageLog : null;
}
