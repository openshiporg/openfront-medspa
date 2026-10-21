-- Compatibility bridge for the two preserved historical ADD COLUMN statements.
-- Retain the earlier publication value until the following original migration
-- has created its column; no original SQL bytes or business values are changed.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Provider' AND column_name = 'isPublic') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Provider' AND column_name = 'isPublicBeforeStorefront') THEN
      RAISE EXCEPTION 'Publication compatibility column already exists';
    END IF;
    ALTER TABLE "Provider" RENAME COLUMN "isPublic" TO "isPublicBeforeStorefront";
  END IF;
END $$;
