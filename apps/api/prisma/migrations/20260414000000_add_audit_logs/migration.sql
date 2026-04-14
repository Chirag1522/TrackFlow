-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "userId" TEXT,
    "tenantId" TEXT,
    "changes" JSONB,
    "status" TEXT NOT NULL DEFAULT 'success',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "idx_audit_tenant" ON "audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "idx_audit_resource" ON "audit_logs"("resourceId");

-- CreateIndex
CREATE INDEX "idx_audit_time" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_tenant_time" ON "audit_logs"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_user_time" ON "audit_logs"("userId", "timestamp");
