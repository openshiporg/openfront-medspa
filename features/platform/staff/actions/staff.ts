'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { CAPABILITIES, type CapabilityKey, type StaffDetail, type StaffDirectory, type StaffRole, type WorkflowActionResult } from '../types';

const CAPABILITY_FIELDS = CAPABILITIES.map(([key]) => key).join(' ');
const SERVICE_FIELDS = 'id name status staffAuthorizationRequired requiresConsultation requiresIntakeReview requiresLotTraceability';
const PROVIDER_FIELDS = `
  id title bio role tier status isActive isPublic
  user { id name email phone }
  locations(orderBy: { name: asc }) { id name }
  specializations(orderBy: { name: asc }) { id name status }
  credentials(orderBy: { expiresAt: asc }) { id licenseType licenseNumber jurisdiction status effectiveFrom expiresAt supervisionRequired location { id name } }
  schedulesCount
`;

type RawService = { id: string; name: string; status: string | null; staffAuthorizationRequired: boolean | null; requiresConsultation: boolean | null; requiresIntakeReview: boolean | null; requiresLotTraceability: boolean | null };
const toService = (service: RawService) => ({
  id: service.id, name: service.name, status: service.status,
  restricted: service.staffAuthorizationRequired !== false || Boolean(service.requiresConsultation || service.requiresIntakeReview || service.requiresLotTraceability),
});
const toRole = (role: any): StaffRole => ({ id: role.id, name: role.name, assignedToCount: role.assignedToCount || 0, capabilities: Object.fromEntries(CAPABILITIES.map(([key]) => [key, role[key] === true])) as Record<CapabilityKey, boolean> });

