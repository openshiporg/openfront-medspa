import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('public catalog queries consistently order by creation then name', () => {
  const services = source('./services.ts')
  assert.equal((services.match(/orderBy: \[\{ createdAt: asc \}, \{ name: asc \}\]/g) || []).length, 5)
  assert.doesNotMatch(services, /orderBy: \{ name: asc \}/)
  assert.ok(services.includes('a.services[0].createdAt.localeCompare(b.services[0].createdAt)'))
  assert.match(source('../../screens/HomePage.tsx'), /getAllServices\(\)/)
  assert.match(source('../../screens/BookingPageServer.tsx'), /getAllServices\(\)/)
  assert.match(source('../../screens/ServicesPage.tsx'), /getServicesGroupedByCategory\(\)/)
})

test('home headline uses the configured city with the practice name fallback', () => {
  assert.ok(source('../../screens/HomePage.tsx').includes('brand.city ? `${brand.city}’s calmest clinic.` : brand.name'))
})
