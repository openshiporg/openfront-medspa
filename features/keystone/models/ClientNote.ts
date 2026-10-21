import { list } from "@keystone-6/core";
import {
  relationship,
  checkbox,
  text,
  timestamp,
} from "@keystone-6/core/fields";

import { activeListPermissions } from "../access";

import { trackingFields } from "./trackingFields";
import { tenantFilter } from "./tenantAccess";

export const ClientNote = list({
  access: {
    operation: {
      query: async args => (await activeListPermissions.canManageClinical(args)) || (await activeListPermissions.canManageSensitiveRecords(args)),
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: tenantFilter },
  },
  ui: {
    listView: {
      initialColumns: ["client", "author", "isPrivate", "createdAt"],
    },
  },
  fields: {
    client: relationship({
      ref: "Client",
      ui: {
        displayMode: "select",
        description: "Client this note is about",
      },
    }),

    author: relationship({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who wrote this note",
      },
    }),

    content: text({
      ui: {
        displayMode: "textarea",
        description: "Note content",
      },
      validation: {
        isRequired: true,
      },
    }),

    isPrivate: checkbox({
      defaultValue: true,
      ui: {
        description: "Visible only to staff (not shown to client)",
      },
    }),

    appointment: relationship({
      ref: "Appointment",
      ui: {
        displayMode: "select",
        description: "Related appointment (if any)",
      },
    }),

    practice: relationship({ ref: "Practice" }),
    type: text({ defaultValue: "clinical" }), status: text({ defaultValue: "signed" }),
    signedAt: timestamp(), evidenceHash: text(), idempotencyKey: text({ isIndexed: "unique" }), lateEntryReason: text(),
    supersedes: relationship({ ref: "ClientNote.supersededBy" }), supersededBy: relationship({ ref: "ClientNote.supersedes" }),
    assets: relationship({ ref: "ClientAsset.note", many: true }),

    ...trackingFields,
  },
});
