import type { Tone } from '@/features/platform/components/medspa-ui';
import { PROVIDER_ROLES, PROVIDER_TIERS, type StaffCredential, type StaffProvider } from '../types';

export const roleLabel = (value?: string | null) => PROVIDER_ROLES.find(([key]) => key === value)?.[1] || 'Provider';
export const tierLabel = (value?: string | null) => PROVIDER_TIERS.find(([key]) => key === value)?.[1] || '';

export function providerState(provider: Pick<StaffProvider, 'status' | 'isActive'>): { tone: Tone; label: string } {
  if (provider.status === 'active' && provider.isActive) return { tone: 'emerald', label: 'Active' };
  if (provider.status === 'on_leave') return { tone: 'amber', label: 'On leave' };
  return { tone: 'zinc', label: 'Inactive' };
}

export function shortDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

const DAY = 86_400_000;

/** The credential that matters most right now: expired or suspended first, then the soonest expiry. */
export function credentialState(credentials: StaffCredential[]): { tone: Tone; label: string } {
  if (!credentials.length) return { tone: 'zinc', label: 'No credential' };
  const now = Date.now();
  const effective = credentials.filter((item) => item.status === 'verified' && item.expiresAt && new Date(item.expiresAt).getTime() > now);
  if (!effective.length) {
    const blocked = credentials.find((item) => item.status === 'suspended' || item.status === 'revoked');
    return { tone: 'rose', label: blocked ? `Credential ${blocked.status}` : 'Credential expired' };
  }
  const next = effective.reduce((soonest, item) => (new Date(item.expiresAt!) < new Date(soonest.expiresAt!) ? item : soonest));
  const days = Math.ceil((new Date(next.expiresAt!).getTime() - now) / DAY);
  return days <= 30 ? { tone: 'amber', label: `Expires in ${days} d` } : { tone: 'emerald', label: `Verified to ${shortDate(next.expiresAt)}` };
}

export function statusTone(value?: string | null): Tone {
  if (value === 'verified' || value === 'active') return 'emerald';
  if (value === 'pending' || value === 'restricted') return 'amber';
  if (value === 'suspended' || value === 'revoked' || value === 'expired') return 'rose';
  return 'zinc';
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
