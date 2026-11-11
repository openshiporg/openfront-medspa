-- Remove the invented DomainEvent outbox (written by lifecycle hooks, never delivered). Events go through Commerce webhooks only.
DROP TABLE "DomainEvent";
DROP TYPE "DomainEventOperationType";
DROP TYPE "DomainEventStatusType";
