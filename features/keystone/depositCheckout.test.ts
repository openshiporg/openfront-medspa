import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  amountDueAfterDeposit,
  cardPaymentFields,
  decideDepositSettlement,
  depositAppointmentAcceptsPayment,
  netDepositMinor,
  type DepositCheckoutFacts,
  type DepositSessionFacts,
} from "./depositCheckoutCore";
import { trustedOrigin } from "./lib/trustedOrigin";
import { stripePaymentAdapter } from "../integrations/payment/stripe";

const session: DepositSessionFacts = { status: "pending", amount: 7500, currency: "usd", providerReference: "cs_test_1" };
const paid: DepositCheckoutFacts = { providerReference: "cs_test_1", state: "paid", amount: 7500, currency: "usd", paymentIntentId: "pi_test_1" };

test("a paid Checkout for the exact amount and currency completes the deposit", () => {
  assert.deepEqual(decideDepositSettlement(session, paid), { action: "complete", paymentIntentId: "pi_test_1" });
});

test("amount mismatch is parked for review, never marked paid", () => {
  const lower = decideDepositSettlement(session, { ...paid, amount: 7499 });
  assert.equal(lower.action, "review");
  assert.equal(decideDepositSettlement(session, { ...paid, amount: 100000 }).action, "review");
});

test("currency mismatch is parked for review", () => {
  assert.equal(decideDepositSettlement(session, { ...paid, currency: "eur" }).action, "review");
});

test("a Checkout belonging to another payment is never applied", () => {
  assert.equal(decideDepositSettlement(session, { ...paid, providerReference: "cs_other" }).action, "review");
});

test("a paid Checkout without a payment intent cannot be refunded later, so it is parked", () => {
  assert.equal(decideDepositSettlement(session, { ...paid, paymentIntentId: null }).action, "review");
});

test("open and unpaid Checkouts change nothing; an expired one releases the session", () => {
  assert.deepEqual(decideDepositSettlement(session, { ...paid, state: "open" }), { action: "none", reason: "still_open" });
  assert.deepEqual(decideDepositSettlement(session, { ...paid, state: "unpaid" }), { action: "none", reason: "unpaid" });
  assert.deepEqual(decideDepositSettlement(session, { ...paid, state: "expired" }), { action: "expire" });
});

test("a replay (webhook after the return page, or twice) is a no-op once the session is settled", () => {
  for (const status of ["completed", "refunded", "partially_refunded", "cancelled", "failed"]) {
    assert.deepEqual(decideDepositSettlement({ ...session, status }, paid), { action: "none", reason: "already_settled" });
  }
});

test("only open visits accept a deposit; a late payment on a cancelled visit gets refunded instead", () => {
  assert.equal(depositAppointmentAcceptsPayment("pending"), true);
  assert.equal(depositAppointmentAcceptsPayment("confirmed"), true);
  for (const status of ["cancelled", "completed", "no_show", "in_progress", undefined]) assert.equal(depositAppointmentAcceptsPayment(status), false);
});

test("checkout credits only unapplied, settled deposits, net of refunds", () => {
  assert.equal(netDepositMinor([{ amount: 7500, status: "completed", purpose: "appointment_deposit" }]), 7500);
  assert.equal(netDepositMinor([{ amount: 7500, status: "partially_refunded", purpose: "appointment_deposit", refundedAmount: 2500 }]), 5000);
  assert.equal(netDepositMinor([{ amount: 7500, status: "refunded", purpose: "appointment_deposit", refundedAmount: 7500 }]), 0);
  assert.equal(netDepositMinor([{ amount: 7500, status: "pending", purpose: "appointment_deposit" }]), 0);
  assert.equal(netDepositMinor([{ amount: 9900, status: "completed", purpose: "controlled_checkout" }]), 0);
});

test("the deposit can never push the amount due below zero", () => {
  assert.equal(amountDueAfterDeposit(20000, 7500), 12500);
  assert.equal(amountDueAfterDeposit(7500, 7500), 0);
  assert.throws(() => amountDueAfterDeposit(5000, 7500), /more than the amount due/);
  assert.throws(() => amountDueAfterDeposit(5000.5, 100), /integer cents/);
});

test("the deposit amount comes from the server: the GraphQL inputs carry no amount", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("./depositCheckout.ts", import.meta.url), "utf8");
  for (const name of ["startDepositCheckout", "confirmDepositCheckout"]) {
    const block = source.slice(source.indexOf(`export const ${name}`), source.indexOf("async resolve", source.indexOf(`export const ${name}`)));
    assert.match(block, /appointmentId/);
    assert.doesNotMatch(block, /amount/i, `${name} must not accept an amount`);
  }
  assert.match(source, /const amount = Number\(appointment\.depositAmount/);
});

