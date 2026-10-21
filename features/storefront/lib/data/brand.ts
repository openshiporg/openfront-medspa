"use server"

import type { Metadata } from "next"
import { gql } from "graphql-request"
import { cache } from "react"
import { medspaClient } from "../config"
import { publicLogoSvg, validLogoHue } from '@/features/lib/store-logo'
import {
  STOREFRONT_NEUTRAL_NAME,
  STOREFRONT_UNCONFIGURED_DESCRIPTION,
} from "./brand-constants"

type LocationHours = Record<
  string,
  { open?: string | null; close?: string | null; closed?: boolean | null }
>

interface PublicSettingsResponse {
  configured: boolean
  displayName: string | null
  accentHue: number | null
  logoSvg: string | null
  logoHue: number | null
  catalogNames: string[]
  serviceCount: number
  primaryLocation: {
    id: string
    name: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    phone: string | null
    email: string | null
    hours: LocationHours | null
    timezone: string | null
  } | null
}

export interface StorefrontBrand {
  configured: boolean
  name: string
  description: string
  accentHue: number
  logoSvg: string
  logoHue: number
  serviceCount: number
  catalogNames: string[]
  locationId: string | null
  address: string | null
  addressLine: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  phone: string | null
  phoneHref: string | null
  email: string | null
  hours: LocationHours | null
  timezone: string | null
}

function practiceSlug() {
  const value = process.env.MEDSPA_PRACTICE_SLUG?.trim()
  if (!value) throw new Error("MEDSPA_PRACTICE_SLUG is required for storefront reads")
  return value
}

function neutralBrand(): StorefrontBrand {
  return {
    configured: false,
    name: STOREFRONT_NEUTRAL_NAME,
    description: STOREFRONT_UNCONFIGURED_DESCRIPTION,
    accentHue: 220,
    logoSvg: publicLogoSvg(null),
    logoHue: 0,
    serviceCount: 0,
    catalogNames: [],
    locationId: null,
    address: null,
    addressLine: null,
    city: null,
    state: null,
    zipCode: null,
    phone: null,
    phoneHref: null,
    email: null,
    hours: null,
    timezone: null,
  }
}

function phoneHref(phone: string | null): string | null {
  if (!phone) return null
  const normalized = phone.replace(/[^\d+]/g, "")
  return normalized ? `tel:${normalized}` : null
}

function catalogDescription(name: string, catalogNames: string[], count: number) {
  if (!count || !catalogNames.length) return `${name} has no public services listed.`
  const suffix = count > catalogNames.length ? ", and other published services" : ""
  return `${name} public service listings: ${catalogNames.join(", ")}${suffix}. Listings do not establish candidacy, provider qualifications, authorization, results, or appointment availability.`
}

export const getStorefrontBrand = cache(async function (): Promise<StorefrontBrand> {
  try {
    const data = await medspaClient.request<{ publicStorefrontSettings: PublicSettingsResponse }>(gql`
      query PublicStorefrontSettings($practiceSlug: String!) {
        publicStorefrontSettings(practiceSlug: $practiceSlug) {
          configured
          displayName
          accentHue
          logoSvg
          logoHue
          catalogNames
          serviceCount
          primaryLocation {
            id
            name
            address
            city
            state
            zipCode
            phone
            email
            hours
            timezone
          }
        }
      }
    `, { practiceSlug: practiceSlug() })

    const settings = data.publicStorefrontSettings
    const location = settings.primaryLocation
    if (!settings.configured || !settings.displayName || settings.accentHue === null || !location) return neutralBrand()
    const locality = [location.city, location.state].filter(Boolean).join(", ")
    const finalLine = [locality, location.zipCode].filter(Boolean).join(" ")
    const addressLine = [location.address, finalLine].filter(Boolean).join(", ") || null

    return {
      configured: true,
      name: settings.displayName,
      description: catalogDescription(settings.displayName, settings.catalogNames, settings.serviceCount),
      accentHue: settings.accentHue,
      logoSvg: publicLogoSvg(settings.logoSvg),
      logoHue: validLogoHue(settings.logoHue) ? settings.logoHue : 0,
      serviceCount: settings.serviceCount,
      catalogNames: settings.catalogNames,
      locationId: location.id,
      address: location.address,
      addressLine,
      city: location.city,
      state: location.state,
      zipCode: location.zipCode,
      phone: location.phone,
      phoneHref: phoneHref(location.phone),
      email: location.email,
      hours: location.hours,
      timezone: location.timezone,
    }
  } catch (error) {
    console.error("Public storefront settings are unavailable:", error)
    return neutralBrand()
  }
})

export async function storefrontMetadata(page?: string): Promise<Metadata> {
  const brand = await getStorefrontBrand()
  const title = page ? `${page} | ${brand.name}` : brand.name
  return {
    applicationName: brand.name,
    title,
    description: brand.description,
    robots: brand.configured ? undefined : { index: false, follow: false },
  }
}

export async function storefrontTitle(page?: string): Promise<string> {
  const brand = await getStorefrontBrand()
  return page ? `${page} | ${brand.name}` : brand.name
}
