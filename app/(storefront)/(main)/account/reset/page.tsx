import type { Metadata } from 'next'
import { CustomerResetForm } from '@/features/storefront/account/CustomerResetForm'
import { storefrontMetadata } from '@/features/storefront/lib/data/brand'

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata('Reset password')
}

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams
  return <CustomerResetForm token={typeof token === 'string' && token ? token : null} />
}
