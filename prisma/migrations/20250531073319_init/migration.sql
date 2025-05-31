/*
  Warnings:

  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Flavor" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "RestockRequest" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "ShopInventory" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
