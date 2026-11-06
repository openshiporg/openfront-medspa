"use client"

import { useState } from "react"
import { startGiftCardPurchase } from "../lib/data/giftCards"
import { Dot } from "./ui/primitives"

const PRESETS = [5_000, 10_000, 15_000, 25_000]
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100)

/** Buy a gift card online: amount, who it is for, then Stripe Checkout. The card is emailed once payment settles. */
export function GiftCardPurchaseForm() {
  const [amount, setAmount] = useState(10_000)
  const [custom, setCustom] = useState("")
  const [forSomeoneElse, setForSomeoneElse] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const customCents = custom ? Math.round(Number(custom) * 100) : null
  const chosen = customCents ?? amount

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    if (!Number.isInteger(chosen) || chosen < 2_500 || chosen > 50_000) { setError("Choose an amount between $25 and $500."); return }
    setBusy(true); setError(null)
    const result = await startGiftCardPurchase({
      amount: chosen,
      purchaserName: String(form.get("purchaserName") || "").trim(),
      purchaserEmail: String(form.get("purchaserEmail") || "").trim(),
      recipientName: forSomeoneElse ? String(form.get("recipientName") || "").trim() : undefined,
      recipientEmail: forSomeoneElse ? String(form.get("recipientEmail") || "").trim() : undefined,
      message: forSomeoneElse ? String(form.get("message") || "").trim() : undefined,
    })
    if (result.url) { window.location.assign(result.url); return }
    setBusy(false); setError(result.error || "We couldn't open the payment page. Please try again.")
  }

  return (
    <form onSubmit={submit} className="sf-card grid gap-6 p-5 md:p-7">
      <fieldset className="grid gap-3">
        <legend className="sf-field mb-1">Amount</legend>
        <div className="sf-track self-start flex-wrap" role="group" aria-label="Gift card amount">
          {PRESETS.map((value) => (
            <button key={value} type="button" className="sf-pill sf-pill-sm sf-num" aria-pressed={!custom && amount === value} onClick={() => { setAmount(value); setCustom("") }}>{money(value)}</button>
          ))}
        </div>
        <label className="sf-field max-w-[14rem]">Other amount ($25–$500)
          <input className="sf-input sf-num" type="number" inputMode="decimal" min={25} max={500} step={1} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Custom" />
        </label>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="sf-field">Your name
          <input className="sf-input" name="purchaserName" required maxLength={120} autoComplete="name" />
        </label>
        <label className="sf-field">Your email
          <input className="sf-input" name="purchaserEmail" type="email" required maxLength={200} autoComplete="email" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]">
        <input type="checkbox" checked={forSomeoneElse} onChange={(event) => setForSomeoneElse(event.target.checked)} />
        Send it to someone else
      </label>

      {forSomeoneElse ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="sf-field">Recipient name
            <input className="sf-input" name="recipientName" required maxLength={120} />
          </label>
          <label className="sf-field">Recipient email
            <input className="sf-input" name="recipientEmail" type="email" required maxLength={200} />
          </label>
          <label className="sf-field md:col-span-2">Message <span className="font-normal text-[var(--sf-ink-3)]">Optional</span>
            <textarea className="sf-input" name="message" maxLength={500} />
          </label>
        </div>
      ) : null}

      {error ? <p role="alert" className="sf-alert"><Dot tone="stop" />{error}</p> : null}
      <div className="sf-track self-start">
        <button type="submit" className="sf-pill sf-pill-primary" disabled={busy}>
          {busy ? <><span className="sf-spinner" aria-hidden="true" />Opening payment</> : <>Buy {Number.isInteger(chosen) && chosen >= 2_500 ? money(chosen) : ""} gift card</>}
        </button>
      </div>
      <p className="text-[length:var(--sf-text-xs)] text-[var(--sf-ink-3)]">You pay securely with Stripe. The code is emailed {forSomeoneElse ? "to the recipient" : "to you"} as soon as the payment goes through, and works for any treatment or product.</p>
    </form>
  )
}
