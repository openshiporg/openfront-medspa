import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

/** Offset (ms) of `timeZone` from UTC at `at`. */
function zoneOffsetMs(timeZone: string, at: Date) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(at.getTime() / 1000) * 1000;
  } catch { return 0; }
}

/** The practice's current local day, as UTC instants. The server runs in UTC, so a plain setHours would roll "today" over at 7pm in New York. */
export function getTodayRange(timeZone = 'UTC', now = new Date()) {
  const local = new Date(now.getTime() + zoneOffsetMs(timeZone, now));
  const startGuess = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const endGuess = startGuess + 86_400_000;
  const start = new Date(startGuess - zoneOffsetMs(timeZone, new Date(startGuess)));
  const end = new Date(endGuess - zoneOffsetMs(timeZone, new Date(endGuess)) - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getPracticeTimeZone() {
  const response = await keystoneClient<{ storefrontSettings: Array<{ primaryLocation: { timezone?: string | null } | null }>; locations: Array<{ timezone?: string | null }> }>(`
    query PracticeTimeZone {
      storefrontSettings(take: 1) { primaryLocation { timezone } }
      locations(where: { isActive: { equals: true } }, orderBy: { name: asc }, take: 1) { timezone }
    }
  `, {}, { cache: 'no-store' }).catch(() => null);
  if (!response?.success) return 'UTC';
  return response.data.storefrontSettings?.[0]?.primaryLocation?.timezone || response.data.locations?.[0]?.timezone || 'UTC';
}
