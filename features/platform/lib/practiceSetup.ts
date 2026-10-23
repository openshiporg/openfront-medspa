'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

/** true when the signed-in user belongs to a practice, false when setup has not run, null when unknown. */
export async function hasPracticeSetup(): Promise<boolean | null> {
  const response = await keystoneClient<{ authenticatedItem: { practice: { id: string } | null } | null }>(`
    query PracticeSetupStatus { authenticatedItem { ... on User { practice { id } } } }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success || !response.data.authenticatedItem) return null;
  return Boolean(response.data.authenticatedItem.practice?.id);
}
