-- AlterTable
ALTER TABLE "shipments" ADD COLUMN "current_hub_id" TEXT;

-- CreateIndex
CREATE INDEX "idx_shipments_current_hub" ON "shipments"("current_hub_id");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_current_hub_id_fkey" FOREIGN KEY ("current_hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
