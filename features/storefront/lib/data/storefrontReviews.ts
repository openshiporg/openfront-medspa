"use server"

import { gql } from "graphql-request"
import { cache } from "react"
import { medspaClient } from "../config"

export interface StorefrontReview { id: string; rating: number; comment: string | null; author: string; serviceName: string | null; providerName: string | null; createdAt: string | null }

/** Approved reviews only; the backend projects the author as first name and initial. */
export const getStorefrontReviews = cache(async function (filter: { serviceId?: string; providerId?: string; take?: number } = {}): Promise<StorefrontReview[]> {
  try {
    const data = await medspaClient.request<{ storefrontReviews: StorefrontReview[] }>(gql`
      query StorefrontReviews($serviceId: ID, $providerId: ID, $take: Int) {
        storefrontReviews(serviceId: $serviceId, providerId: $providerId, take: $take) { id rating comment author serviceName providerName createdAt }
      }
    `, { serviceId: filter.serviceId || null, providerId: filter.providerId || null, take: filter.take || 24 })
    return data.storefrontReviews
  } catch {
    return []
  }
})
