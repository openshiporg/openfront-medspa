"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { getAvailableTimeSlots, getNextAvailableDate, type BookingSlot } from "../lib/data/availability"

interface ProviderOption { id: string; name: string; title: string | null; workingDays?: number[] }
interface Props { serviceId: string; serviceName: string; duration: number; total: string; providers: ProviderOption[] }

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d) }

/** Read-only availability preview. Booking itself stays on /book. */
export function ServiceTimePicker({ serviceId, serviceName, duration, total, providers }: Props) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "")
  const [date, setDate] = useState<Date | undefined>()
  const [month, setMonth] = useState<Date>(new Date())
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [time, setTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [next, setNext] = useState<string | null | undefined>(undefined)
  const provider = providers.find((p) => p.id === providerId)

  useEffect(() => {
    let off = false
    setDate(undefined); setSlots([]); setTime(null); setNext(undefined)
    if (!providerId) return
    getNextAvailableDate(providerId, duration, serviceId).then((n) => {
      if (off) return
      setNext(n)
      if (n) { setDate(parse(n)); setMonth(parse(n)) }
    }).catch(() => { if (!off) setNext(null) })
    return () => { off = true }
  }, [providerId, duration, serviceId])

  useEffect(() => {
    let off = false
    if (!date || !providerId) return
    setLoading(true); setTime(null)
    getAvailableTimeSlots(providerId, key(date), duration, serviceId)
      .then((s) => { if (!off) setSlots(s) })
      .finally(() => { if (!off) setLoading(false) })
    return () => { off = true }
  }, [date, providerId, duration, serviceId])

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = provider?.workingDays
  const href = `/book?service=${encodeURIComponent(serviceId)}` + (providerId && date && time
    ? `&provider=${encodeURIComponent(providerId)}&date=${key(date)}&time=${encodeURIComponent(time)}` : providerId ? `&provider=${encodeURIComponent(providerId)}` : "")
  const dateLabel = date?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

  return (
    <>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        month={month}
        onMonthChange={setMonth}
        disabled={(d) => d < today || Boolean(days?.length && !days.includes(d.getDay()))}
        className="altair-calendar"
      />
      <h3 className="altair-times-heading">{date ? `Available times \u2014 ${dateLabel}` : "Available times"}</h3>
      {loading || next === undefined ? <p role="status" className="altair-times-note">Loading times</p>
        : date && slots.length ? (
          <div className="altair-times" role="group" aria-label="Available times">
            {slots.map((slot) => (
              <button key={slot.startTime} type="button" aria-pressed={time === slot.startTime} onClick={() => setTime(slot.startTime)}>{slot.label}</button>
            ))}
          </div>
        ) : <p role="status" className="altair-times-note">{next ? `No openings on this date. Next available ${parse(next).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.` : "No openings in the next 30 days."}</p>}
      <dl>
        <div><dt>Treatment</dt><dd>{serviceName}</dd></div>
        {providers.length > 1 ? (
          <div><dt>With</dt><dd className="altair-with" role="group" aria-label="Provider">
            {providers.map((p) => <button key={p.id} type="button" aria-pressed={p.id === providerId} onClick={() => setProviderId(p.id)}>{p.name}</button>)}
          </dd></div>
        ) : provider ? <div><dt>With</dt><dd>{provider.name}{provider.title ? `, ${provider.title}` : ""}</dd></div> : null}
        <div className="altair-book-total"><dt>Total</dt><dd>{total}</dd></div>
      </dl>
      <Link href={href} className="altair-book-button">Request this time <ArrowRight aria-hidden="true" /></Link>
    </>
  )
}
