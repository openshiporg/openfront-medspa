import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  relationship,
  integer,
  select,
  timestamp,
} from "@keystone-6/core/fields";

import { permissions, rules } from "../access";

import { trackingFields } from "./trackingFields";

export const Referral = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadReferrals,
    },
  },
  ui: {
    listView: {
      initialColumns: ["referrer", "referred", "rewardAmount", "rewardType", "status"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // The user who made the referral
    referrer: relationship({
      ref: "User.referralsMade",
      ui: {
        displayMode: "select",
        description: "The client who made the referral",
      },
    }),

    // The new user who was referred
    referred: relationship({
      ref: "User.referralsReceived",
      ui: {
        displayMode: "select",
        description: "The new client who was referred",
      },
    }),

    // Reward details
    rewardAmount: integer({
      defaultValue: 0,
      validation: { isRequired: true },
      ui: {
        description: "Amount of reward (points or credit value)",
      },
    }),

    rewardType: select({
      type: "string",
      options: [
        { label: "Points", value: "points" },
        { label: "Credit", value: "credit" },
      ],
      defaultValue: "points",
      validation: { isRequired: true },
      ui: {
        description: "Type of reward given for the referral",
      },
    }),

    // Referral status
    status: select({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Completed", value: "completed" },
        { label: "Expired", value: "expired" },
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
      ui: {
        description: "Current status of the referral",
      },
    }),

    completedAt: timestamp({
      ui: {
        description: "When the referral was completed (referred client made first purchase)",
      },
    }),
    ...trackingFields,
  },
});
