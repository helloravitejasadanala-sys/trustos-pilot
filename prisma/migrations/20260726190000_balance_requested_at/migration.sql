-- Explicit vendor gate before client can declare FINAL/balance.
ALTER TABLE "projects" ADD COLUMN "balance_requested_at" TIMESTAMP(3);
