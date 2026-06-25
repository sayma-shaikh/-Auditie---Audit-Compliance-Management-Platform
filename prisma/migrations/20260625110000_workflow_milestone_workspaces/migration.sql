ALTER TABLE "ReviewProgramTemplateMilestone" ADD COLUMN "milestoneKey" TEXT;
ALTER TABLE "ReviewProgramTemplateMilestone" ADD COLUMN "workspaceType" TEXT;
ALTER TABLE "ReviewProgramTemplateMilestone" ADD COLUMN "defaultWeight" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ReviewProgramTemplateMilestone" ADD COLUMN "defaultOwnerRole" TEXT;

ALTER TABLE "ProjectMilestone" ADD COLUMN "milestoneKey" TEXT;
ALTER TABLE "ProjectMilestone" ADD COLUMN "requiredAction" TEXT;
ALTER TABLE "ProjectMilestone" ADD COLUMN "workspaceType" TEXT;
ALTER TABLE "ProjectMilestone" ADD COLUMN "workspaceId" TEXT;

ALTER TABLE "ProjectMilestoneHistory" ADD COLUMN "oldValue" TEXT;
ALTER TABLE "ProjectMilestoneHistory" ADD COLUMN "newValue" TEXT;

CREATE TABLE "PlanningWorkspace" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "scopeDefined" BOOLEAN NOT NULL DEFAULT false,
  "objectivesDefined" BOOLEAN NOT NULL DEFAULT false,
  "auditCriteriaDefined" BOOLEAN NOT NULL DEFAULT false,
  "applicableStandards" TEXT,
  "engagementLetterLinked" BOOLEAN NOT NULL DEFAULT false,
  "ndaLinked" BOOLEAN NOT NULL DEFAULT false,
  "auditPlanLinked" BOOLEAN NOT NULL DEFAULT false,
  "teamAllocated" BOOLEAN NOT NULL DEFAULT false,
  "schedulePrepared" BOOLEAN NOT NULL DEFAULT false,
  "samplingApproachDefined" BOOLEAN NOT NULL DEFAULT false,
  "remarks" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PlanningWorkspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanningWorkspace_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PlanningWorkspace_milestoneId_key" ON "PlanningWorkspace"("milestoneId");
CREATE INDEX "PlanningWorkspace_projectId_idx" ON "PlanningWorkspace"("projectId");

CREATE TABLE "ProjectManagementWorkspace" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "governanceOwnerId" TEXT,
  "escalationMatrixDefined" BOOLEAN NOT NULL DEFAULT false,
  "communicationPlanDefined" BOOLEAN NOT NULL DEFAULT false,
  "weeklyTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "risksLogged" BOOLEAN NOT NULL DEFAULT false,
  "remarks" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProjectManagementWorkspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectManagementWorkspace_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProjectManagementWorkspace_milestoneId_key" ON "ProjectManagementWorkspace"("milestoneId");
CREATE INDEX "ProjectManagementWorkspace_projectId_idx" ON "ProjectManagementWorkspace"("projectId");

CREATE TABLE "MeetingWorkspace" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "meetingType" TEXT NOT NULL,
  "meetingDate" DATETIME,
  "meetingTime" TEXT,
  "location" TEXT,
  "agenda" TEXT,
  "attendees" TEXT,
  "minutesOfMeeting" TEXT,
  "actionItems" TEXT,
  "attendanceLinked" BOOLEAN NOT NULL DEFAULT false,
  "momLinked" BOOLEAN NOT NULL DEFAULT false,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "MeetingWorkspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MeetingWorkspace_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MeetingWorkspace_milestoneId_key" ON "MeetingWorkspace"("milestoneId");
CREATE INDEX "MeetingWorkspace_projectId_idx" ON "MeetingWorkspace"("projectId");
CREATE INDEX "MeetingWorkspace_meetingType_idx" ON "MeetingWorkspace"("meetingType");

CREATE TABLE "AreaChecklistWorkspace" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "generatedFromTemplate" BOOLEAN NOT NULL DEFAULT false,
  "areasAllocated" BOOLEAN NOT NULL DEFAULT false,
  "checklistGenerated" BOOLEAN NOT NULL DEFAULT false,
  "remarks" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AreaChecklistWorkspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AreaChecklistWorkspace_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AreaChecklistWorkspace_milestoneId_key" ON "AreaChecklistWorkspace"("milestoneId");
CREATE INDEX "AreaChecklistWorkspace_projectId_idx" ON "AreaChecklistWorkspace"("projectId");

CREATE TABLE "DataRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "requestTitle" TEXT NOT NULL,
  "description" TEXT,
  "assignedTo" TEXT,
  "dueDate" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "response" TEXT,
  "repositoryItemId" TEXT,
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "DataRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DataRequest_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DataRequest_projectId_idx" ON "DataRequest"("projectId");
CREATE INDEX "DataRequest_milestoneId_idx" ON "DataRequest"("milestoneId");
CREATE INDEX "DataRequest_status_idx" ON "DataRequest"("status");

