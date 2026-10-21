'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export interface PlatformCommission {
  id: string;
  saleAmount?: number | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  isPaid?: boolean | null;
  paidAt?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  provider?: {
    id: string;
    user?: { name?: string | null; email?: string | null } | null;
  } | null;
  service?: { id: string; name?: string | null } | null;
  payment?: {
    id: string;
    totalAmount?: number | null;
    paymentMethod?: string | null;
    processedAt?: string | null;
    appointment?: {
      id: string;
      startTime?: string | null;
      client?: { user?: { name?: string | null } | null } | null;
    } | null;
  } | null;
}

export interface ProviderCommissionSummary {
  providerId: string;
  providerName: string;
  unpaidCount: number;
  unpaidAmount: number;
  paidAmount: number;
  grossSales: number;
}

export interface CommissionOperationsData {
  availability: 'loaded' | 'unavailable';
  commissions: PlatformCommission[];
  summaries: ProviderCommissionSummary[];
  counts: { unpaid: number; paid: number; total: number };
  totals: { unpaidAmount: number; paidAmount: number; grossSales: number };
}

const COMMISSION_QUERY = `
  id
  saleAmount
  commissionRate
  commissionAmount
  isPaid
  paidAt
  createdAt
  notes
  provider { id user { name email } }
  service { id name }
  payment {
    id
    totalAmount
    paymentMethod
    processedAt
    appointment { id startTime client { user { name } } }
  }
`;

function buildWhere(status?: string | null) {
  if (status === 'paid') return { isPaid: { equals: true } };
  if (status === 'all') return {};
  return { isPaid: { equals: false } };
}

function summarize(commissions: PlatformCommission[]): ProviderCommissionSummary[] {
  const summaries = new Map<string, ProviderCommissionSummary>();

  for (const commission of commissions) {
    const providerId = commission.provider?.id || 'unassigned';
    const providerName = commission.provider?.user?.name || 'Unassigned';
    const current = summaries.get(providerId) || {
      providerId,
      providerName,
      unpaidCount: 0,
      unpaidAmount: 0,
      paidAmount: 0,
      grossSales: 0,
    };

    current.grossSales += commission.saleAmount || 0;
    if (commission.isPaid) {
      current.paidAmount += commission.commissionAmount || 0;
    } else {
      current.unpaidCount += 1;
      current.unpaidAmount += commission.commissionAmount || 0;
    }

    summaries.set(providerId, current);
  }

  return [...summaries.values()].sort((a, b) => b.unpaidAmount - a.unpaidAmount);
}

export async function getCommissionOperations(status?: string | null): Promise<CommissionOperationsData> {
  const response = await keystoneClient<{
    commissions: PlatformCommission[];
    unpaidCount: number;
    paidCount: number;
    totalCount: number;
  }>(
    `
      query CommissionOperations($where: CommissionWhereInput!) {
        commissions(where: $where, orderBy: { createdAt: desc }, take: 200) {
          ${COMMISSION_QUERY}
        }
        unpaidCount: commissionsCount(where: { isPaid: { equals: false } })
        paidCount: commissionsCount(where: { isPaid: { equals: true } })
        totalCount: commissionsCount
      }
    `,
    { where: buildWhere(status) }
  );

  if (!response.success) {
    console.error('Failed to load commission operations:', response.error);
    return {
      availability: 'unavailable',
      commissions: [],
      summaries: [],
      counts: { unpaid: 0, paid: 0, total: 0 },
      totals: { unpaidAmount: 0, paidAmount: 0, grossSales: 0 },
    };
  }

  const commissions = response.data.commissions || [];
  const totals = commissions.reduce(
    (acc, commission) => {
      acc.grossSales += commission.saleAmount || 0;
      if (commission.isPaid) acc.paidAmount += commission.commissionAmount || 0;
      else acc.unpaidAmount += commission.commissionAmount || 0;
      return acc;
    },
    { unpaidAmount: 0, paidAmount: 0, grossSales: 0 }
  );

  return {
    availability: 'loaded',
    commissions,
    summaries: summarize(commissions),
    counts: {
      unpaid: response.data.unpaidCount || 0,
      paid: response.data.paidCount || 0,
      total: response.data.totalCount || 0,
    },
    totals,
  };
}

async function runCommissionPayout(commissionIds: string[]) {
  const response = await keystoneClient<{
    payoutCommissions: { success: boolean; payoutCount: number; totalAmount: number; error?: string | null };
  }>(
    `
      mutation PayoutCommissions($commissionIds: [ID!]!) {
        payoutCommissions(commissionIds: $commissionIds) {
          success
          payoutCount
          totalAmount
          error
        }
      }
    `,
    { commissionIds },
  );

  if (!response.success || !response.data.payoutCommissions.success) {
    console.error(
      'Failed to pay commissions:',
      response.success ? response.data.payoutCommissions.error : response.error,
    );
    return false;
  }

  revalidatePath('/dashboard/platform/commissions');
  revalidatePath('/dashboard/commissions');
  return true;
}

export async function markCommissionPaid(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString();
  if (!id) {
    console.error('Missing commission id.');
    return;
  }
  await runCommissionPayout([id]);
}

export async function markProviderCommissionsPaid(formData: FormData): Promise<void> {
  const providerId = formData.get('providerId')?.toString();
  if (!providerId || providerId === 'unassigned') {
    console.error('Missing provider id.');
    return;
  }

  const response = await keystoneClient<{ commissions: { id: string }[] }>(
    `
      query UnpaidProviderCommissions($providerId: ID!) {
        commissions(where: { isPaid: { equals: false }, provider: { id: { equals: $providerId } } }, take: 200) { id }
      }
    `,
    { providerId },
  );

  if (!response.success) {
    console.error('Failed to load provider commissions:', response.error);
    return;
  }

  const commissionIds = (response.data.commissions || []).map((commission) => commission.id);
  if (commissionIds.length > 0) await runCommissionPayout(commissionIds);
}
