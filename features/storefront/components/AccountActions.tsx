"use client"

import { useRef, useState } from "react"
import { Star } from "lucide-react"
import { replyToAftercare, submitVisitReview } from "../lib/data/clientActions"
import { Dot } from "./ui/primitives"

function useAttempt() {
  const key = useRef<string | null>(null)
  return () => (key.current ||= crypto.randomUUID())
}

/** Star rating and comment for a completed visit. */
export function VisitReviewForm({ appointmentId }: { appointmentId: string }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [state, setState] = useState<{ busy: boolean; error: string | null; done: boolean }>({ busy: false, error: null, done: false })
  const attempt = useAttempt()
  if (state.done) return <p role="status" className="flex items-center gap-2 text-[length:var(--sf-text-sm)] text-[var(--sf-ink-2)]"><Dot tone="ok" />Thanks for your review</p>
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setRating(value)} className="grid size-10 place-items-center rounded-full text-[var(--sf-accent)]">
            <Star className="size-5" fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      {rating ? <textarea className="sf-input" maxLength={2000} placeholder="Comment (optional)" value={comment} onChange={(event) => setComment(event.target.value)} /> : null}
      {state.error ? <p role="alert" className="sf-alert"><Dot tone="stop" />{state.error}</p> : null}
      {rating ? <div className="sf-track self-start"><button type="button" disabled={state.busy} className="sf-pill sf-pill-primary" onClick={async () => {
        setState({ busy: true, error: null, done: false })
        const result = await submitVisitReview({ appointmentId, rating, comment: comment.trim(), idempotencyKey: attempt() })
        setState({ busy: false, error: result.success ? null : result.error || "Review wasn't sent.", done: result.success })
      }}>{state.busy ? "Sending" : "Send review"}</button></div> : null}
    </div>
  )
}

/** Reply to an aftercare check-in, optionally flagging it for the practice. */
export function AftercareReplyForm({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [flag, setFlag] = useState(false)
  const [state, setState] = useState<{ busy: boolean; error: string | null; done: boolean }>({ busy: false, error: null, done: false })
  const attempt = useAttempt()
  if (state.done) return <p role="status" className="flex items-center gap-2 text-[length:var(--sf-text-xs)] text-[var(--sf-ink-2)]"><Dot tone="ok" />Reply sent</p>
  if (!open) return <div className="sf-track self-start"><button type="button" className="sf-pill sf-pill-sm" onClick={() => setOpen(true)}>Reply</button></div>
  return (
    <div className="grid gap-3">
      <textarea className="sf-input" maxLength={2000} required value={message} onChange={(event) => setMessage(event.target.value)} aria-label="Your reply" />
      <label className="flex min-h-11 items-center gap-3 text-[length:var(--sf-text-sm)]"><input type="checkbox" checked={flag} onChange={(event) => setFlag(event.target.checked)} className="size-5 accent-[var(--sf-accent)]" />I'd like the practice to contact me</label>
      {state.error ? <p role="alert" className="sf-alert"><Dot tone="stop" />{state.error}</p> : null}
      <div className="sf-track self-start"><button type="button" disabled={state.busy || !message.trim()} className="sf-pill sf-pill-primary sf-pill-sm" onClick={async () => {
        setState({ busy: true, error: null, done: false })
        const result = await replyToAftercare({ taskId, message: message.trim(), needsAttention: flag, idempotencyKey: attempt() })
        setState({ busy: false, error: result.success ? null : result.error || "Reply wasn't sent.", done: result.success })
      }}>{state.busy ? "Sending" : "Send"}</button></div>
    </div>
  )
}
