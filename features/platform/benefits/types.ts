export type BenefitsTab = 'plans' | 'memberships' | 'packages' | 'client-packages' | 'gift-cards';

export const BENEFIT_TABS: Array<{ value: BenefitsTab; label: string }> = [
  { value: 'plans', label: 'Plans' },
  { value: 'memberships', label: 'Client memberships' },
  { value: 'packages', label: 'Packages' },
  { value: 'client-packages', label: 'Client packages' },
  { value: 'gift-cards', label: 'Gift cards' },
];

export interface ServiceOption { id: string; name: string; price: number | null }
export interface ClientOption { id: string; name: string; email: string }

export interface MembershipPlan {
  id: string; name: string; description: string | null; monthlyPrice: number | null; discountPercent: number | null; isActive: boolean | null;
  includedServices: Array<{ id: string; name: string }>;
  activeCount: number;
}

export interface PackagePlan {
  id: string; name: string; description: string | null; totalPrice: number | null; savingsAmount: number | null; validDays: number | null; isActive: boolean | null;
  services: Array<{ id: string; name: string }>;
}

export interface ClientMembershipRow {
  id: string; status: string | null; startDate: string | null; nextBillingDate: string | null; pausedUntil: string | null;
  client: { id: string; name: string | null; email: string | null } | null;
  membership: { id: string; name: string; monthlyPrice: number | null; discountPercent: number | null; includedServices: Array<{ id: string }> } | null;
  agreements: Array<{ id: string; acceptedAt: string | null; effectiveUntil: string | null; termsVersion: string | null }>;
  ledgerEntries: Array<{ id: string; type: string | null; reason: string | null; occurredAt: string | null }>;
}

export interface ClientPackageRow {
  id: string; status: string | null; purchasedAt: string | null; expiresAt: string | null;
  totalValue: number | null; paidAmount: number | null; usedValue: number | null;
  client: { id: string; name: string | null; email: string | null } | null;
  package: { id: string; name: string } | null;
  usageHistory: Array<{ id: string; valueUsed: number | null; usedAt: string | null; service: { name: string } | null; appointment: { id: string } | null }>;
  adjustments: Array<{ id: string; type: string | null; usage: { id: string } | null }>;
}

export interface GiftCardRow {
  id: string; code: string; initialValue: number | null; currentBalance: number | null; recipientName: string | null; recipientEmail: string | null;
  isActive: boolean | null; expiresAt: string | null; createdAt: string | null;
  transactions: Array<{ id: string; type: string | null; amount: number | null; notes: string | null; createdAt: string | null; appointment: { id: string } | null }>;
}

export type BenefitsData =
  | { status: 'loaded'; tab: BenefitsTab; services: ServiceOption[]; clients: ClientOption[]; memberships: MembershipPlan[]; packages: PackagePlan[]; clientMemberships: ClientMembershipRow[]; clientPackages: ClientPackageRow[]; giftCards: GiftCardRow[] }
  | { status: 'unavailable' };

export type ActionResult = { success: boolean; recordId?: string | null; error?: string | null };
