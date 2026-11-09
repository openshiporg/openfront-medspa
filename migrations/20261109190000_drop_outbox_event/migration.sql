-- Remove the invented OutboxEvent table (verified empty on live, no inbound foreign keys).
DROP TABLE "OutboxEvent";
DROP TYPE "OutboxEventStatusType";
