-- Practice-scoped storefront presentation settings. Existing practices remain
-- deliberately unconfigured until an authorized manager creates and publishes a row.
CREATE TABLE "StorefrontSetting" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "primaryLocation" TEXT,
    "accentHue" INTEGER NOT NULL DEFAULT 220,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorefrontSetting_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Practice" ADD COLUMN "storefrontSetting" TEXT;
ALTER TABLE "Service" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Provider" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resource" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProviderSchedule" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "StorefrontSetting_primaryLocation_idx" ON "StorefrontSetting"("primaryLocation");
CREATE UNIQUE INDEX "Practice_storefrontSetting_key" ON "Practice"("storefrontSetting");

ALTER TABLE "StorefrontSetting"
  ADD CONSTRAINT "StorefrontSetting_primaryLocation_fkey"
  FOREIGN KEY ("primaryLocation") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Practice"
  ADD CONSTRAINT "Practice_storefrontSetting_fkey"
  FOREIGN KEY ("storefrontSetting") REFERENCES "StorefrontSetting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
