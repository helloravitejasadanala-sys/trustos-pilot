-- Per-booking service so a photography workspace can also run livestream (etc.) jobs.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "service" "PrimaryService" NOT NULL DEFAULT 'PHOTOGRAPHY';

UPDATE "projects" AS p
SET "service" = v."primary_service"
FROM "vendor_profiles" AS v
WHERE p."vendor_id" = v."id";
