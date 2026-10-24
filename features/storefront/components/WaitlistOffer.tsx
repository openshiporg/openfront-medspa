"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { requestWaitlist } from "../lib/data/clientActions"
import { Dot } from "./ui/primitives"

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

/** Shown when a date has no openings: signed-in clients join the waitlist for that weekday. */
export function WaitlistOffer({ serviceId, providerId, date, signedIn }: { serviceId: string; providerId: string | null; date: Date; signedIn: boolean }) {
  const [state, setState] = useState<{ busy: boolean; done: boolean; error: string | null }>({ busy: false, done: false, error: null })
  const key = useRef<string | null>(null)
  const weekday = WEEKDAYS[date.getDay()]
  if (!signedIn) return <div className="sf-track self-start"><Link href="/account/sign-in" className="sf-pill sf-pill-sm">Sign in to join the waitlist</Link></div>
  if (state.done) return <p role="status" className="flex items-center gap-2 text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]"><Dot tone="ok" />On the waitlist for {weekday}s</p>
  return (
    <div className="grid gap-2">
      {state.error ? <p role="alert" className="sf-alert"><Dot tone="stop" />{state.error}</p> : null}
      <div className="sf-track self-start">
        <button type="button" className="sf-pill sf-pill-sm" disabled={state.busy} onClick={async () => {
          setState({ busy: true, done: false, error: null })
          key.current ||= crypto.randomUUID()
          const result = await requestWaitlist({ serviceId, providerId, preferredDays: [weekday], preferredTimeRange: "", notes: "", idempotencyKey: key.current })
          setState({ busy: false, done: result.success, error: result.success ? null : result.error || "Waitlist request failed." })
        }}>{state.busy ? "Joining" : `Join the ${weekday} waitlist`}</button>
      </div>
    </div>
  )
}
