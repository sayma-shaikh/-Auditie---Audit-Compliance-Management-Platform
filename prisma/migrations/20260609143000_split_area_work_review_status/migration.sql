ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "workStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "ProjectAreaAllocation" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'NOT_REVIEWED';

UPDATE "ProjectAreaAllocation"
SET
  "workStatus" = CASE
    WHEN "status" = 'Submitted For Review' THEN 'SUBMITTED'
    WHEN "status" = 'Approved' THEN 'SUBMITTED'
    WHEN "status" = 'Rework Required' THEN 'IN_PROGRESS'
    WHEN "status" = 'Completed' THEN 'SUBMITTED'
    WHEN "status" = 'In Progress' THEN 'IN_PROGRESS'
    ELSE 'NOT_STARTED'
  END,
  "reviewStatus" = CASE
    WHEN "status" = 'Approved' THEN 'APPROVED'
    WHEN "status" = 'Completed' THEN 'APPROVED'
    WHEN "status" = 'Rework Required' THEN 'REWORK_REQUIRED'
    ELSE 'NOT_REVIEWED'
  END;
