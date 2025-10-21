-- Add createdBy field to RawMaterial table
-- This script should be run to add the createdBy field to existing raw materials

-- Add the createdBy column
ALTER TABLE "RawMaterial" ADD COLUMN "createdBy" TEXT;

-- Set default value for existing records (you may want to update this with actual user IDs)
UPDATE "RawMaterial" SET "createdBy" = 'admin' WHERE "createdBy" IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE "RawMaterial" ALTER COLUMN "createdBy" SET NOT NULL;

-- Add an index for better query performance
CREATE INDEX "RawMaterial_createdBy_idx" ON "RawMaterial"("createdBy");
