-- Align VenueResearch intel with VenueNote fields for future curated import.
ALTER TABLE "venue_research" ADD COLUMN IF NOT EXISTS "access" TEXT;
ALTER TABLE "venue_research" ADD COLUMN IF NOT EXISTS "lighting" TEXT;
