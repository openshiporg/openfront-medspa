import type { Metadata } from 'next'
import { CustomerAuthForm } from '@/features/storefront/account/CustomerAuthForm'
import { storefrontMetadata } from '@/features/storefront/lib/data/brand'

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata('Sign in')
}

export default function Page() { return <CustomerAuthForm mode="sign-in" /> }
