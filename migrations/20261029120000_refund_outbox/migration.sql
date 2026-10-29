-- CreateEnum
CREATE TYPE "RefundAttemptStatusType" AS ENUM ('pending', 'submitted', 'succeeded', 'failed', 'unknown');

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "attempt" TEXT;

-- CreateTable
CREATE TABLE "RefundAttempt" (
    "id" TEXT NOT NULL,
    "practice" TEXT,
    "paymentSession" TEXT,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT '',
    "status" "RefundAttemptStatusType" NOT NULL DEFAULT 'pending',
    "providerReference" TEXT NOT NULL DEFAULT '',
    "providerRefundId" TEXT NOT NULL DEFAULT '',
    "attemptCount" INTEGER DEFAULT 0,
    "submitStartedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "data" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefundAttempt_idempotencyKey_key" ON "RefundAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RefundAttempt_practice_idx" ON "RefundAttempt"("practice");

-- CreateIndex
CREATE INDEX "RefundAttempt_paymentSession_idx" ON "RefundAttempt"("paymentSession");

-- CreateIndex
CREATE INDEX "RefundAttempt_providerRefundId_idx" ON "RefundAttempt"("providerRefundId");

-- CreateIndex
CREATE INDEX "RefundAttempt_nextAttemptAt_idx" ON "RefundAttempt"("nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_attempt_key" ON "Refund"("attempt");

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_attempt_fkey" FOREIGN KEY ("attempt") REFERENCES "RefundAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundAttempt" ADD CONSTRAINT "RefundAttempt_practice_fkey" FOREIGN KEY ("practice") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundAttempt" ADD CONSTRAINT "RefundAttempt_paymentSession_fkey" FOREIGN KEY ("paymentSession") REFERENCES "PaymentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

