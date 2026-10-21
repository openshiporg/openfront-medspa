"use server"

import { cache } from "react"
import { gql } from "graphql-request"
import { medspaClient } from "../config"

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "no_show"
  | "cancelled"

interface AppointmentService {
  id: string
  name: string
  basePrice: number
  baseDuration: number
}

interface AppointmentProvider {
  id: string
  tier: string
  specializations?: { id: string; name: string }[]
  specialties?: string[]
  user: {
    name: string
  } | null
}

export interface Appointment {
  id: string
  startTime: string
  endTime: string | null
  duration: number
  status: AppointmentStatus
  bookedAt: string | null
  confirmedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  clientNotes: string | null
  client: {
    id: string
    name?: string
    email?: string
    phone?: string
    user: {
      name: string
      email: string
      phone?: string
    } | null
  } | null
  provider: AppointmentProvider | null
  service?: AppointmentService | null
  services: AppointmentService[]
}

export interface CreateAppointmentInput {
  startTime: string
  providerId: string
  serviceIds: string[]
  clientName: string
  clientEmail: string
  clientPhone?: string
  clientNotes?: string
  idempotencyKey: string
}

interface BookAppointmentResult {
  success: boolean
  appointmentId: string | null
  error: string | null
}

const APPOINTMENT_SELECTION = gql`
  id
  startTime
  endTime
  duration
  status
  bookedAt
  confirmedAt
  cancelledAt
  cancellationReason
  clientNotes
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
    specializations {
      id
      name
    }
    user {
      name
    }
  }
  services {
    id
    name
    basePrice
    baseDuration
  }
`

function normalizeAppointment(appointment: Appointment): Appointment {
  const services = (appointment.services || []).map((service) => ({
    ...service,
    basePrice: service.basePrice / 100,
  }))
  const duration = appointment.duration || services.reduce((sum, service) => sum + (service.baseDuration || 0), 0)
  const user = appointment.client?.user || null
  const providerSpecializations = appointment.provider?.specializations || []

  return {
    ...appointment,
    duration,
    status: (appointment.status || "pending") as AppointmentStatus,
    service: appointment.service || services[0] || null,
    client: appointment.client
      ? {
          ...appointment.client,
          name: appointment.client.name || user?.name,
          email: appointment.client.email || user?.email,
          phone: appointment.client.phone || user?.phone,
        }
      : null,
    provider: appointment.provider
      ? {
          ...appointment.provider,
          specialties:
            appointment.provider.specialties ||
            providerSpecializations.map((specialization) => specialization.name),
        }
      : null,
  }
}

/**
 * Create a new appointment request through the public-safe booking mutation.
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<{ appointment: Appointment | null; error: string | null }> {
  const BOOK_APPOINTMENT = gql`
    mutation BookAppointment(
      $serviceIds: [ID!]!
      $providerId: ID!
      $startTime: String!
      $clientName: String!
      $clientEmail: String!
      $clientPhone: String
      $clientNotes: String
      $idempotencyKey: String!
    ) {
      bookAppointment(
        serviceIds: $serviceIds
        providerId: $providerId
        startTime: $startTime
        clientName: $clientName
        clientEmail: $clientEmail
        clientPhone: $clientPhone
        clientNotes: $clientNotes
        idempotencyKey: $idempotencyKey
      ) {
        success
        appointmentId
        error
      }
    }
  `

  try {
    const result = await medspaClient.request<{ bookAppointment: BookAppointmentResult }>(BOOK_APPOINTMENT, {
      serviceIds: input.serviceIds,
      providerId: input.providerId,
      startTime: input.startTime,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone || null,
      clientNotes: input.clientNotes || null,
      idempotencyKey: input.idempotencyKey,
    })

    if (!result.bookAppointment.success || !result.bookAppointment.appointmentId) {
      return { appointment: null, error: result.bookAppointment.error || "The appointment request was not accepted." }
    }

    return { appointment: {
      id: result.bookAppointment.appointmentId,
      startTime: input.startTime,
      endTime: null,
      duration: 0,
      status: "pending",
      bookedAt: null,
      confirmedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      clientNotes: input.clientNotes || null,
      client: null,
      provider: null,
      services: [],
    }, error: null }
  } catch (error) {
    console.error("Error creating appointment:", error)
    return { appointment: null, error: "We could not submit your appointment request. Please try again." }
  }
}

/**
 * Get appointments for a specific client by ID.
 */
