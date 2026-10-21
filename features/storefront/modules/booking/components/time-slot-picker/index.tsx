"use client"

interface TimeSlotPickerProps {
  slots: string[]
  selectedSlot: string | null
  onSelectSlot: (slot: string) => void
}

export default function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
}: TimeSlotPickerProps) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          No selectable time was returned for this date.
        </p>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Returned time options</label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => onSelectSlot(slot)}
            className={`p-2 border rounded-md text-sm transition-colors ${
              selectedSlot === slot
                ? "border-primary bg-primary/5"
                : "hover:border-primary/50"
            }`}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  )
}
