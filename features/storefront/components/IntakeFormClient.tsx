"use client"

import { useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { submitIntakeForm, type IntakeField } from "../lib/data/intake"
import { Dot } from "./ui/primitives"

/** One intake template, answered by the client for one appointment. */
export function IntakeFormClient({ templateId, appointmentId, fields }: { templateId: string; appointmentId: string; fields: IntakeField[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attempt = useRef<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const responses: Record<string, string | boolean> = {}
    for (const field of fields) responses[field.id] = field.type === "checkbox" ? form.get(field.id) === "on" : String(form.get(field.id) || "").trim()
    setBusy(true); setError(null)
    attempt.current ||= crypto.randomUUID()
    const result = await submitIntakeForm({ templateId, appointmentId, responses, idempotencyKey: attempt.current })
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error || "Intake wasn't submitted.")
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      {fields.map((field) => field.type === "checkbox" ? (
        <label key={field.id} className="flex min-h-11 items-center gap-3 text-[length:var(--sf-text-sm)] font-medium">
          <input type="checkbox" name={field.id} required={field.required} className="size-5 shrink-0 accent-[var(--sf-accent)]" />{field.label}
        </label>
      ) : field.type === "select" && field.options?.length ? (
        <label key={field.id} className="sf-field">{field.label}
          <select name={field.id} required={field.required} className="sf-input" defaultValue=""><option value="" disabled>Choose</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select>
        </label>
      ) : (
        <label key={field.id} className="sf-field">{field.label}{field.required ? null : <span className="font-normal text-[var(--sf-ink-3)]">Optional</span>}
          {field.type === "textarea" ? <textarea name={field.id} required={field.required} maxLength={4000} className="sf-input" /> : <input name={field.id} required={field.required} maxLength={500} type={field.type === "date" ? "date" : "text"} className="sf-input" />}
        </label>
      ))}
      {error ? <p role="alert" className="sf-alert"><Dot tone="stop" />{error}</p> : null}
      <div className="sf-track self-start"><button type="submit" disabled={busy} className="sf-pill sf-pill-primary">{busy ? <><span className="sf-spinner" aria-hidden="true" />Submitting</> : "Submit"}</button></div>
    </form>
  )
}
