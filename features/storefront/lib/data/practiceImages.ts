"use server"

import { cache } from "react"
import { gql } from "graphql-request"
import { medspaClient } from "../config"
import { practiceSlug } from "./practice"
import type { StorefrontImage } from "./services"

/** Public marketing images only; never query clinical assets or private metadata. */
export const getPublicPracticeImages = cache(async (): Promise<Array<StorefrontImage & { id: string }>> => {
  try {
    const data = await medspaClient.request<{ medSpaImages: Array<StorefrontImage & { id: string }> }>(gql`
      query StorefrontPracticeImages($slug: String!) {
        medSpaImages(where: { practice: { slug: { equals: $slug } } }, take: 100, orderBy: { id: asc }) {
          id image { url } imagePath altText
        }
      }
    `, { slug: await practiceSlug() })
    return data.medSpaImages
  } catch { return [] }
})
