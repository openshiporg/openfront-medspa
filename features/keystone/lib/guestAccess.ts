import { createHmac, timingSafeEqual } from 'node:crypto'

/*
 * Bearer link for a storefront guest request. It is derived from the session
 * secret and the appointment id, so replays of the same booking return the same
 * link and nothing extra is stored. Without a secret no link is issued.
 */
export function guestAccessToken(appointmentId: string): string | null {
  const secret = process.env.SESSION_SECRET
  if (!secret || !appointmentId) return null
  return createHmac('sha256', secret).update(`medspa-guest-appointment:${appointmentId}`).digest('base64url')
}

export function validGuestAccessToken(appointmentId: string, token: string | null | undefined): boolean {
  const expected = guestAccessToken(appointmentId)
  if (!expected || typeof token !== 'string' || token.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}
