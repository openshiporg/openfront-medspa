import { list } from "@keystone-6/core";
import { checkbox, json, relationship, select, text } from "@keystone-6/core/fields";
import { activeListPermissions, permissions } from "../access";
import { trackingFields } from "./trackingFields";
import { tenantFilter, validateTenantInput } from "./tenantAccess";

export const PaymentProvider = list({
  hooks: { validateInput: async args => {
    await validateTenantInput(args);
    const adapter = args.resolvedData.adapter ?? args.item?.adapter;
    const installed = args.resolvedData.isInstalled ?? args.item?.isInstalled;
    if (adapter === "stripe" && installed === true) args.addValidationError("Stripe is not launch-enabled until durable refund outbox reconciliation is implemented");
  } },
  access: {
    operation: {
      query: permissions.canManageIntegrations,
      create: activeListPermissions.canManageIntegrations,
      update: activeListPermissions.canManageIntegrations,
      delete: activeListPermissions.canManageIntegrations,
    },
    filter: { query: tenantFilter, update: tenantFilter, delete: tenantFilter },
  },
  ui: {
    listView: {
      initialColumns: ["name", "code", "adapter", "isInstalled", "isDefault"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    name: text({ validation: { isRequired: true } }),
    code: text({
      isIndexed: "unique",
      validation: {
        isRequired: true,
        match: {
          regex: /^pp_[a-z0-9_-]+$/,
          explanation: "Provider codes must start with pp_ and contain lowercase letters, numbers, underscores, or hyphens.",
        },
      },
    }),
    adapter: select({
      type: "enum",
      validation: { isRequired: true },
      options: [
        { label: "Manual / terminal", value: "manual" },
        { label: "Stripe", value: "stripe" },
      ],
    }),
    isInstalled: checkbox({ defaultValue: false }),
    isDefault: checkbox({ defaultValue: false }),
    config: json({
      defaultValue: {},
      ui: {
        description: "Non-secret provider configuration only. API keys and webhook secrets are read from environment variables by the adapter.",
      },
    }),
    sessions: relationship({ ref: "PaymentSession.provider", many: true }),
    webhookEvents: relationship({ ref: "PaymentWebhookEvent.provider", many: true }),
    ...trackingFields,
  },
});
