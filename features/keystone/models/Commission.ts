import { list } from "@keystone-6/core";
import {
  relationship,
  float,
  integer,
  timestamp,
  checkbox,
  text,
} from "@keystone-6/core/fields";

import { rules } from "../access";
import { createLifecycleHooks } from "../lifecycle";

import { trackingFields } from "./trackingFields";

export const Commission = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadCommissions,
    },
  },
  hooks: createLifecycleHooks("commission", ["saleAmount", "commissionRate", "commissionAmount", "isPaid", "paidAt", "providerId", "serviceId", "paymentId"]),
  ui: {
    listView: {
      initialColumns: ["provider", "payment", "saleAmount", "commissionRate", "commissionAmount", "isPaid"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // Commission calculation fields
    saleAmount: integer({
      validation: { isRequired: true },
      ui: {
        description: "Total sale amount for this service",
      },
    }),

    commissionRate: float({
      validation: { isRequired: true, min: 0, max: 1 },
      ui: {
        description: "Commission rate applied (e.g., 0.5 for 50%)",
      },
    }),

    commissionAmount: integer({
      validation: { isRequired: true },
      ui: {
        description: "Calculated commission amount (saleAmount * commissionRate)",
      },
    }),

    // Payment status
    isPaid: checkbox({
      defaultValue: false,
      ui: {
        description: "Whether this commission has been paid to the provider",
      },
    }),

    paidAt: timestamp({
      ui: {
        description: "When the commission was paid to the provider",
      },
    }),

    // Notes
    notes: text({
      ui: {
        displayMode: "textarea",
        description: "Notes about this commission",
      },
    }),

    // Relationships
    provider: relationship({
      ref: "Provider",
      ui: {
        displayMode: "select",
        description: "Provider who earned this commission",
      },
    }),

    service: relationship({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "Service that generated this commission",
      },
    }),

    payment: relationship({
      ref: "Payment",
      ui: {
        displayMode: "select",
        description: "Payment associated with this commission",
      },
    }),
    ...trackingFields,
  },
});
