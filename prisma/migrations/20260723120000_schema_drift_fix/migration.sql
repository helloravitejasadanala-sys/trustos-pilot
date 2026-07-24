-- Align database with schema.prisma fields referenced by application code.

-- Contract send timestamp (vendor contract route)
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMP(3);

-- Message classification (review requests, etc.)
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "type" TEXT;

-- Manual payment route reads proposal.deposit alongside deposit_amount
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "deposit" DECIMAL(10,2);

-- Activity log action column (admin funnel groupBy); event already exists from init
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "action" TEXT;

-- Post-event learning capture (vendor learning route)
CREATE TABLE IF NOT EXISTS "learnings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "went_well" TEXT NOT NULL,
    "problems" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "missing" TEXT NOT NULL,
    "venue_accurate" TEXT NOT NULL,
    "advice" TEXT NOT NULL,
    "setup_time" TEXT NOT NULL,
    "client_journey" TEXT NOT NULL,
    "rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learnings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "learnings_project_id_idx" ON "learnings"("project_id");
CREATE INDEX IF NOT EXISTS "learnings_vendor_id_idx" ON "learnings"("vendor_id");

ALTER TABLE "learnings" DROP CONSTRAINT IF EXISTS "learnings_project_id_fkey";
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
