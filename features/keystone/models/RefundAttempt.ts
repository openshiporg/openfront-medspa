import { list } from "@keystone-6/core";
import { checkbox, integer, json, relationship, select, text, timestamp } from "@keystone-6/core/fields";
import { permissions } from "../access";
import { trackingFields } from "./trackingFields";
import { tenantFilter } from "./tenantAccess";

/**
 * Refund attempt state. One row is written in the same transaction as its Refund; the provider call
 * is made right after, never inside that transaction, so a crash or timeout leaves a row that is
 * re-queried (never blindly re-sent) by the next request, webhook or the staff Retry button.
 */
export const RefundAttempt = list({
  access: {
    operation: { query: permissions.canManageFinance, create: () => false, update: () => false, delete: () => false },
    filter: { query: tenantFilter },
  },
  ui: { listView: { initialColumns: ["refund", "status", "amountMinor", "providerRefundId", "attemptCount"] } },
  fields: {
    practice: relationship({ ref: "Practice" }),
    refund: relationship({ ref: "Refund.attempt" }),
    paymentSession: relationship({ ref: "PaymentSession.refundAttempts" }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: "unique" }),
    amountMinor: integer({ validation: { isRequired: true, min: 1 } }),
    currencyCode: text({ validation: { isRequired: true } }),
    status: select({
      type: "enum",
      defaultValue: "pending",
      validation: { isRequired: true },
      options: [
        { label: "Pending", value: "pending" },
        { label: "Submitted", value: "submitted" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Unknown", value: "unknown" },
      ],
    }),
    providerReference: text({ ui: { description: "The captured payment the provider refunds against (Stripe pi_…)" } }),
    providerRefundId: text({ isIndexed: true, ui: { description: "The provider's refund id (Stripe re_…)" } }),
    attemptCount: integer({ defaultValue: 0 }),
    submitStartedAt: timestamp({ ui: { description: "Set before the provider call; once set the provider is re-queried before any resend" } }),
    needsReview: checkbox({ defaultValue: false, ui: { description: "The provider's refund disagrees with ours; staff must reconcile it" } }),
    lastError: text(),
    completedAt: timestamp(),
    data: json({ defaultValue: {} }),
    ...trackingFields,
  },
});
