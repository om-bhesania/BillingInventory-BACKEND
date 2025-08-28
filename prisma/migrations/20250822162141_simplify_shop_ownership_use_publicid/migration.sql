-- Step 1: Add a temporary column to store the publicId
ALTER TABLE "Shop" ADD COLUMN "tempManagerPublicId" TEXT;

-- Step 2: Update the temporary column with publicId values from User table
UPDATE "Shop" 
SET "tempManagerPublicId" = "User"."publicId"
FROM "User" 
WHERE "Shop"."managerId" = "User"."id";

-- Step 3: Also handle cases where ownerId was used instead of managerId
UPDATE "Shop" 
SET "tempManagerPublicId" = "User"."publicId"
FROM "User" 
WHERE "Shop"."ownerId" = "User"."id" 
AND "tempManagerPublicId" IS NULL;

-- Step 4: Drop the foreign key constraints
ALTER TABLE "Shop" DROP CONSTRAINT IF EXISTS "Shop_managerId_fkey";
ALTER TABLE "Shop" DROP CONSTRAINT IF EXISTS "Shop_ownerId_fkey";

-- Step 5: Drop the old columns
ALTER TABLE "Shop" DROP COLUMN IF EXISTS "managerId";
ALTER TABLE "Shop" DROP COLUMN IF EXISTS "ownerId";

-- Step 6: Rename the temporary column to managerId
ALTER TABLE "Shop" RENAME COLUMN "tempManagerPublicId" TO "managerId";

-- Step 7: Add the new foreign key constraint using publicId
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_managerId_fkey" 
FOREIGN KEY ("managerId") REFERENCES "User"("publicId") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Add unique constraint
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_managerId_key" UNIQUE ("managerId");

-- Step 9: Update Notification table to use publicId
-- First add temporary column
ALTER TABLE "Notification" ADD COLUMN "tempUserIdPublicId" TEXT;

-- Update with publicId values
UPDATE "Notification" 
SET "tempUserIdPublicId" = "User"."publicId"
FROM "User" 
WHERE "Notification"."userId" = "User"."id";

-- Drop old foreign key
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";

-- Drop old column
ALTER TABLE "Notification" DROP COLUMN "userId";

-- Rename new column
ALTER TABLE "Notification" RENAME COLUMN "tempUserIdPublicId" TO "userId";

-- Add new foreign key constraint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("publicId") ON DELETE CASCADE ON UPDATE CASCADE;
