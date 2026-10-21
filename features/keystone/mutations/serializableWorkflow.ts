import type { Context } from ".keystone/types";
import { assertActiveActor } from '../workflowAuth';

function retryableTransactionError(error: unknown) {
  const value = error as { code?: string; extensions?: { prisma?: { code?: string } }; message?: string };
  const message = error instanceof Error ? error.message : String(error);
  return value?.code === "P2034"
    || value?.extensions?.prisma?.code === "P2034"
    || /write conflict|deadlock|please retry your transaction/i.test(message);
}

export async function serializableWorkflow<T>(
  context: Context,
  namespace: string,
  lockKeys: string[],
  work: (transactionContext: Context) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await context.transaction(async (transactionContext: Context) => {
        if (context.session?.itemId && context.session.data.practice?.id) {
          // Authority rows stay locked until COMMIT. Revocation cannot commit
          // between the command's current read and its protected effect/replay.
          await transactionContext.prisma.$queryRawUnsafe('SELECT "id" FROM "User" WHERE "id" = $1 FOR SHARE', context.session.itemId);
          await transactionContext.prisma.$queryRawUnsafe('SELECT r."id" FROM "Role" r JOIN "User" u ON u."role" = r."id" WHERE u."id" = $1 FOR SHARE OF r', context.session.itemId);
          await transactionContext.prisma.$queryRawUnsafe('SELECT "id" FROM "PracticeMembership" WHERE "user" = $1 AND "practice" = $2 FOR SHARE', context.session.itemId, context.session.data.practice.id);
          await assertActiveActor(transactionContext);
        }
        for (const key of [...new Set(lockKeys)].sort()) {
          await transactionContext.prisma.$executeRawUnsafe(
            "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            namespace,
            key,
          );
        }
        return work(transactionContext);
      }, {
        maxWait: 5_000,
        timeout: 30_000,
        isolationLevel: "Serializable" as any,
      });
    } catch (error) {
      if (!retryableTransactionError(error) || attempt === 3) throw error;
    }
  }
  throw new Error("Serializable workflow retry exhausted");
}
