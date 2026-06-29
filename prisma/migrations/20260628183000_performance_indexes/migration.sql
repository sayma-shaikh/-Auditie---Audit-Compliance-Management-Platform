CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");
CREATE INDEX IF NOT EXISTS "Project_reportingDeadline_idx" ON "Project"("reportingDeadline");
CREATE INDEX IF NOT EXISTS "Project_createdAt_idx" ON "Project"("createdAt");

CREATE INDEX IF NOT EXISTS "ProjectAreaAllocation_status_idx" ON "ProjectAreaAllocation"("status");
CREATE INDEX IF NOT EXISTS "ProjectAreaAllocation_workStatus_idx" ON "ProjectAreaAllocation"("workStatus");
CREATE INDEX IF NOT EXISTS "ProjectAreaAllocation_reviewStatus_idx" ON "ProjectAreaAllocation"("reviewStatus");
CREATE INDEX IF NOT EXISTS "ProjectAreaAllocation_dueDate_idx" ON "ProjectAreaAllocation"("dueDate");
CREATE INDEX IF NOT EXISTS "ProjectAreaAllocation_projectId_reviewStatus_idx" ON "ProjectAreaAllocation"("projectId", "reviewStatus");
CREATE INDEX IF NOT EXISTS "ProjectAreaAllocation_projectId_workStatus_idx" ON "ProjectAreaAllocation"("projectId", "workStatus");

CREATE INDEX IF NOT EXISTS "ChecklistRow_createdAt_idx" ON "ChecklistRow"("createdAt");
CREATE INDEX IF NOT EXISTS "ChecklistRow_updatedAt_idx" ON "ChecklistRow"("updatedAt");
CREATE INDEX IF NOT EXISTS "ChecklistRow_auditAreaId_status_idx" ON "ChecklistRow"("auditAreaId", "status");
CREATE INDEX IF NOT EXISTS "ChecklistRow_auditAreaId_sortOrder_idx" ON "ChecklistRow"("auditAreaId", "sortOrder");

CREATE INDEX IF NOT EXISTS "RowEvidence_uploadedAt_idx" ON "RowEvidence"("uploadedAt");
CREATE INDEX IF NOT EXISTS "RowEvidence_rowId_uploadedAt_idx" ON "RowEvidence"("rowId", "uploadedAt");

CREATE INDEX IF NOT EXISTS "Observation_createdAt_idx" ON "Observation"("createdAt");
CREATE INDEX IF NOT EXISTS "Observation_projectId_status_idx" ON "Observation"("projectId", "status");

CREATE INDEX IF NOT EXISTS "CAPA_targetDate_idx" ON "CAPA"("targetDate");
CREATE INDEX IF NOT EXISTS "CAPA_projectId_closureStatus_idx" ON "CAPA"("projectId", "closureStatus");

CREATE INDEX IF NOT EXISTS "ProjectMilestone_targetDate_idx" ON "ProjectMilestone"("targetDate");
CREATE INDEX IF NOT EXISTS "ProjectMilestone_projectId_status_idx" ON "ProjectMilestone"("projectId", "status");

CREATE INDEX IF NOT EXISTS "ProjectActivityLog_timestamp_idx" ON "ProjectActivityLog"("timestamp");
CREATE INDEX IF NOT EXISTS "ProjectActivityLog_projectId_timestamp_idx" ON "ProjectActivityLog"("projectId", "timestamp");

CREATE INDEX IF NOT EXISTS "TaskAssignment_status_idx" ON "TaskAssignment"("status");
CREATE INDEX IF NOT EXISTS "TaskAssignment_dueDate_idx" ON "TaskAssignment"("dueDate");
CREATE INDEX IF NOT EXISTS "TaskAssignment_userId_status_idx" ON "TaskAssignment"("userId", "status");

CREATE INDEX IF NOT EXISTS "RepositoryItem_createdById_idx" ON "RepositoryItem"("createdById");
CREATE INDEX IF NOT EXISTS "RepositoryItem_updatedById_idx" ON "RepositoryItem"("updatedById");
CREATE INDEX IF NOT EXISTS "RepositoryItem_source_idx" ON "RepositoryItem"("source");
CREATE INDEX IF NOT EXISTS "RepositoryItem_type_idx" ON "RepositoryItem"("type");

CREATE INDEX IF NOT EXISTS "RepositoryAudit_itemId_idx" ON "RepositoryAudit"("itemId");
CREATE INDEX IF NOT EXISTS "RepositoryAudit_userId_idx" ON "RepositoryAudit"("userId");
CREATE INDEX IF NOT EXISTS "RepositoryAudit_action_idx" ON "RepositoryAudit"("action");
CREATE INDEX IF NOT EXISTS "RepositoryAudit_createdAt_idx" ON "RepositoryAudit"("createdAt");
