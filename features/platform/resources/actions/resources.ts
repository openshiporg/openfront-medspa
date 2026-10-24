'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { PlatformResource, ResourceFormOptions, ResourceOperationsData, ResourceSaveState } from '../types';

const RESOURCE_QUERY = `
  id
  name
  type
  capacity
  isActive
  isPublic
  readinessStatus
  revision
  notes
  manufacturer
  model
  serialNumber
  maintenanceDueAt
  calibrationDueAt
  location { id name city timezone }
  services { id name baseDuration }
  appointments(
    where: { status: { in: [pending, confirmed, in_progress] } }
    orderBy: { startTime: asc }
    take: 8
  ) {
    id
    startTime
    endTime
    duration
    status
    client { user { name } }
    provider { user { name } }
    services { name }
  }
`;

function buildResourceWhere(status?: string | null) {
  if (status === 'active') return { isActive: { equals: true } };
  if (status === 'inactive') return { isActive: { equals: false } };
  return {};
}

const emptyOptions: ResourceFormOptions = { locations: [], services: [], releaseProviderId: null };

export async function getResourceOperations(status?: string | null): Promise<ResourceOperationsData> {
  const response = await keystoneClient<{
    resources: PlatformResource[];
    allCount: number;
    activeCount: number;
    inactiveCount: number;
    uncoveredServices: { id: string }[];
    locations: { id: string; name: string }[];
    services: { id: string; name: string }[];
    authenticatedItem: { providerProfile: { id: string } | null } | null;
  }>(
    `
      query ResourceOperations($where: ResourceWhereInput!) {
        resources(where: $where, orderBy: { name: asc }, take: 100) {
          ${RESOURCE_QUERY}
        }
        allCount: resourcesCount
        activeCount: resourcesCount(where: { isActive: { equals: true } })
        inactiveCount: resourcesCount(where: { isActive: { equals: false } })
        uncoveredServices: services(where: { requiredResources: { none: {} }, status: { equals: active } }, take: 200) {
          id
        }
        locations(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 50) { id name }
        services(orderBy: { name: asc }, take: 200) { id name }
        authenticatedItem { ... on User { providerProfile { id } } }
      }
    `,
    { where: buildResourceWhere(status) },
    { cache: 'no-store' },
  );

  if (!response.success) {
    return { availability: 'unavailable', resources: [], counts: { all: 0, active: 0, inactive: 0, uncoveredServices: 0 }, options: emptyOptions };
  }

  return {
    availability: 'loaded',
    resources: response.data.resources || [],
    counts: {
      all: response.data.allCount || 0,
      active: response.data.activeCount || 0,
      inactive: response.data.inactiveCount || 0,
      uncoveredServices: response.data.uncoveredServices?.length || 0,
    },
    options: {
      locations: response.data.locations || [],
      services: response.data.services || [],
      releaseProviderId: response.data.authenticatedItem?.providerProfile?.id || null,
    },
  };
}

export async function setResourceActive(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString();
  const isActive = formData.get('isActive')?.toString() === 'true';
  const expectedRevision = Number(formData.get('revision'));
  if (!id || !Number.isInteger(expectedRevision) || expectedRevision < 1) return;

  const response = await keystoneClient<{ setResourceAvailability: { success: boolean; error?: string | null } }>(
    `
      mutation SetResourceAvailability($resourceId: ID!, $isActive: Boolean!, $expectedRevision: Int!) {
        setResourceAvailability(resourceId: $resourceId, isActive: $isActive, expectedRevision: $expectedRevision) { success error }
      }
    `,
    { resourceId: id, isActive, expectedRevision },
  );
  if (!response.success || !response.data.setResourceAvailability.success) {
    console.error('Failed to update resource:', response.success ? response.data.setResourceAvailability.error : response.error);
    return;
  }
  revalidatePath('/dashboard/platform/resources');
}

function optionalDate(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? `${text}T12:00:00.000Z` : null;
}

