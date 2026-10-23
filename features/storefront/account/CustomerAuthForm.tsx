'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { signInCustomer, signUpCustomer } from './auth'

export function CustomerAuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const creating = mode === 'sign-up'
  const [state, action, pending] = useActionState(creating ? signUpCustomer : signInCustomer, { message: null })
  const [show, setShow] = useState(false)
  return <div className="sf-container-narrow sf-page-pad">
    <div className="mx-auto grid max-w-md gap-[var(--sf-space-lg)]">
      <header className="grid gap-4">
        <p className="sf-eyebrow">Account</p>
        <h1 className="sf-display text-[length:var(--sf-text-display-s)]">{creating ? 'Create account' : 'Sign in'}</h1>
      </header>
      <form action={action} className="sf-card grid gap-5 p-[var(--sf-space-md)]">
        {creating ? <label className="sf-field">Name<input className="sf-input" name="name" autoComplete="name" required maxLength={120} /></label> : null}
        <label className="sf-field">Email<input className="sf-input" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label className="sf-field">Password{creating ? <span className="font-normal text-[var(--sf-ink-3)]">12 characters minimum</span> : null}
          <span className="relative block"><input className="sf-input !pr-12" name="password" type={show ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'} required minLength={creating ? 12 : 1} maxLength={200} />
            <button aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-[var(--sf-ink-3)] hover:text-[var(--sf-ink)]">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          </span>
        </label>
        {state.message ? <p role="alert" className="sf-alert"><span className="sf-dot" data-tone="stop" aria-hidden="true" />{state.message}</p> : null}
        <div className="sf-track sf-track-block">
          <button disabled={pending} className="sf-pill sf-pill-primary" type="submit">{pending ? <><span className="sf-spinner" aria-hidden="true" />{creating ? 'Creating account' : 'Signing in'}</> : creating ? 'Create account' : 'Sign in'}</button>
        </div>
      </form>
      <p className="text-center text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">
        {creating ? 'Have an account? ' : 'New here? '}
        <Link href={creating ? '/account/sign-in' : '/account/sign-up'} className="sf-link">{creating ? 'Sign in' : 'Create account'}</Link>
      </p>
    </div>
  </div>
}
