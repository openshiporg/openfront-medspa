import { tenantFilter } from './tenantAccess';
import { list } from "@keystone-6/core";
import {
  text,
  relationship,
  checkbox,
  json,
  select,
  integer,
} from "@keystone-6/core/fields";

import { permissions } from "../access";

import { trackingFields } from "./trackingFields";

export const FormTemplate = list({
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
      initialColumns: ["name", "type", "isActive", "requiredForCategories"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    version: integer({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    name: text({
      validation: { isRequired: true },
      ui: {
        description: "Versioned intake, acknowledgement, or consultation form name",
      },
    }),

    type: select({
      type: "string",
      options: [
        { label: "Intake", value: "intake" },
        { label: "Consent", value: "consent" },
        { label: "Clinical Intake", value: "clinical_intake" },
        { label: "Waiver", value: "waiver" },
      ],
      defaultValue: "intake",
      ui: {
        displayMode: "select",
        description: "Type of form",
      },
    }),

    description: text({
      ui: {
        displayMode: "textarea",
        description: "Description of the form's purpose",
      },
    }),

    fields: json({
      ui: {
        description: `JSON array of field definitions: [{id, type (text/textarea/checkbox/radio/select/signature/file), label, required, options (for select/radio), validation}]`,
      },
    }),

    isActive: checkbox({
      defaultValue: true,
      ui: {
        description: "Whether this form is currently active",
      },
    }),

    requiredForCategories: relationship({
      ref: "ServiceCategory",
      many: true,
      ui: {
        displayMode: "select",
        description: "Service categories that require this form",
      },
    }),

    submissions: relationship({
      ref: "FormSubmission.template",
      many: true,
      ui: {
        displayMode: "count",
      },
    }),

    metadata: json({
      ui: {
        description: "Additional form metadata",
      },
    }),
    ...trackingFields,
  },
});
