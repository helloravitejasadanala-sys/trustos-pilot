-- Payment schedule stages (max 4 per project enforced in application).
-- Additive: existing payments keep stage_id NULL (legacy deposit/final path).

CREATE TABLE "payment_stages" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "percent" INTEGER,
    "timing_label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "requested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_stages_project_id_sort_order_key" ON "payment_stages"("project_id", "sort_order");

CREATE INDEX "payment_stages_project_id_idx" ON "payment_stages"("project_id");

ALTER TABLE "payment_stages" ADD CONSTRAINT "payment_stages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD COLUMN "stage_id" TEXT;

CREATE INDEX "payments_stage_id_idx" ON "payments"("stage_id");

ALTER TABLE "payments" ADD CONSTRAINT "payments_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "payment_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
