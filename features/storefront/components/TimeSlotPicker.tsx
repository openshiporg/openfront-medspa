"use client"

import { Calendar } from "@/components/ui/calendar"
import { addDays, isBefore, startOfDay } from "date-fns"
import { Clock } from "lucide-react"
import type { BookingSlot } from "../lib/data/availability"

interface TimeSlotPickerProps {
  selectedDate: Date | undefined
  onDateSelect: (date: Date | undefined) => void
  selectedTime: string | null
  onTimeSelect: (startTime: string) => void
  availableSlots: BookingSlot[]
  loadingSlots?: boolean
}

export function TimeSlotPicker({
  selectedDate,
  onDateSelect,
  selectedTime,
  onTimeSelect,
  availableSlots,
  loadingSlots = false,
}: TimeSlotPickerProps) {
  const today = startOfDay(new Date())
  const maxDate = addDays(today, 90)

  const disabledDates = (date: Date) => isBefore(date, today) || date > maxDate

  return (
    <div className="grid gap-[var(--sf-space-md)] lg:grid-cols-2">
      <div className="min-w-0 p-0 sm:sf-card sm:p-[var(--sf-space-md)]">
        <h3 className="sf-display text-[var(--sf-text-lg)] mb-4">Select a date</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          disabled={disabledDates}
          className="rounded-none p-0"
        />
      </div>

      <div className="sf-card p-[var(--sf-space-md)]">
        <h3 className="sf-display text-[var(--sf-text-lg)] mb-4">Select a time</h3>
        {!selectedDate ? (
          <div className="flex items-center justify-center h-56 text-[var(--sf-text-sm)] text-[var(--sf-ink-3)]">
            Choose a date first
          </div>
        ) : loadingSlots ? (
          <div role="status" className="flex items-center justify-center gap-3 h-56">
            <div aria-hidden="true" className="h-8 w-8 animate-spin border-b-2 border-[var(--sf-ink)]" /><span>Loading available times…</span>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-[var(--sf-text-sm)] text-[var(--sf-ink-3)] text-center">
            <Clock className="h-10 w-10 mb-3 opacity-40" />
            <p>No times available. Try another date.</p><a className="sf-btn sf-btn-secondary mt-3" href="/contact">Contact the practice</a>
          </div>
        ) : (
          <div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {availableSlots.map((slot) => (
              <button
                key={slot.startTime}
                type="button"
                aria-pressed={selectedTime === slot.startTime}
                onClick={() => onTimeSelect(slot.startTime)}
                className={`min-h-[2.75rem] px-2 text-[var(--sf-text-sm)] font-medium border transition-colors ${
                  selectedTime === slot.startTime
                    ? "border-[var(--sf-ink)] bg-[var(--sf-ink)] text-[var(--sf-accent-ink)]"
                    : "border-[var(--sf-rule)] hover:border-[var(--sf-ink)]"
                }`}
              >
                {slot.label}
              </button>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
