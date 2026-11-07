/**
 * Almost every Med Spa list is command-only (`delete: () => false`). The few that can still be
 * deleted are catalog and setup records, and their history is ON DELETE SET NULL (or a cascading
 * join row), so a delete would quietly strip it: a service vanishes from booked appointments,
 * charts, consents, sales lines and commissions; a vendor from purchase orders and lots; a provider
 * from the payments it processed. Those deletes are refused while history exists, with the real
 * retire option; a record nothing points at can still be deleted.
 * `deleteHistoryGuard.test.ts` checks every entry against the Prisma schema.
 */
type Ref = { model: string; relation: string; one: string; many: string; list?: boolean };
const ref = (model: string, relation: string, one: string, many = `${one}s`, list = false): Ref => ({ model, relation, one, many, list });

export const DELETE_HISTORY: Record<string, { references: Ref[]; instead: string }> = {
  Service: {
    instead: 'Set the service to Inactive instead of deleting it.',
    references: [
      ref('appointment', 'services', 'appointment', 'appointments', true),
      ref('appointmentLineItem', 'service', 'appointment line', 'appointment lines'),
      ref('medSpaTransactionLineItem', 'service', 'sale line', 'sale lines'),
      ref('treatmentSession', 'service', 'treatment record'),
      ref('treatmentAdministration', 'service', 'administration record'),
      ref('consentRecord', 'service', 'signed consent'),
      ref('clinicalOrder', 'service', 'clinical order'),
      ref('commission', 'service', 'commission'),
      ref('clientPackageUsage', 'service', 'package redemption'),
      ref('servicePackage', 'services', 'package', 'packages', true),
      ref('membership', 'includedServices', 'membership plan', 'membership plans', true),
    ],
  },
  ServiceCategory: {
    instead: 'Move those services to another category first.',
    references: [ref('service', 'category', 'service'), ref('serviceCategory', 'parent', 'subcategory', 'subcategories')],
  },
  Vendor: {
    instead: 'Turn off Active instead of deleting the vendor.',
    references: [ref('purchaseOrder', 'vendor', 'purchase order'), ref('inventoryLot', 'vendor', 'inventory lot')],
  },
  MessageTemplate: {
    instead: 'Turn off Active instead of deleting the template.',
    references: [ref('messageLog', 'template', 'sent message')],
  },
  PaymentProvider: {
    instead: 'Turn off Installed instead of deleting the provider.',
    references: [ref('paymentSession', 'provider', 'payment'), ref('paymentWebhookEvent', 'provider', 'processor event')],
  },
};

export async function deleteHistoryProblem(prisma: any, listKey: string, id: string) {
  const rule = DELETE_HISTORY[listKey];
  if (!rule) return null;
  const counts = await Promise.all(rule.references.map(r => prisma[r.model].count({ where: { [r.relation]: r.list ? { some: { id } } : { id } } })));
  const found = rule.references.map((r, i) => counts[i] ? `${counts[i]} ${counts[i] === 1 ? r.one : r.many}` : '').filter(Boolean);
  return found.length ? `This is used by ${found.join(', ')}. ${rule.instead}` : null;
}

/** For `hooks.validateDelete` (these lists use `validateInput`, not `validate`). */
export function historyDeleteGuard(listKey: string) {
  return async ({ item, context, addValidationError }: any) => {
    const problem = await deleteHistoryProblem(context.prisma, listKey, String(item.id));
    if (problem) addValidationError(problem);
  };
}
