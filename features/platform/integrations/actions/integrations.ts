'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { IntegrationsRead } from '../types';

export async function getIntegrations(eventStatus: string): Promise<IntegrationsRead> {
  const where = eventStatus === 'all' ? {} : { status: { equals: eventStatus } };
  const response = await keystoneClient<any>(`
    query Integrations($where: DomainEventWhereInput!) {
      paymentProviders(orderBy: { name: asc }, take: 20) { id name code adapter isInstalled isDefault }
      domainEvents(where: $where, orderBy: { occurredAt: desc }, take: 50) { id eventType aggregateType status attempts occurredAt lastError }
      pending: domainEventsCount(where: { status: { equals: pending } })
      deadLetter: domainEventsCount(where: { status: { equals: dead_letter } })
      delivered: domainEventsCount(where: { status: { equals: delivered } })
      paymentWebhookEvents(orderBy: { processedAt: desc }, take: 20) { id type status processedAt provider { name } }
    }
  `, { where }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const data = response.data;
  return {
    status: 'loaded',
    providers: data.paymentProviders || [],
    events: data.domainEvents || [],
    eventCounts: { pending: data.pending || 0, deadLetter: data.deadLetter || 0, delivered: data.delivered || 0 },
    webhooks: data.paymentWebhookEvents || [],
    // Presence only; no setting values leave the server.
    email: { configured: Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim()) },
  };
}

export async function setPaymentProviderFlag(id: string, field: 'isInstalled' | 'isDefault', value: boolean): Promise<{ success: boolean; error: string | null }> {
  if (!id || !['isInstalled', 'isDefault'].includes(field)) return { success: false, error: 'Unsupported change' };
  const response = await keystoneClient(`mutation UpdatePaymentProvider($id: ID!, $data: PaymentProviderUpdateInput!) { updatePaymentProvider(where: { id: $id }, data: $data) { id } }`, { id, data: { [field]: value } });
  if (!response.success) return { success: false, error: field === 'isInstalled' ? 'Not saved. Stripe stays off until refund reconciliation ships.' : 'Not saved.' };
  revalidatePath('/dashboard/platform/integrations');
  revalidatePath('/dashboard/platform/checkout');
  return { success: true, error: null };
}
