/** Return URLs sent to a payment provider must never follow request Host/forwarded headers. */
export function trustedOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.APP_ORIGIN || env.NEXT_PUBLIC_APP_URL || (env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : '') || (env.NODE_ENV !== 'production' ? env.PORTLESS_URL || '' : '')
  if (configured) {
    const url = new URL(configured)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('APP_ORIGIN must be an HTTP(S) origin without credentials or path.')
    if (env.NODE_ENV === 'production' && url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('APP_ORIGIN must use HTTPS in production.')
    return url.origin
  }
  if (env.NODE_ENV === 'production') throw new Error('Set APP_ORIGIN (or RAILWAY_PUBLIC_DOMAIN) before starting production.')
  const port = env.PORT || '3000'
  if (!/^\d{1,5}$/.test(port)) throw new Error('Invalid local application port.')
  return `http://127.0.0.1:${port}`
}
