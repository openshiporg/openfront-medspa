export type FollowUpStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export type FollowUpTaskRow = {
  id: string;
  title: string;
  instructions: string | null;
  status: FollowUpStatus;
  dueAt: string | null;
  completedAt: string | null;
  clientId: string | null;
  clientName: string;
  appointmentId: string | null;
  sessionTitle: string | null;
  assignedTo: string | null;
  timezone: string;
  lastAction: { action: string; redFlag: string | null; reason: string | null; occurredAt: string | null } | null;
};

export type FollowUpRead =
  | { status: 'loaded'; tasks: FollowUpTaskRow[]; counts: Record<FollowUpStatus, number> }
  | { status: 'unavailable' };

export type FollowUpActionResult = { success: boolean; status?: string | null; error?: string | null };
