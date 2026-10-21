'use server'

import { revalidatePath } from 'next/cache'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'
import { sanitizeStoreLogoSvg } from '@/features/lib/sanitize-store-logo'
import { validLogoHue } from '@/features/lib/store-logo'

export interface StorefrontSettingsData {
  setting: {
    id: string
    displayName: string
    accentHue: number
    logoSvg: string
    logoHue: number
    isPublished: boolean
    revision: number
    primaryLocation: { id: string; name: string } | null
  } | null
  locations: Array<{ id: string; name: string; city: string; state: string; isActive: boolean }>
}

export type StorefrontSettingsRead = ({ status: 'loaded' } & StorefrontSettingsData) | { status: 'unavailable'; message: string }
export type StorefrontSaveState = { status: 'idle' | 'saved' | 'invalid' | 'conflict' | 'unavailable'; message: string; revision?: number }

export async function getStorefrontSettings(): Promise<StorefrontSettingsRead> {
  const response = await keystoneClient<{
    storefrontSettings: StorefrontSettingsData['setting'][]
    locations: StorefrontSettingsData['locations']
  }>(`
    query ManageStorefrontSettings {
      storefrontSettings(take: 1) {
        id displayName accentHue logoSvg logoHue isPublished revision
        primaryLocation { id name }
      }
      locations(orderBy: { name: asc }, take: 100) { id name city state isActive }
    }
  `).catch(() => ({ success: false as const, error: 'Settings unavailable' }))
  if (!response.success) {
    return { status: 'unavailable', message: 'Storefront settings could not be loaded. Try again.' }
  }
  return {
    status: 'loaded',
    setting: response.data.storefrontSettings[0] || null,
    locations: response.data.locations || [],
  }
}

export async function saveStorefrontSettings(_state: StorefrontSaveState, formData: FormData): Promise<StorefrontSaveState> {
  const displayName = formData.get('displayName')?.toString().trim() || ''
  const primaryLocationId = formData.get('primaryLocationId')?.toString() || ''
  const accentHue = Number(formData.get('accentHue'))
  const expectedRevision = Number(formData.get('expectedRevision'))
  const rawLogo = String(formData.get('logoSvg') || '').trim()
  const logoSvg = rawLogo ? sanitizeStoreLogoSvg(rawLogo) : ''
  const logoHue = Number(formData.get('logoHue'))
  const isPublished = formData.get('isPublished') === 'on'

  if (
    !displayName || displayName.length > 80 || !primaryLocationId || (Boolean(rawLogo) && !logoSvg) || !validLogoHue(logoHue) ||
    !Number.isInteger(accentHue) || accentHue < 0 || accentHue > 360 ||
    !Number.isInteger(expectedRevision) || expectedRevision < 0
  ) return { status: 'invalid', message: 'Review the display name, active location and valid logo/hue before saving.', revision: _state.revision }

  const response = await keystoneClient<{
    publishStorefrontSettings: { success: boolean; error: string | null }
  }>(`
    mutation UpdateStorefrontSettings(
      $displayName: String!
      $primaryLocationId: ID!
      $accentHue: Int!
      $logoSvg: String!
      $logoHue: Int!
      $isPublished: Boolean!
      $expectedRevision: Int!
    ) {
      publishStorefrontSettings(
        displayName: $displayName
        primaryLocationId: $primaryLocationId
        accentHue: $accentHue
        logoSvg: $logoSvg
        logoHue: $logoHue
        isPublished: $isPublished
        expectedRevision: $expectedRevision
      ) { success error }
    }
  `, { displayName, primaryLocationId, accentHue, logoSvg, logoHue, isPublished, expectedRevision }).catch(() => ({ success: false as const, error: 'Save unavailable' }))

  if (!response.success || !response.data.publishStorefrontSettings.success) {
    if (response.success && response.data.publishStorefrontSettings.error === 'Storefront settings changed; reload before saving again') {
      return { status: 'conflict', message: 'Settings changed elsewhere. Keep your draft for comparison, then reload and review the latest settings before saving again.', revision: expectedRevision }
    }
    return { status: 'unavailable', message: 'Save was not confirmed. Your draft is retained. Check your access and reload the latest settings before retrying.', revision: expectedRevision }
  }

  revalidatePath('/')
  revalidatePath('/services')
  revalidatePath('/contact')
  revalidatePath('/dashboard/platform/storefront')
  return { status: 'saved', message: 'Storefront settings saved.', revision: expectedRevision + 1 }
}
