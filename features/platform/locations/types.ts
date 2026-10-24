export const WEEK_DAYS = [
  ['monday', 'Mon'], ['tuesday', 'Tue'], ['wednesday', 'Wed'], ['thursday', 'Thu'], ['friday', 'Fri'], ['saturday', 'Sat'], ['sunday', 'Sun'],
] as const;
export type WeekDay = typeof WEEK_DAYS[number][0];
export type LocationHours = Partial<Record<WeekDay, { open?: string | null; close?: string | null; closed?: boolean | null }>>;

export interface PracticeLocation {
  id: string; name: string; address: string | null; city: string | null; state: string | null; zipCode: string | null;
  phone: string | null; email: string | null; timezone: string | null; hours: LocationHours | null; isActive: boolean;
  providersCount: number; resourcesCount: number; isPrimary: boolean;
}

export type LocationsRead = { status: 'loaded'; locations: PracticeLocation[] } | { status: 'unavailable' };
