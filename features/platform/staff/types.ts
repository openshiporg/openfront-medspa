export type WorkflowActionResult = { success: boolean; recordId?: string | null; error?: string | null; token?: string | null };

export const CAPABILITIES = [
  ['canAccessDashboard', 'Dashboard'], ['canSchedule', 'Scheduling'], ['canReadClients', 'Client records'],
  ['canManageClinical', 'Clinical'], ['canManageSensitiveRecords', 'Sensitive records'], ['canManageFinance', 'Finance'],
  ['canManageInventory', 'Inventory'], ['canManageCommunications', 'Messages'], ['canViewReports', 'Reports'],
  ['canManageIntegrations', 'Integrations'], ['canManagePractice', 'Practice settings'], ['canManagePeople', 'People'],
  ['canManageRoles', 'Roles'], ['canManageOnboarding', 'Onboarding'],
] as const;
export type CapabilityKey = typeof CAPABILITIES[number][0];

export const PROVIDER_ROLES = [['provider', 'Provider'], ['esthetician', 'Esthetician'], ['nurse', 'Nurse'], ['physician', 'Physician'], ['assistant', 'Assistant']] as const;
export const PROVIDER_TIERS = [['junior', 'Associate'], ['senior', 'Senior'], ['master', 'Lead'], ['celebrity', 'Specialist']] as const;
export const PROVIDER_STATUSES = [['active', 'Active'], ['on_leave', 'On leave'], ['inactive', 'Inactive']] as const;

export interface StaffRole { id: string; name: string; assignedToCount: number; capabilities: Record<CapabilityKey, boolean> }
export interface StaffLocationOption { id: string; name: string; isActive: boolean; timezone: string | null }
export interface StaffServiceOption { id: string; name: string; status: string | null; restricted: boolean }

export interface StaffCredential {
  id: string; licenseType: string | null; licenseNumber: string | null; jurisdiction: string | null; status: string | null;
  effectiveFrom: string | null; expiresAt: string | null; supervisionRequired: boolean | null; location: { id: string; name: string } | null;
}
export interface StaffAuthorization {
  id: string; status: string | null; effectiveFrom: string | null; effectiveTo: string | null; supervisionRequired: boolean | null;
  service: { id: string; name: string } | null; location: { id: string; name: string } | null; credential: { id: string; licenseType: string | null } | null;
  requiredSupervisor: { id: string; user: { name: string } | null } | null;
}
export interface StaffSchedule { id: string; type: string | null; dayOfWeek: number | null; localDate: string | null; startTime: string | null; endTime: string | null; isAvailable: boolean | null }

export interface StaffProvider {
  id: string; title: string | null; bio: string | null; role: string | null; tier: string | null; status: string | null;
  isActive: boolean | null; isPublic: boolean | null;
  user: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  locations: Array<{ id: string; name: string }>;
  specializations: Array<{ id: string; name: string; status: string | null }>;
  credentials: StaffCredential[];
  schedulesCount: number;
}

export interface StaffProviderDetail extends StaffProvider {
  authorizations: StaffAuthorization[];
  schedules: StaffSchedule[];
  appointments: Array<{ id: string; startTime: string | null; status: string | null; client: { user: { name: string | null } | null } | null; location: { timezone: string | null } | null; lineItems: Array<{ serviceTitle: string | null }> }>;
}

export interface StaffInvitationRow { id: string; email: string | null; status: string | null; expiresAt: string | null; role: { id: string; name: string } | null }
export interface StaffUserOption { id: string; name: string | null; email: string | null }

export type StaffDirectory =
  | { status: 'loaded'; providers: StaffProvider[]; roles: StaffRole[]; invitations: StaffInvitationRow[]; locations: StaffLocationOption[]; services: StaffServiceOption[]; unlinkedUsers: StaffUserOption[] }
  | { status: 'unavailable' };

export type StaffDetail =
  | { status: 'loaded'; provider: StaffProviderDetail; locations: StaffLocationOption[]; services: StaffServiceOption[]; supervisors: Array<{ id: string; name: string }> }
  | { status: 'missing' }
  | { status: 'unavailable' };
