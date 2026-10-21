-- Restore the exact preserved publication decisions, including false values.
-- Drop only the temporary column created by our preceding compatibility bridge.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Provider' AND column_name = 'isPublicBeforeStorefront') THEN
    UPDATE "Provider" SET "isPublic" = "isPublicBeforeStorefront";
    IF EXISTS (SELECT 1 FROM "Provider" WHERE "isPublic" IS DISTINCT FROM "isPublicBeforeStorefront") THEN
      RAISE EXCEPTION 'Publication preservation failed';
    END IF;
    ALTER TABLE "Provider" DROP COLUMN "isPublicBeforeStorefront";
  END IF;
END $$;
