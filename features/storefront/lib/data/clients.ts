"use server"

/**
 * Client identity creation and lookup are intentionally not exposed as raw
 * storefront CRUD. Guest booking uses `bookAppointment`; verified clients use
 * the session-aware `clientPortal` projection in `features/storefront/account`.
 */
export type Client = {
  id: string
  user: { id: string; name: string; email: string } | null
}
