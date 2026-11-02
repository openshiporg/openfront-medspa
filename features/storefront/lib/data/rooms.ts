"use server"
import { cache } from 'react'
import { gql } from 'graphql-request'
import { medspaClient } from '../config'

export interface StorefrontRoom { id: string; name: string; photoUrl: string }
export const getStorefrontRooms = cache(async (): Promise<StorefrontRoom[]> => {
  try {
    const result = await medspaClient.request<{ storefrontRooms: StorefrontRoom[] }>(gql`query PublicRooms { storefrontRooms }`)
    // Stable display order: consultation, treatment, light therapy, then the rest by name.
    const rank = (name: string) => { const i = [/consult/i, /treatment/i, /light/i].findIndex(re => re.test(name)); return i < 0 ? 3 : i }
    return [...result.storefrontRooms].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
  } catch { return [] }
})
