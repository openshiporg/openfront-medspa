import { list, graphql } from "@keystone-6/core";
import {
  relationship,
  integer,
  timestamp,
  text,
  virtual,
} from "@keystone-6/core/fields";

import { permissions, rules } from "../access";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

import { trackingFields } from "./trackingFields";

export const ClientPackageUsage = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadClientPackageUsages,
    },
  },
  ui: {
    listView: {
      initialColumns: ["clientPackage", "service", "quantityUsed", "valueUsed", "usedAt"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    clientPackage: relationship({
      ref: "ClientPackage.usageHistory",
      ui: {
        displayMode: "select",
        description: "The client package this usage is for",
      },
    }),

    appointment: relationship({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "The appointment where this was used",
      },
    }),

    service: relationship({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "The service that was used",
      },
    }),

    quantityUsed: integer({
      defaultValue: 1,
      validation: { min: 1 },
      ui: {
        description: "Number of units used",
      },
    }),

    valueUsed: integer({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Value used in cents",
      },
    }),

    usedAt: timestamp({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the package was used",
      },
    }),

    idempotencyKey: text({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Workflow idempotency key that produced this immutable usage record",
      },
    }),

    formattedValueUsed: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context) {
          const usageId = (item as { id: string }).id;
          const usage = await context.sudo().query.ClientPackageUsage.findOne({
            where: { id: usageId },
            query: "valueUsed",
          });

          if (!usage?.valueUsed) return "$0.00";
          return formatCurrency(usage.valueUsed);
        },
      }),
    }),
    ...trackingFields,
  },
});
