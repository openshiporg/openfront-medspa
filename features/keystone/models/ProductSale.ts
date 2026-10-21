import { list } from "@keystone-6/core";
import {
  integer,
  timestamp,
  relationship,
  json,
} from "@keystone-6/core/fields";

import { rules } from "../access";
import { createLifecycleHooks } from "../lifecycle";

import { trackingFields } from "./trackingFields";

export const ProductSale = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadProductSales,
    },
  },
  hooks: createLifecycleHooks("product_sale", ["total", "soldAt", "appointmentId", "soldById"]),
  ui: {
    listView: {
      initialColumns: ["soldAt", "total", "soldBy", "appointment"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // Optional link to appointment (for retail sales during service)
    appointment: relationship({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Associated appointment (optional - for sales during service visits)",
      },
    }),

    // Products sold in this transaction
    products: json({
      defaultValue: [],
      ui: {
        description: "Array of products sold: [{ productId, name, quantity, price, subtotal }]",
      },
    }),

    total: integer({
      validation: { isRequired: true },
      ui: {
        description: "Total sale amount",
      },
    }),

    // Staff member who made the sale
    soldBy: relationship({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who processed the sale",
      },
    }),

    soldAt: timestamp({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the sale occurred",
      },
    }),
    ...trackingFields,
  },
});
