/**
 * POS (Point of Sale) Page - Server Component
 * Staff-facing interface for creating orders at tables
 */

import React from 'react'
import { PageContainer } from '../../components/PageContainer'
import { POSClient } from './POSClient'

export async function POSPage() {
  const header = (
    <div className="flex flex-col">
      <h1 className="text-lg font-semibold md:text-2xl">Point of Sale</h1>
      <p className="text-muted-foreground">Create and manage orders</p>
    </div>
  )

  const breadcrumbs = [
    { type: 'page' as const, label: 'Dashboard', href: '/dashboard' },
    { type: 'page' as const, label: 'POS' }
  ]

  return (
    <PageContainer title="Point of Sale" header={header} breadcrumbs={breadcrumbs}>
      <POSClient />
    </PageContainer>
  )
}

export default POSPage
