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
    <h1 className="sf-display mb-6 text-[var(--sf-text-2xl)]">{creating ? 'Create account' : 'Sign in'}</h1>
    <form action={action} className="sf-card grid gap-5 p-5">
      {creating ? <label className="grid gap-2 text-sm font-medium">Name<input className="sf-input min-h-11 w-full rounded-lg border px-3" name="name" autoComplete="name" required maxLength={120} /></label> : null}
      <label className="grid gap-2 text-sm font-medium">Email<input className="sf-input min-h-11 w-full rounded-lg border px-3" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label className="grid gap-2 text-sm font-medium">Password
        <span className="relative block"><input className="sf-input min-h-11 w-full rounded-lg border pl-3 pr-12" name="password" type={show ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'} required minLength={creating ? 12 : 1} maxLength={200} />
          <button aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} type="button" onClick={() => setShow(!show)} className="absolute right-0 top-0 grid size-11 place-items-center">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
        </span>
      </label>
      {state.message ? <p role="alert" className="text-sm text-red-700">{state.message}</p> : null}
      <button disabled={pending} className="sf-btn sf-btn-primary min-h-11" type="submit">{pending ? 'Saving…' : creating ? 'Create account' : 'Sign in'}</button>
      <Link href={creating ? '/account/sign-in' : '/account/sign-up'} className="sf-link flex min-h-11 items-center justify-center">{creating ? 'Sign in' : 'Create account'}</Link>
    </form>
  </div>
}
