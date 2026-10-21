import { list, graphql, group } from "@keystone-6/core";
import type { KeystoneContext } from '@keystone-6/core/types';
import {
  select,
  relationship,
  integer,
  text,
  timestamp,
  json,
  virtual,
} from "@keystone-6/core/fields";

import { rules } from "../access";
import { createLifecycleHooks } from "../lifecycle";
import { trackingFields } from "./trackingFields";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

async function recordedSettlementAmount(context: KeystoneContext, transactionId: string, field: 'tax' | 'totalAmount') {
  const transaction = await context.sudo().query.MedSpaTransaction.findOne({
    where: { id: transactionId },
    query: `id practice { id } appointment { transaction { id } payment { id status currencyCode tax totalAmount practice { id } } }`,
  });
  const payment = transaction?.appointment?.payment;
  if (!transaction || transaction.appointment?.transaction?.id !== transaction.id || !payment
    || !transaction.practice?.id || payment.practice?.id !== transaction.practice.id
    || !['completed', 'partially_refunded', 'refunded'].includes(payment.status)
    || !Number.isSafeInteger(payment[field]) || payment[field] < 0 || !/^[A-Z]{3}$/.test(payment.currencyCode || '')) return 'Recorded amount unavailable';
  // This checkout currently supports USD. Do not infer another currency's exponent.
  return payment.currencyCode === 'USD' ? formatCurrency(payment[field]) : `${payment[field]} ${payment.currencyCode} minor units`;
}

export const MedSpaTransaction = list({
  access: {
    operation: {
      query: () => true,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: {
      query: rules.canReadMedSpaTransactions,
    },
  },
  hooks: createLifecycleHooks("medspa_transaction", ["type", "tip", "paymentMethod", "paymentStatus", "status", "completedAt", "locationId", "clientId", "appointmentId", "staffId"]),
  ui: {
    listView: {
      initialColumns: ["type", "client", "staff", "total", "paymentStatus", "status"],
    },
  },
  fields: {
    practice: relationship({ ref: "Practice" }),
    currencyCode: text({ defaultValue: "USD", validation: { isRequired: true } }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: "unique" }),
    type: select({
      type: "enum",
      options: [
        { label: "Appointment", value: "appointment" },
        { label: "Walk-in", value: "walk_in" },
        { label: "Retail", value: "retail" },
      ],
      defaultValue: "appointment",
      validation: {
        isRequired: true,
      },
    }),

    location: relationship({ ref: "Location" }),

    client: relationship({
      ref: "Client",
      ui: {
        displayMode: "select",
        description: "Client (optional for walk-ins)",
      },
    }),

    appointment: relationship({
      ref: "Appointment.transaction",
      ui: {
        displayMode: "select",
        description: "Appointment being checked out",
      },
    }),

    staff: relationship({
      ref: "Provider",
      ui: {
        displayMode: "select",
        description: "Staff member who processed the transaction",
      },
    }),

    lineItems: relationship({
      ref: "MedSpaTransactionLineItem.transaction",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["itemType", "service", "product", "formattedTotal"],
      },
    }),

    tip: integer({
      defaultValue: 0,
      ui: {
        description: "Tip amount in cents",
      },
    }),

    paymentMethod: select({
      type: "enum",
      options: [
        { label: "Cash", value: "cash" },
        { label: "Card", value: "card" },
        { label: "Split", value: "split" },
        { label: "Gift Card", value: "gift_card" },
        { label: "Package", value: "package" },
      ],
      ui: {
        description: "Payment method used",
      },
    }),

    paymentStatus: select({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Paid", value: "paid" },
        { label: "Partially Paid", value: "partially_paid" },
        { label: "Refunded", value: "refunded" },
      ],
      defaultValue: "pending",
      validation: {
        isRequired: true,
      },
    }),

    status: select({
      type: "enum",
      options: [
        { label: "Open", value: "open" },
        { label: "Completed", value: "completed" },
        { label: "Voided", value: "voided" },
      ],
      defaultValue: "open",
      validation: {
        isRequired: true,
      },
    }),

    metadata: json({
      ui: {
        description: "Additional transaction metadata",
      },
    }),

    completedAt: timestamp({
      ui: {
        description: "When the transaction was completed",
      },
    }),

    ...group({
      label: "Virtual Fields",
      description: "Calculated fields for transaction totals",
      fields: {
        subtotal: virtual({
          field: graphql.field({
            type: graphql.String,
            async resolve(item, args, context) {
              const transactionId = (item as { id: string }).id;
              const transaction = await context.sudo().query.MedSpaTransaction.findOne({
                where: { id: transactionId },
                query: `
                  lineItems {
                    quantity
                    unitPrice
                    discount
                  }
                `,
              });

              if (!transaction?.lineItems?.length) return "$0.00";

              let subtotal = 0;
              for (const lineItem of transaction.lineItems) {
                const lineTotal = (lineItem.unitPrice * lineItem.quantity) - (lineItem.discount || 0);
                subtotal += lineTotal;
              }

              return formatCurrency(subtotal);
            },
          }),
        }),

        tax: virtual({
          field: graphql.field({
            type: graphql.String,
            resolve(item, _args, context) { return recordedSettlementAmount(context, String((item as { id: string }).id), 'tax'); },
          }),
        }),

        discount: virtual({
          field: graphql.field({
            type: graphql.String,
            async resolve(item, args, context) {
              const transactionId = (item as { id: string }).id;
              const transaction = await context.sudo().query.MedSpaTransaction.findOne({
                where: { id: transactionId },
                query: `
                  lineItems {
                    discount
                  }
                `,
              });

              if (!transaction?.lineItems?.length) return "$0.00";

              const totalDiscount = transaction.lineItems.reduce(
                (sum: number, item: { discount?: number | null }) => sum + (item.discount || 0),
                0
              );

              if (totalDiscount === 0) return "$0.00";
              return formatCurrency(totalDiscount);
            },
          }),
        }),

        total: virtual({
          field: graphql.field({
            type: graphql.String,
            resolve(item, _args, context) { return recordedSettlementAmount(context, String((item as { id: string }).id), 'totalAmount'); },
          }),
        }),
      },
    }),

    ...trackingFields,
  },
});
