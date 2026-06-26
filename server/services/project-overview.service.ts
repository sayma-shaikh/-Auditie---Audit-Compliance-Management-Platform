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

function questionEvidenceCount(item: any) {
  if (Array.isArray(item?.evidence)) return item.evidence.length;
  if (typeof item?.evidence === 'string' && item.evidence.trim()) return 1;
  return 0;
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
          checklistRows: { include: { evidence: true } },
          observations: { include: { capa: true } },
          capas: true,
          workingPapers: {
            include: {
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
  let questionMissingEvidence = 0;
  let questionEvidence = 0;
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
        const evidenceCount = questionEvidenceCount(item);
        questionEvidence += evidenceCount;
        if (!evidenceCount && bucket !== 'notApplicable') questionMissingEvidence += 1;
      }
    }
  }

  const tableCompleted = allAreaRows.filter((row) => rowStatusBucket(row.status) === 'completed').length;
  const tablePending = allAreaRows.filter((row) => rowStatusBucket(row.status) === 'pending').length;
  const tableNonCompliant = allAreaRows.filter((row) => rowStatusBucket(row.status) === 'nonCompliant').length;
  const tableNotApplicable = allAreaRows.filter((row) => rowStatusBucket(row.status) === 'notApplicable').length;
  const tableEvidence = allAreaRows.reduce((sum, row) => sum + (row.evidence?.length || 0) + (row.evidenceLink ? 1 : 0), 0);
  const tableMissingEvidence = allAreaRows.filter((row) => !(row.evidence?.length || row.evidenceLink) && rowStatusBucket(row.status) !== 'notApplicable').length;

  const checklistTotal = allAreaRows.length + questionTotal;
  const checklistCompleted = tableCompleted + questionCompleted;
  const checklistPending = tablePending + questionPending;
  const nonCompliantRows = tableNonCompliant + questionNonCompliant;
  const notApplicableRows = tableNotApplicable + questionNotApplicable;
  const missingEvidenceRows = tableMissingEvidence + questionMissingEvidence;
  const checklistProgress = percent(checklistCompleted, checklistTotal);
  const evidenceTotal = tableEvidence + questionEvidence;
  const evidenceProgress = checklistTotal ? percent(checklistTotal - missingEvidenceRows, checklistTotal) : 0;

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

  const overdueAreas = filteredAreas.filter((area) => area.dueDate && new Date(area.dueDate) < today && areaStatus(area) !== 'Completed').length;
  const overdueItems = overdueAreas + capaOverdue + queriesOverdue + milestoneOverdue;
  const highRiskOpen = bySeverity.high;
  const reviewPending = filteredAreas.filter((area) => area.reviewStatus === 'AWAITING_REVIEW').length;
  const reviewReturned = filteredAreas.filter((area) => area.reviewStatus === 'REWORK_REQUIRED').length;
  const reviewApproved = filteredAreas.filter((area) => area.reviewStatus === 'APPROVED').length;
  const evidenceExpected = Math.max(checklistTotal - notApplicableRows, 0);
  const evidenceLinked = Math.min(evidenceTotal, evidenceExpected || evidenceTotal);
  const evidenceMissing = Math.max(evidenceExpected - evidenceLinked, 0);
  const evidenceCompletion = percent(evidenceLinked, evidenceExpected);
  const healthScore = Math.round(
    (milestoneProgress * 0.35)
    + (Math.max(0, 100 - (overdueItems * 15)) * 0.20)
    + (percent(reviewApproved, reviewPending + reviewReturned + reviewApproved) * 0.15)
    + (Math.max(0, 100 - (highRiskOpen * 25)) * 0.15)
    + (evidenceCompletion * 0.15),
  );
  const healthReasons: string[] = [];
  if (evidenceMissing) healthReasons.push(`${evidenceMissing} expected evidence item(s) missing`);
  if (highRiskOpen) healthReasons.push(`${highRiskOpen} high-risk observations open`);
  if (milestoneOverdue) healthReasons.push(`${milestoneOverdue} milestone(s) delayed`);
  if (capaOverdue) healthReasons.push(`${capaOverdue} CAPA item(s) overdue`);
  if (!healthReasons.length) healthReasons.push('No critical blockers detected');
  const healthStatus = healthScore < 50 || highRiskOpen >= 3 || milestoneOverdue > 1
    ? 'CRITICAL'
    : healthScore < 80 || overdueItems > 0 || highRiskOpen > 0
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
    const userRows = userAreas.flatMap((area) => [
      ...(area.checklistRows || []),
      ...(area.workingPapers || []).flatMap((paper) => paper.checklistRows || []),
    ]);
    const completedRows = userRows.filter((row) => rowStatusBucket(row.status) === 'completed').length;
    const pendingRows = Math.max(userRows.length - completedRows, 0);
    const userOverdue = userAreas.filter((area) => area.dueDate && new Date(area.dueDate) < today && areaStatus(area) !== 'Completed').length;
    return {
      userId: membership.userId,
      name: membership.user?.name || 'User',
      role: membership.projectRole || membership.user?.role || '',
      assignedAreas: userAreas.length,
      checklistRows: userRows.length,
      completedRows,
      pendingRows,
      pendingReviews: reviewAreas.length,
      observationsCreated: allAreaObservations.filter((observation) => observation.createdBy === membership.userId).length,
      overdueItems: userOverdue,
      workloadPercent: percent(userAreas.length + reviewAreas.length, Math.max(filteredAreas.length, 1)),
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
      label: 'Evidence',
      state: healthTone(evidenceMissing > 5 ? 'red' : evidenceMissing > 0 ? 'amber' : 'green'),
      value: evidenceMissing ? `${evidenceMissing} missing` : 'Complete',
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
    isOverdue: Boolean(item.targetDate && new Date(item.targetDate) < today && item.status !== 'COMPLETED'),
  }));
  const attentionRequired = [
    ...filteredMilestones
      .filter((item) => item.targetDate && new Date(item.targetDate) < today && item.status !== 'COMPLETED')
      .map((item) => ({ severity: 'critical', type: 'Milestone', message: `${item.milestoneName} milestone is overdue`, href: `/projects/${project.id}/milestones/${item.id}`, dueDate: item.targetDate })),
    ...areas
      .filter((area) => area.status === 'Awaiting Review')
      .map((area) => ({ severity: 'warning', type: 'Review', message: `${area.name} is waiting for reviewer`, href: `/projects/${project.id}/areas/${area.areaId}`, dueDate: area.dueDate })),
    ...areas
      .filter((area) => area.status === 'Rework Required')
      .map((area) => ({ severity: 'critical', type: 'Returned Work', message: `${area.name} was returned for rework`, href: `/projects/${project.id}/areas/${area.areaId}`, dueDate: area.dueDate })),
    ...areas
      .filter((area) => area.checklistRows > 0 && area.evidenceCount < area.checklistRows)
      .map((area) => ({ severity: area.evidenceCount === 0 ? 'critical' : 'warning', type: 'Evidence', message: `${area.name} has missing evidence`, href: `/projects/${project.id}/areas/${area.areaId}`, dueDate: area.dueDate })),
    ...(highRiskOpen ? [{ severity: 'critical', type: 'Observation', message: `${highRiskOpen} high-risk observation(s) are open`, href: `/projects/${project.id}`, dueDate: null }] : []),
    ...uniqueCapas
      .filter((capa: any) => capa.targetDate && new Date(capa.targetDate) < today && !isClosedStatus(capa.closureStatus))
      .map((capa: any) => ({ severity: 'critical', type: 'CAPA', message: 'CAPA item is overdue', href: `/projects/${project.id}`, dueDate: capa.targetDate })),
  ].sort((a, b) => {
    const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3)
      || Number(new Date(a.dueDate || 8640000000000000)) - Number(new Date(b.dueDate || 8640000000000000));
  }).slice(0, 8);
  const upcomingDeadlines = [
    ...filteredMilestones.filter((item) => item.targetDate && item.status !== 'COMPLETED').map((item) => ({ dueDate: item.targetDate, item: item.milestoneName, owner: item.owner?.name || '-', status: item.status, href: `/projects/${project.id}/milestones/${item.id}` })),
    ...areas.filter((area) => area.dueDate && area.status !== 'Completed').map((area) => ({ dueDate: area.dueDate, item: area.name, owner: area.maker || '-', status: area.status, href: `/projects/${project.id}/areas/${area.areaId}` })),
    ...uniqueCapas.filter((capa: any) => capa.targetDate && !isClosedStatus(capa.closureStatus)).map((capa: any) => ({ dueDate: capa.targetDate, item: 'CAPA action', owner: '-', status: capa.closureStatus, href: `/projects/${project.id}` })),
    ...(project.reportingDeadline ? [{ dueDate: project.reportingDeadline, item: 'Final report', owner: auditManager?.name || '-', status: project.status, href: `/projects/${project.id}` }] : []),
  ]
    .filter((item) => item.dueDate)
    .sort((a, b) => Number(new Date(a.dueDate!)) - Number(new Date(b.dueDate!)))
    .slice(0, 5);
  const maxActiveWork = Math.max(1, ...team.map((member) => member.assignedAreas + member.pendingReviews + member.overdueItems));
  const cockpitTeam = team.map((member) => {
    const activeWork = member.assignedAreas + member.pendingReviews + member.overdueItems;
    return {
      ...member,
      pendingTasks: member.assignedAreas + member.pendingReviews,
      workloadPercent: percent(activeWork, maxActiveWork),
    };
  });

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
      currentPhase: project.currentStage,
      currentMilestone: currentMilestone?.milestoneName || project.currentStage || null,
      overallProgress: milestoneProgress,
      projectManager: auditManager?.name || null,
    },
    filters: {
      areas: project.areaAllocations.map((area) => ({ id: area.id, name: area.areaName })),
      owners: project.userProjects.map((item) => ({ id: item.userId, name: item.user?.name || 'User' })),
      reviewers: project.userProjects.map((item) => ({ id: item.userId, name: item.user?.name || 'User' })),
      milestones: project.milestones.map((item) => ({ id: item.id, name: item.milestoneName })),
      statuses: Array.from(new Set([...areas.map((area) => area.status), ...project.milestones.map((item) => item.status), ...project.queries.map((item) => item.status)])),
    },
    health: { status: healthStatus, score: healthScore, reasons: healthReasons },
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
      evidence: {
        expected: evidenceExpected,
        linked: evidenceLinked,
        missing: evidenceMissing,
      },
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
      overallProgress: milestoneProgress,
      totalAuditAreas: filteredAreas.length,
      completedAreas: areas.filter((area) => area.status === 'Completed').length,
      areasUnderReview: areas.filter((area) => area.status === 'Awaiting Review').length,
      pendingChecklistRows: checklistPending,
      evidenceLinked,
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
      evidenceMissing: missingEvidenceRows,
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
    capa: {
      total: uniqueCapas.length,
      open: capaOpen,
      closed: capaClosed,
      overdue: capaOverdue,
      pendingVerification: uniqueCapas.filter((capa: any) => !capa.verification && !isClosedStatus(capa.closureStatus)).length,
      closurePercent: capaProgress,
    },
    evidence: {
      totalLinked: evidenceTotal,
      repositoryFiles,
      deviceUploads: evidenceTotal - googleDriveFiles,
      googleDriveFiles,
      linkedEvidence: evidenceTotal,
      missingEvidenceRows,
      observationsMissingEvidence: allAreaObservations.filter((item) => !item.evidenceReference).length,
      capaMissingEvidence: uniqueCapas.filter((capa: any) => !capa.closureEvidence).length,
      folders: repositoryFolders,
      recentFiles: recentRepository,
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
      evidenceLinked: evidenceTotal,
      recentFiles: recentRepository,
    },
    frameworkCoverage: [],
  };
}
