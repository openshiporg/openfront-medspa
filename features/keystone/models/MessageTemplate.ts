import { tenantFilter } from './tenantAccess';
import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  text,
  select,
  json,
  checkbox,
  relationship,
} from "@keystone-6/core/fields";

import { activeListPermissions, permissions } from "../access";

import { trackingFields } from "./trackingFields";
import { validateTenantInput } from "./tenantAccess";

export const MessageTemplate = list({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: permissions.canManageCommunications,
      create: activeListPermissions.canManageCommunications,
      update: activeListPermissions.canManageCommunications,
      delete: activeListPermissions.canManageCommunications,
    },
    filter: { query: tenantFilter, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false },
  },
  ui: {
    listView: {
      initialColumns: ["name", "type", "isActive"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    name: text({
      validation: { isRequired: true },
      ui: {
        description: "Template name for identification",
      },
    }),

    type: select({
      type: "string",
      options: [
        { label: "Reminder", value: "reminder" },
        { label: "Confirmation", value: "confirmation" },
        { label: "Marketing", value: "marketing" },
      ],
      validation: { isRequired: true },
      ui: {
        description: "Type of message template",
      },
    }),

    content: text({
      validation: { isRequired: true },
      ui: {
        displayMode: "textarea",
        description: "Message content with variables like {{clientName}}, {{appointmentDate}}, {{providerName}}",
      },
    }),

    variables: json({
      ui: {
        description: "Available variables for this template, e.g., [\"clientName\", \"appointmentDate\", \"providerName\"]",
      },
    }),

    isActive: checkbox({
      defaultValue: true,
      ui: {
        description: "Whether this template is currently active and available for use",
      },
    }),
    ...trackingFields,
  },
});
