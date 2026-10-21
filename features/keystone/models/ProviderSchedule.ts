import { list } from "@keystone-6/core";
import {
  text,
  relationship,
  select,
  checkbox,
  timestamp,
  integer,
} from "@keystone-6/core/fields";

import { rules } from "../access";
import { createLifecycleHooks } from "../lifecycle";
import { trackingFields } from "./trackingFields";

export const ProviderSchedule = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadProviderSchedules,
    },
  },
  hooks: createLifecycleHooks("provider_schedule", ["type", "dayOfWeek", "localDate", "startTime", "endTime", "isAvailable", "revision", "providerId", "locationId"]),
  ui: {
    listView: {
      initialColumns: ["provider", "dayOfWeek", "startTime", "endTime", "isAvailable", "isPublic"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    type: select({
      type: "enum",
      options: [
        { label: "Recurring", value: "recurring" },
        { label: "One-time", value: "one_time" },
        { label: "Time-off", value: "time_off" },
      ],
      defaultValue: "recurring",
      validation: {
        isRequired: true,
      },
    }),

    idempotencyKey: text({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Stable workflow key for idempotent schedule creation",
      },
    }),

    revision: integer({
      defaultValue: 1,
      validation: { isRequired: true, min: 1 },
      ui: {
        description: "Optimistic concurrency revision managed by schedule workflows",
      },
    }),

    // Day of week for recurring schedules (0-6, Sunday = 0)
    dayOfWeek: integer({
      validation: {
        min: 0,
        max: 6,
      },
      ui: {
        description: "Day of week (0=Sunday, 1=Monday, etc) for recurring schedules",
      },
    }),

    // Legacy string-based day of week
    dayOfWeekLegacy: select({
      type: "enum",
      options: [
        { label: "Monday", value: "monday" },
        { label: "Tuesday", value: "tuesday" },
        { label: "Wednesday", value: "wednesday" },
        { label: "Thursday", value: "thursday" },
        { label: "Friday", value: "friday" },
        { label: "Saturday", value: "saturday" },
        { label: "Sunday", value: "sunday" },
      ],
    }),

    localDate: text({
      ui: {
        description: "MedSpa-local YYYY-MM-DD date for one-time and time-off entries",
      },
    }),

    // Legacy timestamp mirror for one-time or time-off entries
    date: timestamp({
      ui: {
        description: "Specific date for one-time schedule or time-off",
      },
    }),

    startTime: text({
      validation: { isRequired: true },
      ui: {
        description: "Start time in HH:MM format (e.g., 09:00)",
      },
    }),

    endTime: text({
      validation: { isRequired: true },
      ui: {
        description: "End time in HH:MM format (e.g., 17:00)",
      },
    }),

    isAvailable: checkbox({
      defaultValue: true,
      ui: {
        description: "Whether provider is available on this day (false for time off)",
      },
    }),

    isPublic: checkbox({
      defaultValue: false,
      ui: {
        description: "Explicit storefront scheduling flag. Returned times remain request options, not confirmed availability.",
      },
    }),

    // Break times
    breakStart: text({
      ui: {
        description: "Lunch/break start time in HH:MM format",
      },
    }),

    breakEnd: text({
      ui: {
        description: "Lunch/break end time in HH:MM format",
      },
    }),

    reason: text({
      ui: {
        displayMode: "textarea",
        description: "Reason for time-off or special schedule",
      },
    }),

    // Schedule validity period
    effectiveFrom: timestamp({
      ui: {
        description: "When this schedule starts being effective",
      },
    }),

    effectiveTo: timestamp({
      ui: {
        description: "When this schedule ends (null for ongoing recurring schedules)",
      },
    }),

    // Legacy fields
    effectiveDate: timestamp({
      ui: {
        description: "When this schedule starts being effective (legacy - use effectiveFrom)",
      },
    }),

    endDate: timestamp({
      ui: {
        description: "When this schedule ends (legacy - use effectiveTo)",
      },
    }),

    location: relationship({ ref: "Location.schedules" }),

    // Relationship to provider
    provider: relationship({
      ref: "Provider.schedules",
      ui: {
        displayMode: "select",
      },
    }),

    ...trackingFields,
  },
});
