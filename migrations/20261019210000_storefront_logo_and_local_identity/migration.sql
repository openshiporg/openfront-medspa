-- Additive presentation fields and an immutable local-fictional identity marker.
ALTER TABLE "StorefrontSetting"
  ADD COLUMN "logoHue" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "logoSvg" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StorefrontSetting" ADD CONSTRAINT "StorefrontSetting_logoHue_range" CHECK ("logoHue" BETWEEN 0 AND 360);
ALTER TABLE "Practice" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
