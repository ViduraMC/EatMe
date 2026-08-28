-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('overall', 'users', 'donations', 'requests', 'deliveries');

-- CreateTable
CREATE TABLE "reports" (
    "report_id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "type" "ReportType" NOT NULL,
    "start_date" TIMESTAMPTZ(3) NOT NULL,
    "end_date" TIMESTAMPTZ(3) NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateIndex
CREATE INDEX "reports_admin_id_idx" ON "reports"("admin_id");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "reports"("type");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");
