-- Additive photography only; no resource scheduling/readiness changes.
ALTER TABLE "Resource" ADD COLUMN "image_extension" TEXT,
ADD COLUMN "image_filesize" INTEGER,
ADD COLUMN "image_height" INTEGER,
ADD COLUMN "image_id" TEXT,
ADD COLUMN "image_width" INTEGER;
