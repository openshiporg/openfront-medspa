'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'
import { passwordResetEmailAvailable } from '@/features/dashboard/lib/authFlow'

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

export type CustomerResetState = { message: string | null; done: boolean }

export async function requestCustomerPasswordReset(_state: CustomerResetState, form: FormData): Promise<CustomerResetState> {
  const email = String(form.get('email') || '').trim().toLowerCase()
  if (!email) return { message: 'Enter your email.', done: false }
  if (!passwordResetEmailAvailable()) return { message: 'Reset emails cannot be sent right now. Call the practice and we will help you sign in.', done: false }
  const response = await keystoneClient<{ sendUserPasswordResetLink: boolean }>('mutation CustomerResetLink($email: String!) { sendUserPasswordResetLink(email: $email) }', { email })
  if (!response.success) return { message: 'The reset email could not be sent. Try again.', done: false }
  // The same answer whether or not the address has an account.
  return { message: null, done: true }
}

export async function resetCustomerPassword(_state: CustomerResetState, form: FormData): Promise<CustomerResetState> {
  const email = String(form.get('email') || '').trim().toLowerCase(), password = String(form.get('password') || ''), token = String(form.get('token') || '')
  if (password.length < 12) return { message: 'Use at least 12 characters.', done: false }
  const response = await keystoneClient<{ redeemUserPasswordResetToken: { code: string } | null }>(`mutation CustomerResetPassword($email: String!, $token: String!, $password: String!) {
    redeemUserPasswordResetToken(email: $email, token: $token, password: $password) { code }
  }`, { email, token, password })
  if (!response.success) return { message: 'Your password could not be changed. Try again.', done: false }
  if (response.data.redeemUserPasswordResetToken?.code) return { message: 'This link has expired or the email does not match. Request a new link.', done: false }
  return { message: null, done: true }
}
