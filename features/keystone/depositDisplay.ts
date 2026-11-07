/**
 * What the client should be told about a visit's deposit, derived from the appointment and its
 * online deposit sessions and refunds. Pure so the storefront can never say "due" on a closed visit.
 */
export type DepositDisplayState = "due" | "paid" | "not_charged" | "refund_pending" | "refund_failed" | "refunded";

export type DepositSessionFacts = {
  status: string;
  amount: number;
  refundedAt?: string | null;
  refunds: Array<{ status: string; amountMinor: number; processedAt?: string | null; createdAt?: string | null }>;
};

const OPEN = new Set(["pending", "confirmed"]);
const CAPTURED = new Set(["completed", "partially_refunded", "refunded"]);

export function depositDisplay(appointment: { status: string; depositPaid: boolean }, sessions: DepositSessionFacts[]): {
  state: DepositDisplayState; refundedAmount: number; refundedAt: string | null;
} {
  const captured = sessions.filter((session) => CAPTURED.has(session.status));
  const paidAmount = captured.reduce((sum, session) => sum + session.amount, 0);
  const refunds = captured.flatMap((session) => session.refunds);
  const done = refunds.filter((refund) => refund.status === "completed");
  const refundedAmount = done.reduce((sum, refund) => sum + refund.amountMinor, 0);
  const refundedAt = done.map((refund) => refund.processedAt || refund.createdAt || "").filter(Boolean).sort().pop()
    || captured.map((session) => session.refundedAt || "").filter(Boolean).sort().pop() || null;

  if (paidAmount > 0 && refundedAmount >= paidAmount) return { state: "refunded", refundedAmount, refundedAt };
  if (refunds.some((refund) => refund.status === "pending")) return { state: "refund_pending", refundedAmount, refundedAt };
  if (refunds.some((refund) => refund.status === "failed")) return { state: "refund_failed", refundedAmount, refundedAt };
  if (OPEN.has(appointment.status)) return { state: appointment.depositPaid || paidAmount > 0 ? "paid" : "due", refundedAmount, refundedAt };
  // Closed visit. Money still held on a cancelled visit is on its way back (the late-deposit path enqueues it).
  if (paidAmount > refundedAmount && appointment.status === "cancelled") return { state: "refund_pending", refundedAmount, refundedAt };
  if (appointment.depositPaid || paidAmount > 0) return { state: "paid", refundedAmount, refundedAt };
  return { state: "not_charged", refundedAmount, refundedAt };
}
