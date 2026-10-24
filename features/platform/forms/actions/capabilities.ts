'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { Capabilities } from '../types';

/** The signed-in role's clinical and records capabilities; null when unknown. */
export async function getRecordCapabilities(): Promise<Capabilities | null> {
  const response = await keystoneClient<{ authenticatedItem: { role: Record<string, boolean | null> | null; providerProfile: { id: string } | null } | null }>(`
    query RecordCapabilities {
      authenticatedItem { ... on User { role { canManageClinical canManageSensitiveRecords canManagePractice } providerProfile { id } } }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success || !response.data.authenticatedItem) return null;
  const role = response.data.authenticatedItem.role || {};
  return {
    canManageClinical: role.canManageClinical === true,
    canManageSensitiveRecords: role.canManageSensitiveRecords === true,
    canManagePractice: role.canManagePractice === true,
    providerId: response.data.authenticatedItem.providerProfile?.id || null,
  };
}
