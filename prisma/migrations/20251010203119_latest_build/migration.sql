-- AlterTable
ALTER TABLE "public"."Billing" ADD COLUMN     "isParcel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parcelSize" TEXT,
ADD COLUMN     "parcelType" TEXT;

-- CreateTable
CREATE TABLE "public"."RawMaterialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RawMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "isPerishable" BOOLEAN NOT NULL DEFAULT false,
    "shelfLife" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RawMaterialInventory" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "materialId" TEXT NOT NULL,
    "currentStock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "minStockLevel" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "maxStockLevel" DECIMAL(10,3),
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterialInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductRecipe" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantityNeeded" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RawMaterialTransaction" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "shopId" TEXT,
    "inventoryId" TEXT,
    "transactionType" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2),
    "reason" TEXT,
    "referenceId" TEXT,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawMaterialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterialCategory_name_key" ON "public"."RawMaterialCategory"("name");

-- CreateIndex
CREATE INDEX "RawMaterialCategory_name_idx" ON "public"."RawMaterialCategory"("name");

-- CreateIndex
CREATE INDEX "RawMaterialCategory_isActive_idx" ON "public"."RawMaterialCategory"("isActive");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "public"."Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_isActive_idx" ON "public"."Supplier"("isActive");

-- CreateIndex
CREATE INDEX "RawMaterial_name_idx" ON "public"."RawMaterial"("name");

-- CreateIndex
CREATE INDEX "RawMaterial_categoryId_idx" ON "public"."RawMaterial"("categoryId");

-- CreateIndex
CREATE INDEX "RawMaterial_supplierId_idx" ON "public"."RawMaterial"("supplierId");

-- CreateIndex
CREATE INDEX "RawMaterial_isPerishable_idx" ON "public"."RawMaterial"("isPerishable");

-- CreateIndex
CREATE INDEX "RawMaterial_isActive_idx" ON "public"."RawMaterial"("isActive");

-- CreateIndex
CREATE INDEX "RawMaterialInventory_shopId_idx" ON "public"."RawMaterialInventory"("shopId");

-- CreateIndex
CREATE INDEX "RawMaterialInventory_materialId_idx" ON "public"."RawMaterialInventory"("materialId");

-- CreateIndex
CREATE INDEX "RawMaterialInventory_currentStock_idx" ON "public"."RawMaterialInventory"("currentStock");

-- CreateIndex
CREATE INDEX "RawMaterialInventory_expiryDate_idx" ON "public"."RawMaterialInventory"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterialInventory_shopId_materialId_key" ON "public"."RawMaterialInventory"("shopId", "materialId");

-- CreateIndex
CREATE INDEX "ProductRecipe_productId_idx" ON "public"."ProductRecipe"("productId");

-- CreateIndex
CREATE INDEX "ProductRecipe_materialId_idx" ON "public"."ProductRecipe"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRecipe_productId_materialId_key" ON "public"."ProductRecipe"("productId", "materialId");

-- CreateIndex
CREATE INDEX "RawMaterialTransaction_materialId_idx" ON "public"."RawMaterialTransaction"("materialId");

-- CreateIndex
CREATE INDEX "RawMaterialTransaction_shopId_idx" ON "public"."RawMaterialTransaction"("shopId");

-- CreateIndex
CREATE INDEX "RawMaterialTransaction_inventoryId_idx" ON "public"."RawMaterialTransaction"("inventoryId");

-- CreateIndex
CREATE INDEX "RawMaterialTransaction_transactionType_idx" ON "public"."RawMaterialTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "RawMaterialTransaction_createdAt_idx" ON "public"."RawMaterialTransaction"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "RawMaterialTransaction_referenceId_idx" ON "public"."RawMaterialTransaction"("referenceId");

-- CreateIndex
CREATE INDEX "Billing_isParcel_idx" ON "public"."Billing"("isParcel");

-- CreateIndex
CREATE INDEX "Billing_parcelType_idx" ON "public"."Billing"("parcelType");

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shop" ADD CONSTRAINT "Shop_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("publicId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "public"."Flavor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_packagingTypeId_fkey" FOREIGN KEY ("packagingTypeId") REFERENCES "public"."PackagingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopInventory" ADD CONSTRAINT "ShopInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopInventory" ADD CONSTRAINT "ShopInventory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RestockRequest" ADD CONSTRAINT "RestockRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RestockRequest" ADD CONSTRAINT "RestockRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Billing" ADD CONSTRAINT "Billing_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("publicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatRequest" ADD CONSTRAINT "ChatRequest_shopOwnerId_fkey" FOREIGN KEY ("shopOwnerId") REFERENCES "public"."User"("publicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatRequest" ADD CONSTRAINT "ChatRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("publicId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_chatRequestId_fkey" FOREIGN KEY ("chatRequestId") REFERENCES "public"."ChatRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopFinancials" ADD CONSTRAINT "ShopFinancials_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockTransaction" ADD CONSTRAINT "StockTransaction_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockTransaction" ADD CONSTRAINT "StockTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAdjustmentRequest" ADD CONSTRAINT "StockAdjustmentRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAdjustmentRequest" ADD CONSTRAINT "StockAdjustmentRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Holiday" ADD CONSTRAINT "Holiday_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Holiday" ADD CONSTRAINT "Holiday_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("publicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RawMaterial" ADD CONSTRAINT "RawMaterial_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."RawMaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RawMaterial" ADD CONSTRAINT "RawMaterial_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RawMaterialInventory" ADD CONSTRAINT "RawMaterialInventory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RawMaterialInventory" ADD CONSTRAINT "RawMaterialInventory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "public"."RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductRecipe" ADD CONSTRAINT "ProductRecipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductRecipe" ADD CONSTRAINT "ProductRecipe_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "public"."RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RawMaterialTransaction" ADD CONSTRAINT "RawMaterialTransaction_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "public"."RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RawMaterialTransaction" ADD CONSTRAINT "RawMaterialTransaction_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RawMaterialTransaction" ADD CONSTRAINT "RawMaterialTransaction_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "public"."RawMaterialInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
