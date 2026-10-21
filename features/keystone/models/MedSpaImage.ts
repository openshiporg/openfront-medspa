import { list } from "@keystone-6/core";
import { text, json, image, relationship } from "@keystone-6/core/fields";

import { activeListPermissions, rules } from "../access";

import { trackingFields } from "./trackingFields";
import { validateTenantInput } from "./tenantAccess";

export const MedSpaImage = list({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: () => true, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice, delete: activeListPermissions.canManagePractice,
    },
    filter: { query: rules.canReadMedSpaImages, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false },
  },
  ui: {
    listView: {
      initialColumns: ["altText", "imagePath", "image"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    image: image({
      storage: "my_images",
    }),
    imagePath: text({
      ui: {
        description: "Relative public image path (for example /images/services/signature-cut-blowout.svg)",
      },
    }),
    altText: text({
      ui: {
        description: "Alternative text for the image (accessibility)",
      },
    }),
    metadata: json({
      access: { read: activeListPermissions.canManagePractice },
      ui: {
        description: "Additional metadata about the image",
      },
    }),
    ...trackingFields,
  },
});
