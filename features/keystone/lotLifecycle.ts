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
