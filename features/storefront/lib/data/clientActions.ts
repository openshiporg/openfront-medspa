"use server"

import { gql } from "graphql-request"
import { revalidatePath } from "next/cache"
import { medspaClient } from "../config"

type Result = { success: boolean; error: string | null }

export async function submitVisitReview(input: { appointmentId: string; rating: number; comment: string; idempotencyKey: string }): Promise<Result> {
  try {
    const data = await medspaClient.request<{ submitAppointmentReview: Result }>(gql`
      mutation SubmitVisitReview($appointmentId: ID!, $rating: Int!, $comment: String, $idempotencyKey: String!) {
        submitAppointmentReview(appointmentId: $appointmentId, rating: $rating, comment: $comment, idempotencyKey: $idempotencyKey) { success error }
      }
    `, input)
    if (data.submitAppointmentReview.success) revalidatePath("/account")
    return data.submitAppointmentReview
  } catch {
    return { success: false, error: "Review wasn't sent. Try again." }
  }
}

export async function replyToAftercare(input: { taskId: string; message: string; needsAttention: boolean; idempotencyKey: string }): Promise<Result> {
  try {
    const data = await medspaClient.request<{ submitFollowUpResponse: Result }>(gql`
      mutation ReplyToAftercare($taskId: ID!, $response: JSON!, $redFlag: String!, $idempotencyKey: String!) {
        submitFollowUpResponse(taskId: $taskId, response: $response, redFlag: $redFlag, idempotencyKey: $idempotencyKey) { success error }
      }
    `, { taskId: input.taskId, response: { message: input.message }, redFlag: input.needsAttention ? "review" : "none", idempotencyKey: input.idempotencyKey })
    if (data.submitFollowUpResponse.success) revalidatePath("/account")
    return data.submitFollowUpResponse
  } catch {
    return { success: false, error: "Reply wasn't sent. Try again." }
  }
}

export async function requestWaitlist(input: { serviceId: string; providerId?: string | null; preferredDays: string[]; preferredTimeRange: string; notes: string; idempotencyKey: string }): Promise<Result> {
  try {
    const data = await medspaClient.request<{ requestWaitlistSpot: Result }>(gql`
      mutation RequestWaitlist($serviceId: ID!, $providerId: ID, $preferredDays: [String!], $preferredTimeRange: String, $notes: String, $idempotencyKey: String!) {
        requestWaitlistSpot(serviceId: $serviceId, providerId: $providerId, preferredDays: $preferredDays, preferredTimeRange: $preferredTimeRange, notes: $notes, idempotencyKey: $idempotencyKey) { success error }
      }
    `, { ...input, providerId: input.providerId || null })
    return data.requestWaitlistSpot
  } catch {
    return { success: false, error: "Waitlist request wasn't sent. Try again." }
  }
}
