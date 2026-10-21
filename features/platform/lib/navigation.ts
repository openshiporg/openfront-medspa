import type { LucideIcon } from 'lucide-react'
import { Armchair, Banknote, Boxes, Building2, CalendarClock, CalendarDays, ChartNoAxesCombined, ContactRound, Gift, LayoutGrid, Megaphone, PlugZap, ReceiptText, Scissors, Store, UsersRound } from 'lucide-react'

export interface PlatformNavItem {
  title: string
  href: string
  color: string
  description: string
  icon: LucideIcon
  group: 'standalone' | 'relationships' | 'catalog' | 'operations' | 'insights'
}

export interface PlatformNavGroup {
  id: string
  title: string
  icon: LucideIcon
  items: PlatformNavItem[]
}

export const platformNavItems: PlatformNavItem[] = [
  { title: 'Appointments', href: '/platform/appointments', color: 'purple', description: 'Manage bookings, client arrivals, and appointment status.', icon: CalendarDays, group: 'standalone' },
  { title: 'Checkout', href: '/platform/checkout', color: 'emerald', description: 'Complete medspa tickets, service charges, and retail sales.', icon: ReceiptText, group: 'standalone' },
  { title: 'Clients', href: '/platform/clients', color: 'rose', description: 'Prioritize client relationships, visit history, and follow-up.', icon: ContactRound, group: 'relationships' },
  { title: 'Waitlist & communications', href: '/platform/engagement', color: 'orange', description: 'Work demand, slot offers, and delivery exceptions.', icon: Megaphone, group: 'relationships' },
  { title: 'Services & catalog', href: '/platform/catalog', color: 'violet', description: 'Review bookability, pricing, duration, and resource coverage.', icon: Scissors, group: 'catalog' },
  { title: 'Memberships & benefits', href: '/platform/benefits', color: 'pink', description: 'Monitor memberships, packages, and gift-card value.', icon: Gift, group: 'catalog' },
  { title: 'Retail inventory', href: '/platform/inventory', color: 'lime', description: 'Replenish low stock and record controlled inventory movement.', icon: Boxes, group: 'catalog' },
  { title: 'Staff schedules', href: '/platform/schedules', color: 'blue', description: 'Coordinate provider availability and shift coverage.', icon: CalendarClock, group: 'operations' },
  { title: 'Resources', href: '/platform/resources', color: 'teal', description: 'Manage chairs, rooms, equipment, and bookable resources.', icon: Armchair, group: 'operations' },
  { title: 'Staff & locations', href: '/platform/administration', color: 'cyan', description: 'Review provider assignment and location readiness.', icon: Building2, group: 'operations' },
  { title: 'Storefront settings', href: '/platform/storefront', color: 'indigo', description: 'Publish practice identity, primary location, and theme hue.', icon: Store, group: 'operations' },
  { title: 'Commissions', href: '/platform/commissions', color: 'amber', description: 'Review staff commissions and controlled payouts.', icon: Banknote, group: 'operations' },
  { title: 'Reports', href: '/platform/reports', color: 'sky', description: 'Read settled revenue, refunds, appointments, and payout exposure.', icon: ChartNoAxesCombined, group: 'insights' },
  { title: 'Integrations & exceptions', href: '/platform/integrations', color: 'zinc', description: 'Check providers, webhooks, and domain-event delivery.', icon: PlugZap, group: 'insights' },
]

export const platformStandaloneItems = platformNavItems.filter((item) => item.group === 'standalone')

const groupDefinitions = [
  { id: 'relationships', title: 'Clients & demand', icon: UsersRound },
  { id: 'catalog', title: 'Catalog & retail', icon: LayoutGrid },
  { id: 'operations', title: 'MedSpa administration', icon: Building2 },
  { id: 'insights', title: 'Insights & systems', icon: ChartNoAxesCombined },
] as const

export const platformNavGroups: PlatformNavGroup[] = groupDefinitions.map((group) => ({
  ...group,
  items: platformNavItems.filter((item) => item.group === group.id),
}))

export function getPlatformNavItemsWithBasePath(basePath: string) {
  return platformNavItems.map((item) => ({ ...item, href: `${basePath}${item.href}` }))
}
