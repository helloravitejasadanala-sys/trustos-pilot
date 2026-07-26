-- Stage 2 Learning moat: vendor-scoped venue book + venue notes (no client PII).
-- Separate from learnings and venue_research.

CREATE TABLE "vendor_venues" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_venues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "venue_notes" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "project_id" TEXT,
    "access" TEXT,
    "power" TEXT,
    "internet" TEXT,
    "lighting" TEXT,
    "restrictions" TEXT,
    "confidence" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'post_event',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_venues_vendor_id_name_key_city_key" ON "vendor_venues"("vendor_id", "name_key", "city");

CREATE INDEX "vendor_venues_vendor_id_idx" ON "vendor_venues"("vendor_id");

CREATE INDEX "venue_notes_vendor_id_venue_id_idx" ON "venue_notes"("vendor_id", "venue_id");

CREATE INDEX "venue_notes_project_id_idx" ON "venue_notes"("project_id");

ALTER TABLE "vendor_venues" ADD CONSTRAINT "vendor_venues_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "venue_notes" ADD CONSTRAINT "venue_notes_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "vendor_venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "venue_notes" ADD CONSTRAINT "venue_notes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "venue_notes" ADD CONSTRAINT "venue_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
