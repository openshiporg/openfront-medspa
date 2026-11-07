import test from "node:test";
import assert from "node:assert/strict";
import { depositDisplay } from "./depositDisplay";

const paid = (refunds: any[] = [], status = "completed") => ({ status, amount: 2500, refunds });

test("open visit: due until paid, then paid", () => {
  assert.equal(depositDisplay({ status: "pending", depositPaid: false }, []).state, "due");
  assert.equal(depositDisplay({ status: "confirmed", depositPaid: true }, [paid()]).state, "paid");
});

test("cancelled with nothing paid is never due", () => {
  assert.equal(depositDisplay({ status: "cancelled", depositPaid: false }, []).state, "not_charged");
  assert.equal(depositDisplay({ status: "cancelled", depositPaid: false }, [{ status: "cancelled", amount: 2500, refunds: [] }]).state, "not_charged");
  assert.equal(depositDisplay({ status: "no_show", depositPaid: false }, []).state, "not_charged");
});

test("cancelled after a paid or late deposit: refund pending, then refunded with its date", () => {
  assert.equal(depositDisplay({ status: "cancelled", depositPaid: false }, [paid()]).state, "refund_pending");
  assert.equal(depositDisplay({ status: "cancelled", depositPaid: false }, [paid([{ status: "pending", amountMinor: 2500 }])]).state, "refund_pending");
  const done = depositDisplay({ status: "cancelled", depositPaid: false }, [paid([{ status: "completed", amountMinor: 2500, processedAt: "2026-11-07T02:17:55.000Z" }], "refunded")]);
  assert.deepEqual(done, { state: "refunded", refundedAmount: 2500, refundedAt: "2026-11-07T02:17:55.000Z" });
});

test("a failed refund is surfaced, not hidden as due", () => {
  assert.equal(depositDisplay({ status: "cancelled", depositPaid: false }, [paid([{ status: "failed", amountMinor: 2500 }])]).state, "refund_failed");
});
