import type { Metadata } from 'next'
import { AcceptInvitationPage } from '@/features/platform/staff/screens/AcceptInvitationPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Join the practice', robots: { index: false, follow: false } }

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return <AcceptInvitationPage token={typeof token === 'string' ? token : ''} />
}
