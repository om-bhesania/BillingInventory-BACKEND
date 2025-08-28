-- Add shopIds column to users table
ALTER TABLE "User" ADD COLUMN "shopIds" TEXT[] DEFAULT '{}';

-- Populate shopIds for existing users based on current shop relationships
UPDATE "User" 
SET "shopIds" = (
  SELECT ARRAY_AGG(s."id") 
  FROM "Shop" s 
  WHERE s."managerId" = "User"."publicId"
);

-- Update users with no shops to have empty array instead of NULL
UPDATE "User" SET "shopIds" = '{}' WHERE "shopIds" IS NULL;
