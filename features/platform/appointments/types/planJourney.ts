export type PlanJourney = {
  consultation: { id: string; clientId: string; clientName: string; clientEmail: string; clientPhone: string; providerId: string; locationId: string; serviceId: string; serviceName: string; status: string; candidacyDecision: string; evidenceHash: string; revision: string; superseded: boolean; canApprove: boolean };
  canSchedule: boolean;
  pages: { plans: number; appointments: number; history: number; morePlans: boolean; moreAppointments: boolean; moreHistory: boolean };
  plans: { id: string; title: string; status: string; revision: number; evidenceHash: string; signedAt: string | null; receiptAvailable: boolean; items: { id: string; serviceId: string; title: string; plannedSessions: number; completedSessions: number; price: number | null; duration: number | null }[] }[];
  appointments: { id: string; planId: string; itemId: string; status: string; revision: number; startTime: string; endTime: string | null; price: number; resourceIds: string[]; supervisorIds: string[]; correctable: boolean }[];
  history: { id: string; action: string; resourceId: string; occurredAt: string; evidenceHash: string; correlationId: string }[];
};
export type ConsultationQueue = { page: number; hasMore: boolean; items: { id: string; clientName: string; serviceName: string; status: string; candidacyDecision: string }[] };
export type PlanSlot = { startTime: string; time: string; available: boolean; resourceIds: string[]; roomId: string | null; deviceId: string | null; supervisorIds: string[]; blockedReason: string | null };
export type WorkflowAttemptResult = { success: boolean; recordId?: string | null; appointmentId?: string | null; error?: string | null };
