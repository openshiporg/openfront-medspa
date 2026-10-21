import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  text,
  relationship,
  integer,
  timestamp,
  checkbox,
} from "@keystone-6/core/fields";

import { permissions, rules } from "../access";

import { trackingFields } from "./trackingFields";

export const GiftCard = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadGiftCards,
    },
  },
  ui: {
    listView: {
      initialColumns: ["code", "initialValue", "currentBalance", "recipientName", "isActive", "expiresAt"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // Unique gift card code
    code: text({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Unique gift card code for redemption",
      },
    }),

    // Value fields
    initialValue: integer({
      validation: { isRequired: true },
      ui: {
        description: "Original value of the gift card when purchased",
      },
    }),

    currentBalance: integer({
      validation: { isRequired: true },
      ui: {
        description: "Current remaining balance on the gift card",
      },
    }),

    // Recipient information
    recipientEmail: text({
      ui: {
        description: "Email address of the gift card recipient",
      },
    }),

    recipientName: text({
      ui: {
        description: "Name of the gift card recipient",
      },
    }),

    // Personal message
    message: text({
      ui: {
        displayMode: "textarea",
        description: "Personal message from purchaser to recipient",
      },
    }),

    // Expiration and status
    expiresAt: timestamp({
      ui: {
        description: "Expiration date of the gift card",
      },
    }),

    isActive: checkbox({
      defaultValue: true,
      ui: {
        description: "Whether the gift card is currently active and can be redeemed",
      },
    }),

    // Timestamps
// Relationships
    purchasedBy: relationship({
      ref: "User.purchasedGiftCards",
      ui: {
        displayMode: "select",
        description: "User who purchased this gift card",
      },
    }),

    // Transactions on this gift card
    transactions: relationship({
      ref: "GiftCardTransaction.giftCard",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["amount", "type", "createdAt"],
        description: "Transaction history for this gift card",
      },
    }),
    ...trackingFields,
  },
});
