'use server'

import { revalidatePath } from 'next/cache'
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient'

export async function getPracticeTaxRate(): Promise<{ practiceId: string; taxRate: number } | null> {
  const response = await keystoneClient<{ practices: Array<{ id: string; taxRate: number | null }> }>(
    'query PracticeTaxRate { practices(take: 1) { id taxRate } }', {}, { cache: 'no-store' },
  ).catch(() => null)
  const practice = response?.success ? response.data.practices[0] : null
  return practice ? { practiceId: practice.id, taxRate: practice.taxRate ?? 0 } : null
}

export async function savePracticeTaxRate(_state: { status: 'idle' | 'saved' | 'error'; message: string }, formData: FormData): Promise<{ status: 'idle' | 'saved' | 'error'; message: string }> {
  const practiceId = String(formData.get('practiceId') || '')
  const percent = Number(String(formData.get('taxPercent') || '').trim())
  if (!practiceId || !Number.isFinite(percent) || percent < 0 || percent > 100) return { status: 'error', message: 'Enter a rate from 0 to 100%.' }
  const taxRate = Math.round(percent * 1000) / 100000
  const response = await keystoneClient<{ updatePractice: { id: string } | null }>(
    'mutation SavePracticeTaxRate($id: ID!, $taxRate: Float!) { updatePractice(where: { id: $id }, data: { taxRate: $taxRate }) { id } }',
    { id: practiceId, taxRate },
  )
  if (!response.success || !response.data.updatePractice) return { status: 'error', message: 'Tax rate was not saved.' }
  revalidatePath('/dashboard/platform/storefront')
  revalidatePath('/dashboard/platform/checkout')
  return { status: 'saved', message: 'Tax rate saved.' }
}
