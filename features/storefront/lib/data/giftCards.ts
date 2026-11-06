"use server"

import { gql } from "graphql-request"
import { medspaClient } from "../config"

export interface GiftCardPurchaseInput {
  amount: number
  purchaserName: string
  purchaserEmail: string
  recipientName?: string
  recipientEmail?: string
  message?: string
}

/** Opens Stripe Checkout for an online gift card. The server prices nothing from the client except the chosen amount, which it bounds. */
export async function startGiftCardPurchase(input: GiftCardPurchaseInput): Promise<{ url: string | null; error: string | null }> {
  try {
    const data = await medspaClient.request<{ purchaseGiftCardOnline: { success: boolean; error: string | null; url: string | null } }>(gql`
      mutation PurchaseGiftCardOnline($amount: Int!, $purchaserName: String!, $purchaserEmail: String!, $recipientName: String, $recipientEmail: String, $message: String) {
        purchaseGiftCardOnline(amount: $amount, purchaserName: $purchaserName, purchaserEmail: $purchaserEmail, recipientName: $recipientName, recipientEmail: $recipientEmail, message: $message) { success error url }
      }
    `, { ...input, recipientName: input.recipientName || null, recipientEmail: input.recipientEmail || null, message: input.message || null })
    const result = data.purchaseGiftCardOnline
    return result.success ? { url: result.url, error: null } : { url: null, error: result.error }
  } catch {
    return { url: null, error: "We couldn't open the payment page. Please try again." }
  }
}

export interface GiftCardPurchaseView { status: "paid" | "pending" | "expired" | "review"; amount: number; code: string | null; recipientName: string | null; recipientEmail: string | null }

/** After Stripe returns: settles the purchase if it is paid and returns the card. */
export async function confirmGiftCardPurchase(ref: string, token: string): Promise<GiftCardPurchaseView | null> {
  try {
    const data = await medspaClient.request<{ confirmGiftCardOnline: GiftCardPurchaseView | null }>(gql`
      mutation ConfirmGiftCardOnline($ref: ID!, $token: String!) { confirmGiftCardOnline(ref: $ref, token: $token) { status amount code recipientName recipientEmail } }
    `, { ref, token })
    return data.confirmGiftCardOnline
  } catch {
    return null
  }
}
