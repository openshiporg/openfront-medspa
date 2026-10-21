"use server"

import { gql } from "graphql-request"
import { cache } from "react"
import { medspaClient } from "../config"
import { readPublicProviderProfiles, type ProviderReadResult } from "./providerReadResult"

export interface Provider {
  id: string
  isActive: boolean
  user: { id: string; name: string } | null
  photo: {
    image: { url: string } | null
    imagePath: string | null
    altText: string | null
  } | null
  specializations: { id: string; name: string }[]
}

function practiceSlug() {
  const value = process.env.MEDSPA_PRACTICE_SLUG?.trim()
  if (!value) throw new Error("MEDSPA_PRACTICE_SLUG is required for storefront reads")
  return value
}

const PROVIDER_FRAGMENT = gql`
  fragment StorefrontProviderFields on StorefrontProvider {
    id
    user { id name }
    isActive
    photo { image { url } imagePath altText }
    specializations { id name }
  }
`

export const getAllProviders = cache(async function (): Promise<ProviderReadResult<Provider[]>> {
  return readPublicProviderProfiles(async () => {
    const data = await medspaClient.request<{ storefrontProviders: Provider[] }>(gql`
      ${PROVIDER_FRAGMENT}
      query GetAllStorefrontProviders($practiceSlug: String!) {
        storefrontProviders(practiceSlug: $practiceSlug, take: 50) { ...StorefrontProviderFields }
      }
    `, { practiceSlug: practiceSlug() })
    return data.storefrontProviders
  })
})

export const getProviderById = cache(async function (id: string): Promise<ProviderReadResult<Provider | null>> {
  return readPublicProviderProfiles(async () => {
    const data = await medspaClient.request<{ storefrontProvider: Provider | null }>(gql`
      ${PROVIDER_FRAGMENT}
      query GetStorefrontProvider($id: ID!, $practiceSlug: String!) {
        storefrontProvider(id: $id, practiceSlug: $practiceSlug) { ...StorefrontProviderFields }
      }
    `, { id, practiceSlug: practiceSlug() })
    return data.storefrontProvider
  })
})

export const getFeaturedProviders = cache(async function (limit = 4): Promise<ProviderReadResult<Provider[]>> {
  const take = Math.max(1, Math.min(Math.trunc(limit), 8))
  return readPublicProviderProfiles(async () => {
    const data = await medspaClient.request<{ storefrontProviders: Provider[] }>(gql`
      ${PROVIDER_FRAGMENT}
      query GetFeaturedStorefrontProviders($take: Int!, $practiceSlug: String!) {
        storefrontProviders(take: $take, practiceSlug: $practiceSlug) { ...StorefrontProviderFields }
      }
    `, { take, practiceSlug: practiceSlug() })
    return data.storefrontProviders
  })
})

export const getProvidersForService = cache(async function (serviceId: string): Promise<ProviderReadResult<Provider[]>> {
  return readPublicProviderProfiles(async () => {
    const data = await medspaClient.request<{ storefrontProviders: Provider[] }>(gql`
      ${PROVIDER_FRAGMENT}
      query GetStorefrontProvidersForService($serviceId: ID!, $practiceSlug: String!) {
        storefrontProviders(serviceId: $serviceId, take: 50, practiceSlug: $practiceSlug) {
          ...StorefrontProviderFields
        }
      }
    `, { serviceId, practiceSlug: practiceSlug() })
    return data.storefrontProviders
  })
})
