import { configuredTaxRate } from '@/features/keystone/checkoutInput';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export interface CheckoutPackageBenefit {
  id: string;
  status?: string | null;
  totalValue?: number | null;
  usedValue?: number | null;
  expiresAt?: string | null;
  metadata?: { entitlementSnapshot?: { snapshotVersion?: number; serviceIds?: unknown[] } } | null;
  package?: {
    id: string;
    name?: string | null;
    services: { id: string; name?: string | null }[];
  } | null;
}

export interface CheckoutMembershipBenefit {
  id: string;
  status?: string | null;
  pausedUntil?: string | null;
  agreements?: { effectiveUntil?: string | null; evidenceHash?: string | null; benefitSnapshot?: unknown }[];
  membership?: {
    id: string;
    name?: string | null;
    discountPercent?: number | null;
    includedServices: { id: string; name?: string | null }[];
  } | null;
}

export interface CheckoutRetailProduct {
  id: string;
  name?: string | null;
  sku?: string | null;
  price?: number | null;
  quantity?: number | null;
  category?: string | null;
}

export interface CheckoutAppointment {
  id: string;
  startTime?: string | null;
  location?: { timezone?: string | null } | null;
  duration?: number | null;
  status?: string | null;
  depositAmount?: number | null;
  depositPaid?: boolean | null;
  client?: {
    id: string;
    totalVisits?: number | null;
    lifetimeValue?: number | null;
    lastVisit?: string | null;
    user?: { id: string; name?: string | null; email?: string | null } | null;
  } | null;
  provider?: {
    id: string;
    baseCommissionRate?: number | null;
    user?: { id: string; name?: string | null } | null;
  } | null;
  services: { id: string; name?: string | null; price?: number | null; basePrice?: number | null; baseDuration?: number | null }[];
  lineItems: {
    id: string;
    serviceTitle: string;
    serviceImagePath?: string | null;
    price?: number | null;
    quantity?: number | null;
    duration?: number | null;
    staff?: { id: string; baseCommissionRate?: number | null; user?: { name?: string | null } | null } | null;
    service?: { id: string; name?: string | null; price?: number | null; basePrice?: number | null } | null;
  }[];
  payment?: { id: string; subtotal?: number | null; tax?: number | null; tip?: number | null; discount?: number | null; totalAmount?: number | null; refundedAmount?: number | null; currencyCode?: string | null; status?: string | null; paymentMethod?: string | null } | null;
  transaction?: { id: string; status?: string | null; paymentStatus?: string | null; paymentMethod?: string | null; lineItems?: { id: string; itemType?: string | null; quantity?: number | null; unitPrice?: number | null; discount?: number | null; metadata?: { title?: string } | null }[] } | null;
  clientPackages?: CheckoutPackageBenefit[];
  clientMemberships?: CheckoutMembershipBenefit[];
  benefitsUnavailable?: boolean;
}

export interface CheckoutQueueData {
  appointments: CheckoutAppointment[];
  products: CheckoutRetailProduct[];
  counts: { ready: number; inProgress: number; completedToday: number; openTransactions: number };
  loadError?: boolean;
}

export type CheckoutAppointmentLoadResult =
  | { status: "loaded"; appointment: CheckoutAppointment; products: CheckoutRetailProduct[] }
  | { status: "unavailable"; appointment: null; products: CheckoutRetailProduct[] }
  | { status: "request-failed"; appointment: null; products: [] };

type CheckoutCreatedState = {
  transactionId?: string;
  paymentId?: string | null;
  createdLineItemIds: string[];
  updatedProducts: { id: string; previousQuantity: number }[];
  clientPackageId?: string;
  previousPackageUsedValue?: number | null;
  previousPackageStatus?: string | null;
  createdUsageId?: string;
  createdCommissionIds: string[];
  productSaleId?: string;
  appointmentId?: string;
  previousAppointmentStatus?: string | null;
  clientId?: string;
  previousTotalVisits?: number | null;
  previousLifetimeValue?: number | null;
  previousLastVisit?: string | null;
};

