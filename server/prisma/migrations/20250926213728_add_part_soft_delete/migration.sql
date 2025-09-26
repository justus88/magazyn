-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Part" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "catalogNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "unit" TEXT DEFAULT 'szt',
    "minimumQuantity" DECIMAL,
    "currentQuantity" DECIMAL NOT NULL DEFAULT 0,
    "storageLocation" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Part_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Part" ("catalogNumber", "categoryId", "createdAt", "currentQuantity", "description", "id", "minimumQuantity", "name", "storageLocation", "unit", "updatedAt") SELECT "catalogNumber", "categoryId", "createdAt", "currentQuantity", "description", "id", "minimumQuantity", "name", "storageLocation", "unit", "updatedAt" FROM "Part";
DROP TABLE "Part";
ALTER TABLE "new_Part" RENAME TO "Part";
CREATE UNIQUE INDEX "Part_catalogNumber_key" ON "Part"("catalogNumber");
CREATE INDEX "Part_name_idx" ON "Part"("name");
CREATE INDEX "Part_categoryId_idx" ON "Part"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
