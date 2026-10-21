import { tenantFilter } from './tenantAccess';
import { list } from "@keystone-6/core";
import { integer, json, relationship, select, text, timestamp } from "@keystone-6/core/fields";
import { permissions } from "../access";
import { trackingFields } from "./trackingFields";

export const DomainEvent = list({
  access: {
    operation: {
      query: permissions.canManageIntegrations,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: tenantFilter },
  },
  ui: {
    listView: { initialColumns: ["eventType", "aggregateType", "aggregateId", "operation", "status", "occurredAt"] },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    eventKey: text({ validation: { isRequired: true }, isIndexed: "unique", access: { update: () => false } }),
    eventType: text({ validation: { isRequired: true }, access: { update: () => false } }),
    eventVersion: integer({ defaultValue: 1, validation: { isRequired: true, min: 1 }, access: { update: () => false } }),
    aggregateType: text({ validation: { isRequired: true }, access: { update: () => false } }),
    aggregateId: text({ validation: { isRequired: true }, access: { update: () => false } }),
    operation: select({
      type: "enum",
      options: [
        { label: "Create", value: "create" },
        { label: "Update", value: "update" },
        { label: "Delete", value: "delete" },
      ],
      validation: { isRequired: true },
      access: { update: () => false },
    }),
    actorId: text({ validation: { isRequired: true }, access: { update: () => false } }),
    locationId: text({ access: { update: () => false } }),
    payload: json({ access: { update: () => false } }),
    payloadHash: text({ validation: { isRequired: true }, access: { update: () => false } }),
    occurredAt: timestamp({ validation: { isRequired: true }, access: { update: () => false } }),
    status: select({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Delivered", value: "delivered" },
        { label: "Dead letter", value: "dead_letter" },
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
    }),
    attempts: integer({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    availableAt: timestamp({ defaultValue: { kind: "now" }, validation: { isRequired: true } }),
    deliveredAt: timestamp(),
    lastError: text({ ui: { displayMode: "textarea" } }),
    ...trackingFields,
  },
});
