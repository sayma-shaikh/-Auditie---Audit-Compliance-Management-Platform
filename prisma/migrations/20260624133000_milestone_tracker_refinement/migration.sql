PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ProjectMilestoneRepositoryLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "repositoryItemId" TEXT,
    "googleDriveFileId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'repository',
    "fileName" TEXT,
    "filePath" TEXT,
    "linkedById" TEXT,
    "linkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMilestoneRepositoryLink_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMilestoneRepositoryLink_repositoryItemId_fkey" FOREIGN KEY ("repositoryItemId") REFERENCES "RepositoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMilestoneRepositoryLink_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_ProjectMilestoneRepositoryLink" ("id", "milestoneId", "repositoryItemId", "linkedById", "linkedAt", "source")
SELECT "id", "milestoneId", "repositoryItemId", "linkedById", "linkedAt", 'repository'
FROM "ProjectMilestoneRepositoryLink";

DROP TABLE "ProjectMilestoneRepositoryLink";
ALTER TABLE "new_ProjectMilestoneRepositoryLink" RENAME TO "ProjectMilestoneRepositoryLink";

CREATE TABLE "ProjectMilestoneHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "oldProgress" INTEGER,
    "newProgress" INTEGER,
    "performedBy" TEXT,
    "performedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMilestoneHistory_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMilestoneHistory_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProjectMilestoneRepositoryLink_milestoneId_repositoryItemId_key" ON "ProjectMilestoneRepositoryLink"("milestoneId", "repositoryItemId");
CREATE INDEX "ProjectMilestoneRepositoryLink_milestoneId_idx" ON "ProjectMilestoneRepositoryLink"("milestoneId");
CREATE INDEX "ProjectMilestoneRepositoryLink_repositoryItemId_idx" ON "ProjectMilestoneRepositoryLink"("repositoryItemId");
CREATE INDEX "ProjectMilestoneRepositoryLink_linkedById_idx" ON "ProjectMilestoneRepositoryLink"("linkedById");
CREATE INDEX "ProjectMilestoneRepositoryLink_googleDriveFileId_idx" ON "ProjectMilestoneRepositoryLink"("googleDriveFileId");
CREATE INDEX "ProjectMilestoneRepositoryLink_source_idx" ON "ProjectMilestoneRepositoryLink"("source");
CREATE INDEX "ProjectMilestoneHistory_milestoneId_idx" ON "ProjectMilestoneHistory"("milestoneId");
CREATE INDEX "ProjectMilestoneHistory_performedBy_idx" ON "ProjectMilestoneHistory"("performedBy");
CREATE INDEX "ProjectMilestoneHistory_action_idx" ON "ProjectMilestoneHistory"("action");

PRAGMA foreign_keys=ON;
