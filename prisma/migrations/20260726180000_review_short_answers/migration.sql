-- Client review short answers (separate from venue_notes / vendor_venues).
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "went_well" TEXT;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "would_recommend" TEXT;
