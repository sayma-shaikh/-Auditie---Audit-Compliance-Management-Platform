ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "checklistType" TEXT NOT NULL DEFAULT 'QUESTION_CHECKLIST';
ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "checklistTemplateId" TEXT;

CREATE TABLE "ChecklistTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "framework" TEXT,
  "areaKey" TEXT,
  "evidenceRequirement" TEXT,
  "validationRules" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ChecklistColumn" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "columnName" TEXT NOT NULL,
  "columnKey" TEXT NOT NULL,
  "columnType" TEXT NOT NULL DEFAULT 'text',
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "options" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChecklistColumn_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ChecklistRow" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "auditAreaId" TEXT NOT NULL,
  "templateId" TEXT,
  "rowData" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "comments" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChecklistRow_auditAreaId_fkey" FOREIGN KEY ("auditAreaId") REFERENCES "ProjectAreaAllocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChecklistRow_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "RowEvidence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "rowId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileType" TEXT,
  "fileSize" INTEGER,
  "uploadedBy" TEXT,
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RowEvidence_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "ChecklistRow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProjectAreaAllocation_checklistTemplateId_idx" ON "ProjectAreaAllocation"("checklistTemplateId");
CREATE INDEX "ChecklistTemplate_type_idx" ON "ChecklistTemplate"("type");
CREATE INDEX "ChecklistTemplate_framework_idx" ON "ChecklistTemplate"("framework");
CREATE INDEX "ChecklistTemplate_areaKey_idx" ON "ChecklistTemplate"("areaKey");
CREATE INDEX "ChecklistColumn_templateId_idx" ON "ChecklistColumn"("templateId");
CREATE UNIQUE INDEX "ChecklistColumn_templateId_columnKey_key" ON "ChecklistColumn"("templateId", "columnKey");
CREATE INDEX "ChecklistRow_auditAreaId_idx" ON "ChecklistRow"("auditAreaId");
CREATE INDEX "ChecklistRow_templateId_idx" ON "ChecklistRow"("templateId");
CREATE INDEX "ChecklistRow_status_idx" ON "ChecklistRow"("status");
CREATE INDEX "RowEvidence_rowId_idx" ON "RowEvidence"("rowId");
CREATE INDEX "RowEvidence_uploadedBy_idx" ON "RowEvidence"("uploadedBy");
