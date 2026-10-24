'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { FollowUpActionResult, FollowUpRead, FollowUpStatus } from '../types';

const STATUSES: FollowUpStatus[] = ['open', 'in_progress', 'completed', 'cancelled'];

export async function getFollowUps(status: FollowUpStatus): Promise<FollowUpRead> {
  const response = await keystoneClient<any>(`
    query FollowUps($status: FollowUpTaskStatusType!) {
      followUpTasks(where: { status: { equals: $status } }, orderBy: { dueAt: asc }, take: 100) {
        id title instructions status dueAt completedAt
        client { id user { name } }
        appointment { id location { timezone } }
        treatmentSession { id serviceTitle }
        assignedTo { name }
        actions(orderBy: { occurredAt: desc }, take: 1) { action redFlag reason occurredAt }
      }
      open: followUpTasksCount(where: { status: { equals: open } })
      in_progress: followUpTasksCount(where: { status: { equals: in_progress } })
      completed: followUpTasksCount(where: { status: { equals: completed } })
      cancelled: followUpTasksCount(where: { status: { equals: cancelled } })
    }
  `, { status }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const d = response.data;
  return {
    status: 'loaded',
    counts: Object.fromEntries(STATUSES.map((key) => [key, Number(d[key] || 0)])) as Record<FollowUpStatus, number>,
    tasks: (d.followUpTasks || []).map((task: any) => ({
      id: task.id,
      title: task.title || 'Follow-up',
      instructions: task.instructions || null,
      status: task.status,
      dueAt: task.dueAt || null,
      completedAt: task.completedAt || null,
      clientId: task.client?.id || null,
      clientName: task.client?.user?.name || 'Client',
      appointmentId: task.appointment?.id || null,
      sessionTitle: task.treatmentSession?.serviceTitle || null,
      assignedTo: task.assignedTo?.name || null,
      timezone: task.appointment?.location?.timezone || 'UTC',
      lastAction: task.actions?.[0] ? { action: task.actions[0].action, redFlag: task.actions[0].redFlag || null, reason: task.actions[0].reason || null, occurredAt: task.actions[0].occurredAt || null } : null,
    })),
  };
}

export async function appendFollowUpStep(input: { taskId: string; action: string; reason: string; redFlag: string; idempotencyKey: string }): Promise<FollowUpActionResult> {
  const response = await keystoneClient<{ appendFollowUpAction: FollowUpActionResult }>(`
    mutation AppendFollowUp($taskId: ID!, $action: String!, $reason: String!, $evidence: JSON!, $redFlag: String!, $idempotencyKey: String!) {
      appendFollowUpAction(taskId: $taskId, action: $action, reason: $reason, evidence: $evidence, redFlag: $redFlag, idempotencyKey: $idempotencyKey) { success status error }
    }
  `, { ...input, evidence: { recordedFrom: 'follow-ups' } }).catch(() => null);
  if (!response?.success) return { success: false, error: null };
  if (response.data.appendFollowUpAction.success) revalidatePath('/dashboard/platform/follow-ups');
  return response.data.appendFollowUpAction;
}
