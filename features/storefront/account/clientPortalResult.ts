export type ClientPortalProjection = {
  authenticated: boolean
  client: { id: string; totalVisits: number; user?: { name?: string; email?: string; phone?: string | null } | null } | null
  appointments: Array<{ id: string; startTime: string; status: string; location?: { name?: string | null; timezone?: string | null } | null; provider?: { user?: { name?: string | null } | null } | null; lineItems?: Array<{ id: string; serviceTitle: string; price: number }>; transaction?: { id: string; status: string; paymentStatus: string; completedAt: string | null; lineItems: Array<{ id: string; itemType: string; quantity: number; unitPrice: number; discount: number | null; title: string | null }> } | null; payment?: { id: string; subtotal: number | null; tax: number | null; tip: number | null; discount: number | null; totalAmount: number | null; refundedAmount: number | null; paymentMethod: string | null; status: string | null } | null; reviewed?: boolean }>
  benefits: {
    packages: Array<{ id: string; status: string; expiresAt: string | null; totalValue: number; usedValue: number; remainingValue: number | null; package?: { name?: string | null } | null }>
    memberships: Array<{ id: string; status: string; nextBillingDate: string | null; pausedUntil: string | null; membership?: { name?: string | null; monthlyPrice?: number | null } | null }>
  }
  treatmentPlans: Array<{ id: string; title: string; status: string; items: Array<{ serviceTitle: string; plannedSessions: number; completedSessions: number; status: string }> }>
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
