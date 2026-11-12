/**
 * Sidebar filtering from capabilities the session already has: the role's
 * canAccessDashboard flag and Keystone's per-session list `isHidden` from admin meta.
 * Plain module: no 'use server' / 'use client', no @/ imports.
 */

type SidebarList = { path: string; isHidden?: boolean | null }
type SidebarUser = { role?: ({ canAccessDashboard?: boolean | null } & Record<string, boolean | null | undefined>) | null } | null | undefined

/** Platform pages that need a role flag beyond dashboard access. Other pages stay open to every dashboard role. */
export const platformRouteFlags: Record<string, string> = {
  payments: 'canManageFinance',
  commissions: 'canManageFinance',
  reports: 'canViewReports',
  integrations: 'canManageIntegrations',
  storefront: 'canManagePractice',
  staff: 'canManagePeople',
  privacy: 'canManageSensitiveRecords',
}

/** An unknown user is left to the middleware; a known role must hold the page's flag. */
export function canOpenPlatformRoute(slug: string | undefined, user: SidebarUser) {
  const flag = slug ? platformRouteFlags[slug] : undefined
  if (!flag || !user) return true
  return user.role?.[flag] === true
}

/** Only an explicit false hides navigation; an unknown user is left to the middleware. */
export function canUseDashboardNav(user: SidebarUser) {
  return user?.role?.canAccessDashboard !== false
}

export function visibleSidebarLists<T extends SidebarList>(lists: T[], user: SidebarUser): T[] {
  if (!canUseDashboardNav(user)) return []
  return lists.filter((list) => !list.isHidden)
}

/**
 * A platform page whose first segment is a list path follows that list's visibility;
 * pages that are not tied to one list stay visible to dashboard users.
 */
export function visiblePlatformItems<T extends { href: string }>(
  items: T[],
  lists: SidebarList[],
  user: SidebarUser
): T[] {
  if (!canUseDashboardNav(user)) return []
  const hiddenPaths = new Set(lists.filter((list) => list.isHidden).map((list) => list.path))
  return items.filter((item) => {
    const slug = item.href.split('/platform/')[1]?.split(/[/?#]/)[0]
    return canOpenPlatformRoute(slug, user) && (!slug || !hiddenPaths.has(slug))
  })
}
