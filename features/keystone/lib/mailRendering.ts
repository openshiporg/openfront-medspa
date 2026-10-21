/** Dynamic receipt values are plain text, never trusted HTML. */
export function escapeMailText(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

/** Only a configured web origin/path may create a transactional receipt link. */
export function receiptBookingLink(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password || url.search || url.hash) return null;
    const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
    url.pathname = `${url.pathname.replace(/\/$/, '')}/book`;
    return escapeMailText(url.toString());
  } catch { return null; }
}
