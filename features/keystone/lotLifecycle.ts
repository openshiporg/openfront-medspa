/**
 * Inventory lot statuses that were checked ad hoc in each writer. One place so the incident,
 * recall and disposition commands agree: a stronger status is never overwritten by a weaker one.
 */
export type LotStatus = "available" | "quarantined" | "recalled" | "expired" | "depleted" | "returned" | "destroyed";

/** Lots that left custody. Nothing changes their status any more. */
export const LOT_GONE_STATUSES: readonly string[] = ["destroyed", "returned"];

/** An incident hold only applies to stock that can still be sold or used. */
export function canQuarantineLot(status: string | null | undefined) {
  return status === "available" || status === "depleted";
}

/** A recall wins over every status except lots already gone from custody. */
export function recallChangesLotStatus(status: string | null | undefined) {
  return !LOT_GONE_STATUSES.includes(String(status));
}

/** A deposit paid after the visit is no longer open is refunded, never used to revive the visit. */
export function depositWebhookAppointmentEffect(appointmentStatus: string | null | undefined): "confirm" | "mark_paid" | "refund" {
  if (appointmentStatus === "pending") return "confirm";
  if (appointmentStatus === "confirmed") return "mark_paid";
  return "refund";
}

/** Recall case order. A case only moves forward; closed is final (a new finding opens a new case). */
export const RECALL_STATUS_ORDER: readonly string[] = ["open", "applicability_review", "quarantined", "patients_identified", "notifications_in_progress", "disposition_complete", "closed"];

/**
 * Status a recall case takes for a step, or an error when the step would reopen or rewind it.
 * Per-client notify/assessment steps can still be recorded after disposition; they just don't rewind the case.
 */
export function recallStepOutcome(current: string, action: string, target: string): { status: string } | { error: string } {
  if (current === "closed") return { error: "This recall is closed and can't be reopened; open a new recall case" };
  const from = RECALL_STATUS_ORDER.indexOf(current); const to = RECALL_STATUS_ORDER.indexOf(target);
  if (from < 0 || to < 0) return { error: "Recall step is invalid" };
  if (to >= from) return { status: target };
  if (action === "notify" || action === "clinical_assessment") return { status: current };
  return { error: `A recall at ${current.replace(/_/g, " ")} can't go back to ${target.replace(/_/g, " ")}` };
}
