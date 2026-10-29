/**
 * Pure decisions for the booking-deposit Checkout flow (no database, no framework), so the money
 * rules can be tested directly. The server always supplies the amount; nothing here reads a client value.
 */

export type DepositCheckoutState = "paid" | "open" | "expired" | "unpaid";

export interface DepositSessionFacts {
  status: string;
  amount: number;
  currency: string;
  providerReference: string;
}

export interface DepositCheckoutFacts {
  providerReference: string;
  state: DepositCheckoutState;
  amount: number;
  currency: string;
  paymentIntentId: string | null;
}

export type DepositSettlement =
  | { action: "none"; reason: "already_settled" | "still_open" | "unpaid" }
  | { action: "expire" }
  | { action: "review"; reason: string }
  | { action: "complete"; paymentIntentId: string };

const OPEN_STATUSES = new Set(["pending", "requires_action", "authorized"]);

export function decideDepositSettlement(session: DepositSessionFacts, checkout: DepositCheckoutFacts): DepositSettlement {
  if (!OPEN_STATUSES.has(session.status)) return { action: "none", reason: "already_settled" };
  if (checkout.providerReference !== session.providerReference) {
    return { action: "review", reason: "Checkout session does not belong to this payment" };
  }
  if (checkout.state === "expired") return { action: "expire" };
  if (checkout.state === "open") return { action: "none", reason: "still_open" };
  if (checkout.state === "unpaid") return { action: "none", reason: "unpaid" };

  // paid: assert amount AND currency before anything is marked paid.
  if (!Number.isInteger(checkout.amount) || checkout.amount !== session.amount) {
    return { action: "review", reason: `Stripe collected ${checkout.amount} ${checkout.currency}; the deposit is ${session.amount} ${session.currency}` };
  }
  if (checkout.currency.toLowerCase() !== session.currency.toLowerCase()) {
    return { action: "review", reason: `Stripe collected ${checkout.currency}; the deposit is ${session.currency}` };
  }
  if (!checkout.paymentIntentId) return { action: "review", reason: "Paid Checkout has no payment intent to refund against" };
  return { action: "complete", paymentIntentId: checkout.paymentIntentId };
}

/** A deposit can be paid while the visit is still a request or confirmed; anything else gets refunded. */
export function depositAppointmentAcceptsPayment(status: string | null | undefined) {
  return status === "pending" || status === "confirmed";
}

/**
 * Net deposit held for a visit, from authoritative session rows (completed minus refunded).
 * Used by checkout, which credits it against what is due.
 */
export function netDepositMinor(sessions: ReadonlyArray<{ amount: number; status: string; purpose?: unknown; refundedAmount?: number | null }>) {
  return sessions
    .filter(s => s.purpose === "appointment_deposit" && (s.status === "completed" || s.status === "partially_refunded"))
    .reduce((sum, s) => sum + Math.max(0, s.amount - Number(s.refundedAmount || 0)), 0);
}

/** Checkout amount due after crediting a held deposit. Fails closed if the deposit exceeds what is due. */
export function amountDueAfterDeposit(totalBeforeDeposit: number, depositCredit: number) {
  if (!Number.isInteger(totalBeforeDeposit) || !Number.isInteger(depositCredit) || depositCredit < 0) throw new Error("Deposit amounts must be integer cents");
  if (depositCredit > totalBeforeDeposit) throw new Error("The deposit held is more than the amount due. Refund the difference from Payments, then check out");
  return totalBeforeDeposit - depositCredit;
}
