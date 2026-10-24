"use server"

import { gql } from "graphql-request"
import { medspaClient } from "../config"

export interface StorefrontVisit {
  id: string
  status: string
  startTime: string
  duration: number | null
  timezone: string | null
  serviceNames: string[]
  providerName: string | null
  locationName: string | null
  price: number | null
  cancellable: boolean
}

/** The signed-in owner's visit, or a guest's via the confirmation link token. */
export async function getStorefrontVisit(appointmentId: string, token?: string | null): Promise<StorefrontVisit | null> {
  try {
    const data = await medspaClient.request<{ storefrontAppointment: StorefrontVisit | null }>(gql`
      query StorefrontVisit($appointmentId: ID!, $token: String) {
        storefrontAppointment(appointmentId: $appointmentId, token: $token) {
          id status startTime duration timezone serviceNames providerName locationName price cancellable
        }
      }
    `, { appointmentId, token: token || null })
    return data.storefrontAppointment
  } catch {
    return null
  }
}

export async function cancelGuestVisit(appointmentId: string, token: string, reason: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const data = await medspaClient.request<{ cancelGuestAppointment: { success: boolean; error: string | null } }>(gql`
      mutation CancelGuestVisit($appointmentId: ID!, $token: String!, $reason: String) {
        cancelGuestAppointment(appointmentId: $appointmentId, token: $token, reason: $reason) { success error }
      }
    `, { appointmentId, token, reason: reason || null })
    return data.cancelGuestAppointment
  } catch {
    return { success: false, error: "Cancellation wasn't confirmed. Reload to check the status." }
  }
}
