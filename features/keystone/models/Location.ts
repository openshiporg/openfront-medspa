import { list } from "@keystone-6/core";
import {
  text,
  checkbox,
  json,
  relationship,
} from "@keystone-6/core/fields";

import { activeListPermissions, practiceId } from "../access";
import { createLifecycleHooks } from "../lifecycle";
import { trackingFields } from "./trackingFields";
import { validateTenantInput } from './tenantAccess';

export const Location = list({
  access: {
    operation: {
      query: activeListPermissions.signedIn,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: ({ session }) => practiceId(session)
        ? { practice: { id: { equals: practiceId(session)! } } }
        : false,
      update: ({ session }) => practiceId(session) ? { practice: { id: { equals: practiceId(session)! } } } : false,
    },
  },
  hooks: { ...createLifecycleHooks("location", ["name", "city", "state", "timezone", "isActive"]), validateInput: validateTenantInput },
  ui: {
    listView: {
      initialColumns: ["name", "city", "state", "phone", "isActive"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice.locations" }),
    staff: relationship({ ref: "User.locations", many: true }),
    name: text({
      validation: { isRequired: true },
      ui: {
        description: "Location/branch name",
      },
    }),

    address: text({
      validation: { isRequired: true },
      ui: {
        description: "Street address",
      },
    }),

    city: text({
      validation: { isRequired: true },
      ui: {
        description: "City",
      },
    }),

    state: text({
      validation: { isRequired: true },
      ui: {
        description: "State/Province",
      },
    }),

    zipCode: text({
      validation: { isRequired: true },
      ui: {
        description: "ZIP/Postal code",
      },
    }),

    phone: text({
      ui: {
        description: "Contact phone number",
      },
    }),

    email: text({
      ui: {
        description: "Contact email address",
      },
    }),

    hours: json({
      defaultValue: {
        monday: { open: "09:00", close: "18:00", closed: false },
        tuesday: { open: "09:00", close: "18:00", closed: false },
        wednesday: { open: "09:00", close: "18:00", closed: false },
        thursday: { open: "09:00", close: "18:00", closed: false },
        friday: { open: "09:00", close: "18:00", closed: false },
        saturday: { open: "09:00", close: "17:00", closed: false },
        sunday: { open: null, close: null, closed: true },
      },
      ui: {
        description: "Business hours by day of week (JSON object with open/close times)",
      },
    }),

    timezone: text({
      defaultValue: "America/New_York",
      ui: {
        description: "Timezone for this location (e.g., America/New_York)",
      },
    }),

    isActive: checkbox({
      defaultValue: true,
      ui: {
        description: "Whether this location is currently active and accepting appointments",
      },
    }),

    resources: relationship({
      ref: "Resource.location",
      many: true,
      ui: {
        displayMode: "count",
        description: "Rooms, chairs, stations, and equipment at this location",
      },
    }),
    providers: relationship({ ref: "Provider.locations", many: true }),
    clients: relationship({ ref: "Client.homeLocation", many: true }),
    appointments: relationship({ ref: "Appointment.location", many: true }),
    schedules: relationship({ ref: "ProviderSchedule.location", many: true }),
    inventoryMovements: relationship({ ref: "InventoryMovement.location", many: true }),
    inventoryLots: relationship({ ref: "InventoryLot.location", many: true }),
    purchaseOrders: relationship({ ref: "PurchaseOrder.location", many: true }),

    ...trackingFields,
  },
});
