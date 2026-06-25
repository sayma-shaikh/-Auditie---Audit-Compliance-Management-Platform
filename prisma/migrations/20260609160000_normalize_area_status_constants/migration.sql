UPDATE "ProjectAreaAllocation"
SET "workStatus" = CASE
  WHEN "workStatus" = 'Not Started' THEN 'NOT_STARTED'
  WHEN "workStatus" = 'In Progress' THEN 'IN_PROGRESS'
  WHEN "workStatus" = 'Submitted' THEN 'SUBMITTED'
  ELSE "workStatus"
END;

UPDATE "ProjectAreaAllocation"
SET "reviewStatus" = CASE
  WHEN "reviewStatus" = 'Not Reviewed' THEN 'NOT_REVIEWED'
  WHEN "reviewStatus" = 'Awaiting Review' THEN 'AWAITING_REVIEW'
  WHEN "reviewStatus" = 'Approved' THEN 'APPROVED'
  WHEN "reviewStatus" = 'Rework Required' THEN 'REWORK_REQUIRED'
  ELSE "reviewStatus"
END;
