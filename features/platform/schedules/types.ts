export interface PlatformSchedule {
  id: string;
  type: 'recurring' | 'one_time' | 'time_off' | null;
  dayOfWeek: number | null;
  localDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean | null;
  isPublic: boolean | null;
  breakStart: string | null;
  breakEnd: string | null;
  reason: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  revision: number;
  location: { id: string; name: string; timezone: string | null } | null;
}

export interface PlatformProviderSchedule {
  id: string;
  role: string | null;
  title: string | null;
  isPublic: boolean | null;
  user: { id: string; name: string | null; email: string | null } | null;
  locations: Array<{ id: string; name: string }>;
  schedules: PlatformSchedule[];
  appointments: Array<{
    id: string;
    startTime: string | null;
    location: { timezone: string | null } | null;
    client: { user: { name: string | null } | null } | null;
    lineItems: Array<{ serviceTitle: string | null }>;
  }>;
}

export interface ScheduleLocation { id: string; name: string; timezone: string | null; hours: Record<string, { open?: string | null; close?: string | null; closed?: boolean | null }> | null }

export type ScheduleOperationsData =
  | { availability: 'loaded'; providers: PlatformProviderSchedule[]; locations: ScheduleLocation[]; blockedCount: number }
  | { availability: 'unavailable' };

export interface ScheduleSaveInput {
  scheduleId?: string | null;
  expectedRevision?: number | null;
  providerId: string;
  locationId: string;
  type: 'recurring' | 'one_time' | 'time_off';
  dayOfWeek?: number | null;
  localDate?: string | null;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  isPublic: boolean;
  isAvailable?: boolean;
  reason?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  idempotencyKey?: string | null;
}
