-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT,
    "projectId" TEXT,
    "templateId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentReferenceNo" TEXT,
    "docxPath" TEXT,
    "filePath" TEXT NOT NULL,
    "pdfPath" TEXT,
    "warnings" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "staleWarnings" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedDocument_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DocumentGenerationBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentGenerationBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "batchName" TEXT NOT NULL,
    "templateCount" INTEGER NOT NULL,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zipPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED'
);

-- CreateTable
CREATE TABLE "Register" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "registerName" TEXT NOT NULL,
    "registerType" TEXT,
    "framework" TEXT,
    "linkedAuditArea" TEXT,
    "linkedControl" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "filePath" TEXT NOT NULL,
    "sheetNames" TEXT,
    "detectedColumns" TEXT,
    "previewRows" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegisterVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registerId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeSummary" TEXT,
    CONSTRAINT "RegisterVersion_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "Register" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChecklistColumn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "columnKey" TEXT NOT NULL,
    "columnType" TEXT NOT NULL DEFAULT 'text',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "options" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChecklistColumn_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChecklistColumn" ("columnKey", "columnName", "columnType", "createdAt", "id", "isRequired", "options", "sortOrder", "templateId", "updatedAt") SELECT "columnKey", "columnName", "columnType", "createdAt", "id", "isRequired", "options", "sortOrder", "templateId", "updatedAt" FROM "ChecklistColumn";
DROP TABLE "ChecklistColumn";
ALTER TABLE "new_ChecklistColumn" RENAME TO "ChecklistColumn";
CREATE INDEX "ChecklistColumn_templateId_idx" ON "ChecklistColumn"("templateId");
CREATE UNIQUE INDEX "ChecklistColumn_templateId_columnKey_key" ON "ChecklistColumn"("templateId", "columnKey");
CREATE TABLE "new_ChecklistRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditAreaId" TEXT NOT NULL,
    "templateId" TEXT,
    "rowData" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "comments" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChecklistRow_auditAreaId_fkey" FOREIGN KEY ("auditAreaId") REFERENCES "ProjectAreaAllocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChecklistRow_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChecklistRow" ("auditAreaId", "comments", "createdAt", "id", "rowData", "sortOrder", "status", "templateId", "updatedAt") SELECT "auditAreaId", "comments", "createdAt", "id", "rowData", "sortOrder", "status", "templateId", "updatedAt" FROM "ChecklistRow";
DROP TABLE "ChecklistRow";
ALTER TABLE "new_ChecklistRow" RENAME TO "ChecklistRow";
CREATE INDEX "ChecklistRow_auditAreaId_idx" ON "ChecklistRow"("auditAreaId");
CREATE INDEX "ChecklistRow_templateId_idx" ON "ChecklistRow"("templateId");
CREATE INDEX "ChecklistRow_status_idx" ON "ChecklistRow"("status");
CREATE TABLE "new_ChecklistTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "framework" TEXT,
    "areaKey" TEXT,
    "evidenceRequirement" TEXT,
    "validationRules" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ChecklistTemplate" ("areaKey", "createdAt", "evidenceRequirement", "framework", "id", "name", "type", "updatedAt", "validationRules") SELECT "areaKey", "createdAt", "evidenceRequirement", "framework", "id", "name", "type", "updatedAt", "validationRules" FROM "ChecklistTemplate";
