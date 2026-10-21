import { list, graphql } from "@keystone-6/core";
import { allOperations } from "@keystone-6/core/access";
import {
  integer,
  relationship,
  text,
  json,
  virtual,
} from "@keystone-6/core/fields";

import { permissions, rules } from "../access";
import { trackingFields } from "./trackingFields";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

export const AppointmentLineItem = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadAppointmentLineItems,
    },
  },
  ui: {
    listView: {
      initialColumns: ["serviceTitle", "staff", "duration", "price", "appointment"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    service: relationship({
      ref: "Service",
      ui: {
        displayMode: "select",
        description: "Service being provided",
      },
    }),

    staff: relationship({
      ref: "Provider",
      ui: {
        displayMode: "select",
        description: "Staff member providing this service",
      },
    }),

    serviceTitle: text({
      validation: { isRequired: true, length: { max: 300 } },
      ui: {
        description: "Immutable service title captured when the appointment was booked",
      },
    }),

    serviceImagePath: text({
      ui: {
        description: "Immutable canonical relative service media path captured at booking",
      },
    }),

    duration: integer({
      defaultValue: 60,
      validation: { isRequired: true, min: 1 },
      ui: {
        description: "Immutable service duration captured at booking",
      },
    }),

    price: integer({
      validation: { isRequired: true, min: 0 },
      ui: {
        description: "Price in cents",
      },
    }),

    quantity: integer({
      defaultValue: 1,
      validation: { isRequired: true, min: 1 },
      ui: {
        description: "Quantity of this service (usually 1)",
      },
    }),

    notes: text({
      ui: {
        displayMode: "textarea",
        description: "Special requests or notes for this service",
      },
    }),

    appointment: relationship({
      ref: "Appointment.lineItems",
      ui: {
        displayMode: "select",
        description: "Related appointment",
      },
    }),

    metadata: json({
      ui: {
        description: "Additional metadata for the line item",
      },
    }),

    formattedPrice: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context) {
          const lineItemId = (item as { id: string }).id;
          const lineItem = await context.sudo().query.AppointmentLineItem.findOne({
            where: { id: lineItemId },
            query: "price",
          });

          if (!lineItem?.price) return "$0.00";
          return formatCurrency(lineItem.price);
        },
      }),
    }),

    formattedTotal: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context) {
          const lineItemId = (item as { id: string }).id;
          const lineItem = await context.sudo().query.AppointmentLineItem.findOne({
            where: { id: lineItemId },
            query: "price quantity",
          });

          if (!lineItem?.price || !lineItem?.quantity) return "$0.00";
          const total = lineItem.price * lineItem.quantity;
          return formatCurrency(total);
        },
      }),
    }),

    ...trackingFields,
  },
});
