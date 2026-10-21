'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'dismissed';

export async function updateOnboardingStatus(status: OnboardingStatus) {
  if (status === 'completed') {
    return { success: false, error: 'Completion is set only by the authoritative medspa onboarding transaction.' };
  }
  try {
    const authQuery = `
      query ActiveUserForOnboarding {
        authenticatedItem {
          ... on User {
            id
            role { canManageOnboarding }
          }
        }
      }
    `;

    const authResponse = await keystoneClient<{
      authenticatedItem?: { id: string; role?: { canManageOnboarding?: boolean | null } | null } | null;
    }>(authQuery);

    if (!authResponse.success) {
      return { success: false, error: authResponse.error };
    }

    const userId = authResponse.data?.authenticatedItem?.id;

    if (!userId) {
      return { success: false, error: 'You must be signed in to update onboarding status.' };
    }
    if (authResponse.data?.authenticatedItem?.role?.canManageOnboarding !== true) {
      return { success: false, error: 'You do not have permission to manage onboarding.' };
    }

    const mutation = `
      mutation UpdateOnboardingStatus($id: ID!, $data: UserUpdateInput!) {
        updateUser(where: { id: $id }, data: $data) {
          id
          onboardingStatus
        }
      }
    `;

    const response = await keystoneClient<{ updateUser?: { id: string; onboardingStatus: OnboardingStatus } | null }>(
      mutation,
      {
        id: userId,
        data: { onboardingStatus: status },
      }
    );

    if (!response.success) {
      return { success: false, error: response.error };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/(admin)');

    return { success: true, data: response.data?.updateUser };
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function dismissOnboarding() {
  return updateOnboardingStatus('dismissed');
}

export async function startOnboarding() {
  return updateOnboardingStatus('in_progress');
}

export async function completeOnboarding() {
  return { success: false, error: 'Completion is set only by the authoritative medspa onboarding transaction.' };
}
