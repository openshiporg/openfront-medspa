import { list, graphql } from "@keystone-6/core";
import {
  relationship,
  integer,
  timestamp,
  select,
  json,
  virtual,
} from "@keystone-6/core/fields";

import { rules } from "../access";
import { createLifecycleHooks } from "../lifecycle";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

import { trackingFields } from "./trackingFields";

export const ClientPackage = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadClientPackages,
    },
  },
  hooks: createLifecycleHooks("client_package", ["status", "totalValue", "paidAmount", "usedValue", "expiresAt", "clientId", "packageId"]),
  ui: {
    listView: {
      initialColumns: ["client", "package", "status", "purchasedAt", "expiresAt"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    client: relationship({
      ref: "User.clientPackages",
      ui: {
        displayMode: "select",
        description: "Client who purchased the package",
      },
    }),

    package: relationship({
      ref: "ServicePackage",
      ui: {
        displayMode: "select",
        description: "The service package purchased",
      },
    }),

    purchasedAt: timestamp({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the package was purchased",
      },
    }),

    expiresAt: timestamp({
      ui: {
        description: "When the package expires (calculated from validityDays)",
      },
    }),

    status: select({
      type: "string",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Expired", value: "expired" },
        { label: "Fully Used", value: "fully-used" },
        { label: "Cancelled", value: "cancelled" },
      ],
      ui: {
        displayMode: "select",
        description: "Current status of the package",
      },
    }),

    totalValue: integer({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Total package value in cents",
      },
    }),

    paidAmount: integer({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Amount paid in cents",
      },
    }),

    usedValue: integer({
      defaultValue: 0,
      ui: {
        description: "Amount used so far in cents",
      },
    }),

    usageHistory: relationship({
      ref: "ClientPackageUsage.clientPackage",
      many: true,
      ui: {
        displayMode: "count",
        description: "Usage history of this package",
      },
    }),

    adjustments: relationship({ ref: "ClientPackageAdjustment.clientPackage", many: true }),

    metadata: json({
      ui: {
        description: "Additional metadata",
      },
    }),

    remainingValue: virtual({
      field: graphql.field({
        type: graphql.Int,
        async resolve(item, args, context) {
          const clientPackageId = (item as { id: string }).id;
          const pkg = await context.sudo().query.ClientPackage.findOne({
            where: { id: clientPackageId },
            query: "totalValue usedValue",
          });

          if (!pkg) return 0;
          return (pkg.totalValue || 0) - (pkg.usedValue || 0);
        },
      }),
    }),

    formattedRemainingValue: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context) {
          const clientPackageId = (item as { id: string }).id;
          const pkg = await context.sudo().query.ClientPackage.findOne({
            where: { id: clientPackageId },
            query: "totalValue usedValue",
          });

          if (!pkg) return "$0.00";
          const remaining = (pkg.totalValue || 0) - (pkg.usedValue || 0);
          return formatCurrency(remaining);
        },
      }),
    }),
    ...trackingFields,
  },
});
