export function overlapsInstantInterval(leftStart: unknown, leftEnd: unknown, rightStart: Date, rightEnd: Date) {
  const start = new Date(String(leftStart)).getTime();
  const end = new Date(String(leftEnd)).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start < rightEnd.getTime() && end > rightStart.getTime();
}

function retainedBuffer(value: unknown, fallback: number) {
  if (value === undefined || value === null) return fallback;
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Math.max(fallback, Number(value)) : Number.POSITIVE_INFINITY;
}

export function hasAppointmentConflict(appointments: readonly any[], start: Date, end: Date, bufferMinutes: number) {
  return appointments.some((appointment) => {
    const appointmentStart = new Date(appointment.startTime).getTime();
    const appointmentEnd = appointment.endTime
      ? new Date(appointment.endTime).getTime()
      : appointmentStart + Number(appointment.duration || 0) * 60_000;
    return Number.isFinite(appointmentStart) && Number.isFinite(appointmentEnd)
      && appointmentStart < end.getTime()
      && appointmentEnd + retainedBuffer(appointment.metadata?.capacityBufferMinutes, bufferMinutes) * 60_000 > start.getTime();
  });
}

export function hasReservationConflict(reservations: readonly any[], ownerId: string, start: Date, end: Date, relation: "supervisor" | "resource") {
  return reservations.some((reservation) => reservation[relation]?.id === ownerId
    && overlapsInstantInterval(reservation.startsAt, reservation.endsAt, start, end));
}

export function hasResourceCapacity({
  resourceId,
  capacity,
  start,
  end,
  reservations,
  appointments,
  blocks,
  bufferMinutes,
}: {
  resourceId: string;
  capacity: number;
  start: Date;
  end: Date;
  reservations: readonly any[];
  appointments: readonly any[];
  blocks: readonly any[];
  bufferMinutes: number;
}) {
  const resourceCapacity = Number(capacity);
  if (!Number.isSafeInteger(resourceCapacity) || resourceCapacity < 1) return false;
  if (blocks.some((block) => block.resource?.id === resourceId && overlapsInstantInterval(block.startsAt, block.endsAt, start, end))) return false;
  const resourceReservations = reservations.filter((reservation) => reservation.resource?.id === resourceId);
  if (resourceReservations.some(reservation => !Number.isFinite(retainedBuffer(reservation.assignmentEvidence?.cleanupBufferMinutes, bufferMinutes)))) return false;
  const segmentedPairs = new Set(resourceReservations.map((reservation) => `${reservation.appointment?.id}:${resourceId}`));
  const segmentUnits = resourceReservations
    .filter((reservation) => overlapsInstantInterval(reservation.startsAt, new Date(new Date(reservation.endsAt).getTime() + retainedBuffer(reservation.assignmentEvidence?.cleanupBufferMinutes, bufferMinutes) * 60_000), start, end))
    .reduce((sum, reservation) => {
      const units = Number(reservation.units);
      return Number.isSafeInteger(units) && units >= 1 ? sum + units : Number.POSITIVE_INFINITY;
    }, 0);
  const legacyUnits = appointments.filter((appointment) => {
    const assigned = appointment.resource?.id === resourceId || appointment.room?.id === resourceId || appointment.device?.id === resourceId;
    if (!assigned || segmentedPairs.has(`${appointment.id}:${resourceId}`)) return false;
    const appointmentStart = new Date(appointment.startTime).getTime();
    const appointmentEnd = appointment.endTime
      ? new Date(appointment.endTime).getTime()
      : appointmentStart + Number(appointment.duration || 0) * 60_000;
    return Number.isFinite(appointmentStart) && Number.isFinite(appointmentEnd)
      && appointmentStart < end.getTime()
      && appointmentEnd + retainedBuffer(appointment.metadata?.capacityBufferMinutes, bufferMinutes) * 60_000 > start.getTime();
  }).length;
  return segmentUnits + legacyUnits < resourceCapacity;
}
