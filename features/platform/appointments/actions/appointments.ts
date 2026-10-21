'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface PlatformAppointment {
  id: string;
  metadata?: { planBooking?: { consultationId?: string } } | null;
  startTime: string;
  location?: { timezone?: string | null } | null;
  endTime?: string | null;
  duration?: number | null;
  status: AppointmentStatus;
  depositAmount?: number | null;
  depositPaid?: boolean | null;
  clientNotes?: string | null;
  internalNotes?: string | null;
  client?: {
    id: string;
    user?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    totalVisits?: number | null;
    lifetimeValue?: number | null;
    marketingConsent?: boolean | null;
  } | null;
  provider?: {
    id: string;
    tier?: string | null;
    user?: {
      name?: string | null;
    } | null;
  } | null;
  services: {
    id: string;
    name?: string | null;
    basePrice?: number | null;
    baseDuration?: number | null;
    requiresConsultation?: boolean | null;
    requiresIntakeReview?: boolean | null;
    staffAuthorizationRequired?: boolean | null;
  }[];
  payment?: {
    id: string;
    status?: string | null;
    totalAmount?: number | null;
    paymentMethod?: string | null;
  } | null;
  lineItems: {
    id: string;
    serviceTitle?: string | null;
    price?: number | null;
    quantity?: number | null;
    duration?: number | null;
    staff?: { user?: { name?: string | null } | null } | null;
    service?: { name?: string | null } | null;
  }[];
}

export interface AppointmentOperationsData {
  appointments: PlatformAppointment[];
  availability: 'loaded' | 'unavailable';
  counts: Record<AppointmentStatus | 'all' | 'today', number>;
}

const APPOINTMENT_QUERY = `
  id
  startTime
  endTime
  duration
  status
  depositAmount
  depositPaid
  location { timezone }
  client {
    id
    user {
      name
      email
      phone
    }
  }
  provider {
    id
    tier
    user {
      name
    }
  }
  services {
    id
    name
    basePrice
    baseDuration
    requiresConsultation
    requiresIntakeReview
    staffAuthorizationRequired
  }
  lineItems {
    id
    serviceTitle
    price
    quantity
    duration
    staff { user { name } }
    service { name }
  }
`;

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function buildWhere(status?: string | null) {
  if (!status || status === 'all') return {};

  if (status === 'today') {
    const { start, end } = getTodayRange();
    return { startTime: { gte: start, lte: end } };
  }

  return { status: { equals: status } };
}

function revalidateAppointmentOperations() {
  revalidatePath('/dashboard/platform/appointments');
  revalidatePath('/dashboard/appointments');
}

export async function transitionAppointmentStatus(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString();
  const status = formData.get('status')?.toString() as AppointmentStatus | undefined;

  if (!id || !status) {
    console.error('Missing appointment id or status.');
    return;
  }

  const response = await keystoneClient<{ transitionAppointment: { success: boolean; error?: string | null } }>(
    `
      mutation TransitionAppointment($id: ID!, $status: String!, $reason: String) {
        transitionAppointment(appointmentId: $id, status: $status, reason: $reason) {
          success
          error
        }
      }
    `,
    {
      id,
      status,
      reason: status === 'cancelled' ? 'Cancelled from appointment command center' : null,
    }
  );

  if (!response.success || !response.data?.transitionAppointment.success) {
    console.error('Failed to transition appointment:', response.error || response.data?.transitionAppointment.error);
    return;
  }

  revalidateAppointmentOperations();
}

export async function cancelAppointmentFromQueue(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString();
  const cancellationReason = formData.get('cancellationReason')?.toString() || 'Cancelled from appointment command center';

  if (!id) {
    console.error('Missing appointment id.');
    return;
  }

  const response = await keystoneClient<{ transitionAppointment: { success: boolean; error?: string | null } }>(
    `
      mutation CancelAppointment($id: ID!, $reason: String!) {
        transitionAppointment(appointmentId: $id, status: "cancelled", reason: $reason) {
          success
          error
        }
      }
    `,
    { id, reason: cancellationReason }
  );

  if (!response.success || !response.data?.transitionAppointment.success) {
    console.error('Failed to cancel appointment:', response.error || response.data?.transitionAppointment.error);
    return;
  }

  revalidateAppointmentOperations();
}

export async function getAppointmentOperations(status?: string | null): Promise<AppointmentOperationsData> {
  const query = `
    query AppointmentOperations($where: AppointmentWhereInput!) {
      appointments(where: $where, orderBy: { startTime: asc }, take: 100) {
        ${APPOINTMENT_QUERY}
      }
      allCount: appointmentsCount
      pendingCount: appointmentsCount(where: { status: { equals: pending } })
      confirmedCount: appointmentsCount(where: { status: { equals: confirmed } })
      inProgressCount: appointmentsCount(where: { status: { equals: in_progress } })
      completedCount: appointmentsCount(where: { status: { equals: completed } })
      cancelledCount: appointmentsCount(where: { status: { equals: cancelled } })
      noShowCount: appointmentsCount(where: { status: { equals: no_show } })
      todayCount: appointmentsCount(where: { startTime: { gte: "${getTodayRange().start}", lte: "${getTodayRange().end}" } })
    }
  `;

  const response = await keystoneClient<{
    appointments: PlatformAppointment[];
    allCount: number;
    pendingCount: number;
    confirmedCount: number;
    inProgressCount: number;
    completedCount: number;
    cancelledCount: number;
    noShowCount: number;
    todayCount: number;
  }>(query, { where: buildWhere(status) });

  if (!response.success) {
    console.error('Failed to load appointment operations:', response.error);
    return {
      appointments: [],
      availability: 'unavailable',
      counts: {
        all: 0,
        today: 0,
        pending: 0,
        confirmed: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      },
    };
  }

  return {
    appointments: response.data.appointments || [],
    availability: 'loaded',
    counts: {
      all: response.data.allCount || 0,
      today: response.data.todayCount || 0,
      pending: response.data.pendingCount || 0,
      confirmed: response.data.confirmedCount || 0,
      in_progress: response.data.inProgressCount || 0,
      completed: response.data.completedCount || 0,
      cancelled: response.data.cancelledCount || 0,
      no_show: response.data.noShowCount || 0,
    },
  };
}
