-- Add structured period coverage dates to projects.
ALTER TABLE "Project" ADD COLUMN "assignmentPeriodStartDate" DATETIME;
ALTER TABLE "Project" ADD COLUMN "assignmentPeriodEndDate" DATETIME;

-- Track actual uploaded/linked evidence review state.
ALTER TABLE "RowEvidence" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW';
CREATE INDEX "RowEvidence_reviewStatus_idx" ON "RowEvidence"("reviewStatus");
