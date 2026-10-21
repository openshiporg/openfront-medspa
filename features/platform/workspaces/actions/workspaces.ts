'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

const workspaceSections = ['clients', 'catalog', 'benefits', 'inventory', 'engagement', 'administration', 'reports', 'integrations'] as const;
export type WorkspaceSection = typeof workspaceSections[number];
export interface WorkspaceMetric { label: string; value: number; format: 'money' | 'count' | string }
export interface WorkspaceRecord { id: string; title: string; subtitle?: string | null; status?: string | null; detail?: string | null; amount?: number | null; metric?: number | null; occurredAt?: string | null; href?: string | null; action?: string | null }
export interface WorkspaceData { section: WorkspaceSection; title: string; description: string; attentionCount: number; metrics: WorkspaceMetric[]; records: WorkspaceRecord[] }

export type WorkspaceRead = { status: 'loaded'; data: WorkspaceData } | { status: 'unavailable'; message: string };

export async function getMedSpaWorkspace(section: WorkspaceSection): Promise<WorkspaceRead> {
  if (!workspaceSections.includes(section)) throw new Error('Unsupported medspa workspace');
  const response = await keystoneClient<{ medspaOperationsWorkspace: WorkspaceData }>(`
    query MedSpaOperationsWorkspace($section: String!) {
      medspaOperationsWorkspace(section: $section) {
        section title description attentionCount
        metrics { label value format }
        records { id title subtitle status detail amount metric occurredAt href action }
      }
    }
  `, { section }).catch(() => ({ success: false as const, error: 'Workspace unavailable' }));
  if (!response.success || !response.data.medspaOperationsWorkspace) return { status: 'unavailable', message: 'These records could not be loaded. Try again.' };
  return { status: 'loaded', data: response.data.medspaOperationsWorkspace };
}

export async function adjustInventoryFromWorkspace(formData: FormData): Promise<void> {
  const productId = formData.get('productId')?.toString() || '';
  const locationId = formData.get('locationId')?.toString() || '';
  const delta = Number(formData.get('delta'));
  const reason = formData.get('reason')?.toString().trim() || '';
  const idempotencyKey = formData.get('idempotencyKey')?.toString() || '';
  if (!productId || !locationId || !Number.isInteger(delta) || delta === 0 || !reason || idempotencyKey.length < 12 || idempotencyKey.length > 200) {
    throw new Error('Product, location, quantity change, reason, and operation key are required.');
  }
  const response = await keystoneClient<{ adjustMedSpaInventory: { success: boolean; error?: string | null } }>(`
    mutation AdjustMedSpaInventory($productId: ID!, $locationId: ID!, $delta: Int!, $reason: String!, $idempotencyKey: String!) {
      adjustMedSpaInventory(productId: $productId, locationId: $locationId, delta: $delta, reason: $reason, idempotencyKey: $idempotencyKey) { success error }
    }
  `, { productId, locationId, delta, reason, idempotencyKey });
  if (!response.success || !response.data.adjustMedSpaInventory.success) throw new Error(response.success ? response.data.adjustMedSpaInventory.error || 'Inventory adjustment failed' : response.error);
  revalidatePath('/dashboard/platform/inventory');
}

export async function transitionWaitlistFromWorkspace(formData: FormData): Promise<void> {
  const waitlistEntryId = formData.get('waitlistEntryId')?.toString() || '';
  const action = formData.get('action')?.toString() || '';
  const reason = formData.get('reason')?.toString().trim() || '';
  if (!waitlistEntryId || !['notify', 'remove'].includes(action)) throw new Error('Unsupported waitlist action.');
  const response = await keystoneClient<{ transitionWaitlistEntry: { success: boolean; error?: string | null } }>(`
    mutation TransitionWaitlist($waitlistEntryId: ID!, $action: String!, $reason: String) {
      transitionWaitlistEntry(waitlistEntryId: $waitlistEntryId, action: $action, reason: $reason) { success error }
    }
  `, { waitlistEntryId, action, reason: reason || null });
  if (!response.success || !response.data.transitionWaitlistEntry.success) throw new Error(response.success ? response.data.transitionWaitlistEntry.error || 'Waitlist action failed' : response.error);
  revalidatePath('/dashboard/platform/engagement');
}
