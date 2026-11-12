import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canOpenPlatformRoute, visiblePlatformItems } from './sidebarAccess'

const front = { role: { canAccessDashboard: true, canSchedule: true } }
const owner = { role: { canAccessDashboard: true, canManageFinance: true, canViewReports: true, canManageIntegrations: true, canManagePractice: true, canManagePeople: true, canManageSensitiveRecords: true } }

  test('404s role-blocked sections and keeps open ones', () => {
    for (const slug of ['payments', 'commissions', 'reports', 'integrations', 'storefront', 'staff', 'privacy']) {
      assert.equal(canOpenPlatformRoute(slug, front), false)
      assert.equal(canOpenPlatformRoute(slug, owner), true)
    }
    assert.equal(canOpenPlatformRoute('appointments', front), true)
  })
  test('hides blocked links from the sidebar', () => {
    const items = [{ href: '/dashboard/platform/payments' }, { href: '/dashboard/platform/appointments' }]
    assert.deepEqual(visiblePlatformItems(items, [], front), [items[1]])
    assert.deepEqual(visiblePlatformItems(items, [], owner), items)
  })
