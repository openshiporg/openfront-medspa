import { tenantFilter } from './tenantAccess';
import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  text,
  relationship,
  json,
  checkbox,
  select,
  timestamp,
} from "@keystone-6/core/fields";

import { permissions } from "../access";

import { trackingFields } from "./trackingFields";

export const WaitlistEntry = list({
  access: {
    operation: {
      query: permissions.canSchedule,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: tenantFilter },
  },
  ui: {
    listView: {
      initialColumns: ["client", "service", "isActive", "dateRangeStart", "dateRangeEnd"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // Client requesting the appointment
    client: relationship({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Client waiting for an appointment",
      },
    }),

    guestName: text({
      ui: { description: "Walk-in name when no client account is connected" },
    }),

    guestPhone: text({
      ui: { description: "Walk-in contact number when no client account is connected" },
    }),

    // Service they want to book
    service: relationship({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "Service the client wants to book",
      },
    }),

    // Preferred providers (many-to-many)
    preferredProviders: relationship({
      ref: "Provider.waitlistEntries",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["user", "tier"],
        description: "Providers the client would prefer",
      },
    }),

    // Preferred days of the week
    preferredDays: json({
      ui: {
        description: "Preferred days of week as JSON array, e.g., [\"monday\", \"wednesday\", \"friday\"]",
      },
    }),

    // Preferred time range
    preferredTimeRange: text({
      ui: {
        description: "Preferred time range, e.g., \"9:00-12:00\" or \"morning\" or \"afternoon\"",
      },
    }),

    // Date range the client is available
    dateRangeStart: timestamp({
      ui: {
        description: "Start of date range the client is available",
      },
    }),

    dateRangeEnd: timestamp({
      ui: {
        description: "End of date range the client is available",
      },
    }),

    // Workflow state
    status: select({
      type: "string",
      defaultValue: "active",
      validation: { isRequired: true },
      options: [
        { label: "Active", value: "active" },
        { label: "Notified", value: "notified" },
        { label: "Converted", value: "converted" },
        { label: "Removed", value: "removed" },
      ],
    }),

    isActive: checkbox({
      defaultValue: true,
      ui: {
        description: "Compatibility flag maintained by the waitlist workflow",
      },
    }),

    requestKey: text({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Idempotency key used to join the waitlist",
      },
    }),

    // When the client was notified of availability
    notifiedAt: timestamp({
      ui: {
        description: "When the client was notified that a slot became available",
      },
    }),

    transitionedAt: timestamp({
      ui: {
        description: "When the latest controlled transition occurred",
      },
    }),

    transitionReason: text({
      ui: {
        displayMode: "textarea",
        description: "Reason recorded by the latest controlled transition",
      },
    }),

    convertedAppointment: relationship({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Appointment created from this waitlist entry",
      },
    }),

    // Notes
    notes: text({
      ui: {
        displayMode: "textarea",
        description: "Additional notes or special requests",
      },
    }),

    ...trackingFields,
  },
});
