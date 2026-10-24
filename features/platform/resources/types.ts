export type ResourceStatus = 'all' | 'active' | 'inactive';

export interface PlatformResource {
  id: string;
  name?: string | null;
  type?: string | null;
  capacity?: number | null;
  isActive?: boolean | null;
  isPublic?: boolean | null;
  readinessStatus?: string | null;
  revision: number;
  notes?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  maintenanceDueAt?: string | null;
  calibrationDueAt?: string | null;
  location?: { id: string; name?: string | null; city?: string | null; timezone?: string | null } | null;
  services: { id: string; name?: string | null; baseDuration?: number | null }[];
  appointments: {
    id: string;
    startTime?: string | null;
    endTime?: string | null;
    duration?: number | null;
    status?: string | null;
    client?: { user?: { name?: string | null } | null } | null;
    provider?: { user?: { name?: string | null } | null } | null;
    services: { name?: string | null }[];
  }[];
}

export interface ResourceOperationsData {
  availability: 'loaded' | 'unavailable';
  resources: PlatformResource[];
  counts: { all: number; active: number; inactive: number; uncoveredServices: number };
  options: ResourceFormOptions;
}

export interface ResourceFormOptions {
  locations: { id: string; name: string }[];
  services: { id: string; name: string }[];
  /** The signed-in user's own provider profile; device release must be signed by them. */
  releaseProviderId: string | null;
}

export type ResourceSaveState = { status: 'idle' | 'saved' | 'error'; message: string; resourceId?: string | null };

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  room: 'Treatment room', device: 'Device', equipment: 'Equipment', station: 'Station', other: 'Other',
};

export const READINESS_LABELS: Record<string, string> = {
  acceptance_testing: 'Acceptance testing', available: 'Available', in_use: 'In use', cleaning: 'Cleaning',
  maintenance_due: 'Maintenance due', out_of_service: 'Out of service', incident_lockout: 'Incident lockout',
  recall_quarantine: 'Recall quarantine', retired: 'Retired',
};

/** Readiness actions offered per current status, mirroring transitionDeviceReadiness. */
export const READINESS_ACTIONS: Record<string, Array<{ action: string; toStatus: string; label: string }>> = {
  acceptance_testing: [{ action: 'acceptance_test', toStatus: 'available', label: 'Pass acceptance' }, { action: 'acceptance_test', toStatus: 'out_of_service', label: 'Fail acceptance' }],
  available: [{ action: 'clean', toStatus: 'cleaning', label: 'Cleaning' }, { action: 'maintenance_due', toStatus: 'maintenance_due', label: 'Maintenance due' }, { action: 'lockout', toStatus: 'incident_lockout', label: 'Lock out' }, { action: 'retire', toStatus: 'retired', label: 'Retire' }],
  cleaning: [{ action: 'release', toStatus: 'available', label: 'Release' }, { action: 'service', toStatus: 'out_of_service', label: 'Out of service' }],
  maintenance_due: [{ action: 'service', toStatus: 'out_of_service', label: 'Out of service' }],
  out_of_service: [{ action: 'release', toStatus: 'available', label: 'Release' }, { action: 'retire', toStatus: 'retired', label: 'Retire' }],
  incident_lockout: [{ action: 'release', toStatus: 'available', label: 'Release' }, { action: 'retire', toStatus: 'retired', label: 'Retire' }],
  recall_quarantine: [{ action: 'release', toStatus: 'available', label: 'Release' }, { action: 'retire', toStatus: 'retired', label: 'Retire' }],
};
