/*
  Warnings:

  - You are about to drop the column `filePath` on the `RepositoryItem` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT,
    "repositoryItemId" TEXT,
    "details" TEXT,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_repositoryItemId_fkey" FOREIGN KEY ("repositoryItemId") REFERENCES "RepositoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("actionType", "details", "documentId", "id", "timestamp", "userId") SELECT "actionType", "details", "documentId", "id", "timestamp", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE TABLE "new_RepositoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "framework" TEXT,
    "parentId" TEXT,
    "path" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RepositoryItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RepositoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RepositoryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RepositoryItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RepositoryItem" ("createdAt", "createdById", "framework", "id", "mimeType", "name", "parentId", "type", "updatedAt", "updatedById") SELECT "createdAt", "createdById", "framework", "id", "mimeType", "name", "parentId", "type", "updatedAt", "updatedById" FROM "RepositoryItem";
DROP TABLE "RepositoryItem";
ALTER TABLE "new_RepositoryItem" RENAME TO "RepositoryItem";
CREATE INDEX "RepositoryItem_parentId_idx" ON "RepositoryItem"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