export async function saveResource(_state: ResourceSaveState, formData: FormData): Promise<ResourceSaveState> {
  const resourceId = formData.get('resourceId')?.toString() || null;
  const revision = Number(formData.get('expectedRevision'));
  const capacity = Number(formData.get('capacity'));
  const input = {
    resourceId,
    expectedRevision: resourceId ? revision : null,
    name: formData.get('name')?.toString() || '',
    type: formData.get('type')?.toString() || '',
    locationId: formData.get('locationId')?.toString() || '',
    capacity: Number.isFinite(capacity) ? Math.trunc(capacity) : 0,
    isPublic: formData.get('isPublic') === 'on',
    notes: formData.get('notes')?.toString() || null,
    manufacturer: formData.get('manufacturer')?.toString() || null,
    model: formData.get('model')?.toString() || null,
    serialNumber: formData.get('serialNumber')?.toString() || null,
    maintenanceDueAt: optionalDate(formData.get('maintenanceDueAt')),
    calibrationDueAt: optionalDate(formData.get('calibrationDueAt')),
    serviceIds: formData.getAll('serviceIds').map(String).filter(Boolean),
    idempotencyKey: formData.get('idempotencyKey')?.toString() || '',
  };
  if (!input.name.trim()) return { status: 'error', message: 'Enter a name' };
  if (!input.locationId) return { status: 'error', message: 'Choose a location' };

  const response = await keystoneClient<{ upsertResource: { success: boolean; resourceId: string | null; error: string | null } }>(
    `
      mutation UpsertResource($resourceId: ID, $expectedRevision: Int, $name: String!, $type: String!, $locationId: ID!, $capacity: Int!, $isPublic: Boolean!, $notes: String, $manufacturer: String, $model: String, $serialNumber: String, $maintenanceDueAt: String, $calibrationDueAt: String, $serviceIds: [ID!]!, $idempotencyKey: String!) {
        upsertResource(resourceId: $resourceId, expectedRevision: $expectedRevision, name: $name, type: $type, locationId: $locationId, capacity: $capacity, isPublic: $isPublic, notes: $notes, manufacturer: $manufacturer, model: $model, serialNumber: $serialNumber, maintenanceDueAt: $maintenanceDueAt, calibrationDueAt: $calibrationDueAt, serviceIds: $serviceIds, idempotencyKey: $idempotencyKey) { success resourceId error }
      }
    `,
    input,
  );
  if (!response.success) return { status: 'error', message: 'Not saved. Reload and try again.' };
  const result = response.data.upsertResource;
  if (!result.success) return { status: 'error', message: result.error || 'Not saved' };
  revalidatePath('/dashboard/platform/resources');
  return { status: 'saved', message: resourceId ? 'Saved' : 'Resource added', resourceId: result.resourceId };
}

export async function transitionResourceReadiness(input: { resourceId: string; action: string; toStatus: string; reason: string; qualifiedReleaseProviderId: string | null; idempotencyKey: string }): Promise<{ success: boolean; error?: string | null }> {
  const response = await keystoneClient<{ transitionDeviceReadiness: { success: boolean; error: string | null } }>(
    `
      mutation TransitionDeviceReadiness($resourceId: ID!, $action: String!, $toStatus: String!, $reason: String!, $qualifiedReleaseProviderId: ID, $evidence: JSON!, $idempotencyKey: String!) {
        transitionDeviceReadiness(resourceId: $resourceId, action: $action, toStatus: $toStatus, reason: $reason, qualifiedReleaseProviderId: $qualifiedReleaseProviderId, evidence: $evidence, idempotencyKey: $idempotencyKey) { success error }
      }
    `,
    { ...input, qualifiedReleaseProviderId: input.toStatus === 'available' ? input.qualifiedReleaseProviderId : null, evidence: { source: 'platform-resources', note: input.reason } },
  );
  if (!response.success) return { success: false, error: 'Not confirmed. Reload to check the current status.' };
  if (response.data.transitionDeviceReadiness.success) revalidatePath('/dashboard/platform/resources');
  return response.data.transitionDeviceReadiness;
}
