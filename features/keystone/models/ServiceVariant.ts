import { list, graphql } from "@keystone-6/core";
import {
  text,
  relationship,
  integer,
  virtual,
} from "@keystone-6/core/fields";

import { activeListPermissions, practiceId, rules } from "../access";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

import { trackingFields } from "./trackingFields";
import { validateTenantInput } from "./tenantAccess";
import { validateServiceVariantTenantLinks } from "../serviceVariantTenantScope";

export const ServiceVariant = list({
  hooks: {
    validateInput: async (args) => {
      await validateTenantInput(args);
      await validateServiceVariantTenantLinks({
        practiceId: practiceId(args.context.session),
        operation: args.operation,
        resolvedData: args.resolvedData,
        item: args.item,
        findServices: (query) => args.context.sudo().query.Service.findMany(query),
        addValidationError: args.addValidationError,
      });
    },
  },
  access: {
    operation: {
      query: () => true,
      create: activeListPermissions.canManagePractice,
      update: activeListPermissions.canManagePractice,
      delete: activeListPermissions.canManagePractice,
    },
    filter: { query: rules.canReadServiceVariants, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false },
  },
  ui: {
    listView: {
      initialColumns: ["name", "service", "price", "duration", "displayOrder"],
    },
    labelField: "name",
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    name: text({
      validation: { isRequired: true },
      ui: {
        description: "Variant name (e.g., Junior Provider, Senior Provider, Master Provider)",
      },
    }),

    service: relationship({
      ref: "Service.variants",
      ui: {
        displayMode: "select",
        description: "The service this variant belongs to",
      },
    }),

    price: integer({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Price in cents (overrides base service price if set)",
      },
    }),

    duration: integer({
      ui: {
        description: "Duration in minutes (overrides base service duration if different)",
      },
    }),

    staffLevel: text({
      ui: {
        description: "Staff level/tier this variant applies to (e.g., junior, senior, master)",
      },
    }),

    displayOrder: integer({
      defaultValue: 0,
      ui: {
        description: "Order in which this variant appears",
      },
    }),

    formattedPrice: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context) {
          const variantId = (item as { id: string }).id;
          const variant = await context.sudo().query.ServiceVariant.findOne({
            where: { id: variantId },
            query: "price",
          });

          if (!variant?.price) return "$0.00";
          return formatCurrency(variant.price);
        },
      }),
    }),
    ...trackingFields,
  },
});
