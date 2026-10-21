import { graphql } from "@keystone-6/core";
import type { Context } from ".keystone/types";
import { permissions } from "../access";
import { serializableWorkflow } from "./serializableWorkflow";
import { assertPracticeRecord, requireActorPractice } from "../workflowAuth";

type CommissionPayoutResult = {
  success: boolean;
  payoutCount: number;
  totalAmount: number;
  error: string | null;
};

const denied = { success: false, payoutCount: 0, totalAmount: 0 };

export async function payoutCommissionsTransaction(
  context: Context,
  commissionIds: readonly string[],
): Promise<CommissionPayoutResult> {
  try { requireActorPractice(context, permissions.canManageFinance, "Authorized finance access is required"); }
  catch (error) { return { ...denied, error: error instanceof Error ? error.message : "Authorized finance access is required" }; }

  const ids = [...new Set(commissionIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0 || ids.length > 200) {
    return { ...denied, error: "Choose between 1 and 200 commissions" };
  }

  try {
    await Promise.all(ids.map(id => assertPracticeRecord(context, "Commission", id)));
    return await serializableWorkflow(
      context,
      "medspa-commission-payout",
      ids.map((id) => `commission:${id}`),
      async (transactionContext) => {
        const sudo = transactionContext.sudo();
        const commissions = await sudo.query.Commission.findMany({
          where: { id: { in: ids } },
          take: 200,
          query: "id isPaid paidAt commissionAmount provider { id }",
        });
        if (commissions.length !== ids.length) throw new Error("One or more commissions were not found");

        const providerIds = new Set(commissions.map((commission: any) => commission.provider?.id).filter(Boolean));
        if (providerIds.size !== 1) throw new Error("A payout batch must belong to one provider");

        const paidAt = new Date().toISOString();
        let payoutCount = 0;
        for (const commission of commissions) {
          if (commission.isPaid) continue;
          await sudo.query.Commission.updateOne({
            where: { id: commission.id },
            data: { isPaid: true, paidAt },
            query: "id",
          });
          payoutCount += 1;
        }

        return {
          success: true,
          payoutCount,
          totalAmount: commissions.reduce((sum: number, commission: any) => sum + Number(commission.commissionAmount || 0), 0),
          error: null,
        };
      },
    );
  } catch (error) {
    return { ...denied, error: error instanceof Error ? error.message : "Commission payout failed" };
  }
}

const resultType = graphql.object<CommissionPayoutResult>()({
  name: "CommissionPayoutResult",
  fields: {
    success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
    payoutCount: graphql.field({ type: graphql.nonNull(graphql.Int) }),
    totalAmount: graphql.field({ type: graphql.nonNull(graphql.Int) }),
    error: graphql.field({ type: graphql.String }),
  },
});

export const payoutCommissions = graphql.field({
  type: resultType,
  args: {
    commissionIds: graphql.arg({ type: graphql.nonNull(graphql.list(graphql.nonNull(graphql.ID))) }),
  },
  resolve(_source, args, context: Context) {
    return payoutCommissionsTransaction(context, args.commissionIds);
  },
});