export const getClientAppointments = cache(async function (clientId: string): Promise<Appointment[]> {
  const GET_CLIENT_APPOINTMENTS = gql`
    query GetClientAppointments($clientId: ID!) {
      appointments(
        where: { client: { id: { equals: $clientId } } }
        orderBy: { startTime: desc }
      ) {
        ${APPOINTMENT_SELECTION}
      }
    }
  `

  try {
    const data = await medspaClient.request<{ appointments: Appointment[] }>(GET_CLIENT_APPOINTMENTS, { clientId })
    return data.appointments.map(normalizeAppointment)
  } catch (error) {
    console.error("Error fetching client appointments:", error)
    return []
  }
})

/**
 * Get a single appointment by ID.
 */
export const getAppointmentById = cache(async function (appointmentId: string): Promise<Appointment | null> {
  const GET_APPOINTMENT = gql`
    query GetAppointment($id: ID!) {
      appointment(where: { id: $id }) {
        ${APPOINTMENT_SELECTION}
      }
    }
  `

  try {
    const data = await medspaClient.request<{ appointment: Appointment | null }>(GET_APPOINTMENT, { id: appointmentId })
    return data.appointment ? normalizeAppointment(data.appointment) : null
  } catch (error) {
    console.error("Error fetching appointment:", error)
    return null
  }
})

/**
 * Get appointments for a specific provider on a given date.
 */
export const getProviderAppointmentsForDate = cache(async function (
  providerId: string,
  date: string
): Promise<Appointment[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const GET_PROVIDER_APPOINTMENTS = gql`
    query GetProviderAppointments($providerId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
      appointments(
        where: {
          provider: { id: { equals: $providerId } }
          startTime: { gte: $startDate, lte: $endDate }
          status: { notIn: [cancelled, no_show] }
        }
        orderBy: { startTime: asc }
      ) {
        ${APPOINTMENT_SELECTION}
      }
    }
  `

  try {
    const data = await medspaClient.request<{ appointments: Appointment[] }>(GET_PROVIDER_APPOINTMENTS, {
      providerId,
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    })
    return data.appointments.map(normalizeAppointment)
  } catch (error) {
    console.error("Error fetching provider appointments:", error)
    return []
  }
})

/**
 * Cancel an appointment.
 */
export async function cancelAppointment(appointmentId: string, reason: string): Promise<boolean> {
  const CANCEL_APPOINTMENT = gql`
    mutation CancelAppointment($id: ID!, $reason: String!) {
      transitionAppointment(appointmentId: $id, status: "cancelled", reason: $reason) {
        success
        error
      }
    }
  `

  try {
    const data = await medspaClient.request<{ transitionAppointment: { success: boolean; error?: string | null } }>(CANCEL_APPOINTMENT, {
      id: appointmentId,
      reason,
    })
    return data.transitionAppointment.success
  } catch (error) {
    console.error("Error cancelling appointment:", error)
    return false
  }
}

/**
 * Available booking slot returned by the server-authoritative scheduling engine.
 */
export type BookingSlot = {
  label: string
  startTime: string
}

/**
 * Get staff, break, time-off, appointment, and resource-safe slots.
 */
export async function getAvailableTimeSlots(
  providerId: string,
  date: string,
  serviceDuration: number,
  serviceId: string
): Promise<BookingSlot[]> {
  const CHECK_AVAILABILITY = gql`
    query CheckAvailability($providerId: ID!, $date: String!, $serviceDuration: Int!, $serviceId: ID!) {
      checkAvailability(
        providerId: $providerId
        date: $date
        serviceDuration: $serviceDuration
        serviceId: $serviceId
      ) {
        timezone
        slots {
          time
          startTime
          available
        }
      }
    }
  `

  try {
    const data = await medspaClient.request<{
      checkAvailability: {
        timezone: string
        slots: { time: string; startTime: string; available: boolean }[]
      }
    }>(CHECK_AVAILABILITY, { providerId, date, serviceDuration, serviceId })
    return data.checkAvailability.slots
      .filter((slot) => slot.available)
      .map((slot) => ({ label: slot.time, startTime: slot.startTime }))
  } catch (error) {
    console.error("Error getting available time slots:", error)
    return []
  }
}
