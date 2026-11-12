-- Refunds are submitted on the refund request and retried by a staff button: no lease or schedule columns.
DROP INDEX IF EXISTS "RefundAttempt_nextAttemptAt_idx";
ALTER TABLE "RefundAttempt" DROP COLUMN "leaseUntil", DROP COLUMN "nextAttemptAt";
