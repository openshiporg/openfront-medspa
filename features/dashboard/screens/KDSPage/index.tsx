/**
 * KDS (Kitchen Display System) Page - Server Component
 * Displays incoming orders by kitchen station
 */

import React from 'react'
import { PageContainer } from '../../components/PageContainer'
import { KDSClient } from './KDSClient'

export async function KDSPage() {
  const header = (
    <div className="flex flex-col">
      <h1 className="text-lg font-semibold md:text-2xl">Kitchen Display System</h1>
      <p className="text-muted-foreground">View and manage incoming orders by station</p>
    </div>
  )

  const breadcrumbs = [
    { type: 'page' as const, label: 'Dashboard', href: '/dashboard' },
    { type: 'page' as const, label: 'KDS' }
  ]

  return (
    <PageContainer title="Kitchen Display System" header={header} breadcrumbs={breadcrumbs}>
      <KDSClient />
    </PageContainer>
  )
}

export default KDSPage
