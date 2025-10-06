-- Add costPrice and retailPrice columns to Product table
ALTER TABLE "Product" ADD COLUMN "costPrice" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "retailPrice" DOUBLE PRECISION;
