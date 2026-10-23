import { Suspense } from 'react'
import type { Metadata } from 'next'
import { BookingPage } from './BookingPage'
import { getAllServices } from '../lib/data/services'
import { storefrontMetadata } from '../lib/data/brand'
import { ServiceCatalogUnavailable } from '../components/ServiceCatalogUnavailable'

export async function generateBookingPageMetadata(): Promise<Metadata> {
  return storefrontMetadata('Book')
}

export async function BookingPageServer() {
  const catalog = await getAllServices()
  if (catalog.status === 'unavailable') return <div className="sf-container sf-page-pad"><ServiceCatalogUnavailable retryHref="/book" /></div>
  return <Suspense fallback={<p role="status" className="sf-container sf-page-pad flex items-center gap-3"><span className="sf-spinner" aria-hidden="true" />Loading treatments</p>}><BookingPage initialServices={catalog.data} /></Suspense>
}
