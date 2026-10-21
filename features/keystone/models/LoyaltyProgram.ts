import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  text,
  float,
  checkbox,
  json,
  relationship,
} from "@keystone-6/core/fields";

import { permissions, rules } from "../access";

import { trackingFields } from "./trackingFields";

export const LoyaltyProgram = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadMembershipCatalog,
    },
  },
  ui: {
    listView: {
      initialColumns: ["name", "pointsPerDollar", "redemptionRate", "isActive"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // Program name
    name: text({
      validation: { isRequired: true },
      ui: {
        description: "Name of the loyalty program",
      },
    }),

    // Points configuration
    pointsPerDollar: float({
      validation: { isRequired: true },
      defaultValue: 1,
      ui: {
        description: "Number of points earned per dollar spent",
      },
    }),

    redemptionRate: float({
      validation: { isRequired: true },
      defaultValue: 0.01,
      ui: {
        description: "Dollar value per point when redeeming (e.g., 0.01 = 1 cent per point)",
      },
    }),

    // Tier configuration stored as JSON array
    // Example: [{ name: "Bronze", minPoints: 0, benefits: ["5% off"] }, { name: "Gold", minPoints: 1000, benefits: ["10% off", "Free shipping"] }]
    tiers: json({
      ui: {
        description: "Tier configuration as JSON array with name, minPoints, and benefits for each tier",
      },
    }),

    // Program status
    isActive: checkbox({
      defaultValue: true,
      ui: {
        description: "Whether this loyalty program is currently active",
      },
    }),
    ...trackingFields,
  },
});