const CHECKOUT_APPOINTMENT_QUERY = `
  id
  startTime
  location { timezone }
  duration
  status
  depositAmount
  depositPaid
  client {
    id
    totalVisits
    lifetimeValue
    lastVisit
    user { id name email }
  }
  provider {
    id
    baseCommissionRate
    user { id name }
  }
  services {
    id
    name
    price
    basePrice
    baseDuration
  }
  lineItems {
    id
    serviceTitle
    serviceImagePath
    price
    quantity
    duration
    staff { id baseCommissionRate user { name } }
    service { id }
  }
  payment { id subtotal tax tip discount totalAmount refundedAmount currencyCode status paymentMethod }
  transaction { id status paymentStatus paymentMethod lineItems(take: 101, orderBy: { id: asc }) { id itemType quantity unitPrice discount metadata } }
`;

const CLIENT_PACKAGE_QUERY = `
  id
  status
  totalValue
  usedValue
  expiresAt
  metadata
  package {
    id
    name
    services { id name }
  }
`;

const CLIENT_MEMBERSHIP_QUERY = `
  id
  status
  membership { id name discountPercent includedServices { id } }
`;

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function calculateCheckoutTotals(appointment: CheckoutAppointment) {
  const rawLineItems = appointment.lineItems.length
    ? appointment.lineItems.map((item) => ({
        id: item.id,
        serviceId: item.service?.id,
        serviceName: item.serviceTitle,
        staffId: item.staff?.id || appointment.provider?.id,
        staffName: item.staff?.user?.name || appointment.provider?.user?.name || 'Unassigned',
        unitPrice: item.price || 0,
        quantity: item.quantity || 1,
        commissionRate: item.staff?.baseCommissionRate ?? appointment.provider?.baseCommissionRate ?? null,
      }))
    : appointment.services.map((service) => ({
        id: service.id,
        serviceId: service.id,
        serviceName: service.name || 'Service',
        staffId: appointment.provider?.id,
        staffName: appointment.provider?.user?.name || 'Unassigned',
        unitPrice: service.price || service.basePrice || 0,
        quantity: 1,
        commissionRate: appointment.provider?.baseCommissionRate ?? null,
      }));

  const subtotal = rawLineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  // Deposits are not allocated into controlled checkout until refund/cancellation reconciliation exists.
  const depositCredit = 0;
  let tax: number | null = null;
  try { tax = Math.round(subtotal * configuredTaxRate()); } catch { /* Missing configuration is not an estimate of zero tax. */ }
  const totalDue = tax === null ? null : Math.max(0, subtotal + tax - depositCredit);
  const ratesAvailable = rawLineItems.every((item) => item.commissionRate !== null && Number.isFinite(item.commissionRate) && item.commissionRate >= 0 && item.commissionRate <= 1);
  const commissionEstimate = ratesAvailable
    ? rawLineItems.reduce((sum, item) => sum + Math.round(item.unitPrice * item.quantity * (item.commissionRate || 0)), 0)
    : null;

  return { lineItems: rawLineItems, subtotal, tax, depositCredit, totalDue, commissionEstimate };
}

export function getPackageRedemptionOptions(appointment: CheckoutAppointment) {
  const lineServiceIds = new Set(appointment.lineItems.map((line) => line.service?.id).filter((id): id is string => Boolean(id)));
  const now = Date.now();
  return (appointment.clientPackages || [])
    .map((clientPackage) => {
      const remainingValue = Math.max(0, (clientPackage.totalValue || 0) - (clientPackage.usedValue || 0));
      const entitlement = clientPackage.metadata?.entitlementSnapshot;
      const entitledIds = entitlement?.snapshotVersion === 1 && Array.isArray(entitlement.serviceIds)
        ? new Set(entitlement.serviceIds.filter((id): id is string => typeof id === 'string'))
        : new Set<string>();
      const coveredServices = appointment.services.filter((service) => lineServiceIds.has(service.id) && entitledIds.has(service.id));
      const notExpired = !clientPackage.expiresAt || new Date(clientPackage.expiresAt).getTime() > now;
      return { ...clientPackage, remainingValue, coveredServices, notExpired };
    })
    .filter((clientPackage) => clientPackage.status === 'active' && clientPackage.remainingValue > 0 && clientPackage.notExpired && clientPackage.coveredServices.length > 0);
}