DROP TABLE "ChecklistTemplate";
ALTER TABLE "new_ChecklistTemplate" RENAME TO "ChecklistTemplate";
CREATE INDEX "ChecklistTemplate_type_idx" ON "ChecklistTemplate"("type");
CREATE INDEX "ChecklistTemplate_framework_idx" ON "ChecklistTemplate"("framework");
CREATE INDEX "ChecklistTemplate_areaKey_idx" ON "ChecklistTemplate"("areaKey");
CREATE TABLE "new_ProjectAreaAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "makerUserId" TEXT,
    "reviewerUserId" TEXT,
    "checklistType" TEXT NOT NULL DEFAULT 'QUESTION_CHECKLIST',
    "checklistTemplateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "workStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "reviewStatus" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
    "remarks" TEXT,
    "dueDate" DATETIME,
    "checklistSnapshot" TEXT,
    "evidenceRecords" TEXT,
    "reviewComments" TEXT,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "reworkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectAreaAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectAreaAllocation_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectAreaAllocation" ("approvedAt", "areaName", "assignedUserId", "checklistSnapshot", "checklistTemplateId", "checklistType", "createdAt", "dueDate", "evidenceRecords", "id", "makerUserId", "projectId", "remarks", "reviewComments", "reviewStatus", "reviewerUserId", "reworkCount", "status", "submittedAt", "updatedAt", "workStatus") SELECT "approvedAt", "areaName", "assignedUserId", "checklistSnapshot", "checklistTemplateId", "checklistType", "createdAt", "dueDate", "evidenceRecords", "id", "makerUserId", "projectId", "remarks", "reviewComments", "reviewStatus", "reviewerUserId", "reworkCount", "status", "submittedAt", "updatedAt", "workStatus" FROM "ProjectAreaAllocation";
DROP TABLE "ProjectAreaAllocation";
ALTER TABLE "new_ProjectAreaAllocation" RENAME TO "ProjectAreaAllocation";
CREATE INDEX "ProjectAreaAllocation_projectId_idx" ON "ProjectAreaAllocation"("projectId");
CREATE INDEX "ProjectAreaAllocation_checklistTemplateId_idx" ON "ProjectAreaAllocation"("checklistTemplateId");
CREATE INDEX "ProjectAreaAllocation_assignedUserId_idx" ON "ProjectAreaAllocation"("assignedUserId");
CREATE INDEX "ProjectAreaAllocation_makerUserId_idx" ON "ProjectAreaAllocation"("makerUserId");
CREATE INDEX "ProjectAreaAllocation_reviewerUserId_idx" ON "ProjectAreaAllocation"("reviewerUserId");
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "templateName" TEXT,
    "templateType" TEXT,
    "framework" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "placeholdersDetected" TEXT,
    "placeholderMapping" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Template" ("category", "createdAt", "description", "filePath", "framework", "id", "isActive", "tags", "title", "updatedAt", "version") SELECT "category", "createdAt", "description", "filePath", "framework", "id", "isActive", "tags", "title", "updatedAt", "version" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "role" TEXT NOT NULL DEFAULT 'AUDITOR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "profileImage" TEXT,
    "joiningDate" DATETIME,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "department", "designation", "email", "employeeId", "id", "joiningDate", "lastLogin", "name", "password", "phone", "profileImage", "role", "status", "updatedAt") SELECT "createdAt", "department", "designation", "email", "employeeId", "id", "joiningDate", "lastLogin", "name", "password", "phone", "profileImage", "role", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");
CREATE INDEX "User_employeeId_idx" ON "User"("employeeId");
CREATE INDEX "User_email_idx" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GeneratedDocument_batchId_idx" ON "GeneratedDocument"("batchId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_projectId_idx" ON "GeneratedDocument"("projectId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_templateId_idx" ON "GeneratedDocument"("templateId");

-- CreateIndex
CREATE INDEX "DocumentGenerationBatch_projectId_idx" ON "DocumentGenerationBatch"("projectId");

-- CreateIndex
CREATE INDEX "DocumentGenerationBatch_generatedAt_idx" ON "DocumentGenerationBatch"("generatedAt");

-- CreateIndex
CREATE INDEX "Register_projectId_idx" ON "Register"("projectId");

-- CreateIndex
CREATE INDEX "Register_registerType_idx" ON "Register"("registerType");

-- CreateIndex
CREATE INDEX "RegisterVersion_registerId_idx" ON "RegisterVersion"("registerId");
