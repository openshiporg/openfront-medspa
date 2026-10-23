"use client"

import { useMemo, useState } from "react"
import { addDays, isSameDay, startOfDay } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { BookingSlot } from "../lib/data/availability"
import { Dot } from "./ui/primitives"

interface TimeSlotPickerProps {
  selectedDate: Date | undefined
  onDateSelect: (date: Date | undefined) => void
  selectedTime: string | null
  onTimeSelect: (startTime: string) => void
  availableSlots: BookingSlot[]
  loadingSlots?: boolean
}

const WINDOW = 14
const HORIZON_DAYS = 90

function slotHour(label: string): number | null {
  const match = label.match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i)
  if (!match) return null
  let hour = Number(match[1]) % 12
  if (!match[3]) hour = Number(match[1])
  else if (match[3].toUpperCase() === "PM") hour += 12
  return hour
}

function groupSlots(slots: BookingSlot[]) {
  const groups: Array<{ label: string; slots: BookingSlot[] }> = [
    { label: "Morning", slots: [] },
    { label: "Afternoon", slots: [] },
    { label: "Evening", slots: [] },
  ]
  for (const slot of slots) {
    const hour = slotHour(slot.label)
    const index = hour === null || hour < 12 ? 0 : hour < 17 ? 1 : 2
    groups[index].slots.push(slot)
  }
  return groups.filter((group) => group.slots.length)
}

export function TimeSlotPicker({ selectedDate, onDateSelect, selectedTime, onTimeSelect, availableSlots, loadingSlots = false }: TimeSlotPickerProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [page, setPage] = useState(0)
  const lastPage = Math.floor(HORIZON_DAYS / WINDOW)
  const days = Array.from({ length: WINDOW }, (_, index) => addDays(today, page * WINDOW + index)).filter((day) => day <= addDays(today, HORIZON_DAYS))
  const monthLabel = days.length ? days[0].toLocaleDateString("en-US", { month: "long", year: "numeric" }) : ""
  const groups = groupSlots(availableSlots)

  return (
    <div className="grid gap-[var(--sf-space-md)]">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="sf-eyebrow" aria-live="polite">{monthLabel}</p>
          <div className="sf-track" role="group" aria-label="Change dates">
            <button type="button" className="sf-pill sf-pill-sm sf-pill-icon" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Earlier dates"><ChevronLeft /></button>
            <button type="button" className="sf-pill sf-pill-sm sf-pill-icon" disabled={page >= lastPage} onClick={() => setPage(page + 1)} aria-label="Later dates"><ChevronRight /></button>
          </div>
        </div>
        <div className="sf-date-strip" role="group" aria-label="Date">
          {days.map((day) => {
            const selected = selectedDate ? isSameDay(selectedDate, day) : false
            return (
              <button
                key={day.toISOString()}
                type="button"
                className="sf-date"
                aria-pressed={selected}
                aria-label={day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                onClick={() => onDateSelect(day)}
              >
                <span className="sf-eyebrow sf-muted">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                <span className="sf-date-day">{day.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="sf-well min-h-40 p-[var(--sf-space-md)]">
        {!selectedDate ? (
          <p className="text-[length:var(--sf-text-sm)] text-[var(--sf-ink-3)]">Choose a date</p>
        ) : loadingSlots ? (
          <p role="status" className="flex items-center gap-3 text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]"><span className="sf-spinner" aria-hidden="true" />Loading times</p>
        ) : groups.length === 0 ? (
          <div className="grid justify-items-start gap-3">
            <p role="status" className="flex items-center gap-2 text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]"><Dot tone="off" />No openings on this date</p>
            <div className="sf-track"><a className="sf-pill sf-pill-sm" href="/contact">Contact the practice</a></div>
          </div>
        ) : (
          <div className="grid gap-5">
            {groups.map((group) => (
              <div key={group.label} className="grid gap-2.5">
                <p className="sf-eyebrow">{group.label}</p>
                <div className="sf-slot-grid" role="group" aria-label={`${group.label} times`}>
                  {group.slots.map((slot) => (
                    <button key={slot.startTime} type="button" className="sf-slot" aria-pressed={selectedTime === slot.startTime} onClick={() => onTimeSelect(slot.startTime)}>
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
