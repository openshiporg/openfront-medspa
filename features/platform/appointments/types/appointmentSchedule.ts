export type AppointmentScheduleScope = {
  actorId: string; practiceId: string; locationId: string; clientId: string;
  appointmentId: string; purpose: 'scheduler' | 'customer_cancel';
};
export type AppointmentTransitionInput = {
  appointmentId: string; status: 'confirmed' | 'in_progress' | 'cancelled' | 'no_show';
  reason?: string | null; expectedRevision?: number | null; idempotencyKey?: string | null;
  expectedScope?: AppointmentScheduleScope | null;
};
export type AppointmentTransitionReceipt = {
  version: 1; scope: AppointmentScheduleScope; idempotencyKey: string; requestHash: string;
  receiptId: string; evidenceHash: string; fromRevision: number; toRevision: number;
  status: string;
};
export type AppointmentScheduleReadback = {
  scope: AppointmentScheduleScope; timezone: string; revision: number; status: string; startTime: string;
  endTime: string | null; simpleCorrectionAllowed: boolean; allowedTransitions: AppointmentTransitionInput['status'][];
  receipt: AppointmentTransitionReceipt | null;
};
