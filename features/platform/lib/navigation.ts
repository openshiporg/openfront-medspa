import type { LucideIcon } from 'lucide-react'
import { Banknote, Boxes, Building2, CalendarClock, CalendarHeart, ChartNoAxesCombined, ContactRound, CreditCard, DoorOpen, FileSignature, Gift, HeartPulse, LayoutGrid, LockKeyhole, MapPin, Megaphone, PlugZap, ReceiptText, ShieldAlert, Sparkles, Star, Stethoscope, Store, UsersRound } from 'lucide-react'

export interface PlatformNavItem {
  title: string
  href: string
  color: string
  description: string
  icon: LucideIcon
  group: 'standalone' | 'relationships' | 'catalog' | 'operations' | 'clinical' | 'insights'
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
  { title: 'Waitlist & messages', href: '/platform/engagement', color: 'orange', description: 'Waitlist, message templates and delivery log.', icon: Megaphone, group: 'relationships' },
  { title: 'Follow-ups', href: '/platform/follow-ups', color: 'red', description: 'Aftercare tasks and client responses.', icon: HeartPulse, group: 'relationships' },
  { title: 'Reviews', href: '/platform/reviews', color: 'yellow', description: 'Approve or hide client reviews.', icon: Star, group: 'relationships' },
  { title: 'Treatments', href: '/platform/catalog', color: 'violet', description: 'Menu, prices, online booking and rooms per treatment.', icon: Sparkles, group: 'catalog' },
  { title: 'Memberships & benefits', href: '/platform/benefits', color: 'pink', description: 'Membership plans, packages and gift cards.', icon: Gift, group: 'catalog' },
  { title: 'Inventory & purchasing', href: '/platform/inventory', color: 'lime', description: 'Products, lots, purchase orders and vendors.', icon: Boxes, group: 'catalog' },
  { title: 'Practice', href: '/platform/administration', color: 'cyan', description: 'Staff, locations, rooms and hours at a glance.', icon: Building2, group: 'operations' },
  { title: 'Staff', href: '/platform/staff', color: 'violet', description: 'Providers, roles, invitations and treatment authority.', icon: UsersRound, group: 'operations' },
  { title: 'Locations', href: '/platform/locations', color: 'cyan', description: 'Addresses, timezones and opening hours.', icon: MapPin, group: 'operations' },
  { title: 'Staff schedules', href: '/platform/schedules', color: 'blue', description: 'Weekly hours, one-off hours and time off.', icon: CalendarClock, group: 'operations' },
  { title: 'Rooms & devices', href: '/platform/resources', color: 'teal', description: 'Rooms, devices, readiness and holds.', icon: DoorOpen, group: 'operations' },
  { title: 'Storefront settings', href: '/platform/storefront', color: 'indigo', description: 'Practice name, logo, publishing and checkout tax.', icon: Store, group: 'operations' },
  { title: 'Forms & consent', href: '/platform/forms', color: 'sky', description: 'Intake forms, consent versions and intake review.', icon: FileSignature, group: 'clinical' },
  { title: 'Safety', href: '/platform/safety', color: 'red', description: 'Incidents, recalls and device readiness.', icon: ShieldAlert, group: 'clinical' },
  { title: 'Privacy & records', href: '/platform/privacy', color: 'slate', description: 'Patient rights requests, legal holds and retention.', icon: LockKeyhole, group: 'clinical' },
  { title: 'Payments', href: '/platform/payments', color: 'emerald', description: 'Settled payments, refunds and tips.', icon: CreditCard, group: 'insights' },
  { title: 'Commissions', href: '/platform/commissions', color: 'amber', description: 'Provider commissions and payouts.', icon: Banknote, group: 'insights' },
  { title: 'Reports', href: '/platform/reports', color: 'sky', description: 'Revenue, visits, treatments and providers.', icon: ChartNoAxesCombined, group: 'insights' },
  { title: 'Integrations', href: '/platform/integrations', color: 'zinc', description: 'Payment methods, email and event log.', icon: PlugZap, group: 'insights' },
]

export const platformStandaloneItems = platformNavItems.filter((item) => item.group === 'standalone')

const groupDefinitions = [
  { id: 'relationships', title: 'Clients & demand', icon: UsersRound },
  { id: 'catalog', title: 'Catalog & retail', icon: LayoutGrid },
  { id: 'operations', title: 'Practice', icon: Building2 },
  { id: 'clinical', title: 'Clinical & compliance', icon: Stethoscope },
  { id: 'insights', title: 'Insights & systems', icon: ChartNoAxesCombined },
] as const

export const platformNavGroups: PlatformNavGroup[] = groupDefinitions.map((group) => ({
  ...group,
  items: platformNavItems.filter((item) => item.group === group.id),
}))

export function getPlatformNavItemsWithBasePath(basePath: string) {
  return platformNavItems.map((item) => ({ ...item, href: `${basePath}${item.href}` }))
}
