import { list } from "@keystone-6/core";
import {
  text,
  relationship,
  select,
  integer,
  timestamp,
  checkbox,
} from "@keystone-6/core/fields";

import { activeListPermissions, rules } from "../access";
import { createLifecycleHooks } from "../lifecycle";
import { trackingFields } from "./trackingFields";

export const Payment = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadPayments,
    },
  },
  hooks: createLifecycleHooks("payment", ["subtotal", "tax", "tip", "discount", "totalAmount", "refundedAmount", "paymentMethod", "status", "processedAt", "refundedAt", "appointmentId", "sessionId"]),
  ui: {
    listView: {
      initialColumns: ["appointment", "totalAmount", "paymentMethod", "status", "processedAt"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    currencyCode: text({ defaultValue: "USD", validation: { isRequired: true } }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: "unique" }),
    refunds: relationship({ ref: "Refund.payment", many: true }),
    // Core amount fields
    subtotal: integer({
      validation: { isRequired: true },
      ui: {
        description: "Service charges before tax and tip",
      },
    }),

    tax: integer({
      defaultValue: 0,
      ui: {
        description: "Tax amount",
      },
    }),

    tip: integer({
      defaultValue: 0,
      ui: {
        description: "Tip amount",
      },
    }),

    discount: integer({
      defaultValue: 0,
      ui: {
        description: "Any discount applied",
      },
    }),

    totalAmount: integer({
      validation: { isRequired: true },
      ui: {
        description: "Total amount charged (subtotal + tax + tip - discount)",
      },
    }),

    // Payment method and processing
    paymentMethod: select({
      type: "string",
      options: [
        { label: "Credit Card", value: "credit_card" },
        { label: "Debit Card", value: "debit_card" },
        { label: "Cash", value: "cash" },
        { label: "Gift Card", value: "gift_card" },
        { label: "Apple Pay", value: "apple_pay" },
        { label: "Google Pay", value: "google_pay" },
      ],
      defaultValue: "credit_card",
      validation: { isRequired: true },
    }),

    status: select({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" },
        { label: "Refunded", value: "refunded" },
        { label: "Partially Refunded", value: "partially_refunded" },
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
    }),

    // Stripe integration fields
    stripePaymentIntentId: text({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        description: "Stripe Payment Intent ID for card payments",
      },
    }),

    stripeChargeId: text({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        description: "Stripe Charge ID for completed payments",
      },
    }),

    stripeRefundId: text({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        description: "Stripe Refund ID if payment was refunded",
      },
    }),

    // Card details (last 4 digits, brand)
    cardBrand: text({
      ui: {
        description: "Card brand (Visa, Mastercard, etc.)",
      },
    }),

    cardLast4: text({
      ui: {
        description: "Last 4 digits of card",
      },
    }),

    // Refund tracking
    refundedAmount: integer({
      defaultValue: 0,
      ui: {
        description: "Amount refunded",
      },
    }),

    refundReason: text({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        displayMode: "textarea",
        description: "Reason for refund if applicable",
      },
    }),

    // Tip distribution
    tipDistributed: checkbox({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      defaultValue: false,
      ui: {
        description: "Whether tip has been distributed to provider",
      },
    }),

    // Timestamps
    processedAt: timestamp({
      ui: {
        description: "When the payment was successfully processed",
      },
    }),

    refundedAt: timestamp({
      ui: {
        description: "When the refund was processed",
      },
    }),

    // Notes
    notes: text({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ui: {
        displayMode: "textarea",
        description: "Internal notes about the payment",
      },
    }),

    // Relationships
    appointment: relationship({
      ref: "Appointment.payment",
      ui: {
        displayMode: "select",
      },
    }),

    session: relationship({
      ref: "PaymentSession.payment",
      ui: {
        displayMode: "select",
        description: "Provider session that created this payment",
      },
    }),

    // Processed by (staff member who processed the payment)
    processedBy: relationship({
      access: { read: activeListPermissions.canManageFinance, create: () => false, update: () => false },
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who processed this payment",
      },
    }),

    // Receipt tracking
    receiptSent: checkbox({
      defaultValue: false,
      ui: {
        description: "Whether receipt email was sent to client",
      },
    }),

    receiptEmail: text({
      ui: {
        description: "Email address receipt was sent to",
      },
    }),

    ...trackingFields,
  },
});
