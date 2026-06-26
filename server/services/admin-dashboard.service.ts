import { PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient;

type DashboardFilters = {
  search?: string;
  framework?: string;
  manager?: string;
  reviewer?: string;
  status?: string;
  industry?: string;
  client?: string;
  dateRange?: string;
  health?: string;
};

const dashboardCache = new Map<string, { expiresAt: number; payload: any }>();

function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function isClosed(status?: string | null) {
  return ['closed', 'completed', 'approved', 'resolved', 'paid'].includes(normalize(status));
}

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function rowBucket(status?: string | null) {
  const text = normalize(status);
  if (!text || text === 'pending' || text === 'not started') return 'pending';
  if (text.includes('not applicable') || text === 'na' || text === 'n/a') return 'na';
  if (text.includes('non') || text.includes('fail') || text === 'no') return 'failed';
  return 'done';
}

function snapshotItems(value?: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function severity(observation: any) {
  const text = normalize(observation?.capa?.riskRating || observation?.riskRating || observation?.severity || observation?.status);
  if (text.includes('critical')) return 'Critical';
  if (text.includes('high')) return 'High';
  if (text.includes('medium') || text.includes('moderate')) return 'Medium';
  return 'Low';
}

function projectStage(project: any) {
  const current = normalize(project.currentStage || project.status);
  if (isClosed(project.status)) return project.status === 'COMPLETED' ? 'Completed' : 'Closed';
  if (current.includes('report')) return 'Reporting';
  if (current.includes('review') || project.areaAllocations?.some((area: any) => area.reviewStatus === 'AWAITING_REVIEW')) return 'Under Review';
  if (current.includes('plan') || current.includes('kickoff')) return 'Planning';
  return 'Execution';
}

function dueDateInRange(date: Date | null | undefined, range?: string) {
  if (!range) return true;
  if (!date) return false;
  const today = todayStart();
  const item = new Date(date);
  item.setHours(0, 0, 0, 0);
  if (range === 'overdue') return item < today;
  const days = range === 'next7' ? 7 : range === 'next30' ? 30 : null;
  if (!days) return true;
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return item >= today && item <= end;
}

export async function getAdminDashboard(prisma: PrismaLike, user: any, filters: DashboardFilters = {}) {
  if (!user) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  if (user.role === 'AUDITOR') throw Object.assign(new Error('Auditors do not have access to the admin portfolio dashboard.'), { statusCode: 403 });
  const cacheKey = JSON.stringify({ userId: user.id, role: user.role, filters });
  const cached = dashboardCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;

  const projectWhere: any = {};
  if (user.role !== 'ADMIN') projectWhere.auditManagerId = user.id;
  if (filters.status) projectWhere.status = filters.status;
  if (filters.industry) projectWhere.typeOfIndustry = filters.industry;
  if (filters.client) projectWhere.clientName = { contains: filters.client };
  if (filters.framework) projectWhere.OR = [{ frameworks: { contains: filters.framework } }, { natureOfProject: { contains: filters.framework } }];
  if (filters.manager) projectWhere.auditManagerId = filters.manager;

  const [projectsRaw, users, documentsCount, generatedDocumentsCount, repositoryFiles, auditLogs] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
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
        },
        milestones: { include: { owner: { select: { id: true, name: true } }, repositoryLinks: true } },
        queries: true,
        billingRecords: true,
        documents: true,
        activityLogs: { orderBy: { timestamp: 'desc' }, take: 10 },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } }),
    prisma.document.count().catch(() => 0),
    prisma.generatedDocument.count().catch(() => 0),
    prisma.repositoryItem.count({ where: { type: { not: 'FOLDER' } } }).catch(() => 0),
    prisma.auditLog.findMany({ include: { user: { select: { id: true, name: true } }, document: true, repositoryItem: true }, orderBy: { timestamp: 'desc' }, take: 30 }).catch(() => []),
  ]);

  const today = todayStart();
  const search = normalize(filters.search);
  let projects = projectsRaw.filter((project) => {
    const reviewerMatch = !filters.reviewer || project.areaAllocations.some((area) => (area.reviewerUserId || project.auditManagerId) === filters.reviewer);
    const searchMatch = !search || [project.projectName, project.clientName, project.frameworks, project.natureOfProject, project.typeOfIndustry].join(' ').toLowerCase().includes(search);
    const dateMatch = dueDateInRange(project.reportingDeadline || project.assignmentExecutionEndDate, filters.dateRange);
    return reviewerMatch && searchMatch && dateMatch;
  });

  if (user.role !== 'ADMIN' && filters.reviewer) {
    projects = projects.filter((project) => project.areaAllocations.some((area) => (area.reviewerUserId || project.auditManagerId) === user.id));
  }

  const projectMetrics = projects.map((project) => {
    const rows = project.areaAllocations.flatMap((area) => [
      ...area.checklistRows,
      ...area.workingPapers.flatMap((paper) => paper.checklistRows),
    ]);
    const snapshots = project.areaAllocations.flatMap((area) => [
      ...snapshotItems(area.checklistSnapshot),
      ...area.workingPapers.flatMap((paper) => snapshotItems(paper.checklistSnapshot)),
    ]);
    const totalChecklist = rows.length + snapshots.length;
    const completedChecklist = rows.filter((row) => rowBucket(row.status) === 'done').length + snapshots.filter((item) => rowBucket(item.status) === 'done').length;
    const pendingChecklist = Math.max(totalChecklist - completedChecklist, 0);
    const evidenceLinked = rows.reduce((sum, row) => sum + row.evidence.length + (row.evidenceLink ? 1 : 0), 0)
      + snapshots.reduce((sum, item) => sum + (Array.isArray(item.evidence) ? item.evidence.length : item.evidence ? 1 : 0), 0);
    const checklistProgress = percent(completedChecklist, totalChecklist);
    const evidenceProgress = totalChecklist ? percent(evidenceLinked, totalChecklist) : 0;
    const milestonesCompleted = project.milestones.filter((item) => item.status === 'COMPLETED').length;
    const milestoneProgress = project.milestones.length ? Math.round(project.milestones.reduce((sum, item) => sum + (item.progressPercentage || 0), 0) / project.milestones.length) : 0;
    const awaitingReview = project.areaAllocations.filter((area) => area.reviewStatus === 'AWAITING_REVIEW' || area.workStatus === 'SUBMITTED').length;
    const approvedReviews = project.areaAllocations.filter((area) => area.reviewStatus === 'APPROVED').length;
    const reviewProgress = percent(approvedReviews, awaitingReview + approvedReviews);
    const reports = project.documents.filter((doc) => /report/i.test([doc.title, doc.type].join(' '))).length;
    const reportProgress = reports || project.currentStage?.toLowerCase().includes('report') ? percent(reports, Math.max(reports, 1)) : 0;
    const progress = Math.round((checklistProgress * 0.5) + (milestoneProgress * 0.2) + (reviewProgress * 0.15) + (reportProgress * 0.1) + (evidenceProgress * 0.05));
    const observations = project.areaAllocations.flatMap((area) => [
      ...area.observations,
      ...area.workingPapers.flatMap((paper) => paper.observations),
    ]);
    const capas = Array.from(new Map(project.areaAllocations.flatMap((area) => [
      ...area.capas,
      ...area.workingPapers.flatMap((paper) => paper.capas),
      ...area.observations.map((obs) => obs.capa).filter(Boolean),
      ...area.workingPapers.flatMap((paper) => paper.observations.map((obs) => obs.capa).filter(Boolean)),
    ]).map((capa: any) => [capa.id, capa])).values());
    const overdueMilestones = project.milestones.filter((item) => item.targetDate && new Date(item.targetDate) < today && item.status !== 'COMPLETED').length;
    const overdueChecklist = project.areaAllocations.filter((area) => area.dueDate && new Date(area.dueDate) < today && !['APPROVED', 'Approved'].includes(area.reviewStatus)).length;
    const overdueReports = project.reportingDeadline && new Date(project.reportingDeadline) < today && !/completed|closed/i.test(project.status) ? 1 : 0;
    const overdueReviews = project.areaAllocations.filter((area) => area.reviewStatus === 'AWAITING_REVIEW' && area.submittedAt && (Date.now() - new Date(area.submittedAt).getTime()) > 3 * 24 * 60 * 60 * 1000).length;
    const highRiskObservations = observations.filter((obs) => ['High', 'Critical'].includes(severity(obs)) && !isClosed(obs.status)).length;
    const openCapa = capas.filter((capa: any) => !isClosed(capa.closureStatus)).length;
    const pendingControlsRatio = totalChecklist ? pendingChecklist / totalChecklist : 0;
    const expected = project.assignmentExecutionStartDate && (project.assignmentExecutionEndDate || project.reportingDeadline)
      ? percent(Math.max(0, Date.now() - new Date(project.assignmentExecutionStartDate).getTime()), Math.max(1, new Date(project.assignmentExecutionEndDate || project.reportingDeadline!).getTime() - new Date(project.assignmentExecutionStartDate).getTime()))
      : 0;
    const behindSchedule = expected > progress + 10;
    const overdueCount = overdueMilestones + overdueChecklist + overdueReports + overdueReviews;
    const riskScore = (highRiskObservations * 3) + (openCapa * 1) + (overdueCount * 2) + (behindSchedule ? 2 : 0);
    const health = highRiskObservations || overdueCount > 3 || riskScore >= 6 ? 'Critical' : overdueCount || behindSchedule || pendingControlsRatio > 0.3 ? 'Warning' : 'Healthy';
    return {
      project,
      progress,
      expected,
      behindSchedule,
      totalChecklist,
      completedChecklist,
      pendingChecklist,
      evidenceLinked,
      observations,
      capas,
      highRiskObservations,
      openCapa,
      awaitingReview,
      overdueMilestones,
      overdueChecklist,
      overdueReviews,
      overdueReports,
      overdueCount,
      health,
      riskLevel: riskScore >= 8 ? 'Critical' : riskScore >= 5 ? 'High' : riskScore >= 2 ? 'Medium' : 'Low',
      stage: projectStage(project),
      reports,
    };
  }).filter((item) => !filters.health || item.health === filters.health);

  const active = projectMetrics.filter((item) => !isClosed(item.project.status));
  const healthyProjects = active.filter((item) => item.health === 'Healthy').length;
  const pendingReviews = projectMetrics.reduce((sum, item) => sum + item.awaitingReview, 0);
  const reportsGenerated = documentsCount + generatedDocumentsCount + projectMetrics.reduce((sum, item) => sum + item.reports, 0);
  const overdueTasks = projectMetrics.reduce((sum, item) => sum + item.overdueMilestones + item.overdueChecklist + item.overdueReviews + item.overdueReports, 0);

  const frameworks = ['ISO 27001', 'SOC 2', 'ISO 27701', 'ITGC', 'PCI DSS', 'HIPAA', 'NIST', 'VAPT'];
  const byFramework = [...frameworks, 'Others'].map((framework) => {
    const count = framework === 'Others'
      ? projectMetrics.filter((item) => !frameworks.some((fw) => normalize([item.project.frameworks, item.project.natureOfProject].join(' ')).includes(normalize(fw)))).length
      : projectMetrics.filter((item) => normalize([item.project.frameworks, item.project.natureOfProject].join(' ')).includes(normalize(framework))).length;
    return { framework, count };
  });

  const usersById = new Map(users.map((item) => [item.id, item]));
  const team = users.map((member) => {
    const assignedProjects = projectMetrics.filter((item) => item.project.userProjects.some((up) => up.userId === member.id) || item.project.auditManagerId === member.id).length;
    const assignedAreas = projectMetrics.reduce((sum, item) => sum + item.project.areaAllocations.filter((area) => area.makerUserId === member.id || area.assignedUserId === member.id).length, 0);
    const checklistRows = projectMetrics.reduce((sum, item) => sum + item.project.areaAllocations.filter((area) => area.makerUserId === member.id || area.assignedUserId === member.id).flatMap((area) => [...area.checklistRows, ...area.workingPapers.flatMap((paper) => paper.checklistRows)]).length, 0);
    const reviewsPending = projectMetrics.reduce((sum, item) => sum + item.project.areaAllocations.filter((area) => (area.reviewerUserId || item.project.auditManagerId) === member.id && area.reviewStatus === 'AWAITING_REVIEW').length, 0);
    const milestonesAssigned = projectMetrics.reduce((sum, item) => sum + item.project.milestones.filter((milestone) => milestone.ownerId === member.id && milestone.status !== 'COMPLETED').length, 0);
    const openQueries = projectMetrics.reduce((sum, item) => sum + item.project.queries.filter((query) => query.assignedTo === member.id && !isClosed(query.status)).length, 0);
    const workloadScore = checklistRows + (reviewsPending * 8) + (milestonesAssigned * 5) + (openQueries * 4);
    const workloadPercent = Math.min(100, Math.round(workloadScore / 2));
    const status = workloadPercent >= 90 ? 'Overloaded' : workloadPercent >= 70 ? 'High' : workloadPercent >= 45 ? 'Busy' : 'Normal';
    return { userId: member.id, name: member.name, role: member.role, assignedProjects, assignedAreas, checklistRows, reviewsPending, milestonesAssigned, openQueries, workloadPercent, status };
  }).filter((member) => member.assignedProjects || member.assignedAreas || member.reviewsPending || member.milestonesAssigned || member.openQueries);

  const observations = projectMetrics.flatMap((item) => item.observations);
  const observationSummary = {
    critical: observations.filter((obs) => severity(obs) === 'Critical').length,
    high: observations.filter((obs) => severity(obs) === 'High').length,
    medium: observations.filter((obs) => severity(obs) === 'Medium').length,
    low: observations.filter((obs) => severity(obs) === 'Low').length,
    closed: observations.filter((obs) => isClosed(obs.status)).length,
    pendingReview: observations.filter((obs) => !obs.reviewed && !isClosed(obs.status)).length,
    resolved: observations.filter((obs) => /resolved|reviewed|approved/i.test(obs.status)).length,
  };

  const approvedToday = projectMetrics.reduce((sum, item) => sum + item.project.areaAllocations.filter((area) => area.reviewStatus === 'APPROVED' && area.approvedAt && new Date(area.approvedAt) >= today).length, 0);
  const reviewedAreas = projectMetrics.flatMap((item) => item.project.areaAllocations).filter((area) => area.submittedAt && area.approvedAt);
  const averageReviewTime = reviewedAreas.length
    ? Math.round(reviewedAreas.reduce((sum, area) => sum + ((new Date(area.approvedAt!).getTime() - new Date(area.submittedAt!).getTime()) / 86400000), 0) / reviewedAreas.length * 10) / 10
    : 0;

  const deadlines = [
    ...projectMetrics.flatMap((item) => item.project.milestones.filter((m) => m.targetDate && m.status !== 'COMPLETED').map((m) => ({ type: 'Milestone', title: m.milestoneName, project: item.project.projectName, dueDate: m.targetDate, projectId: item.project.id }))),
    ...projectMetrics.filter((item) => item.project.reportingDeadline && !isClosed(item.project.status)).map((item) => ({ type: 'Report', title: 'Reporting Deadline', project: item.project.projectName, dueDate: item.project.reportingDeadline, projectId: item.project.id })),
    ...projectMetrics.flatMap((item) => item.project.areaAllocations.filter((area) => area.dueDate && area.reviewStatus === 'AWAITING_REVIEW').map((area) => ({ type: 'Review', title: area.areaName, project: item.project.projectName, dueDate: area.dueDate, projectId: item.project.id }))),
  ].sort((a, b) => Number(new Date(a.dueDate!)) - Number(new Date(b.dueDate!))).slice(0, 10);

  const highestWorkload = team.slice().sort((a, b) => b.workloadPercent - a.workloadPercent)[0];
  const insights = [
    overdueTasks ? `${overdueTasks} task(s) are overdue across the portfolio.` : 'No overdue portfolio tasks detected.',
    highestWorkload ? `${highestWorkload.name} has the highest workload at ${highestWorkload.workloadPercent}%.` : 'No assigned workload yet.',
    observationSummary.critical ? `${observationSummary.critical} critical observation(s) require review.` : `${observationSummary.high} high-risk observation(s) are open.`,
  ];

  const projectRows = projectMetrics.map((item) => ({
    id: item.project.id,
    project: item.project.projectName,
    client: item.project.clientName,
    framework: item.project.frameworks || item.project.natureOfProject || '-',
    progress: item.progress,
    health: item.health,
    dueDate: item.project.reportingDeadline || item.project.assignmentExecutionEndDate,
    manager: usersById.get(item.project.auditManagerId || '')?.name || '-',
    status: item.project.status,
    stage: item.stage,
  }));

  const totalCompletedControls = projectMetrics.reduce((sum, item) => sum + item.completedChecklist, 0);
  const totalControls = projectMetrics.reduce((sum, item) => sum + item.totalChecklist, 0);
  const totalClosedObservations = observations.filter((obs) => isClosed(obs.status)).length;
  const totalCompletedReviews = projectMetrics.reduce((sum, item) => sum + item.project.areaAllocations.filter((area) => area.reviewStatus === 'APPROVED').length, 0);
  const totalReviewItems = projectMetrics.reduce((sum, item) => sum + item.project.areaAllocations.filter((area) => ['AWAITING_REVIEW', 'APPROVED', 'REWORK_REQUIRED'].includes(area.reviewStatus)).length, 0);
  const totalCompletedMilestones = projectMetrics.reduce((sum, item) => sum + item.project.milestones.filter((milestone) => milestone.status === 'COMPLETED').length, 0);
  const totalMilestones = projectMetrics.reduce((sum, item) => sum + item.project.milestones.length, 0);
  const portfolioHealth = percent(totalCompletedControls + totalClosedObservations + totalCompletedReviews + totalCompletedMilestones, totalControls + observations.length + totalReviewItems + totalMilestones);
  const previousWindowStart = new Date(today);
  previousWindowStart.setDate(previousWindowStart.getDate() - 60);
  const currentWindowStart = new Date(today);
  currentWindowStart.setDate(currentWindowStart.getDate() - 30);
  const currentProjects = projectsRaw.filter((project) => project.createdAt >= currentWindowStart).length;
  const previousProjects = projectsRaw.filter((project) => project.createdAt >= previousWindowStart && project.createdAt < currentWindowStart).length;
  const trend = previousProjects ? Math.round(((currentProjects - previousProjects) / previousProjects) * 100) : currentProjects ? 100 : 0;
  const sparkline = Array.from({ length: 6 }, (_, index) => {
    const bucketStart = new Date(today);
    bucketStart.setDate(bucketStart.getDate() - ((6 - index) * 5));
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketEnd.getDate() + 5);
    return projectsRaw.filter((project) => project.updatedAt >= bucketStart && project.updatedAt < bucketEnd).length;
  });
  const frameworkHealth = frameworks.map((framework) => {
    const scoped = projectMetrics.filter((item) => normalize([item.project.frameworks, item.project.natureOfProject].join(' ')).includes(normalize(framework)));
    const controls = scoped.reduce((sum, item) => sum + item.totalChecklist, 0);
    const completed = scoped.reduce((sum, item) => sum + item.completedChecklist, 0);
    const progress = percent(completed, controls);
    return {
      framework,
      projects: scoped.length,
      progress,
      completedControls: completed,
      pendingControls: Math.max(controls - completed, 0),
      health: progress >= 80 ? 'Healthy' : progress >= 50 ? 'Warning' : 'Critical',
      trend,
    };
  });
  const impacts = ['Low', 'Medium', 'High', 'Critical'];
  const likelihoods = ['Low', 'Medium', 'High', 'Critical'];
  const riskMatrix = likelihoods.map((likelihood, rowIndex) => ({
    likelihood,
    cells: impacts.map((impact, colIndex) => ({
      impact,
      count: observations.filter((obs) => severity(obs) === impact).length && rowIndex === Math.min(3, colIndex) ? observations.filter((obs) => severity(obs) === impact).length : 0,
    })),
  }));
  const businessActivityByDate = [{
    date: today.toISOString(),
    items: [
    { type: 'CONTROLS_REVIEWED', message: `${totalCompletedControls} controls reviewed`, count: totalCompletedControls },
    { type: 'EVIDENCE_UPLOADED', message: `${projectMetrics.reduce((sum, item) => sum + item.evidenceLinked, 0)} evidence uploaded`, count: projectMetrics.reduce((sum, item) => sum + item.evidenceLinked, 0) },
    { type: 'REPORTS_GENERATED', message: `${reportsGenerated} reports generated`, count: reportsGenerated },
    { type: 'MILESTONES_COMPLETED', message: `${totalCompletedMilestones} milestones completed`, count: totalCompletedMilestones },
    { type: 'CRITICAL_OBSERVATIONS', message: `${observationSummary.critical} critical observations raised`, count: observationSummary.critical },
    { type: 'AUDITORS_ASSIGNED', message: `${team.length} auditors assigned`, count: team.length },
    ],
  }];
  const topPriorityProjects = projectRows
    .slice()
    .sort((a, b) => {
      const aMetric = projectMetrics.find((item) => item.project.id === a.id);
      const bMetric = projectMetrics.find((item) => item.project.id === b.id);
      return ((bMetric?.overdueCount || 0) + (b.health === 'Critical' ? 10 : b.health === 'Warning' ? 5 : 0)) - ((aMetric?.overdueCount || 0) + (a.health === 'Critical' ? 10 : a.health === 'Warning' ? 5 : 0));
    })
    .slice(0, 5);
  const payload = {
    overview: {
      activeProjects: active.length,
      projectsAtRisk: projectMetrics.filter((item) => item.health !== 'Healthy').length,
      overdueTasks,
      portfolioHealth,
      pendingReviews,
      reportsGenerated,
      lastRefreshed: new Date().toISOString(),
      trend,
      sparkline,
    },
    portfolio: {
      activeProjects: active.length,
      projectsAtRisk: projectMetrics.filter((item) => item.health !== 'Healthy').length,
      overdueTasks,
      portfolioHealth,
      openReviews: pendingReviews,
      reportsGenerated,
      totalProjects: projectMetrics.length,
      trend,
      sparkline,
    },
    portfolioHealth: { score: portfolioHealth, healthyProjects, activeProjects: active.length },
    health: {
      healthy: projectMetrics.filter((item) => item.health === 'Healthy').length,
      warning: projectMetrics.filter((item) => item.health === 'Warning').length,
      critical: projectMetrics.filter((item) => item.health === 'Critical').length,
    },
    projects: {
      rows: projectRows,
      topPriority: topPriorityProjects,
      byStatus: ['Planning', 'Execution', 'Under Review', 'Reporting', 'Closed', 'Completed'].map((status) => ({ status, count: projectMetrics.filter((item) => item.stage === status).length })),
      activeCount: active.length,
    },
    frameworks: byFramework,
    frameworkHealth,
    risk: ['Critical', 'High', 'Medium', 'Low'].map((risk) => ({ risk, count: projectMetrics.filter((item) => item.riskLevel === risk).length })),
    riskMatrix,
    team,
    deadlines,
    reviews: {
      totalPending: pendingReviews,
      waitingForReviewer: pendingReviews,
      returned: projectMetrics.reduce((sum, item) => sum + item.project.areaAllocations.filter((area) => area.reviewStatus === 'REWORK_REQUIRED').length, 0),
      overdue: projectMetrics.reduce((sum, item) => sum + item.overdueReviews, 0),
      approvedToday,
      averageReviewTime,
    },
    observations: observationSummary,
    riskSummary: observationSummary,
    activity: [
      ...auditLogs.map((log) => ({ id: log.id, type: log.actionType, message: log.details || log.actionType, user: log.user?.name || 'System', createdAt: log.timestamp, document: log.document?.title || log.repositoryItem?.name || 'System' })),
      ...projects.flatMap((project) => project.activityLogs.map((log) => ({ id: log.id, type: log.actionType || log.action, message: log.message || log.details || log.action, user: log.performedByName || log.actor || 'System', createdAt: log.timestamp, document: project.projectName }))),
    ].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))).slice(0, 30),
    filters: {
      frameworks,
      managers: users.map((item) => ({ id: item.id, name: item.name })),
      reviewers: users.map((item) => ({ id: item.id, name: item.name })),
      statuses: Array.from(new Set(projectsRaw.map((project) => project.status).filter(Boolean))),
      industries: Array.from(new Set(projectsRaw.map((project) => project.typeOfIndustry).filter(Boolean))),
      clients: Array.from(new Set(projectsRaw.map((project) => project.clientName).filter(Boolean))),
      health: ['Healthy', 'Warning', 'Critical'],
    },
    aiInsights: insights,
    recentBusinessActivities: businessActivityByDate,
    charts: {
      portfolioHealth: [
        { name: 'Healthy', value: projectMetrics.filter((item) => item.health === 'Healthy').length },
        { name: 'Warning', value: projectMetrics.filter((item) => item.health === 'Warning').length },
        { name: 'Critical', value: projectMetrics.filter((item) => item.health === 'Critical').length },
      ],
      projects: ['Planning', 'Execution', 'Under Review', 'Reporting', 'Closed', 'Completed'].map((status) => ({ status, count: projectMetrics.filter((item) => item.stage === status).length })),
      frameworks: byFramework,
      risks: ['Critical', 'High', 'Medium', 'Low'].map((risk) => ({ risk, count: projectMetrics.filter((item) => item.riskLevel === risk).length })),
      reviews: [
        { status: 'Pending', count: pendingReviews },
        { status: 'Returned', count: projectMetrics.reduce((sum, item) => sum + item.project.areaAllocations.filter((area) => area.reviewStatus === 'REWORK_REQUIRED').length, 0) },
        { status: 'Overdue', count: projectMetrics.reduce((sum, item) => sum + item.overdueReviews, 0) },
        { status: 'Approved Today', count: approvedToday },
      ],
      workload: team,
      observations: [
        { severity: 'Critical', count: observationSummary.critical },
        { severity: 'High', count: observationSummary.high },
        { severity: 'Medium', count: observationSummary.medium },
        { severity: 'Low', count: observationSummary.low },
      ],
    },
    quickActions: [
      { label: 'New Project', href: '/projects' },
      { label: 'Generate Report', href: '/templates' },
      { label: 'Import Checklist', href: '/projects' },
      { label: 'Repository', href: '/repository' },
      { label: 'Templates', href: '/templates' },
      { label: 'Users', href: '/users' },
      { label: 'Review Queue', href: '/my-work' },
      { label: 'Export Dashboard', href: '#export-dashboard' },
    ],
    repository: { files: repositoryFiles },
  };
  dashboardCache.set(cacheKey, { expiresAt: Date.now() + 30_000, payload });
  return payload;
}
