import type { LucideIcon } from 'lucide-react'
import { Banknote, Boxes, Building2, CalendarClock, CalendarHeart, ChartNoAxesCombined, ContactRound, DoorOpen, Gift, LayoutGrid, Megaphone, PlugZap, ReceiptText, Sparkles, Store, UsersRound } from 'lucide-react'

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
  { title: 'Appointments', href: '/platform/appointments', color: 'purple', description: 'Day sheet, arrivals and appointment status.', icon: CalendarHeart, group: 'standalone' },
  { title: 'Checkout', href: '/platform/checkout', color: 'emerald', description: 'Treatment tickets, retail add-ons and cash settlement.', icon: ReceiptText, group: 'standalone' },
  { title: 'Clients', href: '/platform/clients', color: 'rose', description: 'Client records, visit history and follow-up.', icon: ContactRound, group: 'relationships' },
  { title: 'Waitlist & communications', href: '/platform/engagement', color: 'orange', description: 'Waitlist demand, slot offers and delivery exceptions.', icon: Megaphone, group: 'relationships' },
  { title: 'Services & catalog', href: '/platform/catalog', color: 'violet', description: 'Treatments, pricing, duration and room coverage.', icon: Sparkles, group: 'catalog' },
  { title: 'Memberships & benefits', href: '/platform/benefits', color: 'pink', description: 'Memberships, treatment packages and gift-card value.', icon: Gift, group: 'catalog' },
  { title: 'Retail inventory', href: '/platform/inventory', color: 'lime', description: 'Skincare stock, product lots and inventory movement.', icon: Boxes, group: 'catalog' },
  { title: 'Staff schedules', href: '/platform/schedules', color: 'blue', description: 'Provider availability and weekly coverage.', icon: CalendarClock, group: 'operations' },
  { title: 'Resources', href: '/platform/resources', color: 'teal', description: 'Treatment rooms, devices and bookable equipment.', icon: DoorOpen, group: 'operations' },
  { title: 'Staff & locations', href: '/platform/administration', color: 'cyan', description: 'Provider assignment and location readiness.', icon: Building2, group: 'operations' },
  { title: 'Storefront settings', href: '/platform/storefront', color: 'indigo', description: 'Practice name, logo, location and publishing.', icon: Store, group: 'operations' },
  { title: 'Commissions', href: '/platform/commissions', color: 'amber', description: 'Provider commissions and payouts.', icon: Banknote, group: 'operations' },
  { title: 'Reports', href: '/platform/reports', color: 'sky', description: 'Settled revenue, refunds, visits and payouts.', icon: ChartNoAxesCombined, group: 'insights' },
  { title: 'Integrations & exceptions', href: '/platform/integrations', color: 'zinc', description: 'Payment providers, webhooks and event delivery.', icon: PlugZap, group: 'insights' },
]

export const platformStandaloneItems = platformNavItems.filter((item) => item.group === 'standalone')

const groupDefinitions = [
  { id: 'relationships', title: 'Clients & demand', icon: UsersRound },
  { id: 'catalog', title: 'Catalog & retail', icon: LayoutGrid },
  { id: 'operations', title: 'Practice', icon: Building2 },
  { id: 'insights', title: 'Insights & systems', icon: ChartNoAxesCombined },
] as const

export const platformNavGroups: PlatformNavGroup[] = groupDefinitions.map((group) => ({
  ...group,
  items: platformNavItems.filter((item) => item.group === group.id),
}))

export function getPlatformNavItemsWithBasePath(basePath: string) {
  return platformNavItems.map((item) => ({ ...item, href: `${basePath}${item.href}` }))
}
