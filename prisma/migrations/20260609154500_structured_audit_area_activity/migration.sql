ALTER TABLE "ProjectActivityLog" ADD COLUMN "auditAreaId" TEXT;
ALTER TABLE "ProjectActivityLog" ADD COLUMN "checklistItemId" TEXT;
ALTER TABLE "ProjectActivityLog" ADD COLUMN "actionType" TEXT;
ALTER TABLE "ProjectActivityLog" ADD COLUMN "oldValue" TEXT;
ALTER TABLE "ProjectActivityLog" ADD COLUMN "newValue" TEXT;
ALTER TABLE "ProjectActivityLog" ADD COLUMN "performedByName" TEXT;
ALTER TABLE "ProjectActivityLog" ADD COLUMN "message" TEXT;

CREATE INDEX "ProjectActivityLog_auditAreaId_idx" ON "ProjectActivityLog"("auditAreaId");
CREATE INDEX "ProjectActivityLog_checklistItemId_idx" ON "ProjectActivityLog"("checklistItemId");
CREATE INDEX "ProjectActivityLog_actionType_idx" ON "ProjectActivityLog"("actionType");
