-- CreateTable
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "batchNumber" TEXT,
    "receivedDate" DATETIME,
    "expiresAt" DATETIME,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockLevel_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StockLevel_partId_idx" ON "StockLevel"("partId");

-- CreateIndex
CREATE INDEX "StockLevel_batchNumber_idx" ON "StockLevel"("batchNumber");
