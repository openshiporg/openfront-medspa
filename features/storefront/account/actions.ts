"use server"

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient"
import { resolveClientPortalResult, type ClientPortalLoadResult, type ClientPortalProjection } from "./clientPortalResult"

export type { ClientPortalLoadResult, ClientPortalProjection } from "./clientPortalResult"

export async function getClientPortalAction(): Promise<ClientPortalLoadResult> {
  try {
    const response = await keystoneClient<{ clientPortal: ClientPortalProjection }>(`
      query ClientPortal { clientPortal }
    `, {}, { cache: "no-store" })
    return resolveClientPortalResult(response)
  } catch {
    console.error("Client portal read failed")
    return { status: "unavailable" }
  }
}
