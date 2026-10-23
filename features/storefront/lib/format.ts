/** Storefront service prices arrive in whole currency units. */
export function formatPrice(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—"
  if (value === 0) return "No charge"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "—"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

export const appointmentStatus: Record<string, { label: string; tone: "ok" | "wait" | "stop" | "off" | "accent" }> = {
  pending: { label: "Requested", tone: "wait" },
  confirmed: { label: "Confirmed", tone: "ok" },
  in_progress: { label: "Checked in", tone: "accent" },
  completed: { label: "Completed", tone: "off" },
  cancelled: { label: "Cancelled", tone: "stop" },
  no_show: { label: "Missed", tone: "stop" },
}
