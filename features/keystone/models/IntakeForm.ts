import { tenantFilter } from './tenantAccess';
import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  text,
  relationship,
  checkbox,
  json,
} from "@keystone-6/core/fields";

import { permissions } from "../access";

import { trackingFields } from "./trackingFields";

export const IntakeForm = list({
  access: {
    operation: {
      query: permissions.canManageClinical,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: tenantFilter },
  },
  ui: {
    listView: {
      initialColumns: ["name", "isActive", "requiredForServices"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    name: text({
      validation: { isRequired: true },
      ui: {
        description: "Form name (e.g., New Client Intake, Color Consultation)",
      },
    }),

    // JSON schema for form fields
    fields: json({
      ui: {
        description: "JSON schema defining form fields, e.g., [{name: 'allergies', type: 'text', required: true}, {name: 'hairGoals', type: 'textarea'}]",
      },
    }),

    // Services that require this form
    requiredForServices: relationship({
      ref: "Service",
      many: true,
      ui: {
        displayMode: "select",
        description: "Services that require this intake form to be completed",
      },
    }),

    // Whether the form is currently active
    isActive: checkbox({
      defaultValue: true,
      ui: {
        description: "Whether this form is currently in use",
      },
    }),

    // Submissions of this form
    submissions: relationship({
      ref: "FormSubmission.form",
      many: true,
      ui: {
        displayMode: "count",
      },
    }),
    ...trackingFields,
  },
});
