"use server"

import { gql } from "graphql-request"
import { cache } from "react"
import { medspaClient } from "../config"
import { practiceSlug } from "./practice"
import { readServiceCatalog, type ServiceCatalogResult } from "./serviceCatalogResult"

export interface StorefrontImage {
  image: { url: string } | null
  imagePath: string | null
  altText: string | null
}

export interface Service {
  id: string
  name: string
  baseDuration: number
  basePrice: number
  category: { id: string; name: string } | null
  image: StorefrontImage | null
  description?: null
  pricingTier?: null
  requiresConsultation?: false
  specialists?: []
}

export interface ServiceCategory {
  id: string
  name: string
  description: null
  services: Service[]
}

type ServiceRead = Pick<Service, 'id' | 'name' | 'baseDuration' | 'basePrice'>
type ServiceWithScopedCategory = ServiceRead & { category: Service["category"] }

function toStorefrontService(service: Service): Service {
  return { ...service, basePrice: service.basePrice / 100 }
}

const PUBLISHED_PRACTICE = `{
  slug: { equals: $practiceSlug }
  isActive: { equals: true }
  storefrontSetting: {
    isPublished: { equals: true }
    primaryLocation: {
      isActive: { equals: true }
      practice: { slug: { equals: $practiceSlug }, isActive: { equals: true } }
    }
  }
}`

const SERVICE_FIELDS = gql`
  fragment StorefrontServiceFields on Service {
    id
    name
    baseDuration
    basePrice: price
  }
`

async function publicPresentation(services: Array<{ id: string }>): Promise<Service[]> {
  const byId = new Map<string, Service>()
  for (let offset = 0; offset < services.length; offset += 100) {
    const ids = services.slice(offset, offset + 100).map(service => service.id)
    const data = await medspaClient.request<{ storefrontServices: Service[] }>(gql`
      query PublicServicePresentation($ids: [ID!]!) { storefrontServices(ids: $ids) }
    `, { ids })
    if (!Array.isArray(data.storefrontServices)) throw new Error('Service presentation unavailable')
    for (const service of data.storefrontServices) byId.set(service.id, service)
  }
  if (services.some(service => !byId.has(service.id))) throw new Error('Service publication changed; reload catalog')
  return services.map(service => byId.get(service.id)!)
}

export const getServicesGroupedByCategory = cache(async function (): Promise<ServiceCatalogResult<ServiceCategory[]>> {
  return readServiceCatalog(async () => {
    const query = gql`
      ${SERVICE_FIELDS}
      query GetServicesByCategory($practiceSlug: String!) {
        serviceCategories(
          where: { isVisible: { equals: true }, practice: ${PUBLISHED_PRACTICE} }
          orderBy: { name: asc }
          take: 50
        ) {
          id
          name
          services(where: { status: { equals: active }, isPublic: { equals: true }, practice: ${PUBLISHED_PRACTICE} }, orderBy: { name: asc }, take: 50) {
            ...StorefrontServiceFields
          }
        }
        uncategorizedServices: services(
          where: { status: { equals: active }, isPublic: { equals: true }, category: null, practice: ${PUBLISHED_PRACTICE} }
          orderBy: { name: asc }
          take: 50
        ) { ...StorefrontServiceFields }
      }
    `
    const data = await medspaClient.request<{
      serviceCategories: Array<{ id: string; name: string; services: ServiceRead[] }>
      uncategorizedServices: ServiceRead[]
    }>(query, { practiceSlug: await practiceSlug() })
    const groupedCategories = data.serviceCategories.filter(category => category.services?.length > 0)
    const categorizedReads: ServiceWithScopedCategory[] = groupedCategories.flatMap(category =>
      category.services.map(service => ({
        ...service,
        category: { id: category.id, name: category.name },
      })),
    )
    const uncategorizedReads: ServiceWithScopedCategory[] = data.uncategorizedServices.map(service => ({
      ...service,
      category: null,
    }))
    const imageScopedReads = await publicPresentation([...categorizedReads, ...uncategorizedReads])
    let serviceOffset = 0
    const categories: ServiceCategory[] = groupedCategories.map(category => {
      const services = imageScopedReads
        .slice(serviceOffset, serviceOffset + category.services.length)
        .map(toStorefrontService)
      serviceOffset += category.services.length
      return { id: category.id, name: category.name, description: null, services }
    })
    const uncategorizedServices = imageScopedReads.slice(serviceOffset).map(toStorefrontService)
    if (uncategorizedServices.length) {
      categories.push({
        id: "published-services",
        name: "Other published services",
        description: null,
        services: uncategorizedServices,
      })
    }
    return categories
  })
})

export const getAllServices = cache(async function (): Promise<ServiceCatalogResult<Service[]>> {
  return readServiceCatalog(async () => {
    const data = await medspaClient.request<{ services: ServiceRead[] }>(gql`
      ${SERVICE_FIELDS}
      query GetAllServices($practiceSlug: String!) {
        services(
          where: { status: { equals: active }, isPublic: { equals: true }, practice: ${PUBLISHED_PRACTICE} }
          orderBy: { name: asc }
          take: 100
        ) { ...StorefrontServiceFields }
      }
    `, { practiceSlug: await practiceSlug() })
    return (await publicPresentation(data.services)).map(toStorefrontService)
  })
})

export const getServiceById = cache(async function (id: string): Promise<ServiceCatalogResult<Service | null>> {
  return readServiceCatalog(async () => {
    const data = await medspaClient.request<{ services: ServiceRead[] }>(gql`
      ${SERVICE_FIELDS}
      query GetServiceById($id: ID!, $practiceSlug: String!) {
        services(
          where: { id: { equals: $id }, status: { equals: active }, isPublic: { equals: true }, practice: ${PUBLISHED_PRACTICE} }
          take: 1
        ) { ...StorefrontServiceFields }
      }
    `, { id, practiceSlug: await practiceSlug() })
    if (!data.services[0]) return null
    const [service] = await publicPresentation([data.services[0]])
    return toStorefrontService(service)
  })
})

export const getFeaturedServices = cache(async function (limit = 4): Promise<ServiceCatalogResult<Service[]>> {
  const take = Math.max(1, Math.min(Math.trunc(limit), 8))
  return readServiceCatalog(async () => {
    const data = await medspaClient.request<{ services: ServiceRead[] }>(gql`
      ${SERVICE_FIELDS}
      query GetFeaturedServices($take: Int!, $practiceSlug: String!) {
        services(
          where: { status: { equals: active }, isPublic: { equals: true }, practice: ${PUBLISHED_PRACTICE} }
          take: $take
          orderBy: { name: asc }
        ) { ...StorefrontServiceFields }
      }
    `, { take, practiceSlug: await practiceSlug() })
    return (await publicPresentation(data.services)).map(toStorefrontService)
  })
})
