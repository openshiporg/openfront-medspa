/**
 * Client-side helper functions for provider data
 * These are NOT server actions - they're pure utility functions
 */

export type ProviderSchedule = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

/**
 * Calculate years of experience from hire date
 */
export function calculateYearsExperience(hireDate: string | null): number {
  if (!hireDate) return 0
  const hire = new Date(hireDate)
  const now = new Date()
  const years = Math.floor((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365))
  return Math.max(0, years)
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: string): string {
  const tierNames: Record<string, string> = {
    junior: "Junior Provider",
    senior: "Senior Provider",
    master: "Master Provider",
    celebrity: "Celebrity Provider",
  }
  return tierNames[tier] || tier
}

/**
 * Get available days for a provider
 */
export function getAvailableDays(schedules: ProviderSchedule[]): string[] {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return schedules
    .filter((s) => s.isAvailable)
    .map((s) => dayNames[s.dayOfWeek])
    .filter(Boolean)
}
