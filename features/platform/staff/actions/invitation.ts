'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { WorkflowActionResult } from '../types';

export async function acceptInvitation(input: { token: string; name: string; password: string }): Promise<WorkflowActionResult> {
  const response = await keystoneClient<{ acceptStaffInvitation: WorkflowActionResult }>(`
    mutation AcceptStaffInvitation($token: String!, $name: String!, $password: String!) {
      acceptStaffInvitation(token: $token, name: $name, password: $password) { success recordId error }
    }
  `, input);
  if (!response.success) return { success: false, error: 'Not confirmed. Try signing in before retrying.' };
  return response.data.acceptStaffInvitation;
}
