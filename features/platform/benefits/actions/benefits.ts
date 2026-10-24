'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { ActionResult, BenefitsData, BenefitsTab } from '../types';

const PATH = '/dashboard/platform/benefits';

/** Loads only what the active tab needs, plus selector options for its drawers. */
export async function getBenefitsData(tab: BenefitsTab): Promise<BenefitsData> {
  const needsServices = tab === 'plans' || tab === 'packages';
  const needsClients = tab === 'memberships' || tab === 'client-packages';
  const response = await keystoneClient<any>(`
    query BenefitsData($plans: Boolean!, $packages: Boolean!, $memberships: Boolean!, $clientPackages: Boolean!, $giftCards: Boolean!, $services: Boolean!, $clients: Boolean!) {
      memberships(orderBy: { name: asc }, take: 100) @include(if: $plans) {
        id name description monthlyPrice discountPercent isActive includedServices(orderBy: { name: asc }) { id name }
      }
      planHolders: clientMemberships(where: { status: { in: ["active", "paused"] } }, take: 500) @include(if: $plans) { id membership { id } }
      membershipOffers: memberships(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 100) @include(if: $memberships) {
        id name description monthlyPrice discountPercent isActive includedServices { id name }
      }
      servicePackages(orderBy: { name: asc }, take: 100) @include(if: $packages) {
        id name description totalPrice savingsAmount validDays isActive services(orderBy: { name: asc }) { id name }
      }
      packageOffers: servicePackages(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 100) @include(if: $clientPackages) {
        id name description totalPrice savingsAmount validDays isActive services { id name }
      }
      clientMemberships(orderBy: { startDate: desc }, take: 200) @include(if: $memberships) {
        id status startDate nextBillingDate pausedUntil
        client { id name email }
        membership { id name monthlyPrice discountPercent includedServices { id } }
        agreements(orderBy: { acceptedAt: desc }, take: 1) { id acceptedAt effectiveUntil termsVersion }
        ledgerEntries(orderBy: { occurredAt: desc }, take: 5) { id type reason occurredAt }
      }
      clientPackages(orderBy: { purchasedAt: desc }, take: 200) @include(if: $clientPackages) {
        id status purchasedAt expiresAt totalValue paidAmount usedValue
        client { id name email }
        package { id name }
        usageHistory(orderBy: { usedAt: desc }, take: 10) { id valueUsed usedAt service { name } appointment { id } }
        adjustments(take: 50) { id type usage { id } }
      }
      giftCards(orderBy: { createdAt: desc }, take: 200) @include(if: $giftCards) {
        id code initialValue currentBalance recipientName recipientEmail isActive expiresAt createdAt
        transactions(orderBy: { createdAt: desc }, take: 20) { id type amount notes createdAt appointment { id } }
      }
      services(where: { status: { equals: active } }, orderBy: { name: asc }, take: 200) @include(if: $services) { id name price }
      clients(orderBy: { updatedAt: desc }, take: 300) @include(if: $clients) { id user { name email } }
    }
  `, {
    plans: tab === 'plans', packages: tab === 'packages', memberships: tab === 'memberships', clientPackages: tab === 'client-packages',
    giftCards: tab === 'gift-cards', services: needsServices, clients: needsClients,
  }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const data = response.data;
  const holders = new Map<string, number>();
  for (const row of data.planHolders || []) if (row.membership?.id) holders.set(row.membership.id, (holders.get(row.membership.id) || 0) + 1);
  const plans = (data.memberships || data.membershipOffers || []).map((plan: any) => ({ ...plan, includedServices: plan.includedServices || [], activeCount: holders.get(plan.id) || 0 }));
  return {
    status: 'loaded',
    tab,
    services: data.services || [],
    clients: (data.clients || []).filter((client: any) => client.user?.email).map((client: any) => ({ id: client.id, name: client.user.name || client.user.email, email: client.user.email })),
    memberships: plans,
    packages: (data.servicePackages || data.packageOffers || []).map((plan: any) => ({ ...plan, services: plan.services || [] })),
    clientMemberships: data.clientMemberships || [],
    clientPackages: data.clientPackages || [],
    giftCards: data.giftCards || [],
  };
}

async function run(mutation: string, field: string, variables: Record<string, unknown>): Promise<ActionResult> {
  const response = await keystoneClient<Record<string, ActionResult & { status?: string | null }>>(mutation, variables).catch(() => null);
  if (!response?.success) return { success: false, error: 'Not saved. Check the list before retrying.' };
  const result = response.data[field];
  if (result?.success) revalidatePath(PATH);
  return { success: Boolean(result?.success), recordId: result?.recordId ?? null, error: result?.error ?? null };
}

export async function saveMembershipPlan(input: { membershipId?: string | null; name: string; description: string; monthlyPrice: number; discountPercent: number; includedServiceIds: string[]; isActive: boolean; idempotencyKey: string }) {
  return run(`mutation SaveMembershipPlan($membershipId: ID, $name: String!, $description: String, $monthlyPrice: Int!, $discountPercent: Int!, $includedServiceIds: [ID!]!, $isActive: Boolean!, $idempotencyKey: String!) {
    upsertMembershipPlan(membershipId: $membershipId, name: $name, description: $description, monthlyPrice: $monthlyPrice, discountPercent: $discountPercent, includedServiceIds: $includedServiceIds, isActive: $isActive, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'upsertMembershipPlan', input);
}

export async function saveServicePackage(input: { packageId?: string | null; name: string; description: string; totalPrice: number; savingsAmount: number; validDays: number; serviceIds: string[]; isActive: boolean; idempotencyKey: string }) {
  return run(`mutation SaveServicePackage($packageId: ID, $name: String!, $description: String, $totalPrice: Int!, $savingsAmount: Int!, $validDays: Int!, $serviceIds: [ID!]!, $isActive: Boolean!, $idempotencyKey: String!) {
    upsertServicePackage(packageId: $packageId, name: $name, description: $description, totalPrice: $totalPrice, savingsAmount: $savingsAmount, validDays: $validDays, serviceIds: $serviceIds, isActive: $isActive, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'upsertServicePackage', input);
}

export async function enrollMembership(input: { clientId: string; membershipId: string; startDate: string; idempotencyKey: string }) {
  return run(`mutation EnrollMembership($clientId: ID!, $membershipId: ID!, $startDate: String!, $idempotencyKey: String!) {
    enrollClientMembership(clientId: $clientId, membershipId: $membershipId, startDate: $startDate, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'enrollClientMembership', input);
}

export async function acceptMembershipTerms(input: { clientMembershipId: string; termsVersion: string; terms: string; renewalDisclosure: string; cancellationDisclosure: string; signature: string; discountPercent: number; includedServiceIds: string[]; idempotencyKey: string }) {
  return run(`mutation AcceptMembershipTerms($clientMembershipId: ID!, $termsVersion: String!, $terms: JSON!, $benefitSnapshot: JSON!, $renewalDisclosure: JSON!, $cancellationDisclosure: JSON!, $signatureEvidence: String!, $idempotencyKey: String!) {
    acceptMembershipAgreement(clientMembershipId: $clientMembershipId, termsVersion: $termsVersion, terms: $terms, benefitSnapshot: $benefitSnapshot, renewalDisclosure: $renewalDisclosure, cancellationDisclosure: $cancellationDisclosure, signatureEvidence: $signatureEvidence, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'acceptMembershipAgreement', {
    clientMembershipId: input.clientMembershipId,
    termsVersion: input.termsVersion,
    terms: { text: input.terms },
    benefitSnapshot: { discountPercent: input.discountPercent, includedServiceIds: input.includedServiceIds },
    renewalDisclosure: { text: input.renewalDisclosure },
    cancellationDisclosure: { text: input.cancellationDisclosure },
    signatureEvidence: `typed-signature:${input.signature.trim()}`,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function transitionClientMembership(input: { clientMembershipId: string; action: 'freeze' | 'resume' | 'cancel'; reason: string; idempotencyKey: string }) {
  return run(`mutation TransitionClientMembership($clientMembershipId: ID!, $action: String!, $reason: String!, $idempotencyKey: String!) {
    transitionMembership(clientMembershipId: $clientMembershipId, action: $action, reason: $reason, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'transitionMembership', input);
}

export async function sellPackage(input: { clientId: string; packageId: string; paidAmount: number; idempotencyKey: string }) {
  return run(`mutation SellPackage($clientId: ID!, $packageId: ID!, $paidAmount: Int!, $idempotencyKey: String!) {
    sellClientPackage(clientId: $clientId, packageId: $packageId, paidAmount: $paidAmount, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'sellClientPackage', input);
}

export async function reversePackageUsage(input: { usageId: string; reason: string; idempotencyKey: string }) {
  const response = await keystoneClient<{ reverseClientPackageUsage: { success: boolean; clientPackageId: string | null; error: string | null } }>(`mutation ReversePackageUsage($usageId: ID!, $reason: String!, $idempotencyKey: String!) {
    reverseClientPackageUsage(usageId: $usageId, reason: $reason, idempotencyKey: $idempotencyKey) { success clientPackageId error }
  }`, input).catch(() => null);
  if (!response?.success) return { success: false, error: 'Not saved. Check the package before retrying.' };
  const result = response.data.reverseClientPackageUsage;
  if (result.success) revalidatePath(PATH);
  return { success: result.success, recordId: result.clientPackageId, error: result.error };
}

export async function issueGiftCardAction(input: { amount: number; recipientName: string; recipientEmail: string; message: string; idempotencyKey: string }) {
  return run(`mutation IssueGiftCard($amount: Int!, $recipientName: String, $recipientEmail: String, $message: String, $paymentMethod: String!, $idempotencyKey: String!) {
    issueGiftCard(amount: $amount, recipientName: $recipientName, recipientEmail: $recipientEmail, message: $message, paymentMethod: $paymentMethod, idempotencyKey: $idempotencyKey) { success recordId error }
  }`, 'issueGiftCard', { ...input, paymentMethod: 'cash' });
}

export async function adjustGiftCardBalance(input: { giftCardId: string; action: 'redemption' | 'refund'; amount: number; reason: string; appointmentId?: string | null; idempotencyKey: string }) {
  const response = await keystoneClient<{ applyGiftCardBalance: { success: boolean; giftCardId: string | null; error: string | null } }>(`mutation AdjustGiftCard($giftCardId: ID!, $action: String!, $amount: Int!, $appointmentId: ID, $reason: String, $idempotencyKey: String!) {
    applyGiftCardBalance(giftCardId: $giftCardId, action: $action, amount: $amount, appointmentId: $appointmentId, reason: $reason, idempotencyKey: $idempotencyKey) { success giftCardId error }
  }`, { ...input, appointmentId: input.appointmentId || null }).catch(() => null);
  if (!response?.success) return { success: false, error: 'Not saved. Check the card balance before retrying.' };
  const result = response.data.applyGiftCardBalance;
  if (result.success) revalidatePath(PATH);
  return { success: result.success, recordId: result.giftCardId, error: result.error };
}
