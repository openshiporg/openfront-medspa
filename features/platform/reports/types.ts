export const REPORT_PERIODS = [7, 30, 90] as const;
export type ReportPeriod = typeof REPORT_PERIODS[number];

export interface ReportData {
  period: ReportPeriod;
  timezone: string;
  revenue: { gross: number; refunded: number; net: number; tips: number; tax: number; payments: number };
  daily: Array<{ day: string; net: number }>;
  appointments: { completed: number; cancelled: number; noShow: number; upcoming: number };
  newClients: number;
  topTreatments: Array<{ name: string; count: number; revenue: number }>;
  providers: Array<{ name: string; visits: number; revenue: number }>;
  liabilities: { giftCards: number | null; unpaidCommissions: number | null };
}

export type ReportRead = { status: 'loaded'; data: ReportData } | { status: 'unavailable' };
