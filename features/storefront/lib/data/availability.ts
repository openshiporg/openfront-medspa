"use server"

import { gql } from "graphql-request"
import { medspaClient } from "../config"

export interface BookingSlot {
  label: string
  startTime: string
}

interface AvailabilityResult {
  providerId: string
  providerName: string
  date: string
  timezone: string
  slots: {
    time: string
    startTime: string
    available: boolean
  }[]
}

/**
 * Get server-authoritative staff, time-off, appointment, and resource-safe slots.
 */
export async function getAvailableTimeSlots(
  providerId: string,
  date: string,
  serviceDuration: number,
  serviceId?: string
): Promise<BookingSlot[]> {
  const CHECK_AVAILABILITY = gql`
    query CheckAvailability($providerId: ID!, $date: String!, $serviceDuration: Int!, $serviceId: ID) {
      checkAvailability(
        providerId: $providerId
        date: $date
        serviceDuration: $serviceDuration
        serviceId: $serviceId
      ) {
        providerId
        providerName
        date
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
    const data = await medspaClient.request<{ checkAvailability: AvailabilityResult }>(
      CHECK_AVAILABILITY,
      { providerId, date, serviceDuration, serviceId }
    )
    return data.checkAvailability.slots
      .filter((slot) => slot.available)
      .map((slot) => ({ label: slot.time, startTime: slot.startTime }))
  } catch (error) {
    console.error("Error checking availability:", error)
    return []
  }
}

export async function getMultipleProviderAvailability(
  providerIds: string[],
  date: string,
  serviceDuration: number,
  serviceId?: string
): Promise<Record<string, BookingSlot[]>> {
  const results: Record<string, BookingSlot[]> = {}
  await Promise.all(providerIds.map(async (providerId) => {
    results[providerId] = await getAvailableTimeSlots(providerId, date, serviceDuration, serviceId)
  }))
  return results
}

export async function isTimeSlotAvailable(
  providerId: string,
  date: string,
  startTime: string,
  serviceDuration: number,
  serviceId?: string
): Promise<boolean> {
  const slots = await getAvailableTimeSlots(providerId, date, serviceDuration, serviceId)
  return slots.some((slot) => slot.startTime === startTime)
}

export async function getNextAvailableDate(
  providerId: string,
  serviceDuration: number,
  serviceId?: string
): Promise<string | null> {
  const today = new Date()
  for (let offset = 0; offset < 30; offset += 1) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() + offset)
    const dateString = checkDate.toISOString().split("T")[0]
    if ((await getAvailableTimeSlots(providerId, dateString, serviceDuration, serviceId)).length) return dateString
  }
  return null
}
