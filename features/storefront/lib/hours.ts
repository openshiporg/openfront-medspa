import type { LocationHours } from "./data/brand"

export const WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const

export function formatClock(value?: string | null, style: "long" | "short" = "long"): string | null {
  if (!value) return null
  const [hourValue, minuteValue] = value.split(":").map(Number)
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return value
  const hour = hourValue % 12 || 12
  const period = hourValue >= 12 ? "pm" : "am"
  if (style === "short") return minuteValue ? `${hour}:${String(minuteValue).padStart(2, "0")}${period}` : `${hour}${period}`
  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period.toUpperCase()}`
}

export interface PublishedDay {
  key: (typeof WEEK)[number]
  day: string
  short: string
  hours: string
  closed: boolean
}

export function publishedHours(hours: LocationHours | null, style: "long" | "short" = "long"): PublishedDay[] {
  if (!hours) return []
  return WEEK.flatMap((key): PublishedDay[] => {
    const value = hours[key]
    if (!value) return []
    const day = key.replace(/^./, (letter) => letter.toUpperCase())
    const short = day.slice(0, 3)
    if (value.closed) return [{ key, day, short, hours: "Closed", closed: true }]
    const open = formatClock(value.open, style)
    const close = formatClock(value.close, style)
    return open && close ? [{ key, day, short, hours: `${open} – ${close}`, closed: false }] : []
  })
}

function zonedParts(now: Date, timezone?: string | null) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || undefined,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now)
    const get = (type: string) => parts.find((part) => part.type === type)?.value || ""
    return { weekday: get("weekday").toLowerCase(), minutes: Number(get("hour")) * 60 + Number(get("minute")) }
  } catch {
    return null
  }
}

function toMinutes(value?: string | null) {
  if (!value) return null
  const [hours, minutes] = value.split(":").map(Number)
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null
}

export interface OpenStatus {
  open: boolean
  label: string
  todayKey: string | null
}

/** Open/closed right now in the practice's own timezone, from published hours. */
export function openStatus(hours: LocationHours | null, timezone?: string | null, now = new Date()): OpenStatus | null {
  if (!hours) return null
  const current = zonedParts(now, timezone)
  if (!current) return null
  const todayIndex = WEEK.indexOf(current.weekday as (typeof WEEK)[number])
  if (todayIndex < 0) return null
  const today = hours[WEEK[todayIndex]]
  const openAt = toMinutes(today?.open)
  const closeAt = toMinutes(today?.close)

  if (today && !today.closed && openAt !== null && closeAt !== null) {
    if (current.minutes >= openAt && current.minutes < closeAt) {
      return { open: true, label: `Open · until ${formatClock(today.close, "short")}`, todayKey: WEEK[todayIndex] }
    }
    if (current.minutes < openAt) {
      return { open: false, label: `Closed · opens ${formatClock(today.open, "short")}`, todayKey: WEEK[todayIndex] }
    }
  }

  for (let offset = 1; offset <= 7; offset++) {
    const key = WEEK[(todayIndex + offset) % 7]
    const day = hours[key]
    if (day && !day.closed && day.open) {
      const name = offset === 1 ? "tomorrow" : key.slice(0, 3).replace(/^./, (letter) => letter.toUpperCase())
      return { open: false, label: `Closed · opens ${name} ${formatClock(day.open, "short")}`, todayKey: WEEK[todayIndex] }
    }
  }
  return { open: false, label: "Closed", todayKey: WEEK[todayIndex] }
}
