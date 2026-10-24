import type { Option } from '@/features/platform/forms/types';

export type RightsRequestRow = {
  id: string; type: string; status: string; requestedAt: string | null; dueAt: string | null; completedAt: string | null; legalBasis: string | null; actionEntriesCount: number;
  client: { id: string; user: { name: string | null } | null } | null; requestedBy: { name: string | null } | null; assignedTo: { name: string | null } | null;
};
export type RightsRequestDetail = RightsRequestRow & {
  scope: unknown;
  actionEntries: Array<{ id: string; action: string; reason: string | null; occurredAt: string | null; actor: { name: string | null } | null }>;
};
export type LegalHoldRow = {
  id: string; status: string; reason: string | null; authorityReference: string | null; placedAt: string | null; releasedAt: string | null; releaseReason: string | null;
  client: { user: { name: string | null } | null } | null; incident: { summary: string | null } | null; asset: { category: string | null; originalFilename: string | null } | null;
  placedBy: { name: string | null } | null; releasedBy: { name: string | null } | null;
};
export type RetentionPolicyRow = {
  id: string; jurisdiction: string; recordClass: string; version: string; retainMonths: number; minorsRule: string | null; dispositionRule: string | null; sourceCitations: string | null;
  effectiveFrom: string | null; effectiveUntil: string | null; approvedBy: { name: string | null } | null;
};
export type BreakGlassRow = {
  id: string; status: string; emergencyReason: string | null; openedAt: string | null; expiresAt: string | null; reviewedAt: string | null;
  client: { user: { name: string | null } | null } | null; actor: { name: string | null } | null; reviewer: { name: string | null } | null;
};

export type PrivacyOverview =
  | { status: 'restricted' }
  | { status: 'unavailable' }
  | { status: 'loaded'; canApprove: boolean; requests: RightsRequestRow[]; holds: LegalHoldRow[]; policies: RetentionPolicyRow[]; breakGlass: BreakGlassRow[]; clients: Option[]; incidents: Option[] };