test("return URLs follow the configured origin, never request headers", () => {
  assert.equal(trustedOrigin({ APP_ORIGIN: "https://medspa.example.com", NODE_ENV: "production" } as any), "https://medspa.example.com");
  assert.throws(() => trustedOrigin({ NODE_ENV: "production" } as any), /APP_ORIGIN/);
  assert.throws(() => trustedOrigin({ APP_ORIGIN: "http://medspa.example.com", NODE_ENV: "production" } as any), /HTTPS/);
  assert.throws(() => trustedOrigin({ APP_ORIGIN: "https://u:p@medspa.example.com", NODE_ENV: "production" } as any), /credentials/);
});

// ---- Stripe webhook parsing (real signature verification, local secret) ----

function signed(event: object, secret: string, at = Math.floor(Date.now() / 1000)) {
  const body = JSON.stringify(event);
  const sig = createHmac("sha256", secret).update(`${at}.${body}`).digest("hex");
  return { payload: body, headers: { "stripe-signature": `t=${at},v1=${sig}` } };
}

async function parse(event: object, secret = "whsec_test_local", override?: Record<string, string>) {
  const prior = { sk: process.env.STRIPE_SECRET_KEY, wh: process.env.STRIPE_WEBHOOK_SECRET };
  process.env.STRIPE_SECRET_KEY = "sk_test_local_only";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_local";
  try {
    const { payload, headers } = signed(event, secret);
    return await stripePaymentAdapter.parseWebhook({ provider: { code: "pp_stripe", adapter: "stripe" }, payload, headers: override ?? headers });
  } finally {
    process.env.STRIPE_SECRET_KEY = prior.sk; process.env.STRIPE_WEBHOOK_SECRET = prior.wh;
    if (prior.sk === undefined) delete process.env.STRIPE_SECRET_KEY;
    if (prior.wh === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  }
}

test("webhook: a bad signature is rejected before anything is parsed", async () => {
  await assert.rejects(parse({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } }, "whsec_wrong"));
  await assert.rejects(parse({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } }, "whsec_test_local", {}));
});

test("webhook: checkout.session.completed yields checkout facts for the deposit", async () => {
  const result = await parse({ id: "evt_c1", type: "checkout.session.completed", livemode: false, data: { object: { id: "cs_test_1", object: "checkout.session", payment_status: "paid", status: "complete", amount_total: 7500, currency: "usd", payment_intent: "pi_test_1" } } });
  assert.equal(result.checkout?.state, "paid");
  assert.equal(result.checkout?.amount, 7500);
  assert.equal(result.checkout?.paymentIntentId, "pi_test_1");
  assert.equal(result.status, null, "a checkout event never moves a payment status directly");
});

test("webhook: refund.updated is routed to refund reconcile with our attempt id, not applied as a payment status", async () => {
  const result = await parse({ id: "evt_r1", type: "refund.updated", livemode: false, data: { object: { id: "re_test_1", object: "refund", status: "succeeded", amount: 7500, currency: "usd", payment_intent: "pi_test_1", metadata: { refundAttemptId: "att_9" } } } });
  assert.deepEqual(result.refund, { providerRefundId: "re_test_1", providerReference: "pi_test_1", status: "succeeded", amount: 7500, currency: "usd", attemptId: "att_9" });
  assert.equal(result.status, null);
});

test("webhook: charge.refunded only signals a re-check of open attempts", async () => {
  const result = await parse({ id: "evt_ch1", type: "charge.refunded", livemode: false, data: { object: { id: "ch_1", object: "charge", amount: 7500, amount_refunded: 7500, payment_intent: "pi_test_1" } } });
  assert.equal(result.refundSignal, true);
  assert.equal(result.providerReference, "pi_test_1");
  assert.equal(result.refund, undefined);
  assert.equal(result.status, null);
});

test("a paid Checkout's card details land on the payment record, and nothing is invented when Stripe reports none", () => {
  assert.deepEqual(cardPaymentFields({ brand: "Visa", last4: "4242", chargeId: "ch_test_1", email: "a@b.co" }), { cardBrand: "Visa", cardLast4: "4242", stripeChargeId: "ch_test_1" });
  assert.deepEqual(cardPaymentFields(null), {});
  assert.deepEqual(cardPaymentFields({ brand: null, last4: null, chargeId: "ch_test_2", email: null }), { stripeChargeId: "ch_test_2" });
});
