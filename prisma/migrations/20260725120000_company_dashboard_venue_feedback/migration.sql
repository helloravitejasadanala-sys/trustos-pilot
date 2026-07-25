-- CreateEnum
CREATE TYPE "VenueResearchStatus" AS ENUM ('PENDING', 'VERIFIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PilotFeedbackStatus" AS ENUM ('UNREAD', 'IN_REVIEW', 'RESOLVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "venue_research" (
    "id" TEXT NOT NULL,
    "venue_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "google_maps_url" TEXT,
    "contributor_name" TEXT NOT NULL,
    "contributor_email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'public_form',
    "workspace_id" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "VenueResearchStatus" NOT NULL DEFAULT 'PENDING',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "parking" TEXT,
    "power" TEXT,
    "restrictions" TEXT,
    "internet" TEXT,
    "drone_policy" TEXT,
    "best_ceremony_area" TEXT,
    "loading_area" TEXT,
    "accessibility" TEXT,
    "preferred_vendors" TEXT,
    "previous_notes" TEXT,
    "internal_team_notes" TEXT,
    "media" JSONB,
    "trust_score" DOUBLE PRECISION,

    CONSTRAINT "venue_research_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "workspace_id" TEXT,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "source" TEXT NOT NULL DEFAULT 'public_form',
    "status" "PilotFeedbackStatus" NOT NULL DEFAULT 'UNREAD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_research_status_idx" ON "venue_research"("status");

-- CreateIndex
CREATE INDEX "venue_research_contributor_email_idx" ON "venue_research"("contributor_email");

-- CreateIndex
CREATE INDEX "venue_research_submitted_at_idx" ON "venue_research"("submitted_at");

-- CreateIndex
CREATE INDEX "venue_research_workspace_id_idx" ON "venue_research"("workspace_id");

-- CreateIndex
CREATE INDEX "pilot_feedback_status_idx" ON "pilot_feedback"("status");

-- CreateIndex
CREATE INDEX "pilot_feedback_created_at_idx" ON "pilot_feedback"("created_at");

-- CreateIndex
CREATE INDEX "pilot_feedback_workspace_id_idx" ON "pilot_feedback"("workspace_id");

-- AddForeignKey
ALTER TABLE "venue_research" ADD CONSTRAINT "venue_research_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "vendor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "vendor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
