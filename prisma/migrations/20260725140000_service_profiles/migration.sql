-- CreateEnum
CREATE TYPE "PrimaryService" AS ENUM ('PHOTOGRAPHY', 'LIVE_STREAMING', 'MAKEUP_ARTIST', 'DJ');

-- AlterEnum
ALTER TYPE "ProjectType" ADD VALUE 'DJ';

-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN "primary_service" "PrimaryService" NOT NULL DEFAULT 'PHOTOGRAPHY';
