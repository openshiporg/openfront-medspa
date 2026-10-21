'use client'

import { Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface OnboardingStep { href: string; title: string; description: string }

// Family placement remains SidebarFooter → DashboardLayout dialog. Launch
// controls must be painted, keyboard reachable and >=44px, not hover-clipped.
export function OnboardingCards({ steps, onboardingStatus, onDismiss, onOpenDialog, userRole }: {
  steps: OnboardingStep[]
  onboardingStatus?: string
  onDismiss: () => void
  onOpenDialog?: () => void
  userRole?: { canManageOnboarding?: boolean; canAccessDashboard?: boolean } | null
}) {
  if (!userRole?.canManageOnboarding || ['completed', 'dismissed'].includes(onboardingStatus || '') || !steps.length) return null
  return <div className="w-full">
    <section className="rounded-lg border bg-background p-2 group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden">
      <h2 className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full bg-primary" aria-hidden="true" />Practice setup</h2>
      <div className="mt-2 grid gap-2">
        <Button aria-label="Open onboarding" onClick={onOpenDialog} className="min-h-11 text-xs">Get started</Button>
        <Button variant="ghost" onClick={onDismiss} className="min-h-11 text-xs">Skip for now</Button>
      </div>
    </section>
    <Button variant="outline" aria-label="Open onboarding" onClick={onOpenDialog} className="hidden size-11 group-has-[[data-collapsible=icon]]/sidebar-wrapper:inline-flex"><Rocket className="size-4" /></Button>
  </div>
}
