-- DropForeignKey
ALTER TABLE "public"."Billing" DROP CONSTRAINT "Billing_shopId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_flavorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_packagingTypeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RestockRequest" DROP CONSTRAINT "RestockRequest_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RestockRequest" DROP CONSTRAINT "RestockRequest_shopId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RolePermission" DROP CONSTRAINT "RolePermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Shop" DROP CONSTRAINT "Shop_managerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ShopInventory" DROP CONSTRAINT "ShopInventory_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ShopInventory" DROP CONSTRAINT "ShopInventory_shopId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_roleId_fkey";

-- AlterTable
ALTER TABLE "public"."RestockRequest" ADD COLUMN     "requestType" TEXT NOT NULL DEFAULT 'RESTOCK';
