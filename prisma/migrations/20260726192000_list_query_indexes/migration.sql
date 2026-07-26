-- Speed vendor list / poll queries (projects by vendor, payments by project, messages by type).
CREATE INDEX IF NOT EXISTS "projects_vendor_id_idx" ON "projects"("vendor_id");
CREATE INDEX IF NOT EXISTS "projects_vendor_id_created_at_idx" ON "projects"("vendor_id", "created_at");
CREATE INDEX IF NOT EXISTS "payments_project_id_idx" ON "payments"("project_id");
CREATE INDEX IF NOT EXISTS "messages_project_id_type_idx" ON "messages"("project_id", "type");
