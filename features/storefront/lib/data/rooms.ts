"use server"
import { cache } from 'react'
import { gql } from 'graphql-request'
import { medspaClient } from '../config'

export interface StorefrontRoom { id: string; name: string; photoUrl: string }
export const getStorefrontRooms = cache(async (): Promise<StorefrontRoom[]> => {
  try {
    const result = await medspaClient.request<{ storefrontRooms: StorefrontRoom[] }>(gql`query PublicRooms { storefrontRooms }`)
    return result.storefrontRooms
  } catch { return [] }
})
