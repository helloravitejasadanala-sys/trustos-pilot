-- Additive: broaden ProjectType so the pilot covers more creative disciplines
-- (videography, live streaming, decor, makeup, event planning) alongside
-- the existing photography types. Adding enum values is non-destructive.

ALTER TYPE "ProjectType" ADD VALUE IF NOT EXISTS 'MOTHERHOOD_JOURNEY';
ALTER TYPE "ProjectType" ADD VALUE IF NOT EXISTS 'FAMILY_SESSION';
ALTER TYPE "ProjectType" ADD VALUE IF NOT EXISTS 'VIDEOGRAPHY';
ALTER TYPE "ProjectType" ADD VALUE IF NOT EXISTS 'LIVE_STREAM';
ALTER TYPE "ProjectType" ADD VALUE IF NOT EXISTS 'DECOR';
ALTER TYPE "ProjectType" ADD VALUE IF NOT EXISTS 'MAKEUP';
ALTER TYPE "ProjectType" ADD VALUE IF NOT EXISTS 'EVENT_PLANNING';

-- Optional client phone number (clients have no VendorProfile to hold it).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- How the vendor intends to collect payment: cash | stripe | free.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;
