-- Multi-seller marketplace foundation.
CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

CREATE TABLE "Seller" (
  "id" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "address" TEXT,
  "status" "SellerStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Seller_status_idx" ON "Seller"("status");
CREATE INDEX "Seller_businessName_idx" ON "Seller"("businessName");

ALTER TABLE "Product" ADD COLUMN "sellerId" TEXT;
CREATE INDEX "Product_sellerId_idx" ON "Product"("sellerId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD COLUMN "sellerId" TEXT;
CREATE INDEX "OrderItem_sellerId_idx" ON "OrderItem"("sellerId");
