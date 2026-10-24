export type TreatmentStepName =
  | 'consultation'
  | 'finding'
  | 'decision'
  | 'order'
  | 'orderAction'
  | 'consent'
  | 'withdrawConsent'
  | 'prepareSession'
  | 'startSession'
  | 'administration'
  | 'note'
  | 'followUp';

export type TreatmentStepResult = { success: boolean; recordId?: string | null; error?: string | null };

export type TreatmentPerson = { id: string; name: string };

export type TreatmentService = {
  id: string;
  name: string;
  requiresConsultation: boolean;
  requiresLotTraceability: boolean;
  clinicalProductIds: string[];
};

export type TreatmentFinding = {
  id: string;
  ruleCode: string;
  ruleVersion: string;
  severity: string;
  detectedAt: string | null;
  decision: { disposition: string; rationale: string | null; decidedAt: string | null; expiresAt: string | null } | null;
};

export type TreatmentConsultation = {
  id: string;
  status: string;
  candidacyDecision: string | null;
  summary: string | null;
  signedAt: string | null;
  serviceId: string | null;
  superseded: boolean;
  findings: TreatmentFinding[];
};

export type TreatmentOrder = {
  id: string;
  status: string;
  serviceId: string | null;
  planId: string | null;
  indication: string | null;
  validUntil: string | null;
  signedAt: string | null;
};

export type TreatmentPlanSummary = { id: string; title: string; status: string; plannedServiceIds: string[] };

export type TreatmentConsent = { id: string; status: string; serviceId: string | null; signerName: string | null; signedAt: string | null; effectiveUntil: string | null };

export type TreatmentTemplate = { id: string; serviceId: string | null; version: string; language: string; jurisdiction: string; effectiveFrom: string | null; effectiveUntil: string | null };

export type TreatmentSessionSummary = {
  id: string;
  status: string;
  serviceId: string | null;
  serviceTitle: string | null;
  durationMinutes: number | null;
  orderId: string | null;
  consentId: string | null;
  roomId: string | null;
  deviceId: string | null;
  supervisorId: string | null;
  providerId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  administrationCount: number;
};

export type TreatmentAdministrationSummary = { id: string; status: string; sessionId: string | null; completedAt: string | null; immediateOutcome: string | null; lotCount: number };

export type TreatmentLot = { id: string; lotNumber: string; productId: string | null; productName: string; remainingQuantity: number; expiresAt: string | null };

export type TreatmentResource = { id: string; name: string; type: string; readinessStatus: string | null };

export type TreatmentNote = { id: string; type: string | null; content: string | null; signedAt: string | null };

export type TreatmentFollowUp = { id: string; title: string; status: string; dueAt: string | null };

export type TreatmentWorkspace = {
  appointment: {
    id: string;
    status: string;
    startTime: string | null;
    duration: number | null;
    timezone: string;
    locationId: string | null;
    locationName: string | null;
    clientId: string | null;
    clientName: string;
    providerId: string | null;
    providerName: string | null;
  };
  actorProviderId: string | null;
  services: TreatmentService[];
  consultations: TreatmentConsultation[];
  plans: TreatmentPlanSummary[];
  orders: TreatmentOrder[];
  templates: TreatmentTemplate[];
  consents: TreatmentConsent[];
  sessions: TreatmentSessionSummary[];
  administrations: TreatmentAdministrationSummary[];
  lots: TreatmentLot[];
  rooms: TreatmentResource[];
  devices: TreatmentResource[];
  providers: TreatmentPerson[];
  staffUsers: TreatmentPerson[];
  notes: TreatmentNote[];
  followUps: TreatmentFollowUp[];
};

export type TreatmentWorkspaceRead =
  | { status: 'loaded'; data: TreatmentWorkspace }
  | { status: 'restricted' }
  | { status: 'unavailable' };
