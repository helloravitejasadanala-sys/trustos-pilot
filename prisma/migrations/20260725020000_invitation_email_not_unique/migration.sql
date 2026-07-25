-- Allow the same client email to have multiple projects with one vendor.
-- Previously @@unique([vendorId, email]) made the second project fail to create.
DROP INDEX IF EXISTS "invitations_vendor_id_email_key";

CREATE INDEX IF NOT EXISTS "invitations_vendor_id_email_idx" ON "invitations"("vendor_id", "email");
CREATE INDEX IF NOT EXISTS "invitations_project_id_idx" ON "invitations"("project_id");
