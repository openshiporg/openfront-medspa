'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { ReportData, ReportPeriod, ReportRead } from '../types';

function dayKey(value: string | Date, timeZone: string) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)); }
  catch { return new Date(value).toISOString().slice(0, 10); }
}

export async function getReport(period: ReportPeriod): Promise<ReportRead> {
  const now = new Date();
  const since = new Date(now.getTime() - period * 86_400_000).toISOString();
  const response = await keystoneClient<any>(`
    query PracticeReport($since: DateTime!, $now: DateTime!) {
      locations(where: { isActive: { equals: true } }, take: 1, orderBy: { name: asc }) { timezone }
      payments(where: { status: { in: ["completed", "partially_refunded", "refunded"] }, processedAt: { gte: $since } }, take: 2000) { totalAmount refundedAmount tip tax processedAt }
      completed: appointmentsCount(where: { status: { equals: completed }, startTime: { gte: $since, lte: $now } })
      cancelled: appointmentsCount(where: { status: { equals: cancelled }, startTime: { gte: $since, lte: $now } })
      noShow: appointmentsCount(where: { status: { equals: no_show }, startTime: { gte: $since, lte: $now } })
      upcoming: appointmentsCount(where: { status: { in: [pending, confirmed] }, startTime: { gte: $now } })
      newClients: clientsCount(where: { createdAt: { gte: $since } })
      medSpaTransactionLineItems(where: { transaction: { status: { equals: completed }, completedAt: { gte: $since } } }, take: 5000) {
        itemType quantity unitPrice discount metadata
        service { name } product { name } staff { id title user { name } }
        transaction { id }
      }
    }
  `, { since, now: now.toISOString() }, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return { status: 'unavailable' };
  const data = response.data;
  const timezone = data.locations?.[0]?.timezone || 'UTC';

  const payments = data.payments || [];
  const gross = payments.reduce((sum: number, payment: any) => sum + Number(payment.totalAmount || 0), 0);
  const refunded = payments.reduce((sum: number, payment: any) => sum + Number(payment.refundedAmount || 0), 0);
  const days = new Map<string, number>();
  for (let index = period - 1; index >= 0; index--) days.set(dayKey(new Date(now.getTime() - index * 86_400_000), timezone), 0);
  for (const payment of payments) {
    const key = dayKey(payment.processedAt, timezone);
    if (days.has(key)) days.set(key, (days.get(key) || 0) + Number(payment.totalAmount || 0) - Number(payment.refundedAmount || 0));
  }

  const treatments = new Map<string, { name: string; count: number; revenue: number }>();
  const providers = new Map<string, { name: string; visits: Set<string>; revenue: number }>();
  for (const line of data.medSpaTransactionLineItems || []) {
    const amount = Number(line.unitPrice || 0) * Number(line.quantity || 1) - Number(line.discount || 0);
    if (line.itemType === 'service') {
      const name = line.service?.name || line.metadata?.title || 'Treatment';
      const entry = treatments.get(name) || { name, count: 0, revenue: 0 };
      entry.count += Number(line.quantity || 1); entry.revenue += amount; treatments.set(name, entry);
    }
    if (line.staff?.id) {
      const name = line.staff.user?.name || line.staff.title || 'Provider';
      const entry = providers.get(line.staff.id) || { name, visits: new Set<string>(), revenue: 0 };
      if (line.transaction?.id) entry.visits.add(line.transaction.id);
      entry.revenue += amount; providers.set(line.staff.id, entry);
    }
  }

  // Liabilities need finance access; a denied read shows as unavailable, not zero.
  const liabilities = await keystoneClient<any>(`
    query PracticeLiabilities {
      giftCards(where: { isActive: { equals: true } }, take: 2000) { currentBalance }
      commissions(where: { isPaid: { equals: false } }, take: 2000) { commissionAmount }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);

  const report: ReportData = {
    period, timezone,
    revenue: { gross, refunded, net: gross - refunded, tips: payments.reduce((sum: number, payment: any) => sum + Number(payment.tip || 0), 0), tax: payments.reduce((sum: number, payment: any) => sum + Number(payment.tax || 0), 0), payments: payments.length },
    daily: [...days.entries()].map(([day, net]) => ({ day, net })),
    appointments: { completed: data.completed || 0, cancelled: data.cancelled || 0, noShow: data.noShow || 0, upcoming: data.upcoming || 0 },
    newClients: data.newClients || 0,
    topTreatments: [...treatments.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    providers: [...providers.values()].map((entry) => ({ name: entry.name, visits: entry.visits.size, revenue: entry.revenue })).sort((a, b) => b.revenue - a.revenue),
    liabilities: liabilities?.success
      ? { giftCards: (liabilities.data.giftCards || []).reduce((sum: number, card: any) => sum + Number(card.currentBalance || 0), 0), unpaidCommissions: (liabilities.data.commissions || []).reduce((sum: number, row: any) => sum + Number(row.commissionAmount || 0), 0) }
      : { giftCards: null, unpaidCommissions: null },
  };
  return { status: 'loaded', data: report };
}
