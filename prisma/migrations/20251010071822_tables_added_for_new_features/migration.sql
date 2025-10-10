-- AlterTable
ALTER TABLE "public"."Billing" ADD COLUMN     "customerContact" TEXT,
ADD COLUMN     "invoiceType" TEXT NOT NULL DEFAULT 'SHOP',
ALTER COLUMN "shopId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."ChatMessage" ADD COLUMN     "chatRequestId" TEXT,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "public"."RestockRequest" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "discountAmount" DECIMAL(10,2),
ADD COLUMN     "discountCode" TEXT,
ADD COLUMN     "finalAmount" DECIMAL(10,2),
ADD COLUMN     "fulfilledAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "receiptPath" TEXT,
ADD COLUMN     "totalAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "preferences" JSONB DEFAULT '{}';

-- CreateTable
CREATE TABLE "public"."ChatRequest" (
    "id" TEXT NOT NULL,
    "shopOwnerId" TEXT NOT NULL,
    "adminId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "subject" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopFinancials" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalExpenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingPayments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopFinancials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockTransaction" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AreaAnalytics" (
    "id" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT,
    "totalShops" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "topFlavors" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(10,2),
    "maxDiscount" DECIMAL(10,2),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFactoryWide" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockAdjustmentRequest" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "adjustedStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "customReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAdjustmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HOLIDAY',
    "description" TEXT,
    "year" INTEGER NOT NULL,
    "shopId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatRequest_status_idx" ON "public"."ChatRequest"("status");

-- CreateIndex
CREATE INDEX "ChatRequest_shopOwnerId_idx" ON "public"."ChatRequest"("shopOwnerId");

-- CreateIndex
CREATE INDEX "ChatRequest_adminId_idx" ON "public"."ChatRequest"("adminId");

-- CreateIndex
CREATE INDEX "ChatRequest_createdAt_idx" ON "public"."ChatRequest"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ShopFinancials_lastUpdated_idx" ON "public"."ShopFinancials"("lastUpdated" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ShopFinancials_shopId_key" ON "public"."ShopFinancials"("shopId");

-- CreateIndex
CREATE INDEX "StockTransaction_shopId_idx" ON "public"."StockTransaction"("shopId");

-- CreateIndex
CREATE INDEX "StockTransaction_productId_idx" ON "public"."StockTransaction"("productId");

-- CreateIndex
CREATE INDEX "StockTransaction_transactionType_idx" ON "public"."StockTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "StockTransaction_createdAt_idx" ON "public"."StockTransaction"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AreaAnalytics_city_idx" ON "public"."AreaAnalytics"("city");

-- CreateIndex
CREATE INDEX "AreaAnalytics_state_idx" ON "public"."AreaAnalytics"("state");

-- CreateIndex
CREATE INDEX "AreaAnalytics_lastUpdated_idx" ON "public"."AreaAnalytics"("lastUpdated" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AreaAnalytics_areaName_city_state_key" ON "public"."AreaAnalytics"("areaName", "city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "public"."DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_code_idx" ON "public"."DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_isActive_idx" ON "public"."DiscountCode"("isActive");

-- CreateIndex
CREATE INDEX "DiscountCode_validFrom_idx" ON "public"."DiscountCode"("validFrom");

-- CreateIndex
CREATE INDEX "DiscountCode_validUntil_idx" ON "public"."DiscountCode"("validUntil");

-- CreateIndex
CREATE INDEX "DiscountCode_isFactoryWide_idx" ON "public"."DiscountCode"("isFactoryWide");

-- CreateIndex
CREATE INDEX "StockAdjustmentRequest_shopId_idx" ON "public"."StockAdjustmentRequest"("shopId");

-- CreateIndex
CREATE INDEX "StockAdjustmentRequest_productId_idx" ON "public"."StockAdjustmentRequest"("productId");

-- CreateIndex
CREATE INDEX "StockAdjustmentRequest_status_idx" ON "public"."StockAdjustmentRequest"("status");

-- CreateIndex
CREATE INDEX "StockAdjustmentRequest_createdAt_idx" ON "public"."StockAdjustmentRequest"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "public"."Holiday"("date");

-- CreateIndex
CREATE INDEX "Holiday_year_idx" ON "public"."Holiday"("year");

-- CreateIndex
CREATE INDEX "Holiday_shopId_idx" ON "public"."Holiday"("shopId");

-- CreateIndex
CREATE INDEX "Holiday_type_idx" ON "public"."Holiday"("type");

-- CreateIndex
CREATE INDEX "ChatMessage_isRead_idx" ON "public"."ChatMessage"("isRead");

-- CreateIndex
CREATE INDEX "ChatMessage_chatRequestId_idx" ON "public"."ChatMessage"("chatRequestId");

-- CreateIndex
CREATE INDEX "RestockRequest_shopId_idx" ON "public"."RestockRequest"("shopId");

-- CreateIndex
CREATE INDEX "RestockRequest_productId_idx" ON "public"."RestockRequest"("productId");

-- CreateIndex
CREATE INDEX "RestockRequest_status_idx" ON "public"."RestockRequest"("status");

-- CreateIndex
CREATE INDEX "RestockRequest_paymentStatus_idx" ON "public"."RestockRequest"("paymentStatus");

-- CreateIndex
CREATE INDEX "RestockRequest_createdAt_idx" ON "public"."RestockRequest"("createdAt" DESC);
