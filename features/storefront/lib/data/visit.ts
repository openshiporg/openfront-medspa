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
  depositAmount: number | null
  depositPaid: boolean
  depositOnline: boolean
  /** due | paid | not_charged | refund_pending | refund_failed | refunded */
  depositState: string
  depositRefundedAmount: number
  depositRefundedAt: string | null
}

/** The signed-in owner's visit, or a guest's via the confirmation link token. */
export async function getStorefrontVisit(appointmentId: string, token?: string | null): Promise<StorefrontVisit | null> {
  try {
    const data = await medspaClient.request<{ storefrontAppointment: StorefrontVisit | null }>(gql`
      query StorefrontVisit($appointmentId: ID!, $token: String) {
        storefrontAppointment(appointmentId: $appointmentId, token: $token) {
          id status startTime duration timezone serviceNames providerName locationName price cancellable depositAmount depositPaid depositOnline depositState depositRefundedAmount depositRefundedAt
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

export async function startVisitDeposit(appointmentId: string, token: string | null): Promise<{ url: string | null; error: string | null }> {
  try {
    const data = await medspaClient.request<{ startDepositCheckout: { success: boolean; error: string | null; url: string | null } }>(gql`
      mutation StartVisitDeposit($appointmentId: ID!, $token: String) {
        startDepositCheckout(appointmentId: $appointmentId, token: $token) { success error url }
      }
    `, { appointmentId, token })
    return data.startDepositCheckout.success ? { url: data.startDepositCheckout.url, error: null } : { url: null, error: data.startDepositCheckout.error }
  } catch {
    return { url: null, error: "We couldn't open the payment page. Please try again." }
  }
}

/** Reads the Checkout back from Stripe after the payer returns; the webhook does the same if they never come back. */
export async function confirmVisitDeposit(appointmentId: string, token: string | null): Promise<{ paid: boolean; error: string | null }> {
  try {
    const data = await medspaClient.request<{ confirmDepositCheckout: { success: boolean; error: string | null; paid: boolean | null } }>(gql`
      mutation ConfirmVisitDeposit($appointmentId: ID!, $token: String) {
        confirmDepositCheckout(appointmentId: $appointmentId, token: $token) { success error paid }
      }
    `, { appointmentId, token })
    const result = data.confirmDepositCheckout
    return { paid: result.paid === true, error: result.success ? null : result.error }
  } catch {
    return { paid: false, error: null }
  }
}
