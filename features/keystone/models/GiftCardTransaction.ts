import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  text,
  relationship,
  select,
  integer,
  timestamp,
} from "@keystone-6/core/fields";

import { permissions, rules } from "../access";

import { trackingFields } from "./trackingFields";

export const GiftCardTransaction = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadGiftCardTransactions,
    },
  },
  ui: {
    listView: {
      initialColumns: ["giftCard", "amount", "type", "createdAt"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // Transaction amount
    amount: integer({
      validation: { isRequired: true },
      ui: {
        description: "Transaction amount (positive for purchase/refund, negative for redemption)",
      },
    }),

    // Transaction type
    type: select({
      type: "string",
      options: [
        { label: "Purchase", value: "purchase" },
        { label: "Redemption", value: "redemption" },
        { label: "Refund", value: "refund" },
      ],
      validation: { isRequired: true },
      ui: {
        description: "Type of transaction",
      },
    }),

    idempotencyKey: text({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Workflow idempotency key that produced this immutable balance event",
      },
    }),

    // Notes
    notes: text({
      ui: {
        displayMode: "textarea",
        description: "Additional notes about this transaction",
      },
    }),

    // Relationships
    giftCard: relationship({
      ref: "GiftCard.transactions",
      ui: {
        displayMode: "select",
        description: "Gift card this transaction belongs to",
      },
    }),

    // Optional appointment (for redemptions)
    appointment: relationship({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Appointment this redemption was applied to (if applicable)",
      },
    }),
    ...trackingFields,
  },
});
