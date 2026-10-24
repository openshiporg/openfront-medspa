"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cancelGuestVisit } from "../lib/data/visit"
import { Dot } from "./ui/primitives"

/** Cancel a guest request from its confirmation link. */
export function GuestCancelForm({ appointmentId, token }: { appointmentId: string; token: string }) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cancel() {
    if (busy || !window.confirm("Cancel this appointment?")) return
    setBusy(true); setError(null)
    const result = await cancelGuestVisit(appointmentId, token, reason.trim())
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error || "Cancellation failed.")
  }

  return (
    <div className="grid gap-3">
      <label className="sf-field">Reason <span className="font-normal text-[var(--sf-ink-3)]">Optional</span>
        <input className="sf-input" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} />
      </label>
      {error ? <p role="alert" className="sf-alert"><Dot tone="stop" />{error}</p> : null}
      <div className="sf-track self-start">
        <button type="button" className="sf-pill" onClick={cancel} disabled={busy}>{busy ? <><span className="sf-spinner" aria-hidden="true" />Cancelling</> : "Cancel appointment"}</button>
      </div>
    </div>
  )
}
