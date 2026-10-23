import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  relationship,
  integer,
  text,
  json,
} from "@keystone-6/core/fields";

import { permissions, rules } from "../access";

import { trackingFields } from "./trackingFields";

export const ClientPoints = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadClientPoints,
    },
  },
  graphql: {
    plural: "ClientPointsRecords",
  },
  ui: {
    // "Client Points" would map back to the list key and break the dashboard's admin meta.
    plural: "Client Points Records",
    listView: {
      initialColumns: ["client", "points", "tier"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // Link to User/Client
    client: relationship({
      ref: "User.clientPointsRecords",
      ui: {
        displayMode: "select",
        description: "The client who owns these points",
      },
    }),

    // Current points balance
    points: integer({
      defaultValue: 0,
      validation: { isRequired: true },
      ui: {
        description: "Current loyalty points balance",
      },
    }),

    // Loyalty tier based on points
    tier: text({
      defaultValue: "bronze",
      ui: {
        description: "Loyalty tier (e.g., bronze, silver, gold, platinum)",
      },
    }),

    // Transaction history stored as JSON array
    // Each transaction: { date: string, amount: number, reason: string }
    transactions: json({
      defaultValue: [],
      ui: {
        description: "Array of point transactions with date, amount, and reason",
        createView: { fieldMode: "hidden" },
      },
    }),
    ...trackingFields,
  },
});
