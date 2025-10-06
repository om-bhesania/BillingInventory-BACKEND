/*
  Warnings:

  - You are about to drop the column `meta` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `message` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `severity` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AuditLog" DROP COLUMN "meta",
ADD COLUMN     "attackType" TEXT,
ADD COLUMN     "authenticated" BOOLEAN DEFAULT false,
ADD COLUMN     "blocked" BOOLEAN DEFAULT false,
ADD COLUMN     "businessImpact" TEXT,
ADD COLUMN     "compliance" TEXT[],
ADD COLUMN     "component" TEXT,
ADD COLUMN     "customerImpact" TEXT,
ADD COLUMN     "dataRetention" INTEGER,
ADD COLUMN     "dataSensitivity" TEXT,
ADD COLUMN     "dataType" TEXT,
ADD COLUMN     "dataVolume" INTEGER,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "endpoint" TEXT,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "financialImpact" DOUBLE PRECISION,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "mitigationAction" TEXT,
ADD COLUMN     "operation" TEXT,
ADD COLUMN     "operationalImpact" TEXT,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "performance" JSONB,
ADD COLUMN     "permission" TEXT,
ADD COLUMN     "rateLimited" BOOLEAN DEFAULT false,
ADD COLUMN     "requestSize" INTEGER,
ADD COLUMN     "resource" TEXT,
ADD COLUMN     "responseSize" INTEGER,
ADD COLUMN     "responseTime" INTEGER,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "severity" TEXT NOT NULL,
ADD COLUMN     "sourceIp" TEXT,
ADD COLUMN     "stackTrace" TEXT,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "statusCode" INTEGER,
ADD COLUMN     "targetResource" TEXT,
ADD COLUMN     "targetUser" TEXT,
ADD COLUMN     "threatLevel" TEXT,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userAction" TEXT,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "userRole" TEXT,
ALTER COLUMN "entityId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_type_idx" ON "public"."AuditLog"("type");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "public"."AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_ipAddress_idx" ON "public"."AuditLog"("ipAddress");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_threatLevel_idx" ON "public"."AuditLog"("threatLevel");

-- CreateIndex
CREATE INDEX "AuditLog_attackType_idx" ON "public"."AuditLog"("attackType");

-- CreateIndex
CREATE INDEX "AuditLog_endpoint_idx" ON "public"."AuditLog"("endpoint");

-- CreateIndex
CREATE INDEX "AuditLog_statusCode_idx" ON "public"."AuditLog"("statusCode");
