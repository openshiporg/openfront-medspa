import { list } from "@keystone-6/core";
import {
  text,
  relationship,
  timestamp,
  json,
  select,
  integer,
} from "@keystone-6/core/fields";

import { permissions, rules } from "../access";

import { trackingFields } from "./trackingFields";

export const FormSubmission = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadFormSubmissions,
    },
  },
  ui: {
    listView: {
      initialColumns: ["client", "form", "submittedAt", "appointment"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    templateVersion: integer({ validation: { isRequired: true, min: 1 } }),
    status: select({ type: "enum", options: [
      { label: "Submitted", value: "submitted" },
      { label: "In Review", value: "in_review" },
      { label: "Reviewed", value: "reviewed" },
      { label: "Superseded", value: "superseded" },
    ], defaultValue: "submitted", validation: { isRequired: true } }),
    reviewedBy: relationship({ ref: "User" }),
    reviewedAt: timestamp(), signedAt: timestamp(), evidenceHash: text(), idempotencyKey: text({ isIndexed: "unique" }),
    supersedes: relationship({ ref: "FormSubmission.supersededBy" }), supersededBy: relationship({ ref: "FormSubmission.supersedes" }),
    reviewActions: relationship({ ref: "IntakeReviewAction.submission", many: true }),
    // Form data stored as JSON
    data: json({
      ui: {
        description: "Form field responses as JSON object",
      },
    }),

    // Digital signature
    acknowledgement: text({
      ui: { displayMode: "textarea", description: "Bounded acknowledgement evidence; not a compliance or safety certification." },
    }),

    // Submission timestamp
    submittedAt: timestamp({
      defaultValue: { kind: "now" },
      ui: {
        description: "When the form was submitted",
      },
    }),

    // Relationships
    client: relationship({
      ref: "User.formSubmissions",
      ui: {
        displayMode: "select",
        description: "Client who submitted the form",
      },
    }),

    form: relationship({
      ref: "IntakeForm.submissions",
      ui: {
        displayMode: "select",
        description: "The intake form template that was filled out (legacy)",
      },
    }),

    template: relationship({
      ref: "FormTemplate.submissions",
      ui: {
        displayMode: "select",
        description: "The form template that was filled out",
      },
    }),

    // Optional link to appointment
    appointment: relationship({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Associated appointment (if applicable)",
      },
    }),
    ...trackingFields,
  },
});
