import { tenantFilter } from './tenantAccess';
import { list } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  text,
  checkbox,
  relationship,
} from "@keystone-6/core/fields";

import { activeListPermissions, permissions } from "../access";

import { trackingFields } from "./trackingFields";
import { validateTenantInput } from "./tenantAccess";

export const WidgetConfiguration = list({
  hooks: { validateInput: validateTenantInput },
  access: {
    operation: {
      query: permissions.canManagePractice,
      create: activeListPermissions.canManagePractice,
      update: activeListPermissions.canManagePractice,
      delete: activeListPermissions.canManagePractice,
    },
    filter: { query: tenantFilter, update: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false, delete: ({ session }) => session?.data.practice?.id ? { practice: { id: { equals: session.data.practice.id } } } : false },
  },
  ui: {
    listView: {
      initialColumns: ["name", "primaryColor", "showServices", "showProviders"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    // Widget name/identifier
    name: text({
      validation: { isRequired: true },
      isIndexed: "unique",
      ui: {
        description: "Unique name for this widget configuration",
      },
    }),

    // Branding colors
    primaryColor: text({
      defaultValue: "#000000",
      ui: {
        description: "Primary brand color in hex format (e.g., #FF5733)",
      },
    }),

    secondaryColor: text({
      defaultValue: "#FFFFFF",
      ui: {
        description: "Secondary brand color in hex format (e.g., #333333)",
      },
    }),

    // Logo
    logoUrl: text({
      ui: {
        description: "URL to the medspa logo for the widget",
      },
    }),

    // Display options
    showServices: checkbox({
      defaultValue: true,
      ui: {
        description: "Show service selection in the booking widget",
      },
    }),

    showProviders: checkbox({
      defaultValue: true,
      ui: {
        description: "Show provider selection in the booking widget",
      },
    }),

    // Custom styling
    customCSS: text({
      ui: {
        displayMode: "textarea",
        description: "Custom CSS to override widget styles",
      },
    }),

    // Embed code (generated)
    embedCode: text({
      ui: {
        displayMode: "textarea",
        description: "Generated embed code for external websites",
      },
    }),

    // Additional settings
    buttonText: text({
      defaultValue: "Book Now",
      ui: {
        description: "Text displayed on the booking button",
      },
    }),

    welcomeMessage: text({
      ui: {
        displayMode: "textarea",
        description: "Welcome message displayed in the widget",
      },
    }),

    // Widget dimensions
    width: text({
      defaultValue: "100%",
      ui: {
        description: "Widget width (e.g., 400px, 100%)",
      },
    }),

    height: text({
      defaultValue: "600px",
      ui: {
        description: "Widget height (e.g., 600px, auto)",
      },
    }),
    ...trackingFields,
  },
});
