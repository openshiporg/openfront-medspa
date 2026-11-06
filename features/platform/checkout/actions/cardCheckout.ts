'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

function dollarsToCents(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? '').replace(/[$,\s]/g, '') || 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

function checkoutInputFrom(formData: FormData) {
  const retailProductIds = formData.getAll('retailProductId').map((value) => value.toString());
  const retailQuantities = formData.getAll('retailQuantity').map((value) => Number(value || 0));
  return {
    tipAmount: dollarsToCents(formData.get('tip')),
    discountAmount: dollarsToCents(formData.get('discount')),
    discountReason: formData.get('discountReason')?.toString().trim() || null,
    retailItems: retailProductIds.map((productId, index) => ({ productId, quantity: retailQuantities[index] || 0 })).filter((item) => item.productId && item.quantity > 0),
    clientPackageId: formData.get('clientPackageId')?.toString() || null,
    clientMembershipId: formData.get('clientMembershipId')?.toString() || null,
  };
}

export type CardCheckoutState = { url: string | null; amount: number | null; error: string | null };

/** Front-desk card payment: opens Stripe Checkout for the computed total. The desk keys the card in there or sends the link to the client. */
export async function startCardCheckoutAction(_previous: CardCheckoutState, formData: FormData): Promise<CardCheckoutState> {
  const appointmentId = formData.get('appointmentId')?.toString();
  if (!appointmentId) return { url: null, amount: null, error: 'Appointment is missing' };
  const response = await keystoneClient<{ startCardCheckout: { success: boolean; error: string | null; url: string | null; amount: number | null } }>(`
    mutation StartCardCheckout($appointmentId: ID!, $tipAmount: Int!, $discountAmount: Int!, $discountReason: String, $retailItems: JSON, $clientPackageId: ID, $clientMembershipId: ID) {
      startCardCheckout(appointmentId: $appointmentId, tipAmount: $tipAmount, discountAmount: $discountAmount, discountReason: $discountReason, retailItems: $retailItems, clientPackageId: $clientPackageId, clientMembershipId: $clientMembershipId) { success error url amount }
    }
  `, { appointmentId, ...checkoutInputFrom(formData) }).catch(() => null);
  if (!response?.success) return { url: null, amount: null, error: 'The card payment page could not be opened. Try again.' };
  const result = response.data.startCardCheckout;
  return result.success ? { url: result.url, amount: result.amount, error: null } : { url: null, amount: null, error: result.error };
}

/** Reads open card payments back from Stripe; a paid one writes the sale exactly like the webhook does. */
export async function confirmCardCheckoutAction(appointmentId: string): Promise<{ outcome: string | null; error: string | null }> {
  const response = await keystoneClient<{ confirmCardCheckout: { success: boolean; error: string | null; outcome: string | null } }>(`
    mutation ConfirmCardCheckout($appointmentId: ID!) { confirmCardCheckout(appointmentId: $appointmentId) { success error outcome } }
  `, { appointmentId }).catch(() => null);
  if (!response?.success) return { outcome: null, error: 'The card payment could not be checked. Reload to retry.' };
  const result = response.data.confirmCardCheckout;
  if (result.outcome === 'completed') {
    revalidatePath('/dashboard/platform/checkout');
    revalidatePath(`/dashboard/platform/appointments/${appointmentId}`);
    revalidatePath('/dashboard/platform/payments');
  }
  return { outcome: result.outcome, error: result.success ? result.error : result.error || 'The card payment could not be checked' };
}
