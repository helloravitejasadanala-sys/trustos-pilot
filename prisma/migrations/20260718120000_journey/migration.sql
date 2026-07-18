-- Stage 3: complete project journey.

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED');

-- Questionnaire: flexible answers
ALTER TABLE "questionnaires" ADD COLUMN "answers" JSONB;
ALTER TABLE "questionnaires" ADD COLUMN "started_at" TIMESTAMP(3);

-- Proposal: server-side deposit config
ALTER TABLE "proposals" ADD COLUMN "deposit_percent" INTEGER;
ALTER TABLE "proposals" ADD COLUMN "deposit_amount" DECIMAL(10,2);

-- Contract: version + signature evidence
ALTER TABLE "contracts" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "contracts" ADD COLUMN "signed_ip" TEXT;
ALTER TABLE "contracts" ADD COLUMN "signed_user_agent" TEXT;
ALTER TABLE "contracts" ADD COLUMN "content_hash" TEXT;
ALTER TABLE "contracts" ADD COLUMN "acceptance_text" TEXT;
ALTER TABLE "contracts" ADD COLUMN "client_session_id" TEXT;

-- Payment: currency + method
ALTER TABLE "payments" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'GBP';
ALTER TABLE "payments" ADD COLUMN "method" TEXT NOT NULL DEFAULT 'stripe';

-- Milestone: order, ownership, status, submission
ALTER TABLE "milestones" ADD COLUMN "description" TEXT;
ALTER TABLE "milestones" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "milestones" ADD COLUMN "owner" TEXT NOT NULL DEFAULT 'VENDOR';
ALTER TABLE "milestones" ADD COLUMN "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "milestones" ADD COLUMN "submitted_at" TIMESTAMP(3);
CREATE INDEX "milestones_project_id_order_idx" ON "milestones"("project_id", "order");

-- CreateTable Approval
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "approved_by" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approvals_project_id_idx" ON "approvals"("project_id");

-- CreateTable RevisionRequest
CREATE TABLE "revision_requests" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "requested_by" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revision_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "revision_requests_project_id_idx" ON "revision_requests"("project_id");

-- CreateTable Review
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "communication" INTEGER NOT NULL,
    "professionalism" INTEGER NOT NULL,
    "delivery" INTEGER NOT NULL,
    "quality" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "comment" TEXT,
    "submitted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "reviews_project_id_key" ON "reviews"("project_id");

-- Foreign keys
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revision_requests" ADD CONSTRAINT "revision_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revision_requests" ADD CONSTRAINT "revision_requests_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
