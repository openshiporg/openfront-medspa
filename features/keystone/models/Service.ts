import { list, graphql, group } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  text,
  relationship,
  integer,
  checkbox,
  json,
  select,
  virtual,
} from "@keystone-6/core/fields";

import { activeListPermissions, practiceId, rules } from "../access";
import { trackingFields } from "./trackingFields";
import { validateTenantInput } from "./tenantAccess";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const Service = list({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: () => true,
      create: activeListPermissions.canManagePractice,
      update: activeListPermissions.canManagePractice,
      delete: activeListPermissions.canManagePractice,
    },
    filter: {
      query: rules.canReadServices,
      update: ({ session }) => practiceId(session) ? { practice: { id: { equals: practiceId(session)! } } } : false,
      delete: ({ session }) => practiceId(session) ? { practice: { id: { equals: practiceId(session)! } } } : false,
    },
  },
  ui: {
    listView: {
      initialColumns: ["name", "category", "basePrice", "baseDuration"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    currencyCode: text({ defaultValue: "USD", validation: { isRequired: true } }),
    cleanupBufferMinutes: integer({ defaultValue: 15, validation: { min: 0, max: 240 } }),
    staffAuthorizationRequired: checkbox({
      defaultValue: true,
      ui: { description: "Requires an active configured ProviderAuthorization before booking or treatment. This is not a licensure verification claim." },
    }),
    name: text({
      validation: { isRequired: true },
      ui: {
        description: "Public treatment or consultation service name",
      },
    }),

    description: text({
      ui: {
        displayMode: "textarea",
      },
    }),

    baseDuration: integer({
      validation: { isRequired: true },
      ui: {
        description: "Duration in minutes",
      },
    }),

    // Price in cents for consistency with other models
    price: integer({
      validation: { isRequired: true },
      ui: {
        description: "Base price in cents",
      },
    }),

    // Deprecated alias retained for API compatibility; values are cents.
    basePrice: integer({
      ui: {
        description: "Base price in cents (deprecated; use price)",
      },
    }),

    depositRequired: checkbox({
      defaultValue: false,
      ui: {
        description: "Whether a deposit is required to book this service",
      },
    }),

    depositAmount: integer({
      ui: {
        description: "Deposit amount required in cents",
      },
    }),

    status: select({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      defaultValue: "active",
    }),

    isPublic: checkbox({
      defaultValue: false,
      access: {
        read: () => true,
        create: activeListPermissions.canManagePractice,
        update: activeListPermissions.canManagePractice,
      },
      ui: { description: "Explicit public-catalog publication flag. Active status alone never publishes a service." },
    }),

    metadata: json({
      access: { read: activeListPermissions.canAccessDashboard, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice },
      ui: {
        description: "Additional service metadata",
      },
    }),

    pricingTier: json({
      ui: {
        description: "Pricing by provider tier, e.g., {junior: 50, senior: 75, master: 100}",
      },
    }),

    requiresConsultation: checkbox({
      defaultValue: false,
      ui: {
        description: "Whether this service requires a consultation first",
      },
    }),

    requiresIntakeReview: checkbox({
      defaultValue: true,
      ui: { description: "Whether authorized staff must review current intake before treatment starts" },
    }),

    requiresLotTraceability: checkbox({ access: { read: activeListPermissions.canAccessDashboard, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice }, defaultValue: true, ui: { description: "Fail-closed: disable only for approved services that administer no tracked product." } }),
    clinicalProducts: relationship({ access: { read: activeListPermissions.canAccessDashboard, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice }, ref: "Product", many: true, ui: { description: "Approved products/lots for treatment administration." } }),

    // Public Service rows retain catalog fields, but generic relationship traversal is operator-only.
    // Target list filters also keep authorized operators inside their current practice.
    category: relationship({
      access: { read: rules.canReadServiceRelationships },
      ref: "ServiceCategory.services",
      ui: {
        displayMode: "select",
      },
    }),

    // Image relationship (optional - for service photos)
    image: relationship({
      access: { read: rules.canReadServiceRelationships },
      ref: "MedSpaImage",
      ui: {
        displayMode: "cards",
        cardFields: ["image", "imagePath", "altText"],
        inlineCreate: { fields: ["imagePath", "altText"] },
        inlineEdit: { fields: ["imagePath", "altText"] },
      },
    }),

    // Providers who specialize in this service
    specialists: relationship({
      ref: "Provider.specializations",
      many: true,
      ui: {
        displayMode: "count",
      },
    }),

    requiredResources: relationship({
      access: { read: activeListPermissions.canAccessDashboard, create: activeListPermissions.canManagePractice, update: activeListPermissions.canManagePractice },
      ref: "Resource.services",
      many: true,
      ui: {
        displayMode: "count",
        description: "Rooms, devices, stations, or equipment required to deliver this service",
      },
    }),

    reviews: relationship({
      ref: "Review.service",
      many: true,
      ui: {
        displayMode: "count",
      },
    }),

    variants: relationship({
      ref: "ServiceVariant.service",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["name", "price", "duration", "staffLevel"],
        inlineCreate: { fields: ["name", "price", "duration", "staffLevel", "displayOrder"] },
        inlineEdit: { fields: ["name", "price", "duration", "staffLevel", "displayOrder"] },
        description: "Pricing variants by provider tier",
      },
    }),

    formattedPrice: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context) {
          const serviceId = (item as { id: string }).id;
          const service = await context.sudo().query.Service.findOne({
            where: { id: serviceId },
            query: "price",
          });

          if (!service?.price) return "$0.00";
          return formatCurrency(service.price / 100);
        },
      }),
    }),

    ...trackingFields,
  },
});
