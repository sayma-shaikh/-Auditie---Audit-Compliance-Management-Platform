-- CreateTable
CREATE TABLE "ReviewProgramTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "framework" TEXT,
    "version" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReviewProgramTemplateMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "milestoneName" TEXT NOT NULL,
    "description" TEXT,
    "defaultDurationDays" INTEGER,
    "dependencySequence" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewProgramTemplateMilestone_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReviewProgramTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "milestoneName" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "targetDate" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "progressPercentage" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMilestone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectMilestoneRepositoryLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "repositoryItemId" TEXT NOT NULL,
    "linkedById" TEXT,
    "linkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMilestoneRepositoryLink_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMilestoneRepositoryLink_repositoryItemId_fkey" FOREIGN KEY ("repositoryItemId") REFERENCES "RepositoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMilestoneRepositoryLink_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectMilestoneComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "userId" TEXT,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMilestoneComment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMilestoneComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewProgramTemplate_name_framework_version_key" ON "ReviewProgramTemplate"("name", "framework", "version");
CREATE INDEX "ReviewProgramTemplate_framework_idx" ON "ReviewProgramTemplate"("framework");
CREATE UNIQUE INDEX "ReviewProgramTemplateMilestone_templateId_sequence_key" ON "ReviewProgramTemplateMilestone"("templateId", "sequence");
CREATE INDEX "ReviewProgramTemplateMilestone_templateId_idx" ON "ReviewProgramTemplateMilestone"("templateId");
CREATE UNIQUE INDEX "ProjectMilestone_projectId_sequence_key" ON "ProjectMilestone"("projectId", "sequence");
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");
CREATE INDEX "ProjectMilestone_ownerId_idx" ON "ProjectMilestone"("ownerId");
CREATE INDEX "ProjectMilestone_status_idx" ON "ProjectMilestone"("status");
CREATE UNIQUE INDEX "ProjectMilestoneRepositoryLink_milestoneId_repositoryItemId_key" ON "ProjectMilestoneRepositoryLink"("milestoneId", "repositoryItemId");
CREATE INDEX "ProjectMilestoneRepositoryLink_milestoneId_idx" ON "ProjectMilestoneRepositoryLink"("milestoneId");
CREATE INDEX "ProjectMilestoneRepositoryLink_repositoryItemId_idx" ON "ProjectMilestoneRepositoryLink"("repositoryItemId");
CREATE INDEX "ProjectMilestoneRepositoryLink_linkedById_idx" ON "ProjectMilestoneRepositoryLink"("linkedById");
CREATE INDEX "ProjectMilestoneComment_milestoneId_idx" ON "ProjectMilestoneComment"("milestoneId");
CREATE INDEX "ProjectMilestoneComment_userId_idx" ON "ProjectMilestoneComment"("userId");
