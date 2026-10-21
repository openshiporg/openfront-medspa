export type PaymentLifecycleStatus =
  | "pending"
  | "requires_action"
  | "authorized"
  | "completed"
  | "failed"
  | "cancelled"
  | "partially_refunded"
  | "refunded";

const transitions: Record<PaymentLifecycleStatus, readonly PaymentLifecycleStatus[]> = {
  pending: ["requires_action", "authorized", "completed", "failed", "cancelled"],
  requires_action: ["authorized", "completed", "failed", "cancelled"],
  authorized: ["completed", "failed", "cancelled"],
  completed: ["partially_refunded", "refunded"],
  partially_refunded: ["partially_refunded", "refunded"],
  failed: [],
  cancelled: [],
  refunded: [],
};

export function canTransitionPayment(from: PaymentLifecycleStatus, to: PaymentLifecycleStatus) {
  return from === to || transitions[from].includes(to);
}

export function assertPaymentTransition(from: PaymentLifecycleStatus, to: PaymentLifecycleStatus) {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Invalid payment transition: ${from} -> ${to}`);
  }
}

export function paymentRecordStatus(status: PaymentLifecycleStatus) {
  if (status === "requires_action" || status === "authorized") return "processing";
  if (status === "partially_refunded") return "partially_refunded";
  if (status === "refunded") return "refunded";
  if (status === "completed") return "completed";
  if (status === "failed" || status === "cancelled") return "failed";
  return "pending";
}
