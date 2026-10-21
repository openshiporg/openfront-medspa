"use server"

import { gql } from "graphql-request"
import { cache } from "react"
import { medspaClient } from "../config"

export interface GalleryImage {
  id: string
  image: {
    url: string
  } | null
  imagePath: string | null
  altText: string | null
  metadata: {
    placement?: string
    title?: string
    caption?: string
    serviceId?: string | null
  } | null
}

function practiceSlug() { const value = process.env.MEDSPA_PRACTICE_SLUG; if (!value) throw new Error("MEDSPA_PRACTICE_SLUG is required for storefront reads"); return value }

export const getGalleryImages = cache(async function (): Promise<GalleryImage[]> {
  const GET_GALLERY_IMAGES = gql`
    query GetStorefrontGalleryImages($practiceSlug: String!) {
      medSpaImages(where: { practice: { slug: { equals: $practiceSlug } } }, orderBy: { imagePath: asc }, take: 100) {
        id
        image {
          url
        }
        imagePath
        altText
        metadata
      }
    }
  `

  try {
    const data = await medspaClient.request<{ medSpaImages: GalleryImage[] }>(GET_GALLERY_IMAGES, { practiceSlug: practiceSlug() })
    return data.medSpaImages.filter((image) => image.metadata?.placement === "gallery")
  } catch (error) {
    console.error("Error fetching gallery images:", error)
    return []
  }
})
