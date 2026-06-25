import { PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient;

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function boolProgress(record: any, fields: string[]) {
  return percent(fields.filter((field) => !!record?.[field]).length, fields.length);
}

export async function calculateMilestoneProgress(prisma: PrismaLike, milestone: any) {
  const workspaceType = milestone.workspaceType;

  if (workspaceType === 'PLANNING_WORKSPACE') {
    const workspace = await prisma.planningWorkspace.findUnique({ where: { milestoneId: milestone.id } });
    return {
      progressPercentage: boolProgress(workspace, ['scopeDefined', 'objectivesDefined', 'auditCriteriaDefined', 'engagementLetterLinked', 'ndaLinked', 'auditPlanLinked', 'teamAllocated', 'schedulePrepared', 'samplingApproachDefined']),
      requiredAction: workspace?.scopeDefined ? 'Complete remaining planning requirements' : 'Define project scope',
    };
  }

  if (workspaceType === 'PROJECT_MANAGEMENT_WORKSPACE') {
    const workspace = await prisma.projectManagementWorkspace.findUnique({ where: { milestoneId: milestone.id } });
    return {
      progressPercentage: boolProgress(workspace, ['escalationMatrixDefined', 'communicationPlanDefined', 'weeklyTrackingEnabled', 'risksLogged']),
      requiredAction: 'Complete governance tracking setup',
    };
  }

  if (workspaceType === 'MEETING_WORKSPACE' || workspaceType === 'CLOSING_MEETING_WORKSPACE' || workspaceType === 'COMMITTEE_MEETING_WORKSPACE') {
    const workspace = await prisma.meetingWorkspace.findUnique({ where: { milestoneId: milestone.id } });
    const progress = boolProgress(workspace, ['meetingDate', 'agenda', 'attendees', 'momLinked']);
    return { progressPercentage: workspace?.completed ? 100 : progress, requiredAction: workspace?.meetingDate ? 'Record MoM and action items' : 'Schedule meeting' };
  }

  if (workspaceType === 'AREA_CHECKLIST_WORKSPACE') {
    const [workspace, totalAreas, generatedAreas] = await Promise.all([
      prisma.areaChecklistWorkspace.findUnique({ where: { milestoneId: milestone.id } }),
      prisma.projectAreaAllocation.count({ where: { projectId: milestone.projectId, parentAreaId: null } }),
      prisma.projectAreaAllocation.count({ where: { projectId: milestone.projectId, parentAreaId: null, checklistType: 'TABLE_CHECKLIST' } }),
    ]);
    return {
      progressPercentage: totalAreas ? percent(generatedAreas, totalAreas) : boolProgress(workspace, ['areasAllocated', 'checklistGenerated']),
      requiredAction: totalAreas ? 'Review area allocations and generated checklists' : 'Allocate audit areas',
    };
  }

  if (workspaceType === 'DATA_REQUEST_WORKSPACE') {
    const requests = await prisma.dataRequest.findMany({ where: { milestoneId: milestone.id } });
    return {
      progressPercentage: percent(requests.filter((item) => ['RECEIVED', 'CLOSED'].includes(item.status)).length, requests.length),
      requiredAction: requests.length ? 'Follow up pending data requests' : 'Create data requirement requests',
    };
  }

  if (workspaceType === 'PROCESS_WALKTHROUGH_WORKSPACE') {
    const items = await prisma.processWalkthrough.findMany({ where: { milestoneId: milestone.id } });
    return {
      progressPercentage: percent(items.filter((item) => item.status === 'COMPLETED').length, items.length),
      requiredAction: items.length ? 'Complete pending walkthroughs' : 'Add process walkthroughs',
    };
  }

  if (workspaceType === 'RCM_WORKSPACE') {
    const items = await prisma.riskControlMatrixItem.findMany({ where: { milestoneId: milestone.id } });
    return {
      progressPercentage: percent(items.filter((item) => item.status === 'COMPLETED' || item.status === 'APPROVED').length, items.length),
      requiredAction: items.length ? 'Complete RCM review' : 'Create RCM items',
    };
  }

  if (workspaceType === 'SAMPLING_WORKSPACE') {
    const items = await prisma.samplingItem.findMany({ where: { milestoneId: milestone.id } });
    return {
      progressPercentage: percent(items.filter((item) => item.status === 'COMPLETED').length, items.length),
      requiredAction: items.length ? 'Complete sampling selections' : 'Add sampling populations',
    };
  }

  if (workspaceType === 'EXECUTION_WORKSPACE') {
    const areas = await prisma.projectAreaAllocation.findMany({ where: { projectId: milestone.projectId, parentAreaId: null } });
    const score = (status: string | null | undefined) => {
      if (['Completed', 'Approved'].includes(status || '')) return 100;
      if (['Submitted For Review', 'Rework Required'].includes(status || '')) return 75;
      if (['In Progress'].includes(status || '')) return 50;
      return 0;
    };
    return {
      progressPercentage: areas.length ? Math.round(areas.reduce((sum, area) => sum + score(area.status), 0) / areas.length) : 0,
      requiredAction: areas.length ? 'Open assignments requiring review' : 'Allocate audit areas',
    };
  }

  if (workspaceType === 'WEEKLY_STATUS_WORKSPACE') {
    const count = await prisma.weeklyStatusUpdate.count({ where: { milestoneId: milestone.id } });
    return { progressPercentage: count ? 100 : 0, requiredAction: count ? 'Review latest weekly update' : 'Add weekly update' };
  }

  if (workspaceType === 'INTERIM_REVIEW_WORKSPACE') {
    const review = await prisma.interimReview.findFirst({ where: { milestoneId: milestone.id }, orderBy: { createdAt: 'desc' } });
    return {
      progressPercentage: review ? (review.openPoints ? percent(review.resolvedPoints, review.openPoints) : (review.status === 'COMPLETED' ? 100 : 50)) : 0,
      requiredAction: review ? 'Resolve interim review points' : 'Create interim review',
    };
  }

  if (workspaceType === 'QUERY_WORKSPACE') {
    const queries = await prisma.projectQuery.findMany({ where: { projectId: milestone.projectId } });
    return {
      progressPercentage: percent(queries.filter((query) => ['Closed', 'CLOSED', 'Resolved', 'RESOLVED'].includes(query.status)).length, queries.length),
      requiredAction: queries.length ? 'Close pending queries' : 'Raise or confirm project queries',
    };
  }

  if (workspaceType === 'REPORT_WORKSPACE') {
    const versions = await prisma.reportVersion.findMany({ where: { milestoneId: milestone.id } });
    const approved = versions.some((item) => ['APPROVED', 'FINAL'].includes(item.status));
    return { progressPercentage: approved ? 100 : (versions.length ? 60 : 0), requiredAction: versions.length ? 'Review report version' : 'Upload report version' };
  }

  if (workspaceType === 'REPORT_REVIEW_WORKSPACE') {
    const comments = await prisma.reportReviewComment.findMany({ where: { milestoneId: milestone.id } });
    return {
      progressPercentage: percent(comments.filter((item) => ['RESOLVED', 'CLOSED'].includes(item.status)).length, comments.length),
      requiredAction: comments.length ? 'Resolve report review comments' : 'Add report review comments',
    };
  }

  if (workspaceType === 'REPORT_SUBMISSION_WORKSPACE') {
    const submission = await prisma.reportSubmission.findFirst({ where: { milestoneId: milestone.id }, orderBy: { createdAt: 'desc' } });
    return {
      progressPercentage: submission?.acknowledgementLinked ? 100 : (submission?.submittedDate ? 70 : 0),
      requiredAction: submission?.submittedDate ? 'Link submission acknowledgement' : 'Submit report',
    };
  }

  return { progressPercentage: milestone.progressPercentage || 0, requiredAction: milestone.requiredAction || 'Open milestone workspace' };
}
