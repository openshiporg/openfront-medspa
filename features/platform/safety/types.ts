import type { Option } from '@/features/platform/forms/types';

export type IncidentRow = {
  id: string; summary: string; severity: string; status: string; occurredAt: string | null; closedAt: string | null; actionsCount: number;
  client: { id: string; user: { name: string | null } | null } | null; location: { name: string | null } | null;
  suspectLot: { lotNumber: string | null } | null; suspectDevice: { name: string | null } | null; reportedBy: { name: string | null } | null;
};
export type IncidentAction = {
  id: string; action: string; fromStatus: string | null; toStatus: string | null; severity: string | null; rationale: string | null; occurredAt: string | null;
  actor: { name: string | null } | null; clinician: { user: { name: string | null } | null } | null;
};
export type IncidentDetail = IncidentRow & {
  triageDisposition: string | null; interventions: { symptoms?: unknown; immediateActions?: unknown; onsetAt?: string | null } | null;
  appointment: { id: string; startTime: string | null } | null; actions: IncidentAction[];
};
export type RecallRow = {
  id: string; status: string; sourceReference: string | null; scopeReason: string | null; openedAt: string | null; closedAt: string | null; exposuresCount: number;
  lot: { lotNumber: string | null; product: { name: string | null } | null } | null; device: { name: string | null } | null; location: { name: string | null } | null;
};
export type RecallExposure = {
  id: string; status: string; identifiedAt: string | null; notificationDueAt: string | null;
  client: { id: string; user: { name: string | null } | null } | null; administration: { id: string; completedAt: string | null; service: { name: string | null } | null } | null;
};
export type RecallDetail = RecallRow & {
  exposures: RecallExposure[];
  actions: Array<{ id: string; action: string; reason: string | null; occurredAt: string | null; actor: { name: string | null } | null; exposure: { id: string } | null }>;
};
export type DeviceEventRow = {
  id: string; action: string; fromStatus: string | null; toStatus: string | null; reason: string | null; occurredAt: string | null;
  resource: { name: string | null } | null; actor: { name: string | null } | null; qualifiedReleaseBy: { user: { name: string | null } | null } | null;
};
export type SafetyOptions = { clients: Option[]; locations: Option[]; lots: Option[]; devices: Option[] };
export type SafetyAccess = { canManageClinical: boolean; canActAsClinician: boolean };

export type SafetyOverview =
  | { status: 'unavailable' }
  | {
    status: 'loaded';
    access: SafetyAccess;
    records: { incidents: IncidentRow[]; recalls: RecallRow[]; options: SafetyOptions } | 'restricted';
    deviceEvents: DeviceEventRow[] | 'restricted';
  };
