'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { IntegrationsRead } from '../types';

export async function getIntegrations(): Promise<IntegrationsRead> {
  const response = await keystoneClient<any>(`
    query Integrations {
      paymentProviders(orderBy: { name: asc }, take: 20) { id name code adapter isInstalled isDefault }
      paymentWebhookEvents(orderBy: { processedAt: desc }, take: 20) { id type status processedAt provider { name } }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const data = response.data;
  return {
    status: 'loaded',
    providers: data.paymentProviders || [],
    webhooks: data.paymentWebhookEvents || [],
    // Presence only; no setting values leave the server.
    email: { configured: Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim()) },
  };
}

export async function setPaymentProviderFlag(id: string, field: 'isInstalled' | 'isDefault', value: boolean): Promise<{ success: boolean; error: string | null }> {
  if (!id || !['isInstalled', 'isDefault'].includes(field)) return { success: false, error: 'Unsupported change' };
  const response = await keystoneClient(`mutation UpdatePaymentProvider($id: ID!, $data: PaymentProviderUpdateInput!) { updatePaymentProvider(where: { id: $id }, data: $data) { id } }`, { id, data: { [field]: value } });
  if (!response.success) return { success: false, error: field === 'isInstalled' ? 'Not saved. Check that the Stripe keys are configured on the server.' : 'Not saved.' };
  revalidatePath('/dashboard/platform/integrations');
  revalidatePath('/dashboard/platform/checkout');
  return { success: true, error: null };
}
