import { notFound } from 'next/navigation'
import { getAuthenticatedUser } from '@/features/dashboard/actions/auth'
import { canOpenPlatformRoute } from '@/features/dashboard/lib/sidebarAccess'

/** Layout for a platform section: a role without the section's flag gets a real 404, like a missing record. */
export function platformGate(slug: string) {
  return async function PlatformGate({ children }: { children: React.ReactNode }) {
    const response = await getAuthenticatedUser()
    const user = response.success ? response.data?.authenticatedItem : null
    if (!canOpenPlatformRoute(slug, user)) notFound()
    return children
  }
}
