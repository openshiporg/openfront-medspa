'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'

export type CustomerAuthState = { message: string | null }

export async function signInCustomer(_state: CustomerAuthState, form: FormData): Promise<CustomerAuthState> {
  const email = String(form.get('email') || '').trim().toLowerCase(), password = String(form.get('password') || '')
  const response = await keystoneClient<{ authenticateUserWithPassword: { sessionToken?: string; item?: { status: string } } }>(`mutation CustomerSignIn($email: String!, $password: String!) {
    authenticateUserWithPassword(email: $email, password: $password) {
      ... on UserAuthenticationWithPasswordSuccess { sessionToken item { status } }
    }
  }`, { email, password })
  if (!response.success || !response.data.authenticateUserWithPassword?.sessionToken || response.data.authenticateUserWithPassword.item?.status !== 'active') return { message: 'Email or password is incorrect.' }
  const store = await cookies()
  store.set('keystonejs-session', response.data.authenticateUserWithPassword.sessionToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 })
  revalidatePath('/account')
  redirect('/account')
}

export async function signUpCustomer(_state: CustomerAuthState, form: FormData): Promise<CustomerAuthState> {
  const response = await keystoneClient<{ registerCustomer: { success: boolean; error: string | null } }>(`mutation CustomerSignUp($name: String!, $email: String!, $password: String!) {
    registerCustomer(name: $name, email: $email, password: $password) { success error }
  }`, { name: String(form.get('name') || ''), email: String(form.get('email') || ''), password: String(form.get('password') || '') })
  if (!response.success || !response.data.registerCustomer.success) return { message: response.success ? response.data.registerCustomer.error : 'Account could not be created.' }
  return signInCustomer({ message: null }, form)
}

export async function signOutCustomer(): Promise<void> {
  try { await keystoneClient('mutation CustomerSignOut { endSession }') }
  catch { /* Cookie removal must remain available during a backend outage. */ }
  finally {
    ;(await cookies()).delete('keystonejs-session')
    revalidatePath('/', 'layout')
  }
  redirect('/account')
}