export function getMembershipDiscountOptions(appointment: CheckoutAppointment) {
  const serviceIds = new Set(appointment.lineItems.map((line) => line.service?.id).filter((id): id is string => Boolean(id)));
  const now = Date.now();
  return (appointment.clientMemberships || [])
    .map((clientMembership) => {
      const agreement = clientMembership.agreements?.[0];
      const benefits = agreement?.benefitSnapshot && typeof agreement.benefitSnapshot === 'object' ? agreement.benefitSnapshot as Record<string, any> : {};
      const publishedIds = new Set((clientMembership.membership?.includedServices || []).map((service) => service.id));
      const ids = Array.isArray(benefits.includedServiceIds) ? new Set(benefits.includedServiceIds.filter((id: unknown): id is string => typeof id === 'string' && publishedIds.has(id))) : new Set<string>();
      const discountPercent = Math.min(Number(benefits.discountPercent), Number(clientMembership.membership?.discountPercent ?? 0));
      const coveredServices = appointment.services.filter((service) => serviceIds.has(service.id) && ids.has(service.id));
      const agreementEffective = Boolean(agreement?.evidenceHash) && (!agreement?.effectiveUntil || new Date(agreement.effectiveUntil).getTime() > now);
      const notPaused = !clientMembership.pausedUntil || new Date(clientMembership.pausedUntil).getTime() <= now;
      const membership = clientMembership.membership ? { ...clientMembership.membership, discountPercent, includedServices: coveredServices } : null;
      return { ...clientMembership, membership, coveredServices, agreementEffective, notPaused, supportedBenefit: Number.isFinite(discountPercent) && discountPercent > 0 && discountPercent <= 100 };
    })
    .filter((clientMembership) => clientMembership.status === 'active' && clientMembership.agreementEffective && clientMembership.notPaused && clientMembership.supportedBenefit && clientMembership.coveredServices.length > 0);
}

function assertKeystoneSuccess<T>(response: { success: boolean; data?: T; error?: string }, label: string): asserts response is { success: true; data: T } {
  if (!response.success || response.data === undefined) {
    throw new Error(`${label}: ${response.error || 'Unknown Keystone error'}`);
  }
}

function normalizePaymentMethod(method?: string) {
  if (method === 'card') return 'credit_card';
  if (method === 'package') return 'credit_card';
  if (method === 'credit_card' || method === 'debit_card' || method === 'cash' || method === 'gift_card' || method === 'apple_pay' || method === 'google_pay') {
    return method;
  }
  return 'credit_card';
}

function toTransactionPaymentMethod(method: string, packageCredit: number) {
  if (packageCredit > 0 && method === 'credit_card') return 'split';
  if (method === 'credit_card' || method === 'debit_card' || method === 'apple_pay' || method === 'google_pay') return 'card';
  if (method === 'cash' || method === 'gift_card') return method;
  return 'card';
}

