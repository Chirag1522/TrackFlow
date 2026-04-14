-- Performance indexes for high-traffic shipment and analytics queries
CREATE INDEX IF NOT EXISTS "idx_users_tenant_role_active_hub"
ON "users"("tenant_id", "role", "is_active", "hub_id");

CREATE INDEX IF NOT EXISTS "idx_shipments_tracking_lookup"
ON "shipments"("tracking_id");

CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_created"
ON "shipments"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_agent_created"
ON "shipments"("tenant_id", "assigned_agent_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_shipments_origin_hub_status"
ON "shipments"("tenant_id", "origin_hub_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "idx_shipments_dest_hub_status"
ON "shipments"("tenant_id", "destination_hub_id", "status", "created_at");

DROP INDEX IF EXISTS "idx_events_shipment_time";
CREATE INDEX "idx_events_shipment_time"
ON "shipment_events"("shipment_id", "created_at");
