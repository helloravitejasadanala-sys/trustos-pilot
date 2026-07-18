-- Stage 2: secure client invitations.
--
-- The invitations table previously linked to a project by a nullable
-- text slug and had no expiry or revocation. It is rebuilt here with a
-- real foreign key, a required expiry, and a revocation timestamp.
--
-- Existing rows cannot be migrated safely: they have no project_id and
-- their tokens were never delivered to anyone (no route ever read them).
-- They are deleted rather than back-filled with a guess.

DELETE FROM "invitations";

-- Drop the loose slug link
ALTER TABLE "invitations" DROP COLUMN "project_slug";

-- Link to exactly one project (required)
ALTER TABLE "invitations" ADD COLUMN "project_id" TEXT NOT NULL;

-- Expiry is required; revocation is optional
ALTER TABLE "invitations" ADD COLUMN "expires_at" TIMESTAMP(3) NOT NULL;
ALTER TABLE "invitations" ADD COLUMN "revoked_at" TIMESTAMP(3);

-- Email becomes optional (an invitation may be delivered by link alone)
ALTER TABLE "invitations" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "invitations_project_id_idx" ON "invitations"("project_id");

-- CreateIndex
CREATE INDEX "invitations_expires_at_idx" ON "invitations"("expires_at");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
