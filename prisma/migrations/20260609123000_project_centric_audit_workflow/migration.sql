ALTER TABLE "Project" ADD COLUMN "natureOfProject" TEXT;
ALTER TABLE "Project" ADD COLUMN "assignmentPeriodCoverage" TEXT;
ALTER TABLE "Project" ADD COLUMN "assignmentExecutionStartDate" DATETIME;
ALTER TABLE "Project" ADD COLUMN "assignmentExecutionEndDate" DATETIME;
ALTER TABLE "Project" ADD COLUMN "reportingDeadline" DATETIME;
ALTER TABLE "Project" ADD COLUMN "auditManagerId" TEXT;
ALTER TABLE "Project" ADD COLUMN "typeOfIndustry" TEXT;
ALTER TABLE "Project" ADD COLUMN "geographicalPresence" TEXT;
ALTER TABLE "Project" ADD COLUMN "listingOnExchanges" TEXT;
ALTER TABLE "Project" ADD COLUMN "registeredOfficeAddress" TEXT;
ALTER TABLE "Project" ADD COLUMN "corporateOfficeAddress" TEXT;
ALTER TABLE "Project" ADD COLUMN "email" TEXT;
ALTER TABLE "Project" ADD COLUMN "telephone" TEXT;
ALTER TABLE "Project" ADD COLUMN "cinNo" TEXT;
ALTER TABLE "Project" ADD COLUMN "pan" TEXT;
ALTER TABLE "Project" ADD COLUMN "gst" TEXT;
ALTER TABLE "Project" ADD COLUMN "website" TEXT;
ALTER TABLE "Project" ADD COLUMN "currentStage" TEXT;
ALTER TABLE "Project" ADD COLUMN "createdBy" TEXT;

CREATE TABLE "ProjectAreaAllocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "areaName" TEXT NOT NULL,
  "assignedUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Not Started',
  "remarks" TEXT,
  "dueDate" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProjectAreaAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectStage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "stageName" TEXT NOT NULL,
  "stageOrder" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "assignedTo" TEXT,
  "startDate" DATETIME,
  "targetDate" DATETIME,
  "completedDate" DATETIME,
  "remarks" TEXT,
  "documents" TEXT,
  "comments" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectQuery" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "raisedBy" TEXT,
  "assignedTo" TEXT,
  "queryText" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'Medium',
  "status" TEXT NOT NULL DEFAULT 'Open',
  "dueDate" DATETIME,
  "response" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProjectQuery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectBilling" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "invoiceNumber" TEXT,
  "invoiceDate" DATETIME,
  "invoiceAmount" REAL NOT NULL DEFAULT 0,
  "taxAmount" REAL NOT NULL DEFAULT 0,
  "totalAmount" REAL NOT NULL DEFAULT 0,
  "billingStatus" TEXT NOT NULL DEFAULT 'Not Billed',
  "paymentDueDate" DATETIME,
  "amountReceived" REAL NOT NULL DEFAULT 0,
  "paymentDate" DATETIME,
  "paymentMode" TEXT,
  "outstandingAmount" REAL NOT NULL DEFAULT 0,
  "collectionStatus" TEXT NOT NULL DEFAULT 'Pending',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProjectBilling_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectFeedback" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "feedbackRating" INTEGER,
  "feedbackComments" TEXT,
  "receivedFrom" TEXT,
  "feedbackDate" DATETIME,
  "improvementNotes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProjectFeedback_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectBackup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "evidenceBackedUp" BOOLEAN NOT NULL DEFAULT false,
  "reportsBackedUp" BOOLEAN NOT NULL DEFAULT false,
  "clientDocumentsBackedUp" BOOLEAN NOT NULL DEFAULT false,
  "workingPapersBackedUp" BOOLEAN NOT NULL DEFAULT false,
  "finalArchiveCompleted" BOOLEAN NOT NULL DEFAULT false,
  "backupStatus" TEXT NOT NULL DEFAULT 'Pending',
  "backupLocation" TEXT,
  "backupCompletedBy" TEXT,
  "backupDate" DATETIME,
  "remarks" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProjectBackup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectActivityLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actor" TEXT,
  "action" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "details" TEXT,
  CONSTRAINT "ProjectActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "makerUserId" TEXT;
ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "reviewerUserId" TEXT;
ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "checklistSnapshot" TEXT;
ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "evidenceRecords" TEXT;
ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "reviewComments" TEXT;
ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "submittedAt" DATETIME;
ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "reworkCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Project_auditManagerId_idx" ON "Project"("auditManagerId");
CREATE INDEX "Project_createdBy_idx" ON "Project"("createdBy");
CREATE INDEX "ProjectAreaAllocation_projectId_idx" ON "ProjectAreaAllocation"("projectId");
CREATE INDEX "ProjectAreaAllocation_assignedUserId_idx" ON "ProjectAreaAllocation"("assignedUserId");
CREATE INDEX "ProjectAreaAllocation_makerUserId_idx" ON "ProjectAreaAllocation"("makerUserId");
CREATE INDEX "ProjectAreaAllocation_reviewerUserId_idx" ON "ProjectAreaAllocation"("reviewerUserId");
CREATE INDEX "ProjectStage_projectId_idx" ON "ProjectStage"("projectId");
CREATE INDEX "ProjectStage_assignedTo_idx" ON "ProjectStage"("assignedTo");
CREATE INDEX "ProjectQuery_projectId_idx" ON "ProjectQuery"("projectId");
CREATE INDEX "ProjectBilling_projectId_idx" ON "ProjectBilling"("projectId");
CREATE INDEX "ProjectFeedback_projectId_idx" ON "ProjectFeedback"("projectId");
CREATE INDEX "ProjectBackup_projectId_idx" ON "ProjectBackup"("projectId");
CREATE INDEX "ProjectActivityLog_projectId_idx" ON "ProjectActivityLog"("projectId");
CREATE INDEX "ProjectActivityLog_action_idx" ON "ProjectActivityLog"("action");
