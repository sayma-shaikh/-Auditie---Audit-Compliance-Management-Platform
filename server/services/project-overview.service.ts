import { PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient;

type OverviewFilters = {
  area?: string;
  owner?: string;
  reviewer?: string;
  milestone?: string;
  status?: string;
  severity?: string;
  framework?: string;
  dueDateRange?: string;
};

type AssignmentUrgency = 'OVERDUE' | 'BLOCKED' | 'ACTION_REQUIRED' | 'REVIEW_OVERDUE' | 'MISSING_EVIDENCE' | 'MISSING_FIELDS' | 'NORMAL';

const REVIEW_SLA_DAYS = 3;

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function isClosedStatus(status?: string | null) {
  return ['closed', 'completed', 'approved', 'resolved', 'reviewed'].includes(normalize(status));
}

function isOpenStatus(status?: string | null) {
  return !isClosedStatus(status);
}

function riskBucket(value?: string | null) {
  const text = normalize(value);
  if (text.includes('critical') || text.includes('high')) return 'high';
  if (text.includes('medium') || text.includes('moderate')) return 'medium';
  if (text.includes('low')) return 'low';
  return 'low';
}

function rowStatusBucket(status?: string | null) {
  const text = normalize(status);
  if (!text || text === 'pending' || text === 'not started') return 'pending';
  if (text.includes('non') || text.includes('fail') || text.includes('no')) return 'nonCompliant';
  if (text.includes('not applicable') || text === 'na' || text === 'n/a') return 'notApplicable';
  if (text.includes('complete') || text.includes('compliant') || text.includes('yes') || text.includes('pass')) return 'completed';
  return 'completed';
}

function safeJsonArray(value?: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeJsonObject(value?: string | null): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function questionEvidenceCount(item: any) {
  if (Array.isArray(item?.evidence)) return item.evidence.length;
  if (typeof item?.evidence === 'string' && item.evidence.trim()) return 1;
  return 0;
}

function daysSince(date: Date | string | null | undefined, today: Date) {
  if (!date) return 0;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

function areaRows(area: any) {
  return [
    ...(area.checklistRows || []),
    ...(area.workingPapers || []).flatMap((paper: any) => paper.checklistRows || []),
  ];
}

function hasMandatoryEvidenceGap(area: any) {
  if (!/mandatory|required/i.test(String(area.checklistTemplate?.evidenceRequirement || ''))) return false;
  return areaRows(area).some((row: any) => !row.evidenceLink && !(row.evidence || []).length);
}

function hasMandatoryFieldGap(area: any) {
  const areasForFields = area.workpaperKind === 'AREA_GROUP' ? area.workingPapers || [] : [area];
  return areasForFields.some((itemArea: any) => {
    const requiredColumns = (itemArea.checklistTemplate?.columns || area.checklistTemplate?.columns || []).filter((column: any) => column.isRequired);
    if (!requiredColumns.length) return false;
    return (itemArea.checklistRows || []).some((row: any) => {
      const rowData = safeJsonObject(row.rowData);
      return requiredColumns.some((column: any) => rowData[column.columnKey] === undefined || rowData[column.columnKey] === null || String(rowData[column.columnKey]).trim() === '');
    });
  });
}

function calculateAreaUrgency(area: any, today: Date, fallbackReviewerId?: string | null): AssignmentUrgency {
  const status = areaStatus(area);
  const reviewWaitingDays = daysSince(area.submittedAt || area.updatedAt, today);
  if (area.dueDate && new Date(area.dueDate) < today && status !== 'Completed') return 'OVERDUE';
  if (area.reviewStatus === 'AWAITING_REVIEW' && !(area.reviewerUserId || fallbackReviewerId)) return 'BLOCKED';
  if (area.reviewStatus === 'REWORK_REQUIRED' || status === 'Rework Required') return 'ACTION_REQUIRED';
  if (area.reviewStatus === 'AWAITING_REVIEW' && reviewWaitingDays > REVIEW_SLA_DAYS) return 'REVIEW_OVERDUE';
  if (hasMandatoryEvidenceGap(area)) return 'MISSING_EVIDENCE';
  if (hasMandatoryFieldGap(area)) return 'MISSING_FIELDS';
  return 'NORMAL';
}

function urgencySeverity(urgency: AssignmentUrgency) {
  if (['OVERDUE', 'BLOCKED', 'REVIEW_OVERDUE'].includes(urgency)) return 'critical';
  if (['ACTION_REQUIRED', 'MISSING_EVIDENCE', 'MISSING_FIELDS'].includes(urgency)) return 'warning';
  return 'info';
}

function urgencyMessage(area: any, urgency: AssignmentUrgency) {
  const name = area.areaName || area.name || 'Assignment';
  if (urgency === 'OVERDUE') return `${name} is overdue`;
  if (urgency === 'BLOCKED') return `${name} is blocked because no reviewer is assigned`;
  if (urgency === 'ACTION_REQUIRED') return `${name} was returned for rework`;
  if (urgency === 'REVIEW_OVERDUE') return `${name} review SLA exceeded`;
  if (urgency === 'MISSING_EVIDENCE') return `${name} is missing mandatory evidence`;
  if (urgency === 'MISSING_FIELDS') return `${name} is missing mandatory fields`;
  return `${name} is on track`;
}

function dueDateMatches(date: Date | null | undefined, range?: string) {
  if (!range || range === 'all') return true;
  if (!date) return false;
  const today = startOfToday();
  const itemDate = new Date(date);
  itemDate.setHours(0, 0, 0, 0);
  if (range === 'overdue') return itemDate < today;
  const days = range === 'next7' ? 7 : range === 'next30' ? 30 : null;
  if (!days) return true;
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return itemDate >= today && itemDate <= end;
}

function areaStatus(area: any) {
  if (area.reviewStatus === 'APPROVED' || area.reviewStatus === 'Approved') return 'Completed';
  if (area.reviewStatus === 'REWORK_REQUIRED' || area.reviewStatus === 'Rework Required') return 'Rework Required';
  if (area.reviewStatus === 'AWAITING_REVIEW') return 'Awaiting Review';
  if (area.workStatus === 'SUBMITTED' || area.workStatus === 'Submitted') return 'Awaiting Review';
  if (area.workStatus === 'IN_PROGRESS' || area.workStatus === 'In Progress') return 'In Progress';
  if (area.workStatus === 'NOT_STARTED' || area.workStatus === 'Not Started') return 'Not Started';
  return area.workStatus || area.status || 'Not Started';
}

function areaProgressFromRows(rows: any[], snapshotItems: any[]) {
  const tableTotal = rows.length;
  if (tableTotal) {
    const completed = rows.filter((row) => rowStatusBucket(row.status) === 'completed').length;
    return { total: tableTotal, completed, pending: Math.max(tableTotal - completed, 0), percent: percent(completed, tableTotal) };
  }
  const total = snapshotItems.length;
  const completed = snapshotItems.filter((item) => rowStatusBucket(item.status) === 'completed').length;
  return { total, completed, pending: Math.max(total - completed, 0), percent: percent(completed, total) };
}

export async function getProjectOverviewDashboard(prisma: PrismaLike, projectId: string, filters: OverviewFilters = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      userProjects: { include: { user: { select: { id: true, name: true, email: true, role: true, department: true, designation: true } } } },
      areaAllocations: {
        where: { parentAreaId: null },
        include: {
          checklistTemplate: { include: { columns: true } },
          checklistRows: { include: { evidence: true } },
          observations: { include: { capa: true } },
          capas: true,
          workingPapers: {
            include: {
              checklistTemplate: { include: { columns: true } },
              checklistRows: { include: { evidence: true } },
              observations: { include: { capa: true } },
              capas: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      milestones: { include: { owner: { select: { id: true, name: true, email: true } }, repositoryLinks: true }, orderBy: { sequence: 'asc' } },
      queries: { orderBy: { createdAt: 'desc' } },
      billingRecords: { orderBy: { paymentDueDate: 'asc' } },
      activityLogs: { orderBy: { timestamp: 'desc' }, take: 80 },
    },
  });
  if (!project) return null;

  const today = startOfToday();
  const auditManager = project.userProjects.find((item) => item.userId === project.auditManagerId)?.user || null;
  const projectFrameworks = String(project.frameworks || project.natureOfProject || '');

  const areaMatches = (area: any) => {
    const effectiveReviewer = area.reviewerUserId || project.auditManagerId || '';
    return (!filters.area || area.id === filters.area || normalize(area.areaName) === normalize(filters.area))
      && (!filters.owner || area.makerUserId === filters.owner || area.assignedUserId === filters.owner)
      && (!filters.reviewer || effectiveReviewer === filters.reviewer)
      && (!filters.status || normalize(areaStatus(area)) === normalize(filters.status))
      && dueDateMatches(area.dueDate, filters.dueDateRange);
  };

  const filteredAreas = project.areaAllocations.filter(areaMatches);
  const areaIds = new Set(filteredAreas.map((area) => area.id));
  const allAreaRows = filteredAreas.flatMap((area) => [
    ...(area.checklistRows || []),
    ...(area.workingPapers || []).flatMap((paper) => paper.checklistRows || []),
  ]);
  const allAreaObservations = filteredAreas.flatMap((area) => [
    ...(area.observations || []),
    ...(area.workingPapers || []).flatMap((paper) => paper.observations || []),
  ]).filter((observation) => !filters.severity || riskBucket(observation.capa?.riskRating || observation.status) === normalize(filters.severity));
  const allAreaCapas = filteredAreas.flatMap((area) => [
    ...(area.capas || []),
    ...(area.workingPapers || []).flatMap((paper) => paper.capas || []),
    ...(area.observations || []).map((observation) => observation.capa).filter(Boolean),
    ...(area.workingPapers || []).flatMap((paper) => (paper.observations || []).map((observation: any) => observation.capa).filter(Boolean)),
  ]);
  const uniqueCapas = Array.from(new Map(allAreaCapas.map((capa: any) => [capa.id, capa])).values());

  let questionTotal = 0;
  let questionCompleted = 0;
  let questionPending = 0;
  let questionNonCompliant = 0;
  let questionNotApplicable = 0;
  for (const area of filteredAreas) {
    const areasForSnapshot = area.workpaperKind === 'AREA_GROUP' ? area.workingPapers || [] : [area];
    for (const itemArea of areasForSnapshot) {
      const snapshotItems = safeJsonArray(itemArea.checklistSnapshot);
      for (const item of snapshotItems) {
        const bucket = rowStatusBucket(item.status);
        questionTotal += 1;
        if (bucket === 'completed') questionCompleted += 1;
        if (bucket === 'pending') questionPending += 1;
        if (bucket === 'nonCompliant') questionNonCompliant += 1;
        if (bucket === 'notApplicable') questionNotApplicable += 1;
      }
    }
  }

  const tableCompleted = allAreaRows.filter((row) => rowStatusBucket(row.status) === 'completed').length;
  const tablePending = allAreaRows.filter((row) => rowStatusBucket(row.status) === 'pending').length;
  const tableNonCompliant = allAreaRows.filter((row) => rowStatusBucket(row.status) === 'nonCompliant').length;
  const tableNotApplicable = allAreaRows.filter((row) => rowStatusBucket(row.status) === 'notApplicable').length;
  const checklistTotal = allAreaRows.length + questionTotal;
  const checklistCompleted = tableCompleted + questionCompleted;
  const checklistPending = tablePending + questionPending;
  const nonCompliantRows = tableNonCompliant + questionNonCompliant;
  const notApplicableRows = tableNotApplicable + questionNotApplicable;
  const checklistProgress = percent(checklistCompleted, checklistTotal);
  const observationOpen = allAreaObservations.filter((item) => isOpenStatus(item.status)).length;
  const observationClosed = allAreaObservations.filter((item) => isClosedStatus(item.status)).length;
  const observationProgress = allAreaObservations.length ? percent(observationClosed, allAreaObservations.length) : 100;
  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const observation of allAreaObservations) bySeverity[riskBucket(observation.capa?.riskRating || observation.status) as keyof typeof bySeverity] += 1;

  const capaClosed = uniqueCapas.filter((capa: any) => isClosedStatus(capa.closureStatus)).length;
  const capaOpen = uniqueCapas.length - capaClosed;
  const capaOverdue = uniqueCapas.filter((capa: any) => capa.targetDate && new Date(capa.targetDate) < today && !isClosedStatus(capa.closureStatus)).length;
  const capaProgress = uniqueCapas.length ? percent(capaClosed, uniqueCapas.length) : 100;

  const filteredQueries = project.queries.filter((query) => (!filters.status || normalize(query.status) === normalize(filters.status)) && dueDateMatches(query.dueDate, filters.dueDateRange));
  const queriesClosed = filteredQueries.filter((query) => isClosedStatus(query.status) || query.closedAt).length;
  const queriesOpen = filteredQueries.length - queriesClosed;
  const queriesOverdue = filteredQueries.filter((query) => query.dueDate && new Date(query.dueDate) < today && !isClosedStatus(query.status)).length;
  const queryProgress = filteredQueries.length ? percent(queriesClosed, filteredQueries.length) : 100;

  const filteredMilestones = project.milestones.filter((milestone) => (!filters.milestone || milestone.id === filters.milestone) && (!filters.status || normalize(milestone.status) === normalize(filters.status)) && dueDateMatches(milestone.targetDate, filters.dueDateRange));
  const milestoneCompleted = filteredMilestones.filter((item) => item.status === 'COMPLETED').length;
  const milestoneInProgress = filteredMilestones.filter((item) => item.status === 'IN_PROGRESS').length;
  const milestonePending = filteredMilestones.filter((item) => item.status === 'PENDING').length;
  const milestoneOverdue = filteredMilestones.filter((item) => item.targetDate && new Date(item.targetDate) < today && item.status !== 'COMPLETED').length;
  const milestoneProgress = percent(milestoneCompleted, filteredMilestones.length);

  const observationWithoutCapa = allAreaObservations.filter((observation) => !observation.capa).length;
  const observationPendingReview = allAreaObservations.filter((observation) => !observation.reviewed && !isClosedStatus(observation.status)).length;

  const reviewPending = filteredAreas.filter((area) => area.reviewStatus === 'AWAITING_REVIEW' || areaStatus(area) === 'Awaiting Review').length;
  const reviewReturned = filteredAreas.filter((area) => area.reviewStatus === 'REWORK_REQUIRED' || areaStatus(area) === 'Rework Required').length;
  const reviewApproved = filteredAreas.filter((area) => area.reviewStatus === 'APPROVED' || areaStatus(area) === 'Completed').length;
  const overdueAreas = filteredAreas.filter((area) => area.dueDate && new Date(area.dueDate) < today && areaStatus(area) !== 'Completed').length;
  const overdueItems = overdueAreas + capaOverdue + queriesOverdue + milestoneOverdue;
  const highRiskOpen = bySeverity.high;
  const criticalObservationOpen = allAreaObservations.filter((observation) => isOpenStatus(observation.status) && normalize(observation.capa?.riskRating || observation.status).includes('critical')).length;
  const rowEvidenceRecords = allAreaRows.flatMap((row) => row.evidence || []);
  const legacyEvidenceRecords = filteredAreas.flatMap((area) => {
    const areasForEvidence = area.workpaperKind === 'AREA_GROUP' ? area.workingPapers || [] : [area];
    return areasForEvidence.flatMap((itemArea: any) => safeJsonArray(itemArea.evidenceRecords));
  });
  const evidenceReview = {
    pending: rowEvidenceRecords.filter((item) => item.reviewStatus === 'PENDING_REVIEW').length
      + legacyEvidenceRecords.filter((item) => (item.reviewStatus || 'PENDING_REVIEW') === 'PENDING_REVIEW').length,
    approved: rowEvidenceRecords.filter((item) => item.reviewStatus === 'APPROVED').length
      + legacyEvidenceRecords.filter((item) => item.reviewStatus === 'APPROVED').length,
    returned: rowEvidenceRecords.filter((item) => item.reviewStatus === 'RETURNED').length
      + legacyEvidenceRecords.filter((item) => item.reviewStatus === 'RETURNED').length,
  };
  const totalReviews = reviewPending + reviewReturned + reviewApproved;
  const areaCompletionUnits = filteredAreas.reduce((sum, area) => {
    const rows = [
      ...(area.checklistRows || []),
      ...(area.workingPapers || []).flatMap((paper) => paper.checklistRows || []),
    ];
    const snapshots = (area.workingPapers?.length ? area.workingPapers : [area]).flatMap((paper: any) => safeJsonArray(paper.checklistSnapshot));
    return sum + (areaProgressFromRows(rows, snapshots).percent / 100);
  }, 0);
  const areaCompletion = percent(areaCompletionUnits, filteredAreas.length);
  const reviewCompletion = percent(reviewApproved, totalReviews);
  const overallProjectProgress = percent(milestoneCompleted + areaCompletionUnits + reviewApproved, filteredMilestones.length + filteredAreas.length + totalReviews);
  const healthReasons: string[] = [];
  const reportingDeadlineNear = Boolean(project.reportingDeadline && new Date(project.reportingDeadline) >= today && new Date(project.reportingDeadline).getTime() - today.getTime() <= 7 * 86400000);
  const delayedMilestones = filteredMilestones.filter((item) => normalize(item.status).includes('delay')).length;
  const overdueReviews = filteredAreas.filter((area) => calculateAreaUrgency(area, today, project.auditManagerId) === 'REVIEW_OVERDUE').length;
  const blockedAreas = filteredAreas.filter((area) => calculateAreaUrgency(area, today, project.auditManagerId) === 'BLOCKED').length;
  const daysUntilReportingDeadline = project.reportingDeadline ? Math.ceil((new Date(project.reportingDeadline).getTime() - today.getTime()) / 86400000) : null;
  if (milestoneOverdue) healthReasons.push(`${milestoneOverdue} overdue milestone(s)`);
  if (overdueReviews) healthReasons.push(`${overdueReviews} overdue review(s)`);
  if (reportingDeadlineNear && overallProjectProgress < 100) healthReasons.push(`Reporting deadline in ${Math.max(daysUntilReportingDeadline || 0, 0)} day(s) with only ${overallProjectProgress}% completion`);
  if (criticalObservationOpen) healthReasons.push(`${criticalObservationOpen} open critical observation(s)`);
  if (capaOverdue) healthReasons.push(`${capaOverdue} overdue CAPA item(s)`);
  if (blockedAreas) healthReasons.push(`${blockedAreas} blocked audit area(s)`);
  if (reviewPending) healthReasons.push(`${reviewPending} Audit Area${reviewPending === 1 ? ' is' : 's are'} awaiting reviewer approval`);
  if (reviewReturned) healthReasons.push(`${reviewReturned} returned review(s)`);
  if (highRiskOpen && !criticalObservationOpen) healthReasons.push(`${highRiskOpen} high observation(s)`);
  if (delayedMilestones) healthReasons.push(`${delayedMilestones} delayed milestone(s)`);
  if (!healthReasons.length) healthReasons.push('No pending blockers');
  const healthStatus = milestoneOverdue || overdueReviews || (reportingDeadlineNear && overallProjectProgress < 100) || criticalObservationOpen || capaOverdue
    ? 'CRITICAL'
    : reviewPending || reviewReturned || blockedAreas || highRiskOpen || delayedMilestones || capaOpen
      ? 'NEEDS_ATTENTION'
      : 'HEALTHY';

  const areas = filteredAreas.map((area) => {
    const rows = [
      ...(area.checklistRows || []),
      ...(area.workingPapers || []).flatMap((paper) => paper.checklistRows || []),
    ];
    const snapshots = (area.workingPapers?.length ? area.workingPapers : [area]).flatMap((paper: any) => safeJsonArray(paper.checklistSnapshot));
    const progress = areaProgressFromRows(rows, snapshots);
    const areaObservations = [
      ...(area.observations || []),
      ...(area.workingPapers || []).flatMap((paper) => paper.observations || []),
    ];
    const areaEvidence = rows.reduce((sum, row) => sum + (row.evidence?.length || 0) + (row.evidenceLink ? 1 : 0), 0)
      + snapshots.reduce((sum, item) => sum + questionEvidenceCount(item), 0);
    return {
      areaId: area.id,
      name: area.areaName,
      makerId: area.makerUserId || area.assignedUserId,
      maker: project.userProjects.find((item) => item.userId === (area.makerUserId || area.assignedUserId))?.user?.name || null,
      submittedBy: project.userProjects.find((item) => item.userId === (area.makerUserId || area.assignedUserId))?.user?.name || null,
      reviewerId: area.reviewerUserId || project.auditManagerId,
      reviewer: project.userProjects.find((item) => item.userId === (area.reviewerUserId || project.auditManagerId))?.user?.name || auditManager?.name || null,
      progress: progress.percent,
      status: areaStatus(area),
      dueDate: area.dueDate,
      checklistRows: progress.total,
      completedRows: progress.completed,
      pendingRows: progress.pending,
      observations: areaObservations.length,
      openObservations: areaObservations.filter((observation) => isOpenStatus(observation.status)).length,
      evidenceCount: areaEvidence,
    };
  });

  const team = project.userProjects.map((membership) => {
    const userAreas = filteredAreas.filter((area) => (area.makerUserId || area.assignedUserId) === membership.userId);
    const reviewAreas = filteredAreas.filter((area) => (area.reviewerUserId || project.auditManagerId) === membership.userId && area.reviewStatus === 'AWAITING_REVIEW');
    const returnedReviewAreas = filteredAreas.filter((area) => (area.reviewerUserId || project.auditManagerId) === membership.userId && area.reviewStatus === 'REWORK_REQUIRED');
    const pendingMilestones = filteredMilestones.filter((milestone) => milestone.ownerId === membership.userId && milestone.status !== 'COMPLETED').length;
    const userRows = userAreas.flatMap((area) => [
      ...(area.checklistRows || []),
      ...(area.workingPapers || []).flatMap((paper) => paper.checklistRows || []),
    ]);
    const completedRows = userRows.filter((row) => rowStatusBucket(row.status) === 'completed').length;
    const pendingRows = Math.max(userRows.length - completedRows, 0);
    const userOverdueAreas = userAreas.filter((area) => area.dueDate && new Date(area.dueDate) < today && areaStatus(area) !== 'Completed').length;
    const userOverdueReviews = reviewAreas.filter((area) => calculateAreaUrgency(area, today, project.auditManagerId) === 'REVIEW_OVERDUE').length;
    const userOverdueMilestones = filteredMilestones.filter((milestone) => milestone.ownerId === membership.userId && milestone.targetDate && new Date(milestone.targetDate) < today && milestone.status !== 'COMPLETED').length;
    const userOverdue = userOverdueAreas + userOverdueReviews + userOverdueMilestones;
    const activeItems = userAreas.length + reviewAreas.length + returnedReviewAreas.length + pendingMilestones + userOverdue;
    const currentAssignment = reviewAreas[0]?.areaName
      ? `${reviewAreas[0].areaName} Checklist Review`
      : returnedReviewAreas[0]?.areaName
        ? `Resolve ${returnedReviewAreas[0].areaName}`
        : userAreas[0]?.areaName
          ? userAreas[0].areaName
          : filteredMilestones.find((milestone) => milestone.ownerId === membership.userId && milestone.status !== 'COMPLETED')?.milestoneName || '-';
    return {
      userId: membership.userId,
      name: membership.user?.name || 'User',
      role: membership.projectRole || membership.user?.role || '',
      assignedAreas: userAreas.length,
      checklistRows: userRows.length,
      completedRows,
      pendingRows,
      pendingReviews: reviewAreas.length,
      pendingMilestones,
      returnedReviews: returnedReviewAreas.length,
      observationsCreated: allAreaObservations.filter((observation) => observation.createdBy === membership.userId).length,
      overdueItems: userOverdue,
      currentAssignment,
      completedWork: completedRows,
      pendingWork: pendingRows + reviewAreas.length + pendingMilestones,
      reviews: reviewAreas.length + returnedReviewAreas.length,
      workloadStatus: activeItems >= 9 ? 'Overloaded' : activeItems >= 4 ? 'Busy' : 'Available',
    };
  });

  const repositoryFiles = await prisma.repositoryItem.count({ where: { type: { not: 'FOLDER' } } }).catch(() => 0);
  const googleDriveFiles = await prisma.repositoryItem.count({ where: { source: 'gdrive', type: { not: 'FOLDER' } } }).catch(() => 0);
  const repositoryFolders = await prisma.repositoryItem.count({ where: { type: 'FOLDER' } }).catch(() => 0);
  const recentRepository = await prisma.repositoryItem.findMany({ where: { type: { not: 'FOLDER' } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, source: true, size: true, createdAt: true } }).catch(() => [] as Array<{ id: string; name: string; source: string; size: number | null; createdAt: Date }>);

  const meaningfulActivity = project.activityLogs
    .filter((log) => /APPROVED|OBSERVATION|CAPA|REPORT|MILESTONE|SUBMITTED|REWORK|EVIDENCE|QUERY/i.test([log.action, log.actionType, log.message, log.details].join(' ')))
    .slice(0, 12)
    .map((log) => ({
      id: log.id,
      type: log.actionType || log.action,
      message: log.message || log.details || log.action,
      user: log.performedByName || log.actor || 'System',
      createdAt: log.timestamp,
    }));

  const nextMilestone = filteredMilestones.find((item) => item.status !== 'COMPLETED') || null;
  const nextReview = areas.find((area) => area.status === 'Awaiting Review') || null;
  const nextCapa = uniqueCapas.filter((capa: any) => capa.targetDate && !isClosedStatus(capa.closureStatus)).sort((a: any, b: any) => Number(new Date(a.targetDate)) - Number(new Date(b.targetDate)))[0] || null;
  const nextBilling = project.billingRecords.filter((billing) => billing.paymentDueDate && !isClosedStatus(billing.collectionStatus)).sort((a, b) => Number(new Date(a.paymentDueDate!)) - Number(new Date(b.paymentDueDate!)))[0] || null;
  const currentMilestone = filteredMilestones.find((item) => item.status === 'IN_PROGRESS') || nextMilestone || null;
  const currentMilestoneIndex = currentMilestone ? filteredMilestones.findIndex((item) => item.id === currentMilestone.id) : -1;
  const nextWorkflowMilestone = currentMilestoneIndex >= 0
    ? filteredMilestones.slice(currentMilestoneIndex + 1).find((item) => item.status !== 'COMPLETED') || null
    : nextMilestone;
  const returnedReviewAction = areas.find((area) => area.status === 'Rework Required') || null;
  const overdueReviewAction = areas.find((area) => {
    const source = filteredAreas.find((item) => item.id === area.areaId);
    return source ? calculateAreaUrgency(source, today, project.auditManagerId) === 'REVIEW_OVERDUE' : false;
  }) || null;
  const pendingReviewAction = areas.find((area) => area.status === 'Awaiting Review') || null;
  const pendingAreaAction = areas.find((area) => !['Completed', 'Awaiting Review', 'Rework Required'].includes(area.status)) || null;
  const reportingDeadlineAction = project.reportingDeadline && new Date(project.reportingDeadline) >= today && overallProjectProgress < 100 ? project.reportingDeadline : null;
  const overdueMilestoneAction = filteredMilestones
    .filter((item) => item.targetDate && new Date(item.targetDate) < today && item.status !== 'COMPLETED')
    .sort((a, b) => Number(new Date(a.targetDate!)) - Number(new Date(b.targetDate!)))[0] || null;
  const selectedNextAction = pendingReviewAction || returnedReviewAction || null;
  const nextAction = overdueMilestoneAction
      ? {
          kind: overdueMilestoneAction.milestoneName,
          status: 'Overdue Milestone',
          milestone: overdueMilestoneAction.milestoneName,
          owner: overdueMilestoneAction.owner?.name || null,
          dueDate: overdueMilestoneAction.targetDate,
          href: `/projects/${project.id}/milestones/${overdueMilestoneAction.id}`,
          buttonLabel: 'Open Timeline',
        }
      : selectedNextAction
        ? {
            kind: selectedNextAction === returnedReviewAction ? `Resolve ${selectedNextAction.name} Review` : `Review ${selectedNextAction.name} Checklist`,
            status: selectedNextAction === returnedReviewAction ? 'Returned Review' : selectedNextAction === overdueReviewAction ? 'Overdue Review' : 'Waiting for Review',
            area: selectedNextAction.name,
            reviewer: selectedNextAction.reviewer,
            waitingFor: selectedNextAction.reviewer,
            submittedBy: selectedNextAction.submittedBy || selectedNextAction.maker,
            dueDate: selectedNextAction.dueDate,
            href: `/projects/${project.id}/areas/${selectedNextAction.areaId}`,
            buttonLabel: 'Open Review',
          }
      : reportingDeadlineAction
        ? {
            kind: 'Prepare Final Report',
            status: 'Upcoming Reporting Deadline',
            dueDate: reportingDeadlineAction,
            href: `/projects/${project.id}`,
            buttonLabel: 'Open Project',
          }
        : currentMilestone
      ? {
          kind: 'Current Milestone',
          status: currentMilestone.status,
          milestone: currentMilestone.milestoneName,
          owner: currentMilestone.owner?.name || null,
          dueDate: currentMilestone.targetDate,
          href: `/projects/${project.id}/milestones/${currentMilestone.id}`,
          buttonLabel: 'Open Timeline',
        }
      : pendingAreaAction
        ? {
            kind: 'Pending Area',
            status: pendingAreaAction.status,
            area: pendingAreaAction.name,
            reviewer: pendingAreaAction.reviewer,
            waitingFor: pendingAreaAction.maker,
            submittedBy: pendingAreaAction.maker,
            dueDate: pendingAreaAction.dueDate,
            href: `/projects/${project.id}/areas/${pendingAreaAction.areaId}`,
            buttonLabel: 'Open Area',
          }
        : null;
  const healthTone = (state: 'green' | 'amber' | 'red') => state;
  const latestDelay = [
    ...filteredMilestones.filter((item) => item.targetDate && new Date(item.targetDate) < today && item.status !== 'COMPLETED').map((item) => item.targetDate),
    ...filteredAreas.filter((area) => area.dueDate && new Date(area.dueDate) < today && areaStatus(area) !== 'Completed').map((area) => area.dueDate),
  ].sort((a, b) => Number(new Date(a!)) - Number(new Date(b!)))[0];
  const behindDays = latestDelay ? Math.max(1, Math.ceil((today.getTime() - new Date(latestDelay).getTime()) / 86400000)) : 0;
  const healthStrip = [
    {
      label: 'Project Health',
      state: healthTone(healthStatus === 'HEALTHY' ? 'green' : healthStatus === 'CRITICAL' ? 'red' : 'amber'),
      value: healthStatus === 'HEALTHY' ? 'Healthy' : healthStatus === 'CRITICAL' ? 'Critical' : 'Needs Attention',
    },
    {
      label: 'Schedule',
      state: healthTone(behindDays > 7 ? 'red' : behindDays > 0 ? 'amber' : 'green'),
      value: behindDays ? `Behind by ${behindDays} day(s)` : 'On Track',
    },
    {
      label: 'Reviews',
      state: healthTone(reviewReturned ? 'red' : reviewPending ? 'amber' : 'green'),
      value: reviewReturned ? `${reviewReturned} returned` : reviewPending ? `${reviewPending} pending` : 'On Track',
    },
    {
      label: 'Risk',
      state: healthTone(highRiskOpen > 2 || bySeverity.high > 0 ? (bySeverity.high > 2 ? 'red' : 'amber') : 'green'),
      value: bySeverity.high ? `${bySeverity.high} high` : 'Low',
    },
  ];
  const milestoneTimeline = filteredMilestones.map((item) => ({
    id: item.id,
    name: item.milestoneName,
    status: item.status,
    dueDate: item.targetDate,
    isCurrent: currentMilestone?.id === item.id,
    isCompleted: item.status === 'COMPLETED',
    isReturned: normalize(item.status).includes('return') || normalize(item.status).includes('rework'),
    isOverdue: Boolean(item.targetDate && new Date(item.targetDate) < today && item.status !== 'COMPLETED'),
  }));
  const assignmentAttention = filteredAreas
    .map((area) => {
      const urgency = calculateAreaUrgency(area, today, project.auditManagerId);
      return {
        urgency,
        severity: urgencySeverity(urgency),
        type: urgency === 'ACTION_REQUIRED' ? 'Returned Work' : urgency === 'REVIEW_OVERDUE' ? 'Review SLA' : urgency === 'BLOCKED' ? 'Reviewer' : urgency === 'MISSING_EVIDENCE' ? 'Evidence' : urgency === 'MISSING_FIELDS' ? 'Assignment' : 'Task',
        message: urgencyMessage(area, urgency),
        href: `/projects/${project.id}/areas/${area.id}`,
        dueDate: area.dueDate,
      };
    })
    .filter((item) => item.urgency !== 'NORMAL');
  const attentionRequired = [
    ...filteredMilestones
      .filter((item) => item.targetDate && new Date(item.targetDate) < today && item.status !== 'COMPLETED')
      .map((item) => ({ urgency: 'OVERDUE', severity: 'critical', type: 'Milestone', message: `${item.milestoneName} milestone is overdue`, href: `/projects/${project.id}/milestones/${item.id}`, dueDate: item.targetDate })),
    ...filteredMilestones
      .filter((item) => normalize(item.status) === 'blocked' && !(item.targetDate && new Date(item.targetDate) < today))
      .map((item) => ({ urgency: 'BLOCKED', severity: 'critical', type: 'Milestone', message: `${item.milestoneName} milestone is blocked`, href: `/projects/${project.id}/milestones/${item.id}`, dueDate: item.targetDate })),
    ...assignmentAttention,
    ...uniqueCapas
      .filter((capa: any) => capa.targetDate && new Date(capa.targetDate) < today && !isClosedStatus(capa.closureStatus))
      .map((capa: any) => ({ urgency: 'OVERDUE', severity: 'critical', type: 'CAPA', message: 'CAPA item is overdue', href: `/projects/${project.id}`, dueDate: capa.targetDate })),
  ].sort((a, b) => {
    const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3)
      || Number(new Date(a.dueDate || 8640000000000000)) - Number(new Date(b.dueDate || 8640000000000000));
  }).slice(0, 8);
  const upcomingDeadlines = [
    ...(project.reportingDeadline ? [{ priority: 0, dueDate: project.reportingDeadline, item: 'Reporting Deadline', owner: auditManager?.name || '-', status: project.status, href: `/projects/${project.id}` }] : []),
    ...areas.filter((area) => area.dueDate && area.status !== 'Completed').map((area) => ({ priority: 1, dueDate: area.dueDate, item: `${area.name} area`, owner: area.reviewer || area.maker || '-', status: area.status, href: `/projects/${project.id}/areas/${area.areaId}` })),
    ...filteredMilestones.filter((item) => item.targetDate && item.status !== 'COMPLETED').map((item) => ({ priority: 2, dueDate: item.targetDate, item: item.milestoneName, owner: item.owner?.name || '-', status: item.status, href: `/projects/${project.id}/milestones/${item.id}` })),
    ...uniqueCapas.filter((capa: any) => capa.targetDate && !isClosedStatus(capa.closureStatus)).map((capa: any) => ({ priority: 3, dueDate: capa.targetDate, item: 'CAPA action', owner: '-', status: capa.closureStatus, href: `/projects/${project.id}` })),
  ]
    .filter((item) => item.dueDate)
    .sort((a, b) => Number(new Date(a.dueDate!)) - Number(new Date(b.dueDate!)))
    .slice(0, 5);
  const nextMajorDeadline = upcomingDeadlines[0] || null;
  const deadlineDays = nextMajorDeadline?.dueDate ? Math.ceil((new Date(nextMajorDeadline.dueDate).getTime() - today.getTime()) / 86400000) : null;
  const deadlineText = nextMajorDeadline
    ? `${nextMajorDeadline.item} ${deadlineDays !== null && deadlineDays < 0 ? `overdue by ${Math.abs(deadlineDays)} day(s)` : `due in ${deadlineDays} day(s)`}`
    : 'No upcoming deadlines';
  const executiveSummary = [
    `Project is currently in ${currentMilestone?.milestoneName || project.currentStage || 'the active audit phase'}.`,
    reviewPending
      ? `${reviewPending} audit area${reviewPending === 1 ? ' is' : 's are'} awaiting reviewer approval.`
      : 'No audit areas are awaiting reviewer approval.',
    milestoneOverdue ? `${milestoneOverdue} overdue milestone(s).` : 'No overdue milestones.',
    `Overall completion is ${overallProjectProgress}%.`,
    `Next major deadline: ${deadlineText}.`,
  ];
  const milestonePhaseProgress = (patterns: string[]) => {
    const matches = filteredMilestones.filter((item) => patterns.some((pattern) => normalize(item.milestoneName).includes(pattern)));
    if (!matches.length) return 0;
    return percent(matches.filter((item) => item.status === 'COMPLETED').length, matches.length);
  };
  const completionBreakdown = [
    { label: 'Planning', value: milestonePhaseProgress(['planning', 'scope']) },
    { label: 'Execution', value: milestonePhaseProgress(['execution', 'checklist', 'walkthrough', 'fieldwork']) },
    { label: 'Review', value: reviewCompletion },
    { label: 'Observations', value: observationProgress },
    { label: 'Reporting', value: milestonePhaseProgress(['report']) },
    { label: 'Closure', value: milestonePhaseProgress(['closure', 'submission']) },
  ];
  const cockpitTeam = team.map((member) => ({
    ...member,
    pendingTasks: member.assignedAreas + member.pendingReviews + member.pendingMilestones,
  }));

  return {
    project: {
      id: project.id,
      name: project.projectName,
      clientName: project.clientName,
      framework: project.frameworks || project.natureOfProject,
      industry: project.typeOfIndustry,
      status: project.status,
      auditManager: auditManager?.name || null,
      reviewer: auditManager?.name || null,
      startDate: project.assignmentExecutionStartDate,
      endDate: project.assignmentExecutionEndDate || project.reportingDeadline,
      reportingDeadline: project.reportingDeadline,
      currentPhase: project.currentStage,
      currentMilestone: currentMilestone?.milestoneName || project.currentStage || null,
      overallProgress: overallProjectProgress,
      progressBreakdown: {
        milestones: milestoneProgress,
        auditAreas: areaCompletion,
        reviews: reviewCompletion,
      },
      projectManager: auditManager?.name || null,
    },
    filters: {
      areas: project.areaAllocations.map((area) => ({ id: area.id, name: area.areaName })),
      owners: project.userProjects.map((item) => ({ id: item.userId, name: item.user?.name || 'User' })),
      reviewers: project.userProjects.map((item) => ({ id: item.userId, name: item.user?.name || 'User' })),
      milestones: project.milestones.map((item) => ({ id: item.id, name: item.milestoneName })),
      statuses: Array.from(new Set([...areas.map((area) => area.status), ...project.milestones.map((item) => item.status), ...project.queries.map((item) => item.status)])),
    },
    health: { status: healthStatus, score: overallProjectProgress, reasons: healthReasons },
    executiveSummary,
    healthStrip,
    snapshot: {
      auditAreas: {
        total: filteredAreas.length,
        completed: areas.filter((area) => area.status === 'Completed').length,
        inReview: areas.filter((area) => area.status === 'Awaiting Review').length,
        pending: areas.filter((area) => !['Completed', 'Awaiting Review'].includes(area.status)).length,
      },
      milestones: {
        total: filteredMilestones.length,
        completed: milestoneCompleted,
        active: milestoneInProgress,
        pending: milestonePending,
      },
      observations: {
        open: observationOpen,
        closed: observationClosed,
        high: bySeverity.high,
        critical: allAreaObservations.filter((observation) => normalize(observation.capa?.riskRating || observation.status).includes('critical')).length,
      },
      evidenceReview,
      reviews: {
        pending: reviewPending,
        returned: reviewReturned,
        approved: reviewApproved,
      },
      capa: {
        open: capaOpen,
        closed: capaClosed,
        overdue: capaOverdue,
      },
    },
    kpis: {
      overallProgress: overallProjectProgress,
      totalAuditAreas: filteredAreas.length,
      completedAreas: areas.filter((area) => area.status === 'Completed').length,
      areasUnderReview: areas.filter((area) => area.status === 'Awaiting Review').length,
      pendingChecklistRows: checklistPending,
      observationsOpen: observationOpen,
      observationsClosed: observationClosed,
      highRiskObservations: bySeverity.high,
      capaOpen,
      capaClosed,
      queriesOpen,
      milestonesCompleted: milestoneCompleted,
      milestonesPending: milestonePending,
      overdueItems,
    },
    checklists: {
      totalRows: checklistTotal,
      completedRows: checklistCompleted,
      pendingRows: checklistPending,
      nonCompliantRows,
      notApplicableRows,
      observationsCreated: allAreaObservations.length,
      completionPercent: checklistProgress,
      statusDistribution: [
        { label: 'Completed', value: checklistCompleted },
        { label: 'Pending', value: checklistPending },
        { label: 'Non-Compliant', value: nonCompliantRows },
        { label: 'Not Applicable', value: notApplicableRows },
      ],
    },
    areas,
    observations: {
      total: allAreaObservations.length,
      open: observationOpen,
      closed: observationClosed,
      rejected: allAreaObservations.filter((item) => normalize(item.status).includes('reject')).length,
      returned: allAreaObservations.filter((item) => normalize(item.status).includes('return') || normalize(item.status).includes('rework')).length,
      pendingReview: observationPendingReview,
      withoutCapa: observationWithoutCapa,
      bySeverity,
      byArea: areas.map((area) => ({ area: area.name, count: area.observations })).filter((item) => item.count),
    },
    evidenceReview,
    capa: {
      total: uniqueCapas.length,
      open: capaOpen,
      closed: capaClosed,
      overdue: capaOverdue,
      pendingVerification: uniqueCapas.filter((capa: any) => !capa.verification && !isClosedStatus(capa.closureStatus)).length,
      closurePercent: capaProgress,
    },
    queries: {
      total: filteredQueries.length,
      open: queriesOpen,
      closed: queriesClosed,
      overdue: queriesOverdue,
      pendingClientResponse: filteredQueries.filter((query) => !query.response && isOpenStatus(query.status)).length,
      pendingAuditorResponse: filteredQueries.filter((query) => query.response && isOpenStatus(query.status)).length,
    },
    milestones: {
      total: filteredMilestones.length,
      completed: milestoneCompleted,
      inProgress: milestoneInProgress,
      pending: milestonePending,
      overdue: milestoneOverdue,
      current: currentMilestone?.milestoneName || project.currentStage || null,
      next: nextWorkflowMilestone?.milestoneName || null,
      currentDetails: currentMilestone ? {
        owner: currentMilestone.owner?.name || null,
        started: currentMilestone.startedAt,
        dueDate: currentMilestone.targetDate,
      } : null,
      timeline: milestoneTimeline,
      rows: filteredMilestones.map((item) => ({
        id: item.id,
        milestone: item.milestoneName,
        owner: item.owner?.name || null,
        status: item.status,
        dueDate: item.targetDate,
        started: item.startedAt,
        completed: item.completedAt,
        progress: item.progressPercentage || 0,
        pendingActions: item.requiredAction || 'Open milestone workspace',
        reviewStatus: item.status === 'COMPLETED' ? 'Closed' : 'Open',
        repository: item.repositoryLinks.length,
      })),
    },
    team: cockpitTeam,
    recentActivity: meaningfulActivity,
    attentionRequired,
    nextAction,
    completionBreakdown,
    upcomingDeadlines,
    deadlines: {
      nextMilestone: nextMilestone ? { id: nextMilestone.id, name: nextMilestone.milestoneName, dueDate: nextMilestone.targetDate } : null,
      nextReview,
      capaDue: nextCapa ? { id: nextCapa.id, dueDate: nextCapa.targetDate, status: nextCapa.closureStatus } : null,
      billingDue: nextBilling ? { id: nextBilling.id, dueDate: nextBilling.paymentDueDate, status: nextBilling.collectionStatus, amount: nextBilling.outstandingAmount } : null,
      reportDue: project.reportingDeadline,
      lateTasks: overdueItems,
    },
    repository: {
      folders: repositoryFolders,
      files: repositoryFiles,
      recentlyAdded: recentRepository.length,
      storageUsed: recentRepository.reduce((sum: number, item) => sum + (item.size || 0), 0),
      recentFiles: recentRepository,
    },
    frameworkCoverage: [],
  };
}
