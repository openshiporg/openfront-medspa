import { list } from "@keystone-6/core";
import {
  text,
  integer,
  checkbox,
  relationship,
  select,
} from "@keystone-6/core/fields";

import { activeListPermissions, permissions, practiceId, rules } from "../access";
import { createLifecycleHooks } from "../lifecycle";

import { trackingFields } from "./trackingFields";

export const Product = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadProducts,
    },
  },
  hooks: createLifecycleHooks("product", ["name", "sku", "price", "cost", "quantity", "reorderPoint", "isActive"]),
  ui: {
    listView: {
      initialColumns: ["name", "sku", "price", "quantity", "category", "isActive"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    kind: select({ type: "enum", options: [
      { label: "Retail", value: "retail" },
      { label: "Treatment Consumable", value: "consumable" },
      { label: "Both", value: "both" },
    ], defaultValue: "retail", validation: { isRequired: true } }),
    trackLots: checkbox({ defaultValue: true }),
    name: text({
      validation: { isRequired: true },
      ui: {
        description: "Product name",
      },
    }),

    sku: text({
      isIndexed: "unique",
      ui: {
        description: "Stock Keeping Unit - unique product identifier",
      },
    }),

    price: integer({
      validation: { isRequired: true },
      ui: {
        description: "Retail price",
      },
    }),

    cost: integer({
      access: { read: activeListPermissions.canManageInventory, create: () => false, update: () => false },
      ui: {
        description: "Wholesale/cost price for profit tracking",
      },
    }),

    quantity: integer({
      access: { read: activeListPermissions.canManageInventory, create: () => false, update: () => false },
      defaultValue: 0,
      ui: {
        description: "Current stock quantity",
      },
    }),

    reorderPoint: integer({
      access: { read: activeListPermissions.canManageInventory, create: () => false, update: () => false },
      defaultValue: 5,
      ui: {
        description: "Minimum quantity before reorder alert",
      },
    }),

    category: text({
      ui: {
        description: "Product category (e.g., Shampoo, Conditioner, Styling, Color)",
      },
    }),

    description: text({
      ui: {
        displayMode: "textarea",
        description: "Product description",
      },
    }),

    image: relationship({
      ref: "MedSpaImage",
      ui: {
        displayMode: "cards",
        cardFields: ["image", "altText"],
        inlineCreate: { fields: ["image", "altText"] },
        inlineEdit: { fields: ["image", "altText"] },
      },
    }),

    isActive: checkbox({
      defaultValue: true,
      ui: {
        description: "Whether this product is available for sale",
      },
    }),
    inventoryMovements: relationship({ ref: "InventoryMovement.product", many: true }),
    inventoryLots: relationship({ ref: "InventoryLot.product", many: true }),
    ...trackingFields,
  },
});
