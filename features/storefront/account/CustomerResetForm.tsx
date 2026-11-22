'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { requestCustomerPasswordReset, resetCustomerPassword } from './auth'

export function CustomerResetForm({ token }: { token: string | null }) {
  const [state, action, pending] = useActionState(token ? resetCustomerPassword : requestCustomerPasswordReset, { message: null, done: false })
  return <div className="sf-container-narrow sf-page-pad">
    <div className="mx-auto grid max-w-md gap-[var(--sf-space-lg)]">
      <header className="grid gap-4">
        <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{token ? 'Choose a new password' : 'Reset password'}</h1>
      </header>
      {state.done ? <div className="sf-card grid gap-5 p-[var(--sf-space-md)]">
        <p role="status" className="text-[var(--sf-ink-2)]">{token ? 'Your password has been changed.' : 'If that email has an account, a reset link is on its way. The link works for 24 hours.'}</p>
        <div className="sf-track sf-track-block"><Link href="/account/sign-in" className="sf-pill sf-pill-primary">Sign in</Link></div>
      </div> : <form action={action} className="sf-card grid gap-5 p-[var(--sf-space-md)]">
        {token ? <input type="hidden" name="token" value={token} /> : null}
        <label className="sf-field">Email<input className="sf-input" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        {token ? <label className="sf-field">New password<span className="font-normal text-[var(--sf-ink-3)]">12 characters minimum</span>
          <input className="sf-input" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={200} />
        </label> : null}
        {state.message ? <p role="alert" className="sf-alert"><span className="sf-dot" data-tone="stop" aria-hidden="true" />{state.message}</p> : null}
        <div className="sf-track sf-track-block">
          <button disabled={pending} className="sf-pill sf-pill-primary" type="submit">{pending ? <><span className="sf-spinner" aria-hidden="true" />{token ? 'Saving' : 'Sending'}</> : token ? 'Save password' : 'Send reset link'}</button>
        </div>
      </form>}
      <p className="text-center text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">
        <Link href="/account/sign-in" className="sf-link">Back to sign in</Link>
      </p>
    </div>
  </div>
}
