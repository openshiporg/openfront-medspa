import { list, graphql } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  select,
  relationship,
  integer,
  float,
  json,
  virtual,
} from "@keystone-6/core/fields";

import { permissions, rules } from "../access";
import { trackingFields } from "./trackingFields";
import { commissionMinor } from "../commissionAmount";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

export const MedSpaTransactionLineItem = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadMedSpaTransactionLineItems,
    },
  },
  ui: {
    listView: {
      initialColumns: ["transaction", "itemType", "service", "product", "staff", "formattedTotal"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    transaction: relationship({
      ref: "MedSpaTransaction.lineItems",
      ui: {
        displayMode: "select",
        description: "Related transaction",
      },
    }),

    itemType: select({
      type: "enum",
      options: [
        { label: "Service", value: "service" },
        { label: "Product", value: "product" },
      ],
      validation: {
        isRequired: true,
      },
    }),

    service: relationship({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "Service (if itemType is service)",
      },
    }),

    product: relationship({
      ref: "Product",
      ui: {
        displayMode: "select",
        description: "Product (if itemType is product)",
      },
    }),

    staff: relationship({
      ref: "Provider",
      ui: {
        displayMode: "select",
        description: "Staff member who provided the service",
      },
    }),

    quantity: integer({
      defaultValue: 1,
      validation: {
        isRequired: true,
      },
    }),

    unitPrice: integer({
      validation: {
        isRequired: true,
      },
      ui: {
        description: "Price per unit in cents",
      },
    }),

    discount: integer({
      defaultValue: 0,
      ui: {
        description: "Discount amount in cents",
      },
    }),

    commissionRate: float({
      ui: {
        description: "Commission rate for staff (fraction from 0 to 1)",
      },
    }),

    metadata: json({
      ui: {
        description: "Additional line item metadata",
      },
    }),

    formattedPrice: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context) {
          const lineItemId = (item as { id: string }).id;
          const lineItem = await context.sudo().query.MedSpaTransactionLineItem.findOne({
            where: { id: lineItemId },
            query: "unitPrice",
          });

          if (!lineItem?.unitPrice) return "$0.00";
          return formatCurrency(lineItem.unitPrice);
        },
      }),
    }),

    formattedTotal: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context) {
          const lineItemId = (item as { id: string }).id;
          const lineItem = await context.sudo().query.MedSpaTransactionLineItem.findOne({
            where: { id: lineItemId },
            query: "unitPrice quantity discount",
          });

          if (!lineItem?.unitPrice || !lineItem?.quantity) return "$0.00";
          const total = (lineItem.unitPrice * lineItem.quantity) - (lineItem.discount || 0);
          return formatCurrency(total);
        },
      }),
    }),

    commissionAmount: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context) {
          const lineItemId = (item as { id: string }).id;
          const lineItem = await context.sudo().query.MedSpaTransactionLineItem.findOne({
            where: { id: lineItemId },
            query: "unitPrice quantity discount commissionRate",
          });

          if (!lineItem?.unitPrice || !lineItem?.quantity || !lineItem?.commissionRate) {
            return "$0.00";
          }

          const total = (lineItem.unitPrice * lineItem.quantity) - (lineItem.discount || 0);
          const commission = commissionMinor(total, lineItem.commissionRate);
          return formatCurrency(commission);
        },
      }),
    }),

    ...trackingFields,
  },
});
