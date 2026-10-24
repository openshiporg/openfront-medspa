"use server"

import { gql } from "graphql-request"
import { medspaClient } from "../config"

export interface IntakeField { id: string; type: string; label: string; required?: boolean; options?: string[] }
export interface IntakeTemplateRead { id: string; name: string; type: string; description: string | null; fields: IntakeField[] | null; submitted: boolean; status: string | null }

export async function getIntakeForms(appointmentId: string): Promise<IntakeTemplateRead[] | null> {
  try {
    const data = await medspaClient.request<{ clientIntakeForms: IntakeTemplateRead[] }>(gql`
      query ClientIntakeForms($appointmentId: ID!) {
        clientIntakeForms(appointmentId: $appointmentId) { id name type description fields submitted status }
      }
    `, { appointmentId })
    return data.clientIntakeForms
  } catch {
    return null
  }
}

export async function submitIntakeForm(input: { templateId: string; appointmentId: string; responses: Record<string, string | boolean>; idempotencyKey: string }): Promise<{ success: boolean; error: string | null }> {
  try {
    const data = await medspaClient.request<{ submitIntake: { success: boolean; error: string | null } }>(gql`
      mutation SubmitClientIntake($templateId: ID!, $appointmentId: ID!, $responses: JSON!, $acknowledgement: String!, $idempotencyKey: String!) {
        submitIntake(templateId: $templateId, appointmentId: $appointmentId, responses: $responses, acknowledgement: $acknowledgement, idempotencyKey: $idempotencyKey) { success error }
      }
    `, { ...input, acknowledgement: "Submitted by the client from their account" })
    return data.submitIntake
  } catch {
    return { success: false, error: "Intake wasn't submitted. Try again." }
  }
}