export async function getStaffDirectory(): Promise<StaffDirectory> {
  const response = await keystoneClient<any>(`
    query StaffDirectory {
      providers(orderBy: { status: asc }, take: 200) { ${PROVIDER_FIELDS} }
      locations(orderBy: { name: asc }, take: 100) { id name isActive timezone }
      services(orderBy: { name: asc }, take: 300) { ${SERVICE_FIELDS} }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  // People data needs separate capabilities; a missing grant leaves those panels empty.
  const people = await keystoneClient<any>(`
    query StaffPeople {
      roles(orderBy: { name: asc }, take: 100) { id name assignedToCount ${CAPABILITY_FIELDS} }
      staffInvitations(where: { status: { equals: pending } }, orderBy: { expiresAt: asc }, take: 100) { id email status expiresAt role { id name } }
      users(where: { providerProfile: null, clientProfile: null, status: { equals: active } }, orderBy: { name: asc }, take: 200) { id name email }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  const peopleData = people?.success ? people.data : { roles: [], staffInvitations: [], users: [] };
  return {
    status: 'loaded',
    providers: response.data.providers || [],
    locations: response.data.locations || [],
    services: (response.data.services || []).map(toService),
    roles: (peopleData.roles || []).map(toRole),
    invitations: peopleData.staffInvitations || [],
    unlinkedUsers: peopleData.users || [],
  };
}

export async function getStaffDetail(id: string): Promise<StaffDetail> {
  const response = await keystoneClient<any>(`
    query StaffDetail($id: ID!) {
      provider(where: { id: $id }) {
        ${PROVIDER_FIELDS}
        authorizations(orderBy: { effectiveFrom: desc }, take: 100) {
          id status effectiveFrom effectiveTo supervisionRequired
          service { id name } location { id name } credential { id licenseType } requiredSupervisor { id user { name } }
        }
        schedules(orderBy: [{ dayOfWeek: asc }, { startTime: asc }], take: 100) { id type dayOfWeek localDate startTime endTime isAvailable }
        appointments(where: { status: { in: [pending, confirmed, in_progress] } }, orderBy: { startTime: asc }, take: 10) {
          id startTime status client { user { name } } location { timezone } lineItems { serviceTitle }
        }
      }
      locations(orderBy: { name: asc }, take: 100) { id name isActive timezone }
      services(orderBy: { name: asc }, take: 300) { ${SERVICE_FIELDS} }
      supervisors: providers(where: { status: { equals: active }, id: { not: { equals: $id } } }, orderBy: { status: asc }, take: 200) { id user { name } }
    }
  `, { id }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  if (!response.data.provider) return { status: 'missing' };
  return {
    status: 'loaded',
    provider: response.data.provider,
    locations: response.data.locations || [],
    services: (response.data.services || []).map(toService),
    supervisors: (response.data.supervisors || []).map((item: any) => ({ id: item.id, name: item.user?.name || 'Provider' })),
  };
}

async function run(mutation: string, field: string, variables: Record<string, unknown>, paths: string[]): Promise<WorkflowActionResult> {
  const response = await keystoneClient<Record<string, WorkflowActionResult>>(mutation, variables);
  if (!response.success) return { success: false, error: 'Not confirmed. Check the record before retrying.' };
  const result = response.data[field];
  if (result?.success) for (const path of paths) revalidatePath(path);
  return result || { success: false, error: 'Not saved' };
}

export async function saveProviderProfile(input: {
  providerId: string; title: string; bio: string; role: string; tier: string; status: string; isActive: boolean; isPublic: boolean;
  specializationIds: string[]; locationIds: string[]; idempotencyKey: string;
}): Promise<WorkflowActionResult> {
  return run(`mutation UpdateProviderProfile($providerId: ID!, $title: String, $bio: String, $role: String!, $tier: String!, $status: String!, $isActive: Boolean!, $isPublic: Boolean!, $specializationIds: [ID!]!, $locationIds: [ID!]!, $idempotencyKey: String!) {
    updateProviderProfile(providerId: $providerId, title: $title, bio: $bio, role: $role, tier: $tier, status: $status, isActive: $isActive, isPublic: $isPublic, specializationIds: $specializationIds, locationIds: $locationIds, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'updateProviderProfile', input, ['/dashboard/platform/staff', `/dashboard/platform/staff/${input.providerId}`]);
}

export async function inviteStaffMember(input: { email: string; roleId: string; locationIds: string[]; expiresInHours: number; idempotencyKey: string }): Promise<WorkflowActionResult> {
  return run(`mutation InviteStaff($email: String!, $roleId: ID!, $locationIds: [ID!], $expiresInHours: Int!, $idempotencyKey: String!) {
    inviteStaff(email: $email, roleId: $roleId, locationIds: $locationIds, expiresInHours: $expiresInHours, idempotencyKey: $idempotencyKey) { success recordId token error }
  }`, 'inviteStaff', input, ['/dashboard/platform/staff']);
}

export async function saveAccessRole(input: { roleId?: string | null; name: string; capabilities: Record<string, boolean>; idempotencyKey: string }): Promise<WorkflowActionResult> {
  return run(`mutation UpsertAccessRole($roleId: ID, $name: String!, $capabilities: JSON!, $idempotencyKey: String!) {
    upsertAccessRole(roleId: $roleId, name: $name, capabilities: $capabilities, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'upsertAccessRole', input, ['/dashboard/platform/staff']);
}

export async function createProviderForUser(input: { userId: string; role: string; title: string; locationIds: string[]; idempotencyKey: string }): Promise<WorkflowActionResult> {
  return run(`mutation CreateProviderProfile($userId: ID!, $role: String!, $title: String, $locationIds: [ID!]!, $idempotencyKey: String!) {
    createProviderProfile(userId: $userId, role: $role, title: $title, locationIds: $locationIds, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'createProviderProfile', input, ['/dashboard/platform/staff']);
}

export async function registerCredential(input: {
  providerId: string; locationId: string | null; licenseType: string; licenseNumber: string; jurisdiction: string; effectiveFrom: string; expiresAt: string;
  verificationSource: string; evidenceReference: string; scopeEvidence: Record<string, unknown>; supervisionRequired: boolean; supervisorId: string | null; protocolVersion: string; idempotencyKey: string;
}): Promise<WorkflowActionResult> {
  return run(`mutation RegisterProviderCredential($providerId: ID!, $locationId: ID, $licenseType: String!, $licenseNumber: String!, $jurisdiction: String!, $effectiveFrom: String!, $expiresAt: String!, $verificationSource: String!, $evidenceReference: String!, $scopeEvidence: JSON!, $supervisionRequired: Boolean!, $supervisorId: ID, $protocolVersion: String!, $idempotencyKey: String!) {
    registerProviderCredential(providerId: $providerId, locationId: $locationId, licenseType: $licenseType, licenseNumber: $licenseNumber, jurisdiction: $jurisdiction, effectiveFrom: $effectiveFrom, expiresAt: $expiresAt, verificationSource: $verificationSource, evidenceReference: $evidenceReference, scopeEvidence: $scopeEvidence, supervisionRequired: $supervisionRequired, supervisorId: $supervisorId, protocolVersion: $protocolVersion, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'registerProviderCredential', input, [`/dashboard/platform/staff/${input.providerId}`, '/dashboard/platform/administration']);
}

export async function configureAuthorization(input: {
  providerId: string; credentialId: string; locationId: string; serviceId: string; requiredSupervisorId: string | null; supervisionRequired: boolean; supervisionMode: string;
  effectiveFrom: string; effectiveTo: string | null; policyVersion: string; evidenceLabel: string; evidenceReference: string; authorityEvidence: Record<string, unknown>; idempotencyKey: string;
}): Promise<WorkflowActionResult> {
  return run(`mutation ConfigureProviderAuthorization($providerId: ID!, $credentialId: ID!, $locationId: ID!, $serviceId: ID!, $requiredSupervisorId: ID, $supervisionRequired: Boolean!, $supervisionMode: String, $effectiveFrom: String!, $effectiveTo: String, $policyVersion: String!, $evidenceLabel: String!, $evidenceReference: String!, $authorityEvidence: JSON!, $idempotencyKey: String!) {
    configureProviderAuthorization(providerId: $providerId, credentialId: $credentialId, locationId: $locationId, serviceId: $serviceId, requiredSupervisorId: $requiredSupervisorId, supervisionRequired: $supervisionRequired, supervisionMode: $supervisionMode, effectiveFrom: $effectiveFrom, effectiveTo: $effectiveTo, policyVersion: $policyVersion, evidenceLabel: $evidenceLabel, evidenceReference: $evidenceReference, authorityEvidence: $authorityEvidence, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'configureProviderAuthorization', input, [`/dashboard/platform/staff/${input.providerId}`]);
}

export async function transitionAuthority(input: { providerId: string; targetType: 'provider' | 'credential' | 'authorization'; targetId: string; action: 'activate' | 'suspend' | 'revoke'; reason: string; idempotencyKey: string }): Promise<WorkflowActionResult> {
  const { providerId, ...variables } = input;
  return run(`mutation TransitionProviderAuthority($targetType: String!, $targetId: ID!, $action: String!, $reason: String!, $idempotencyKey: String!) {
    transitionProviderAuthority(targetType: $targetType, targetId: $targetId, action: $action, reason: $reason, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'transitionProviderAuthority', variables, ['/dashboard/platform/staff', `/dashboard/platform/staff/${providerId}`, '/dashboard/platform/administration']);
}
