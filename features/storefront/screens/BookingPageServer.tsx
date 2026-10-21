import { Suspense } from 'react'
import { BookingPage } from './BookingPage'
import { getAllServices } from '../lib/data/services'
import { ServiceCatalogUnavailable } from '../components/ServiceCatalogUnavailable'

export async function BookingPageServer() {
  const catalog = await getAllServices()
  if (catalog.status === 'unavailable') return <div className="sf-page-pad"><div className="sf-container"><ServiceCatalogUnavailable retryHref="/book" /></div></div>
  return <Suspense fallback={<p role="status" className="sf-container sf-page-pad">Loading services…</p>}><BookingPage initialServices={catalog.data} /></Suspense>
}
