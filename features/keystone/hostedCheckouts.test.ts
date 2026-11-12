import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { giftCardAccessToken, giftCardCode, validateOnlineGiftCard } from "./hostedCheckouts";

const source = readFileSync(new URL("./hostedCheckouts.ts", import.meta.url), "utf8");
const checkout = readFileSync(new URL("./mutations/completeAppointmentCheckout.ts", import.meta.url), "utf8");
const webhook = readFileSync(new URL("./payment-webhook.ts", import.meta.url), "utf8");
const refunds = readFileSync(new URL("./mutations/processPayment.ts", import.meta.url), "utf8");

const ok = { amount: 10_000, purchaserName: "Ana Ruiz", purchaserEmail: "ana@example.com", recipientName: "Lee", recipientEmail: "lee@example.com" };

test("online gift cards are bounded to $25–$500 integer cents with valid emails", () => {
  assert.equal(validateOnlineGiftCard(ok), null);
  assert.match(validateOnlineGiftCard({ ...ok, amount: 2_499 })!, /between \$25 and \$500/);
  assert.match(validateOnlineGiftCard({ ...ok, amount: 50_001 })!, /between/);
  assert.match(validateOnlineGiftCard({ ...ok, amount: 2_500.5 })!, /between/);
  assert.match(validateOnlineGiftCard({ ...ok, purchaserEmail: "nope" })!, /email/);
  assert.match(validateOnlineGiftCard({ ...ok, purchaserName: "  " })!, /name/);
  assert.equal(validateOnlineGiftCard({ ...ok, recipientEmail: "" }), null, "the purchaser can buy for themselves");
});

test("gift card codes are deterministic per purchase and the return token is bound to the ref", () => {
  assert.match(giftCardCode("seed"), /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.equal(giftCardCode("seed"), giftCardCode("seed"));
  assert.notEqual(giftCardCode("seed"), giftCardCode("other"));
  process.env.SESSION_SECRET = "x".repeat(32);
  assert.ok(giftCardAccessToken("a"));
  assert.notEqual(giftCardAccessToken("a"), giftCardAccessToken("b"));
});

test("the desk card total is computed by the controlled checkout, not sent by the client", () => {
  const block = source.slice(source.indexOf("export const startCardCheckout"), source.indexOf("async resolve", source.indexOf("export const startCardCheckout")));
  assert.doesNotMatch(block, /\bamount:/, "startCardCheckout must not accept an amount");
  assert.match(source, /kind: "quote"/);
  assert.match(checkout, /if \(Number\(card\.amount\) !== total\) throw new CardAmountMismatch/);
});

test("cash checkout still records cash only; card goes through Charge card", () => {
  assert.match(checkout, /Card payments are taken with Charge card/);
});

test("a paid card that cannot be applied to the visit is refunded through a refund", () => {
  assert.match(source, /card-unapplied/);
  assert.match(source, /enqueueRefund\(/);
});

test("webhook routes hosted card and gift-card checkouts before the deposit path, and refunds accept both", () => {
  assert.ok(webhook.indexOf("settleHostedCheckoutWebhook(") < webhook.indexOf("settleDepositCheckout(sudo"));
  assert.match(refunds, /purpose !== "checkout_card"/);
  assert.match(refunds, /while the gift card is unspent/);
});
