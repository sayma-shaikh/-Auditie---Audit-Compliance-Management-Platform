-- CreateTable
CREATE TABLE "GoogleDriveToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT,
    "tokenType" TEXT,
    "expiryDate" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoogleDriveToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoogleDriveWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "expiration" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoogleDriveWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RepositoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "framework" TEXT,
    "source" TEXT NOT NULL DEFAULT 'internal',
    "externalId" TEXT,
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
INSERT INTO "new_RepositoryItem" ("createdAt", "createdById", "framework", "id", "mimeType", "name", "parentId", "path", "size", "type", "updatedAt", "updatedById") SELECT "createdAt", "createdById", "framework", "id", "mimeType", "name", "parentId", "path", "size", "type", "updatedAt", "updatedById" FROM "RepositoryItem";
DROP TABLE "RepositoryItem";
ALTER TABLE "new_RepositoryItem" RENAME TO "RepositoryItem";
CREATE UNIQUE INDEX "RepositoryItem_externalId_key" ON "RepositoryItem"("externalId");
CREATE INDEX "RepositoryItem_parentId_idx" ON "RepositoryItem"("parentId");
CREATE INDEX "RepositoryItem_externalId_idx" ON "RepositoryItem"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GoogleDriveToken_userId_key" ON "GoogleDriveToken"("userId");
