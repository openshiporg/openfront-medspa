"use server"

import { getGraphQLEndpoint } from "../getBaseUrl"
import { practiceSlug } from "./practice"

export interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  isApproved: boolean
  client?: {
    user?: {
      name: string
    }
  }
  service?: {
    id: string
    name: string
  }
  provider?: {
    id: string
    user?: {
      name: string
    }
  }
}


export async function getApprovedReviews(limit?: number): Promise<Review[]> {
  const query = `
    query GetApprovedReviews($limit: Int, $practiceSlug: String!) {
      reviews(
        where: { isApproved: { equals: true }, practice: { slug: { equals: $practiceSlug } } }
        orderBy: { createdAt: desc }
        take: $limit
      ) {
        id
        rating
        comment
        createdAt
        client {
          user {
            name
          }
        }
        service {
          id
          name
        }
        provider {
          user {
            name
          }
        }
      }
    }
  `

  try {
    const response = await fetch(await getGraphQLEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { limit, practiceSlug: await practiceSlug() } }),
      cache: "no-store",
    })

    const { data, errors } = await response.json()

    if (errors) {
      console.error("GraphQL errors:", errors)
      return []
    }

    return data?.reviews || []
  } catch (error) {
    console.error("Failed to fetch reviews:", error)
    return []
  }
}

export async function getReviewsForService(serviceId: string): Promise<Review[]> {
  const query = `
    query GetServiceReviews($serviceId: ID!, $practiceSlug: String!) {
      reviews(
        where: {
          isApproved: { equals: true }
          service: { id: { equals: $serviceId } }
          practice: { slug: { equals: $practiceSlug } }
        }
        orderBy: { createdAt: desc }
      ) {
        id
        rating
        comment
        createdAt
        client {
          user {
            name
          }
        }
        provider {
          user {
            name
          }
        }
      }
    }
  `

  try {
    const response = await fetch(await getGraphQLEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { serviceId, practiceSlug: await practiceSlug() } }),
      cache: "no-store",
    })

    const { data, errors } = await response.json()

    if (errors) {
      console.error("GraphQL errors:", errors)
      return []
    }

    return data?.reviews || []
  } catch (error) {
    console.error("Failed to fetch service reviews:", error)
    return []
  }
}

export async function getReviewsForProvider(providerId: string): Promise<Review[]> {
  const query = `
    query GetProviderReviews($providerId: ID!, $practiceSlug: String!) {
      reviews(
        where: {
          isApproved: { equals: true }
          provider: { id: { equals: $providerId } }
          practice: { slug: { equals: $practiceSlug } }
        }
        orderBy: { createdAt: desc }
      ) {
        id
        rating
        comment
        createdAt
        client {
          user {
            name
          }
        }
        service {
          id
          name
        }
      }
    }
  `

  try {
    const response = await fetch(await getGraphQLEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { providerId, practiceSlug: await practiceSlug() } }),
      cache: "no-store",
    })

    const { data, errors } = await response.json()

    if (errors) {
      console.error("GraphQL errors:", errors)
      return []
    }

    return data?.reviews || []
  } catch (error) {
    console.error("Failed to fetch provider reviews:", error)
    return []
  }
}

export async function getAverageRatingForService(serviceId: string): Promise<number> {
  const reviews = await getReviewsForService(serviceId)
  if (reviews.length === 0) return 0

  const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
  return sum / reviews.length
}

export async function getAverageRatingForProvider(providerId: string): Promise<number> {
  const reviews = await getReviewsForProvider(providerId)
  if (reviews.length === 0) return 0

  const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
  return sum / reviews.length
}

export async function createReview(data: {
  rating: number
  comment?: string
  clientId: string
  serviceId?: string
  providerId?: string
  appointmentId?: string
}): Promise<{ id: string } | null> {
  const mutation = `
    mutation CreateReview($data: ReviewCreateInput!) {
      createReview(data: $data) {
        id
      }
    }
  `

  const reviewData: any = {
    rating: data.rating,
    comment: data.comment || "",
    isApproved: false, // Requires manual approval
    client: { connect: { id: data.clientId } },
  }

  if (data.serviceId) {
    reviewData.service = { connect: { id: data.serviceId } }
  }

  if (data.providerId) {
    reviewData.provider = { connect: { id: data.providerId } }
  }

  if (data.appointmentId) {
    reviewData.appointment = { connect: { id: data.appointmentId } }
  }

  try {
    const response = await fetch(await getGraphQLEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: mutation,
        variables: { data: reviewData }
      }),
    })

    const { data: result, errors } = await response.json()

    if (errors) {
      console.error("GraphQL errors:", errors)
      return null
    }

    return result?.createReview || null
  } catch (error) {
    console.error("Failed to create review:", error)
    return null
  }
}
