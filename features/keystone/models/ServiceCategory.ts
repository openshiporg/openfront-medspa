import { list, graphql } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import { text, relationship, integer, checkbox, virtual } from "@keystone-6/core/fields";

import { activeListPermissions, rules } from "../access";
import { trackingFields } from "./trackingFields";
import { validateTenantInput } from "./tenantAccess";
import { categoryChildrenRemainInPractice } from "../serviceCategoryPolicy";

export const ServiceCategory = list({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: () => true, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice, delete: activeListPermissions.canManagePractice,
    },
    filter: { query: rules.canReadServiceCategories, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false },
  },
  ui: {
    listView: {
      initialColumns: ["name", "sortOrder", "services"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    name: text({
      validation: { isRequired: true },
      ui: {
        description: "Category name (e.g., Hair, Nails, Skin, Massage, Makeup)",
      },
    }),

    description: text({
      ui: {
        displayMode: "textarea",
      },
    }),

    slug: text({
      isIndexed: "unique",
      ui: {
        description: "URL-friendly slug (auto-generated from name)",
      },
    }),

    parent: relationship({
      ref: "ServiceCategory",
      ui: {
        displayMode: "select",
        description: "Parent category (for subcategories)",
      },
    }),

    displayOrder: integer({
      defaultValue: 0,
      ui: {
        description: "Sort order for display",
      },
    }),

    // Legacy field
    sortOrder: integer({
      defaultValue: 0,
      ui: {
        description: "Order in which categories appear in the service menu (legacy)",
      },
    }),

    isVisible: checkbox({
      defaultValue: true,
      ui: {
        description: "Whether this category is visible on the storefront",
      },
    }),

    icon: text({
      ui: {
        description: "Icon name or emoji for the category",
      },
    }),

    // Relationships
    services: relationship({
      ref: "Service.category",
      many: true,
      access: { read: ({ context, item }) => categoryChildrenRemainInPractice(context, item) },
      ui: {
        displayMode: "cards",
        cardFields: ["name", "basePrice", "baseDuration"],
        inlineCreate: { fields: ["name", "basePrice", "baseDuration"] },
        inlineEdit: { fields: ["name", "basePrice", "baseDuration"] },
      },
    }),

    ...trackingFields,
  },
});
