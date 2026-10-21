import { tenantFilter } from './tenantAccess';
import { list } from "@keystone-6/core";
import { integer, json, relationship, select, text } from "@keystone-6/core/fields";
import { permissions } from "../access";
import { createLifecycleHooks } from "../lifecycle";
import { trackingFields } from "./trackingFields";

export const InventoryMovement = list({
  access: {
    operation: {
      query: permissions.canManageInventory,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: tenantFilter },
  },
  hooks: createLifecycleHooks("inventory_movement", [
    "type", "delta", "balanceBefore", "balanceAfter", "reason", "idempotencyKey", "locationId", "productId", "appointmentId",
  ]),
  fields: {
    practice: relationship({ ref: "Practice" }),
    type: select({
      type: "enum",
      options: [
        { label: "Receive", value: "receive" },
        { label: "Adjustment", value: "adjustment" },
        { label: "Sale", value: "sale" },
        { label: "Return", value: "return" },
      ],
      validation: { isRequired: true },
    }),
    delta: integer({ validation: { isRequired: true } }),
    balanceBefore: integer({ validation: { isRequired: true, min: 0 } }),
    balanceAfter: integer({ validation: { isRequired: true, min: 0 } }),
    reason: text({ validation: { isRequired: true, length: { max: 500 } } }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: "unique" }),
    location: relationship({ ref: "Location.inventoryMovements" }),
    product: relationship({ ref: "Product.inventoryMovements" }),
    appointment: relationship({ ref: "Appointment.inventoryMovements" }),
    metadata: json({ defaultValue: {} }),
    ...trackingFields,
  },
});