CREATE TABLE "ProcessWalkthrough" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "processName" TEXT NOT NULL,
  "department" TEXT,
  "processOwner" TEXT,
  "walkthroughDate" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "gapsIdentified" INTEGER NOT NULL DEFAULT 0,
  "repositoryItemId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProcessWalkthrough_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProcessWalkthrough_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProcessWalkthrough_projectId_idx" ON "ProcessWalkthrough"("projectId");
CREATE INDEX "ProcessWalkthrough_milestoneId_idx" ON "ProcessWalkthrough"("milestoneId");
CREATE INDEX "ProcessWalkthrough_status_idx" ON "ProcessWalkthrough"("status");

CREATE TABLE "RiskControlMatrixItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "processArea" TEXT NOT NULL,
  "riskDescription" TEXT NOT NULL,
  "controlDescription" TEXT NOT NULL,
  "controlOwner" TEXT,
  "controlType" TEXT,
  "frequency" TEXT,
  "testingApproach" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "RiskControlMatrixItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RiskControlMatrixItem_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "RiskControlMatrixItem_projectId_idx" ON "RiskControlMatrixItem"("projectId");
CREATE INDEX "RiskControlMatrixItem_milestoneId_idx" ON "RiskControlMatrixItem"("milestoneId");
CREATE INDEX "RiskControlMatrixItem_status_idx" ON "RiskControlMatrixItem"("status");

CREATE TABLE "SamplingItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "populationName" TEXT NOT NULL,
  "populationSize" INTEGER,
  "sampleSize" INTEGER,
  "samplingMethod" TEXT,
  "selectedSamples" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "SamplingItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SamplingItem_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SamplingItem_projectId_idx" ON "SamplingItem"("projectId");
CREATE INDEX "SamplingItem_milestoneId_idx" ON "SamplingItem"("milestoneId");
CREATE INDEX "SamplingItem_status_idx" ON "SamplingItem"("status");

CREATE TABLE "WeeklyStatusUpdate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "weekStartDate" DATETIME NOT NULL,
  "summary" TEXT NOT NULL,
  "completedWork" TEXT,
  "pendingWork" TEXT,
  "blockers" TEXT,
  "nextSteps" TEXT,
  "submittedBy" TEXT,
  "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyStatusUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WeeklyStatusUpdate_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WeeklyStatusUpdate_projectId_idx" ON "WeeklyStatusUpdate"("projectId");
CREATE INDEX "WeeklyStatusUpdate_milestoneId_idx" ON "WeeklyStatusUpdate"("milestoneId");
CREATE INDEX "WeeklyStatusUpdate_weekStartDate_idx" ON "WeeklyStatusUpdate"("weekStartDate");

CREATE TABLE "InterimReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "reviewDate" DATETIME,
  "reviewComments" TEXT,
  "openPoints" INTEGER NOT NULL DEFAULT 0,
  "resolvedPoints" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InterimReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InterimReview_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InterimReview_projectId_idx" ON "InterimReview"("projectId");
CREATE INDEX "InterimReview_milestoneId_idx" ON "InterimReview"("milestoneId");
CREATE INDEX "InterimReview_status_idx" ON "InterimReview"("status");

CREATE TABLE "ReportVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "repositoryItemId" TEXT,
  "uploadedBy" TEXT,
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ReportVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReportVersion_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReportVersion_projectId_idx" ON "ReportVersion"("projectId");
CREATE INDEX "ReportVersion_milestoneId_idx" ON "ReportVersion"("milestoneId");
CREATE INDEX "ReportVersion_status_idx" ON "ReportVersion"("status");

CREATE TABLE "ReportReviewComment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "reportVersionId" TEXT,
  "reviewerId" TEXT,
  "comment" TEXT NOT NULL,
  "severity" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ReportReviewComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReportReviewComment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReportReviewComment_projectId_idx" ON "ReportReviewComment"("projectId");
CREATE INDEX "ReportReviewComment_milestoneId_idx" ON "ReportReviewComment"("milestoneId");
CREATE INDEX "ReportReviewComment_status_idx" ON "ReportReviewComment"("status");

CREATE TABLE "ReportSubmission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "reportVersionId" TEXT,
  "submittedTo" TEXT,
  "submittedDate" DATETIME,
  "submissionMode" TEXT,
  "acknowledgementLinked" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ReportSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReportSubmission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReportSubmission_projectId_idx" ON "ReportSubmission"("projectId");
CREATE INDEX "ReportSubmission_milestoneId_idx" ON "ReportSubmission"("milestoneId");
CREATE INDEX "ReportSubmission_status_idx" ON "ReportSubmission"("status");
