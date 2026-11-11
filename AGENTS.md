# AGENTS.md

NEVER build outbox/texting/email notification machinery or cron/worker services. External events = Openfront Commerce webhooks (features/webhooks) only.

Time-based state is computed on read or advanced on the request that touches it, or by a staff button. No setInterval/setTimeout loops in `instrumentation.ts`, no lifecycle-hook event log (the DomainEvent table was dropped 2026-11-11).
