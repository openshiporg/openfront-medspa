import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  text,
  relationship,
  integer,
  timestamp,
  checkbox,
} from "@keystone-6/core/fields";

import { permissions, practiceId, rules } from "../access";

import { trackingFields } from "./trackingFields";

export const Review = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadReviews,
    },
  },
  ui: {
    listView: {
      initialColumns: ["client", "rating", "service", "provider", "isApproved", "createdAt"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // Rating (1-5 stars)
    rating: integer({
      validation: {
        isRequired: true,
        min: 1,
        max: 5,
      },
      ui: {
        description: "Rating from 1 to 5 stars",
      },
    }),

    // Review content
    comment: text({
      ui: {
        displayMode: "textarea",
        description: "Review comment from the client",
      },
    }),

    // Moderation
    isApproved: checkbox({
      defaultValue: false,
      ui: {
        description: "Whether this review has been approved to display publicly",
      },
    }),

    // Timestamps
// Relationships
    client: relationship({
      ref: "Client.reviews",
      ui: {
        displayMode: "select",
        description: "Client who wrote this review",
      },
    }),

    service: relationship({
      ref: "Service.reviews",
      ui: {
        displayMode: "select",
        description: "Service being reviewed",
      },
    }),

    provider: relationship({
      ref: "Provider.reviews",
      ui: {
        displayMode: "select",
        description: "Provider being reviewed",
      },
    }),

    appointment: relationship({
      ref: "Appointment.review",
      ui: {
        displayMode: "select",
        description: "Associated appointment (optional)",
      },
    }),
    ...trackingFields,
  },
});
