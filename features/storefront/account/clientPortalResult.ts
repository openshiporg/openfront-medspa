export type ClientPortalProjection = {
  authenticated: boolean
  client: { id: string; totalVisits: number; user?: { name?: string; email?: string } | null } | null
  appointments: Array<{ id: string; startTime: string; status: string; lineItems?: Array<{ id: string; serviceTitle: string; price: number }> }>
  benefits: { packages: unknown[]; memberships: unknown[] }
  treatmentPlans: unknown[]
  followUps: Array<{ id: string; dueAt: string; title: string; instructions?: string; status: string }>
  photoConsents: unknown[]
  rightsRequests: unknown[]
  releasedAssets: unknown[]
}

export type ClientPortalLoadResult =
  | { status: "loaded"; portal: ClientPortalProjection }
  | { status: "unauthenticated" }
  | { status: "unlinked" }
  | { status: "unavailable" }

type ClientPortalResponse =
  | { success: false }
  | { success: true; data: { clientPortal?: ClientPortalProjection | null } }

export function resolveClientPortalResult(response: ClientPortalResponse): ClientPortalLoadResult {
  if (!response.success) return { status: "unavailable" }
  const portal = response.data.clientPortal
  if (!portal || typeof portal !== "object") return { status: "unavailable" }
  if (portal.authenticated !== true) return { status: "unauthenticated" }
  if (!portal.client) return { status: "unlinked" }
  return { status: "loaded", portal }
}
