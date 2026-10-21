import React from 'react'
import { PageContainer } from '../../components/PageContainer'
import { WaitlistClient } from './WaitlistClient'

export async function WaitlistPage() {
  const header = (
    <div className="flex flex-col">
      <h1 className="text-lg font-semibold md:text-2xl">Waitlist</h1>
      <p className="text-muted-foreground">Manage walk-ins and appointment requests</p>
    </div>
  )

  const breadcrumbs = [
    { type: 'page' as const, label: 'Dashboard', href: '/dashboard' },
    { type: 'page' as const, label: 'Waitlist' }
  ]

  return (
    <PageContainer title="Waitlist" header={header} breadcrumbs={breadcrumbs}>
      <WaitlistClient />
    </PageContainer>
  )
}

export default WaitlistPage