async function loadSelectedRetailItems(productIds: string[], quantities: number[]) {
  const requestedItems = productIds
    .map((productId, index) => ({ productId, quantity: Math.max(0, quantities[index] || 0) }))
    .filter((item) => item.productId && item.quantity > 0);

  if (requestedItems.length === 0) return [];

  const response = await keystoneClient<{ products: CheckoutRetailProduct[] }>(
    `
      query SelectedRetailProducts($ids: [ID!]!) {
        products(where: { id: { in: $ids }, isActive: { equals: true } }) {
          id
          name
          price
          quantity
          sku
        }
      }
    `,
    { ids: requestedItems.map((item) => item.productId) }
  );

  if (!response.success) {
    console.error('Failed to load selected retail products:', response.error);
    return [];
  }

  return requestedItems
    .map((requested) => {
      const product = response.data.products.find((candidate) => candidate.id === requested.productId);
      if (!product) return null;
      const quantity = Math.min(requested.quantity, product.quantity || 0);
      if (quantity <= 0) return null;
      return {
        productId: product.id,
        productName: product.name || 'Retail product',
        sku: product.sku,
        quantity,
        stockQuantity: product.quantity || 0,
        unitPrice: product.price || 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function attachClientBenefits(appointment: CheckoutAppointment): Promise<CheckoutAppointment> {
  const userId = appointment.client?.user?.id;
  if (!userId) return appointment;

  const response = await keystoneClient<{
    clientPackages: CheckoutPackageBenefit[];
    clientMemberships: CheckoutMembershipBenefit[];
  }>(
    `
      query CheckoutClientBenefits($userId: ID!) {
        clientPackages(where: { client: { id: { equals: $userId } }, status: { equals: "active" } }, take: 20) {
          ${CLIENT_PACKAGE_QUERY}
        }
        clientMemberships(where: { client: { id: { equals: $userId } }, status: { equals: "active" } }, take: 20) {
          ${CLIENT_MEMBERSHIP_QUERY}
          pausedUntil
          agreements(orderBy: { acceptedAt: desc }, take: 1) { effectiveUntil evidenceHash benefitSnapshot }
        }
      }
    `,
    { userId }
  );

  if (!response.success) {
    console.error('Failed to load checkout benefits:', response.error);
    return { ...appointment, benefitsUnavailable: true };
  }

  return {
    ...appointment,
    clientPackages: response.data.clientPackages || [],
    clientMemberships: response.data.clientMemberships || [],
  };
}

export async function getCheckoutQueue(): Promise<CheckoutQueueData> {
  const range = todayRange();
  const response = await keystoneClient<{
    appointments: CheckoutAppointment[];
    products: CheckoutRetailProduct[];
    ready: number;
    inProgress: number;
    completedToday: number;
    openTransactions: number;
  }>(`
    query CheckoutQueue($start: DateTime!, $end: DateTime!) {
      appointments(
        where: {
          status: { in: [confirmed, in_progress] }
          startTime: { gte: $start, lte: $end }
        }
        orderBy: { startTime: asc }
        take: 100
      ) {
        ${CHECKOUT_APPOINTMENT_QUERY}
      }
      ready: appointmentsCount(where: { status: { equals: confirmed }, startTime: { gte: $start, lte: $end } })
      inProgress: appointmentsCount(where: { status: { equals: in_progress }, startTime: { gte: $start, lte: $end } })
      completedToday: appointmentsCount(where: { status: { equals: completed }, startTime: { gte: $start, lte: $end } })
      openTransactions: medSpaTransactionsCount(where: { status: { equals: open } })
      products(where: { isActive: { equals: true }, quantity: { gt: 0 } }, orderBy: { name: asc }, take: 30) {
        id
        name
        sku
        price
        quantity
        category
      }
    }
  `, range);

  if (!response.success) {
    console.error('Failed to load checkout queue:', response.error);
    return { appointments: [], products: [], counts: { ready: 0, inProgress: 0, completedToday: 0, openTransactions: 0 }, loadError: true };
  }

  return {
    appointments: await Promise.all((response.data.appointments || []).map((appointment) => attachClientBenefits(appointment))),
    products: response.data.products || [],
    counts: {
      ready: response.data.ready || 0,
      inProgress: response.data.inProgress || 0,
      completedToday: response.data.completedToday || 0,
      openTransactions: response.data.openTransactions || 0,
    },
  };
}

export async function getCheckoutAppointment(appointmentId: string): Promise<CheckoutAppointmentLoadResult> {
  const response = await keystoneClient<{ appointments: CheckoutAppointment[]; products: CheckoutRetailProduct[] }>(`
    query CheckoutAppointmentWorkflow($appointmentId: ID!) {
      appointments(where: { id: { equals: $appointmentId } }, take: 1) {
        ${CHECKOUT_APPOINTMENT_QUERY}
      }
      products(where: { isActive: { equals: true }, quantity: { gt: 0 } }, orderBy: { name: asc }, take: 30) {
        id name sku price quantity category
      }
    }
  `, { appointmentId });

  if (!response.success) {
    console.error('Failed to load checkout appointment:', response.error);
    return { status: "request-failed", appointment: null, products: [] };
  }

  const appointment = response.data.appointments?.[0];
  if (!appointment) {
    return { status: "unavailable", appointment: null, products: response.data.products || [] };
  }

  return {
    status: "loaded",
    appointment: await attachClientBenefits(appointment),
    products: response.data.products || [],
  };
}

export async function completeAppointmentCheckout(formData: FormData): Promise<void> {
  'use server';

  const appointmentId = formData.get('appointmentId')?.toString();
  if (!appointmentId) return;
  const retailProductIds = formData.getAll('retailProductId').map((value) => value.toString());
  const retailQuantities = formData.getAll('retailQuantity').map((value) => Number(value || 0));
  const retailItems = retailProductIds
    .map((productId, index) => ({ productId, quantity: retailQuantities[index] || 0 }))
    .filter((item) => item.productId && item.quantity > 0);
  const response = await keystoneClient<{
    completeAppointmentCheckout: { success: boolean; transactionId?: string | null; paymentId?: string | null; error?: string | null };
  }>(`
    mutation ControlledCheckout($appointmentId: ID!, $paymentMethod: String!, $tipAmount: Int!, $discountAmount: Int!, $discountReason: String, $retailItems: JSON, $clientPackageId: ID, $clientMembershipId: ID, $idempotencyKey: String!) {
      completeAppointmentCheckout(
        appointmentId: $appointmentId, paymentMethod: $paymentMethod,
        tipAmount: $tipAmount, discountAmount: $discountAmount, discountReason: $discountReason, retailItems: $retailItems,
        clientPackageId: $clientPackageId, clientMembershipId: $clientMembershipId,
        idempotencyKey: $idempotencyKey
      ) { success transactionId paymentId error }
    }
  `, {
    appointmentId,
    paymentMethod: normalizePaymentMethod(formData.get('paymentMethod')?.toString()),
    tipAmount: Number(formData.get('tip') || 0),
    discountAmount: Number(formData.get('discount') || 0),
    discountReason: formData.get('discountReason')?.toString().trim() || null,
    retailItems,
    clientPackageId: formData.get('clientPackageId')?.toString() || null,
    clientMembershipId: formData.get('clientMembershipId')?.toString() || null,
    idempotencyKey: `appointment-checkout:${appointmentId}`,
  });
  if (!response.success || !response.data.completeAppointmentCheckout.success) {
    console.error('Controlled checkout failed:', response.success ? response.data.completeAppointmentCheckout.error : response.error);
    redirect(`/dashboard/platform/checkout/${encodeURIComponent(appointmentId)}?checkout=failed`);
  }
  revalidatePath('/dashboard/platform/checkout');
  revalidatePath(`/dashboard/platform/checkout/${appointmentId}`);
  revalidatePath('/dashboard/platform/appointments');
  revalidatePath(`/dashboard/platform/appointments/${appointmentId}`);
  revalidatePath('/dashboard/appointments');
  revalidatePath('/dashboard/medspa-transactions');
  redirect(`/dashboard/platform/checkout/${encodeURIComponent(appointmentId)}?checkout=completed`);
}
