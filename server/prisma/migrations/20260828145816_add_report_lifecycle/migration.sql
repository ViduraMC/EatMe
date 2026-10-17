-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('draft', 'finalized');

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ADD COLUMN     "finalized_at" TIMESTAMPTZ(3),
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'draft';

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_deleted_at_idx" ON "reports"("deleted_at");
