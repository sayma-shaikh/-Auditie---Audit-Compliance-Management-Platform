import { PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient;

const cache = new Map<string, { expiresAt: number; payload: any }>();

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function isDone(status?: string | null) {
  return ['completed', 'complete', 'approved', 'closed', 'resolved'].includes(normalize(status));
}

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function parseJsonArray(value?: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowIsComplete(row: any) {
  const status = normalize(row?.status);
  return status && !['pending', 'not started', 'open'].includes(status);
}

function frameworkText(project: any) {
  return project.frameworks || project.natureOfProject || 'Framework';
}

function projectPhase(project: any) {
  const text = normalize(project.currentStage || project.status);
  if (isDone(project.status)) return 'Completed';
  if (text.includes('report')) return 'Reporting';
  if (text.includes('review')) return 'Review';
  if (text.includes('plan')) return 'Planning';
  return 'Execution';
}

function areaProgress(area: any) {
  const rows = [
    ...(area.checklistRows || []),
    ...(area.workingPapers || []).flatMap((paper: any) => paper.checklistRows || []),
  ];
  const snapshot = [
    ...parseJsonArray(area.checklistSnapshot),
    ...(area.workingPapers || []).flatMap((paper: any) => parseJsonArray(paper.checklistSnapshot)),
  ];
  const total = rows.length + snapshot.length;
  const done = rows.filter(rowIsComplete).length + snapshot.filter(rowIsComplete).length;
  return { total, done, percent: total ? percent(done, total) : isDone(area.reviewStatus) ? 100 : 0 };
}

function displayAreaStatus(area: any, today: Date) {
  if (area.dueDate && new Date(area.dueDate) < today && !isDone(area.reviewStatus) && !isDone(area.status)) return 'Overdue';
  if (area.reviewStatus === 'REWORK_REQUIRED') return 'Returned';
  if (area.reviewStatus === 'AWAITING_REVIEW' || area.workStatus === 'SUBMITTED') return 'Under Review';
  if (area.reviewStatus === 'APPROVED') return 'Approved';
  if (area.workStatus === 'IN_PROGRESS' || normalize(area.status).includes('progress')) return 'In Progress';
  if (isDone(area.status)) return 'Completed';
  return 'Not Started';
}

function priorityFor(area: any, today: Date) {
  if (area.dueDate && new Date(area.dueDate) < today && !isDone(area.reviewStatus)) return 'Critical';
  if (area.reviewStatus === 'REWORK_REQUIRED') return 'High';
  if (area.dueDate && Number(new Date(area.dueDate)) <= Number(addDays(today, 1))) return 'High';
  return 'Medium';
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CL';
}

function dateLabel(date?: Date | string | null, today = startOfToday()) {
  if (!date) return 'No due date';
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const diff = Math.round((Number(value) - Number(today)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`;
  return `${diff} days`;
}

function actionFor(status: string) {
  if (status === 'Under Review') return 'Open Review';
  if (status === 'Returned') return 'Continue Editing';
  if (status === 'Not Started') return 'Open Checklist';
  if (status === 'Approved' || status === 'Completed') return 'View';
  return 'Continue';
}

export async function getAuditorDashboard(prisma: PrismaLike, authUser: any) {
  if (!authUser) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  const cacheKey = `auditor:${authUser.id}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;

  const today = startOfToday();
  const weekStart = addDays(today, -7);
  const nextMonth = addDays(today, 30);

  const [user, users, taskAssignments, projects, activity] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      include: { performance: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
    prisma.taskAssignment.findMany({
      where: { userId: authUser.id },
      include: { assignedBy: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.project.findMany({
      where: {
        OR: [
          { auditManagerId: authUser.id },
          { userProjects: { some: { userId: authUser.id } } },
          { areaAllocations: { some: { OR: [{ assignedUserId: authUser.id }, { makerUserId: authUser.id }, { reviewerUserId: authUser.id }] } } },
        ],
      },
      include: {
        userProjects: { include: { user: { select: { id: true, name: true, email: true } } } },
        areaAllocations: {
          where: { parentAreaId: null },
          include: {
            checklistRows: { include: { evidence: true } },
            workingPapers: { include: { checklistRows: { include: { evidence: true } } } },
          },
        },
        milestones: true,
        activityLogs: { orderBy: { timestamp: 'desc' }, take: 15 },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.userActivityLog.findMany({ where: { userId: authUser.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  const usersById = new Map(users.map((item) => [item.id, item]));

  const assignedAreas = projects.flatMap((project) => project.areaAllocations
    .filter((area) => area.assignedUserId === authUser.id || area.makerUserId === authUser.id)
    .map((area) => {
      const progress = areaProgress(area);
      const status = displayAreaStatus(area, today);
      const reviewer = usersById.get(area.reviewerUserId || project.auditManagerId || '');
      return {
        id: area.id,
        type: 'area',
        task: `${area.areaName} Checklist`,
        projectId: project.id,
        project: project.projectName,
        client: project.clientName,
        auditArea: area.areaName,
        framework: frameworkText(project),
        priority: priorityFor(area, today),
        status,
        dueDate: area.dueDate,
        reviewer: reviewer?.name || 'Unassigned',
        progress: progress.percent,
        href: `/projects/${project.id}/areas/${area.id}`,
        action: actionFor(status),
        returnedReason: area.reviewStatus === 'REWORK_REQUIRED' ? (area.reviewComments || area.remarks || 'Reviewer requested rework before approval.') : null,
        returnedBy: reviewer?.name || 'Reviewer',
        updatedAt: area.updatedAt,
      };
    }));

  const reviewQueue = projects.flatMap((project) => project.areaAllocations
    .filter((area) => (area.reviewerUserId || project.auditManagerId) === authUser.id && (area.reviewStatus === 'AWAITING_REVIEW' || area.workStatus === 'SUBMITTED'))
    .map((area) => {
      const submitter = usersById.get(area.makerUserId || area.assignedUserId || '');
      return {
        id: area.id,
        submittedBy: submitter?.name || 'Auditor',
        project: project.projectName,
        projectId: project.id,
        area: area.areaName,
        submittedTime: area.submittedAt || area.updatedAt,
        href: `/projects/${project.id}/areas/${area.id}`,
        priority: area.dueDate && new Date(area.dueDate) < today ? 'Critical' : 'High',
      };
    }));

  const directTasks = taskAssignments.map((task) => {
    const status = task.dueDate < today && !isDone(task.status) ? 'Overdue' : task.status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    return {
      id: task.id,
      type: 'task',
      task: task.description || `Task ${task.taskId}`,
      projectId: '',
      project: 'Direct Assignment',
      client: '',
      auditArea: 'General',
      framework: 'Internal',
      priority: task.priority,
      status,
      dueDate: task.dueDate,
      reviewer: task.assignedBy?.name || 'Manager',
      progress: isDone(task.status) ? 100 : status === 'In Progress' ? 55 : 15,
      href: '/my-work',
      action: status === 'Overdue' ? 'Continue' : 'Open',
      returnedReason: null,
      returnedBy: null,
      updatedAt: task.updatedAt,
    };
  });

  const tasks = [...assignedAreas, ...directTasks].sort((a, b) => {
    const weight = (item: any) => item.status === 'Overdue' ? 0 : item.status === 'Returned' ? 1 : item.priority === 'Critical' ? 2 : item.priority === 'High' ? 3 : 4;
    return weight(a) - weight(b) || Number(new Date(a.dueDate || 8640000000000000)) - Number(new Date(b.dueDate || 8640000000000000));
  });

  const areasByName = new Map<string, any>();
  assignedAreas.forEach((task) => {
    const current = areasByName.get(task.auditArea) || { name: task.auditArea, controls: 0, completed: 0, pending: 0, returned: 0, href: task.href };
    current.controls += 1;
    current.completed += ['Completed', 'Approved'].includes(task.status) ? 1 : 0;
    current.pending += ['Not Started', 'In Progress', 'Under Review', 'Overdue'].includes(task.status) ? 1 : 0;
    current.returned += task.status === 'Returned' ? 1 : 0;
    areasByName.set(task.auditArea, current);
  });

  const projectCards = projects.map((project) => {
    const scopedTasks = assignedAreas.filter((task) => task.projectId === project.id);
    const relevantAreas = project.areaAllocations.filter((area) => area.assignedUserId === authUser.id || area.makerUserId === authUser.id || area.reviewerUserId === authUser.id || project.auditManagerId === authUser.id);
    const progress = relevantAreas.length ? Math.round(relevantAreas.reduce((sum, area) => sum + areaProgress(area).percent, 0) / relevantAreas.length) : project.progressPercentage || 0;
    const endDate = project.assignmentExecutionEndDate || project.reportingDeadline;
    return {
      id: project.id,
      logo: initials(project.clientName || project.projectName),
      clientName: project.clientName,
      projectName: project.projectName,
      framework: frameworkText(project),
      currentPhase: projectPhase(project),
      progress,
      startDate: project.assignmentExecutionStartDate || project.assignmentPeriodStartDate,
      endDate,
      team: project.userProjects.slice(0, 4).map((item) => item.user?.name || 'Member'),
      deadlineCountdown: dateLabel(endDate, today),
      href: `/projects/${project.id}`,
      pinned: scopedTasks.some((task) => ['Overdue', 'Returned'].includes(task.status)),
    };
  });

  const returnedToMe = assignedAreas.filter((task) => task.status === 'Returned').map((task) => ({
    id: task.id,
    task: task.task,
    project: task.project,
    reason: task.returnedReason,
    returnedBy: task.returnedBy,
    date: task.updatedAt,
    priority: task.priority,
    href: task.href,
  }));

  const deadlines = [
    ...tasks.filter((task) => task.dueDate && !['Completed', 'Approved'].includes(task.status)).map((task) => ({
      id: task.id,
      label: dateLabel(task.dueDate, today),
      title: task.task,
      project: task.project,
      dueDate: task.dueDate,
      href: task.href,
      type: task.status === 'Under Review' ? 'Review' : 'Task',
    })),
    ...projects.flatMap((project) => project.milestones
      .filter((milestone) => milestone.ownerId === authUser.id && milestone.targetDate && !isDone(milestone.status))
      .map((milestone) => ({
        id: milestone.id,
        label: dateLabel(milestone.targetDate, today),
        title: milestone.milestoneName,
        project: project.projectName,
        dueDate: milestone.targetDate,
        href: `/projects/${project.id}/milestones/${milestone.id}`,
        type: 'Milestone',
      }))),
  ].sort((a, b) => Number(new Date(a.dueDate || 0)) - Number(new Date(b.dueDate || 0))).slice(0, 12);

  const recentEvidence = projects.flatMap((project) => project.areaAllocations.flatMap((area) => [
    ...(area.checklistRows || []).flatMap((row: any) => (row.evidence || []).map((file: any) => ({ ...file, project: project.projectName, area: area.areaName, href: `/projects/${project.id}/areas/${area.id}` }))),
    ...(area.workingPapers || []).flatMap((paper: any) => (paper.checklistRows || []).flatMap((row: any) => (row.evidence || []).map((file: any) => ({ ...file, project: project.projectName, area: paper.areaName, href: `/projects/${project.id}/areas/${paper.id}` })))),
  ])).sort((a, b) => Number(new Date(b.uploadedAt || b.createdAt || 0)) - Number(new Date(a.uploadedAt || a.createdAt || 0))).slice(0, 10);

  const completedThisWeek = tasks.filter((task) => ['Completed', 'Approved'].includes(task.status) && task.updatedAt && new Date(task.updatedAt) >= weekStart).length;
  const openTasks = tasks.filter((task) => !['Completed', 'Approved'].includes(task.status));
  const overdue = openTasks.filter((task) => task.status === 'Overdue').length;
  const completion = percent(tasks.length - openTasks.length, tasks.length);
  const pendingReviews = reviewQueue.length;
  const workloadScore = openTasks.length + pendingReviews * 2 + overdue * 3;
  const workload = workloadScore >= 24 ? 'Heavy' : workloadScore >= 12 ? 'Moderate' : 'Light';
  const lastTask = openTasks[0] || tasks[0] || null;

  const activityItems = [
    ...activity.map((item) => ({
      id: item.id,
      time: item.createdAt,
      action: item.action.replaceAll('_', ' '),
      subject: item.entityName || item.entityType || 'Workspace activity',
    })),
    ...projects.flatMap((project) => project.activityLogs
      .filter((log) => !log.actor || log.actor === authUser.id || log.performedByName === user.name)
      .map((log) => ({
        id: log.id,
        time: log.timestamp,
        action: log.message || log.details || log.action,
        subject: project.projectName,
      }))),
  ].sort((a, b) => Number(new Date(b.time)) - Number(new Date(a.time))).slice(0, 12);

  const payload = {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    generatedAt: new Date().toISOString(),
    hero: {
      greeting: `Good Morning, ${user.name.split(' ')[0] || 'Auditor'}`,
      attentionTasks: openTasks.filter((task) => ['Overdue', 'Returned'].includes(task.status) || task.priority === 'Critical').length,
      pendingReviews,
      dueToday: openTasks.filter((task) => task.dueDate && new Date(task.dueDate).toDateString() === today.toDateString()).length,
      resume: lastTask,
    },
    summary: {
      assignedTasks: tasks.length,
      newToday: tasks.filter((task) => task.updatedAt && new Date(task.updatedAt) >= today).length,
      pendingReviews,
      overdueTasks: overdue,
      completedThisWeek,
      projectsAssigned: projectCards.length,
      overallCompletion: completion,
    },
    performance: {
      completionRate: completion || Math.round(user.performance?.productivityScore || 0),
      onTimeDelivery: Math.round(user.performance?.onTimeDeliveryRate || (overdue ? 82 : 95)),
      averageReviewTime: user.performance?.avgCompletionTime || 2.3,
      pendingWorkload: openTasks.length,
      trend: [58, 63, 66, 70, 72, completion || 76],
    },
    workload: { label: workload, utilization: Math.min(100, workloadScore * 4), openTasks: openTasks.length },
    tasks,
    priority: openTasks.filter((task) => task.status === 'Overdue' || task.status === 'Returned' || task.priority === 'Critical' || task.priority === 'High' || (task.dueDate && Number(new Date(task.dueDate)) <= Number(addDays(today, 1)))).slice(0, 8),
    projects: projectCards,
    pinnedProjects: projectCards.filter((project) => project.pinned).slice(0, 4),
    assignedAreas: Array.from(areasByName.values()),
    reviews: reviewQueue,
    returnedToMe,
    deadlines: deadlines.filter((item) => item.dueDate && new Date(item.dueDate) <= nextMonth),
    activity: activityItems,
    files: recentEvidence,
    quickAccess: [
      { label: 'Current Project', href: lastTask?.projectId ? `/projects/${lastTask.projectId}` : '/projects' },
      { label: 'Repository', href: '/repository' },
      { label: 'Templates', href: '/templates' },
      { label: 'Policies', href: '/repository' },
      { label: 'Observation Register', href: lastTask?.projectId ? `/projects/${lastTask.projectId}` : '/projects' },
      { label: 'CAPA Register', href: lastTask?.projectId ? `/projects/${lastTask.projectId}` : '/projects' },
    ],
    notifications: [
      ...returnedToMe.slice(0, 3).map((item) => ({ id: `returned-${item.id}`, title: `${item.task} returned`, body: item.reason, unread: true, href: item.href })),
      ...reviewQueue.slice(0, 3).map((item) => ({ id: `review-${item.id}`, title: `${item.area} awaiting review`, body: `${item.submittedBy} submitted ${item.project}`, unread: true, href: item.href })),
      ...deadlines.slice(0, 3).map((item) => ({ id: `deadline-${item.id}`, title: `${item.title} ${item.label.toLowerCase()}`, body: item.project, unread: item.label === 'Today' || item.label.includes('overdue'), href: item.href })),
    ],
    productivity: {
      uploadQueue: [],
      draftChecklists: openTasks.filter((task) => task.progress > 0 && task.progress < 100).slice(0, 5),
      calendar: deadlines.slice(0, 6),
      offlineRecovery: lastTask ? { title: lastTask.task, href: lastTask.href, savedAt: lastTask.updatedAt } : null,
      shortcuts: ['Ctrl+S', 'Ctrl+Enter', 'Ctrl+F', 'Ctrl+/'],
    },
  };

  cache.set(cacheKey, { expiresAt: Date.now() + 30_000, payload });
  return payload;
}
