"use client"

import { useState } from "react"
import { startVisitDeposit } from "../lib/data/visit"
import { Dot } from "./ui/primitives"

/** Sends the payer to Stripe Checkout for the deposit. The amount is decided on the server. */
export function DepositPay({ appointmentId, token, label }: { appointmentId: string; token: string | null; label: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    if (busy) return
    setBusy(true); setError(null)
    const result = await startVisitDeposit(appointmentId, token)
    if (result.url) { window.location.assign(result.url); return }
    setBusy(false)
    setError(result.error || "We couldn't open the payment page.")
  }

  return (
    <div className="grid gap-3">
      {error ? <p role="alert" className="sf-alert"><Dot tone="stop" />{error}</p> : null}
      <div className="sf-track self-start">
        <button type="button" className="sf-pill sf-pill-primary" onClick={pay} disabled={busy}>
          {busy ? <><span className="sf-spinner" aria-hidden="true" />Opening payment</> : label}
        </button>
      </div>
    </div>
  )
}
