import type { Context } from ".keystone/types";
import { evaluateProviderAuthority } from "../clinicalAuthority";
import { hasAppointmentConflict, hasReservationConflict, hasResourceCapacity } from "./capacity";

const SLOT_INTERVAL_MINUTES = 30;
export const BOOKING_BUFFER_MINUTES = 15;
const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed", "in_progress"] as const;

export type AvailabilitySlot = {
  time: string;
  startTime: string;
  available: boolean;
  resourceId: string | null;
  resourceName: string | null;
  resourceIds: string[];
  roomId: string | null;
  deviceId: string | null;
  supervisorIds: string[];
  blockedReason: string | null;
};

export type ProviderAvailability = {
  providerId: string;
  providerName: string;
  date: string;
  timezone: string;
  locationId: string | null;
  supervisorIds: string[];
  slots: AvailabilitySlot[];
};

type WallParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

type ScheduleRecord = {
  id: string;
  type: "recurring" | "one_time" | "time_off";
  dayOfWeek?: number | null;
  date?: string | null;
  localDate?: string | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isPublic?: boolean;
  breakStart?: string | null;
  breakEnd?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  reason?: string | null;
};

function assertDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Availability date is invalid");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Availability date is invalid");
  return value;
}

export function timeToMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error("Schedule time must use HH:MM");
  return Number(match[1]) * 60 + Number(match[2]);
}

function timeLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(mins).padStart(2, "0")} ${period}`;
}

function validTimeZone(value: unknown): string {
  const timezone = typeof value === "string" && value.trim() ? value.trim() : "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    throw new Error("MedSpa timezone is invalid");
  }
}

function wallParts(date: Date, timezone: string): WallParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "0";
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(value("year")), month: Number(value("month")), day: Number(value("day")),
    hour: Number(value("hour")), minute: Number(value("minute")), weekday: weekdays[value("weekday")] ?? 0,
  };
}

export function zonedDateKey(date: Date, timezone: string) {
  const parts = wallParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function nextDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function zonedDateTimeToUtc(dateKey: string, minutes: number, timezone: string) {
  assertDateKey(dateKey);
  const [year, month, day] = dateKey.split("-").map(Number);
  const desiredHour = Math.floor(minutes / 60);
  const desiredMinute = minutes % 60;
  const desiredWall = Date.UTC(year, month - 1, day, desiredHour, desiredMinute, 0, 0);
  let guess = desiredWall;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = wallParts(new Date(guess), timezone);
    const actualWall = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0, 0);
    const correction = desiredWall - actualWall;
    guess += correction;
    if (correction === 0) break;
  }
  const result = new Date(guess);
  const verified = wallParts(result, timezone);
  if (verified.year !== year || verified.month !== month || verified.day !== day || verified.hour !== desiredHour || verified.minute !== desiredMinute) {
    throw new Error("Selected local time does not exist in the medspa timezone");
  }
  return result;
}

export function zonedDayWindow(dateKey: string, timezone: string) {
  return {
    start: zonedDateTimeToUtc(dateKey, 0, timezone),
    end: zonedDateTimeToUtc(nextDateKey(dateKey), 0, timezone),
  };
}

function scheduleDateKey(schedule: Pick<ScheduleRecord, "localDate" | "date">) {
  if (schedule.localDate && /^\d{4}-\d{2}-\d{2}$/.test(schedule.localDate)) return schedule.localDate;
  if (!schedule.date) return null;
  const date = new Date(schedule.date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function withinEffectiveRange(schedule: ScheduleRecord, dateKey: string) {
  const from = schedule.effectiveFrom ? new Date(schedule.effectiveFrom).toISOString().slice(0, 10) : null;
  const to = schedule.effectiveTo ? new Date(schedule.effectiveTo).toISOString().slice(0, 10) : null;
  return (!from || dateKey >= from) && (!to || dateKey <= to);
}

function overlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function interval(schedule: ScheduleRecord) {
  return { start: timeToMinutes(schedule.startTime), end: timeToMinutes(schedule.endTime) };
}

export async function getRuntimeLocation(
  sudo: ReturnType<Context["sudo"]>,
  locationId?: string | null,
  practiceId?: string | null,
  publicOnly = false,
) {
  const selection = "id timezone isActive practice { id isActive storefrontSetting { isPublished primaryLocation { id } } }";
  const usable = (location: any) => location?.isActive === true
    && (!practiceId || location.practice?.id === practiceId)
    && (!publicOnly || (location.practice?.isActive === true
      && location.practice?.storefrontSetting?.isPublished === true
      && location.practice.storefrontSetting.primaryLocation?.id === location.id));
  if (locationId) {
    const location = await sudo.query.Location.findOne({ where: { id: locationId }, query: selection });
    if (!usable(location)) throw new Error("Location is unavailable");
    return { locationId: location.id, timezone: validTimeZone(location.timezone) };
  }
  const locations = await sudo.query.Location.findMany({
    where: {
      isActive: { equals: true },
      practice: practiceId ? { id: { equals: practiceId } } : undefined,
    },
    orderBy: { createdAt: "asc" }, take: 20, query: selection,
  });
  const usableLocations = locations.filter(usable);
  if (usableLocations.length !== 1) throw new Error(usableLocations.length ? "Choose a medspa location" : "No active medspa location is configured");
  return { locationId: usableLocations[0].id, timezone: validTimeZone(usableLocations[0].timezone) };
}

export async function computeProviderAvailability({
  sudo,
  providerId,
  date,
  serviceDuration,
  serviceIds = [],
  locationId: requestedLocationId,
  publicOnly = false,
  excludeAppointmentId,
}: {
  sudo: ReturnType<Context["sudo"]>;
  providerId: string;
  date: string;
  serviceDuration: number;
  serviceIds?: string[];
  locationId?: string | null;
  publicOnly?: boolean;
  excludeAppointmentId?: string;
}): Promise<ProviderAvailability> {
  const dateKey = assertDateKey(date);
  if (!Number.isInteger(serviceDuration) || serviceDuration < 1 || serviceDuration > 8 * 60) throw new Error("Service duration is invalid");
  const provider = await sudo.query.Provider.findOne({
    where: { id: providerId }, query: "id status isActive isPublic practice { id } user { name } locations { id }",
  });
  if (!provider || provider.status !== "active" || provider.isActive !== true || (publicOnly && provider.isPublic !== true)) throw new Error("Provider is unavailable");
  if (!provider.practice?.id) throw new Error("Provider practice is unavailable");
  const { locationId, timezone } = await getRuntimeLocation(sudo, requestedLocationId, provider.practice.id, publicOnly);
  const localNoon = zonedDateTimeToUtc(dateKey, 12 * 60, timezone);
  const requestedWeekday = wallParts(localNoon, timezone).weekday;
  if (!provider.locations?.some((location: any) => location.id === locationId)) throw new Error("Provider is not assigned to this location");

  const schedules = await sudo.query.ProviderSchedule.findMany({
    where: {
      practice: { id: { equals: provider.practice.id } },
      provider: { id: { equals: providerId } },
      location: { id: { equals: locationId } },
    },
    take: 1001,
    query: "id type dayOfWeek localDate date startTime endTime isAvailable isPublic breakStart breakEnd effectiveFrom effectiveTo reason",
  }) as ScheduleRecord[];
  const exact = schedules.filter((schedule) => scheduleDateKey(schedule) === dateKey);
  const oneTimeAvailable = exact.filter((schedule) => schedule.type === "one_time" && schedule.isAvailable && (!publicOnly || schedule.isPublic === true));
  const recurring = schedules.filter((schedule) => schedule.type === "recurring"
    && schedule.isAvailable && schedule.dayOfWeek === requestedWeekday && withinEffectiveRange(schedule, dateKey) && (!publicOnly || schedule.isPublic === true));
  const availability = oneTimeAvailable.length ? oneTimeAvailable : recurring;
  const blocks = exact.filter((schedule) => schedule.type === "time_off" || (schedule.type === "one_time" && !schedule.isAvailable));

  const { start: dayStart, end: dayEnd } = zonedDayWindow(dateKey, timezone);
  const previousCapacityWindow = new Date(dayStart.getTime() - 2 * 86_400_000);
  const appointments = await sudo.query.Appointment.findMany({
    where: {
      NOT: excludeAppointmentId ? { id: { equals: excludeAppointmentId } } : undefined,
      provider: { id: { equals: providerId } },
      startTime: { gte: previousCapacityWindow.toISOString(), lt: dayEnd.toISOString() },
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
    },
    take: 1001,
    query: "id startTime endTime duration metadata location { id }",
  });
  const primarySupervisorReservations = await sudo.query.AppointmentSupervisorReservation.findMany({ where: { NOT: excludeAppointmentId ? { appointment: { id: { equals: excludeAppointmentId } } } : undefined, supervisor: { id: { equals: providerId } }, startsAt: { lt: dayEnd.toISOString() }, endsAt: { gt: previousCapacityWindow.toISOString() }, status: { equals: "reserved" } }, take: 1001, query: "id startsAt endsAt supervisor { id }" });
  if (primarySupervisorReservations.length > 1000) throw new Error("Staff reservation history exceeds the safe verification bound");
  const resourceAppointments = await sudo.query.Appointment.findMany({
    where: {
      NOT: excludeAppointmentId ? { id: { equals: excludeAppointmentId } } : undefined,
      location: { id: { equals: locationId } },
      startTime: { gte: previousCapacityWindow.toISOString(), lt: dayEnd.toISOString() },
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
    },
    take: 1001,
    query: "id startTime endTime duration metadata resource { id } room { id } device { id }",
  });
  const resourceReservations = await sudo.query.AppointmentResourceReservation.findMany({
    where: { NOT: excludeAppointmentId ? { appointment: { id: { equals: excludeAppointmentId } } } : undefined, location: { id: { equals: locationId } }, startsAt: { lt: dayEnd.toISOString() }, endsAt: { gt: previousCapacityWindow.toISOString() }, status: { in: ["reserved", "in_use"] } },
    take: 1001,
    query: "id startsAt endsAt units assignmentEvidence resource { id } appointment { id }",
  });
  const resourceScheduleBlocks = await sudo.query.ResourceScheduleBlock.findMany({
    where: { location: { id: { equals: locationId } }, startsAt: { lt: dayEnd.toISOString() }, endsAt: { gt: dayStart.toISOString() } },
    take: 1001,
    query: "id startsAt endsAt resource { id }",
  });
  const services = serviceIds.length ? await sudo.query.Service.findMany({
    where: {
      id: { in: [...new Set(serviceIds)] },
      status: { equals: "active" },
      isPublic: publicOnly ? { equals: true } : undefined,
      practice: { id: { equals: provider.practice.id } },
    },
    query: "id staffAuthorizationRequired cleanupBufferMinutes requiredResources { id name type capacity isActive isPublic readinessStatus maintenanceDueAt calibrationDueAt practice { id } location { id } }",
  }) : [];
  if (serviceIds.length && services.length !== new Set(serviceIds).size) throw new Error("A selected service is unavailable");
  if ((services as any[]).some(service => (service.requiredResources || []).some((resource: any) => resource.isActive !== true || (publicOnly && resource.isPublic !== true)))) {
    throw new Error("A selected service has no active public request resource");
  }
  const authorityDecisions = [];
  for (const service of (services as any[]).filter(item => item.staffAuthorizationRequired !== false)) authorityDecisions.push(await evaluateProviderAuthority(sudo, {
    providerId, serviceId: service.id, locationId: locationId!, at: localNoon, stage: "scheduling",
  }));
  const supervisorIds = [...new Set(authorityDecisions.map((decision: any) => decision.supervisorId).filter(Boolean))] as string[];
  const resourceRequirements = services.flatMap((service: any) => service.requiredResources || []);
  if (resourceRequirements.some((resource: any) => !resource?.id || resource.practice?.id !== provider.practice!.id || resource.location?.id !== locationId)) {
    throw new Error("Selected service has no resource configured at this location");
  }
  const requiredResources = resourceRequirements
    .filter((resource: any, index: number, all: any[]) => all.findIndex((candidate) => candidate.id === resource.id) === index);
  if (services.some((service: any) => service.requiredResources?.length) && requiredResources.length === 0) throw new Error("Selected service has no resource configured at this location");
  if (requiredResources.some((resource: any) => ['device','equipment'].includes(resource.type)
    && resource.readinessStatus !== 'available')) throw new Error("A required device is not released and ready");
  const supervisorAppointments = supervisorIds.length ? await sudo.query.Appointment.findMany({
    where: { NOT: excludeAppointmentId ? { id: { equals: excludeAppointmentId } } : undefined, provider: { id: { in: supervisorIds } }, startTime: { gte: previousCapacityWindow.toISOString(), lt: dayEnd.toISOString() }, status: { in: [...ACTIVE_APPOINTMENT_STATUSES] } },
    take: 1001,
    query: "id startTime endTime duration metadata provider { id }",
  }) : [];
  const supervisorReservations = supervisorIds.length ? await sudo.query.AppointmentSupervisorReservation.findMany({
    where: { NOT: excludeAppointmentId ? { appointment: { id: { equals: excludeAppointmentId } } } : undefined, supervisor: { id: { in: supervisorIds } }, startsAt: { lt: dayEnd.toISOString() }, endsAt: { gt: new Date(dayStart.getTime() - 86_400_000).toISOString() }, status: { equals: "reserved" } }, take: 1001,
    query: "id startsAt endsAt supervisor { id }",
  }) : [];
  const supervisorSchedules = supervisorIds.length ? await sudo.query.ProviderSchedule.findMany({
    where: { practice: { id: { equals: provider.practice.id } }, provider: { id: { in: supervisorIds } }, location: { id: { equals: locationId } } }, take: 1001,
    query: "id provider { id } type dayOfWeek localDate date startTime endTime isAvailable isPublic reason effectiveFrom effectiveTo",
  }) as Array<ScheduleRecord & { provider?: { id: string } | null }> : [];
  if (schedules.length > 1000 || appointments.length > 1000 || resourceAppointments.length > 1000 || resourceReservations.length > 1000 || resourceScheduleBlocks.length > 1000 || supervisorAppointments.length > 1000 || supervisorReservations.length > 1000 || supervisorSchedules.length > 1000) throw new Error("Availability data exceeds the safe verification bound");

  const cleanupBufferMinutes = Math.max(BOOKING_BUFFER_MINUTES, ...(services as any[]).map((service) => Math.max(0, Number(service.cleanupBufferMinutes) || 0)));
  const candidateMinutes = new Map<number, ScheduleRecord>();
  for (const schedule of availability) {
    const range = interval(schedule);
    if (range.end <= range.start) continue;
    for (let minutes = range.start; minutes + serviceDuration <= range.end; minutes += SLOT_INTERVAL_MINUTES) {
      if (minutes + serviceDuration + cleanupBufferMinutes <= range.end && !candidateMinutes.has(minutes)) candidateMinutes.set(minutes, schedule);
    }
  }

  const slots: AvailabilitySlot[] = [];
  for (const [slotStart, schedule] of [...candidateMinutes.entries()].sort(([a], [b]) => a - b)) {
    const serviceEnd = slotStart + serviceDuration;
    const reservedEnd = serviceEnd + cleanupBufferMinutes;
    const slotStartAt = zonedDateTimeToUtc(dateKey, slotStart, timezone);
    const slotReservedEndAt = new Date(slotStartAt.getTime() + (serviceDuration + cleanupBufferMinutes) * 60_000);
    const breakStart = schedule.breakStart ? timeToMinutes(schedule.breakStart) : null;
    const breakEnd = schedule.breakEnd ? timeToMinutes(schedule.breakEnd) : null;
    const duringBreak = breakStart !== null && breakEnd !== null && overlap(slotStart, reservedEnd, breakStart, breakEnd);
    const blockedSchedule = blocks.find((block) => {
      const range = interval(block);
      return overlap(slotStart, reservedEnd, range.start, range.end);
    });
    const appointmentConflict = hasAppointmentConflict(appointments, slotStartAt, slotReservedEndAt, BOOKING_BUFFER_MINUTES) || hasReservationConflict(primarySupervisorReservations, providerId, slotStartAt, slotReservedEndAt, "supervisor");
    const selectedResources = requiredResources.filter((resource: any) => (!["device", "equipment"].includes(resource.type) || [resource.maintenanceDueAt, resource.calibrationDueAt].every(due => !due || (Number.isFinite(Date.parse(due)) && Date.parse(due) > slotReservedEndAt.getTime()))) && hasResourceCapacity({
      resourceId: resource.id, capacity: Number(resource.capacity || 1), start: slotStartAt, end: slotReservedEndAt,
      reservations: resourceReservations, appointments: resourceAppointments, blocks: resourceScheduleBlocks, bufferMinutes: BOOKING_BUFFER_MINUTES,
    }));
    const resourceBlocked = selectedResources.length !== requiredResources.length;
    const supervisorBlocked = supervisorIds.some(supervisorId => {
      const schedulesForSupervisor = supervisorSchedules.filter((schedule) => schedule.provider?.id === supervisorId);
      const hasCoverage = schedulesForSupervisor.some(schedule => schedule.isAvailable && (!publicOnly || schedule.isPublic === true)
        && ((schedule.type === 'one_time' && scheduleDateKey(schedule) === dateKey)
          || (schedule.type === 'recurring' && schedule.dayOfWeek === requestedWeekday && withinEffectiveRange(schedule, dateKey)))
        && slotStart >= interval(schedule).start && reservedEnd <= interval(schedule).end);
      const blockedByTimeOff = schedulesForSupervisor.some(schedule => (schedule.type === 'time_off' || (schedule.type === 'one_time' && !schedule.isAvailable))
        && scheduleDateKey(schedule) === dateKey
        && overlap(slotStart, reservedEnd, interval(schedule).start, interval(schedule).end));
      const conflict = hasAppointmentConflict(supervisorAppointments.filter((appointment: any) => appointment.provider?.id === supervisorId), slotStartAt, slotReservedEndAt, BOOKING_BUFFER_MINUTES);
      const reservationConflict = hasReservationConflict(supervisorReservations, supervisorId, slotStartAt, slotReservedEndAt, "supervisor");
      return !hasCoverage || blockedByTimeOff || conflict || reservationConflict;
    });
    const blockedReason = blockedSchedule
      ? (publicOnly ? "Provider unavailable" : blockedSchedule.reason?.trim() || "Provider unavailable")
      : (duringBreak ? "Break time" : null)
      || (appointmentConflict ? "Selected provider already has an appointment at that time" : null)
      || (supervisorBlocked ? "Required clinical supervisor is unavailable at that time" : null)
      || (resourceBlocked ? "A required room, device, or equipment resource is unavailable at that time" : null);
    const primary = selectedResources[0] || null;
    slots.push({
      time: timeLabel(slotStart), startTime: zonedDateTimeToUtc(dateKey, slotStart, timezone).toISOString(), available: !blockedReason,
      resourceId: primary?.id || null, resourceName: primary?.name || null, resourceIds: selectedResources.map((resource: any) => resource.id),
      roomId: selectedResources.find((resource: any) => resource.type === 'room')?.id || null,
      deviceId: selectedResources.find((resource: any) => resource.type === 'device')?.id || null,
      supervisorIds, blockedReason,
    });
  }

  return {
    providerId,
    providerName: provider.user?.name || "MedSpa provider",
    date: dateKey,
    timezone,
    locationId,
    supervisorIds,
    slots,
  };
}
