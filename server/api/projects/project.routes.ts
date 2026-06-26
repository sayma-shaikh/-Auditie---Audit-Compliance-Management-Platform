import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../../middleware/auth.middleware.ts';
import { calculateUserPerformance } from '../../services/performance-analytics.service.ts';
import { checklistAreaOption, checklistTemplateForArea, checklistTypeForArea, createChecklistSnapshot, defaultAuditAreas, workingPaperNamesForArea } from '../../data/checklist-library.ts';
import { getProjectMilestoneSummary, seedProjectMilestones } from '../../services/review-program.service.ts';
import { getProjectOverviewDashboard } from '../../services/project-overview.service.ts';

const router = Router();
const prisma = new PrismaClient();

const lifecycleStages = [
  'Planning',
  'Kickoff Meeting',
  'Execution',
  'Queries and Discussions',
  'Draft Reporting',
  'Final Reporting',
  'Billing',
  'Collection',
  'Client Feedback',
  'Data Backup',
];

const suggestedAreas: Record<string, string[]> = {
  'ISO 27001 ISMS': defaultAuditAreas(),
  'SOC 2': defaultAuditAreas(),
  VAPT: [
    'Network Scope',
    'Web Application',
    'Mobile Application',
    'API Testing',
    'Cloud Infrastructure',
    'Reporting',
    'Retesting',
  ],
};

const parseDate = (value: unknown) => (value ? new Date(String(value)) : undefined);
const numberValue = (value: unknown) => (value === undefined || value === null || value === '' ? 0 : Number(value));

function areaTemplate(nature = '') {
  const key = Object.keys(suggestedAreas).find((name) => nature.toLowerCase().includes(name.toLowerCase().replace(' isms', '')));
  return key ? suggestedAreas[key] : defaultAuditAreas();
}

function checklistSnapshot(areaName: string, existing?: unknown) {
  if (existing) return typeof existing === 'string' ? existing : JSON.stringify(existing);
  return JSON.stringify(createChecklistSnapshot(areaName));
}

function checklistType(area: any) {
  return area.checklistType || (workingPaperNamesForArea(area.areaName || '').length ? 'TABLE_CHECKLIST' : checklistTypeForArea(area.areaName || 'Audit Area'));
}

function validateMakerReviewer(area: any, auditManagerId?: string | null) {
  const makerUserId = area.makerUserId || area.assignedUserId || null;
  const reviewerUserId = area.reviewerUserId ?? auditManagerId ?? null;
  if (makerUserId && reviewerUserId && makerUserId === reviewerUserId) {
    return 'Maker and reviewer cannot be the same person. Please assign a different reviewer.';
  }
  return null;
}

function canEditProject(project: any, req: AuthRequest) {
  return req.user?.role === 'ADMIN' || project?.auditManagerId === req.user?.id;
}

async function logProjectAction(projectId: string, req: AuthRequest, action: string, details?: string) {
  await prisma.projectActivityLog.create({
    data: {
      projectId,
      actor: req.user?.id || 'System',
      action,
      details,
    },
  });
}

async function recalculateProject(projectId: string) {
  const milestoneSummary = await getProjectMilestoneSummary(prisma, projectId);
  if (milestoneSummary.totalMilestones) {
    return prisma.project.update({
      where: { id: projectId },
      data: {
        progressPercentage: milestoneSummary.overallProgressPercentage,
        currentStage: milestoneSummary.currentStage,
        status: milestoneSummary.overallProgressPercentage >= 100 ? 'COMPLETED' : 'ACTIVE',
      },
    });
  }

  const [stages, areas, rows, observations, capas] = await Promise.all([
    prisma.projectStage.findMany({ where: { projectId }, orderBy: { stageOrder: 'asc' } }),
    prisma.projectAreaAllocation.findMany({ where: { projectId, workpaperKind: { not: 'AREA_GROUP' } } }),
    prisma.checklistRow.findMany({ where: { auditArea: { projectId } }, include: { evidence: true } }),
    prisma.observation.findMany({ where: { projectId } }),
    prisma.cAPA.findMany({ where: { projectId } }),
  ]);

  const stageScore = stages.length ? stages.filter((stage) => stage.status === 'Completed').length / stages.length : 0;
  const checklistScore = rows.length ? rows.filter((row) => row.status && row.status !== 'Pending').length / rows.length : 0;
  const evidenceScore = rows.length ? rows.filter((row) => row.evidence.length || row.evidenceLink).length / rows.length : 0;
  const observationScore = observations.length ? observations.filter((observation) => observation.reviewed || observation.status === 'Reviewed' || observation.status === 'Closed').length / observations.length : 1;
  const capaScore = capas.length ? capas.filter((capa) => capa.closureStatus === 'Closed').length / capas.length : 1;
  const areaScore = areas.length || rows.length || observations.length || capas.length
    ? (checklistScore * 0.4) + (observationScore * 0.2) + (capaScore * 0.2) + (evidenceScore * 0.2)
    : 0;
  const progress = stages.length && areas.length
    ? Math.round((stageScore * 0.7 + areaScore * 0.3) * 100)
    : Math.round(Math.max(stageScore, areaScore) * 100);

  const activeStage = stages.find((stage) => stage.status === 'In Progress')
    || stages.find((stage) => stage.status !== 'Completed')
    || stages[stages.length - 1];

  return prisma.project.update({
    where: { id: projectId },
    data: {
      progressPercentage: progress,
      currentStage: activeStage?.stageName,
      status: progress >= 100 ? 'COMPLETED' : 'ACTIVE',
    },
  });
}

const includeProject = {
  documents: { orderBy: { updatedAt: 'desc' as const } },
  userProjects: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          designation: true,
        },
      },
    },
  },
  areaAllocations: {
    where: { parentAreaId: null },
    include: {
      checklistRows: { include: { evidence: { orderBy: { uploadedAt: 'desc' as const } } }, orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
      observations: { include: { capa: true } },
      capas: true,
      workingPapers: {
        include: {
          checklistRows: { include: { evidence: { orderBy: { uploadedAt: 'desc' as const } } }, orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
          observations: { include: { capa: true } },
          capas: true,
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  stages: { orderBy: { stageOrder: 'asc' as const } },
  milestones: { orderBy: { sequence: 'asc' as const } },
  queries: { orderBy: { createdAt: 'desc' as const } },
  billingRecords: { orderBy: { updatedAt: 'desc' as const } },
  feedbackRecords: { orderBy: { updatedAt: 'desc' as const } },
  backupRecords: { orderBy: { updatedAt: 'desc' as const } },
  activityLogs: { orderBy: { timestamp: 'desc' as const }, take: 50 },
};

async function syncChecklistTemplate(definition: ReturnType<typeof checklistTemplateForArea>) {
  const template = await prisma.checklistTemplate.upsert({
    where: { id: `${definition.areaKey}-${definition.type}` },
    update: {
      name: definition.name,
      type: definition.type,
      framework: definition.framework || null,
      areaKey: definition.areaKey,
      evidenceRequirement: definition.evidenceRequirement || null,
      validationRules: definition.validationRules ? JSON.stringify(definition.validationRules) : null,
    },
    create: {
      id: `${definition.areaKey}-${definition.type}`,
      name: definition.name,
      type: definition.type,
      framework: definition.framework || null,
      areaKey: definition.areaKey,
      evidenceRequirement: definition.evidenceRequirement || null,
      validationRules: definition.validationRules ? JSON.stringify(definition.validationRules) : null,
    },
  });
  const columns = definition.columns || [];
  await prisma.checklistColumn.deleteMany({ where: { templateId: template.id, columnKey: { notIn: columns.map((column) => column.columnKey) } } });
  await Promise.all(columns.map((column, index) => prisma.checklistColumn.upsert({
    where: { templateId_columnKey: { templateId: template.id, columnKey: column.columnKey } },
    update: { columnName: column.columnName, columnType: column.columnType, isRequired: !!column.isRequired, sortOrder: index, options: column.options ? JSON.stringify(column.options) : null },
    create: { templateId: template.id, columnName: column.columnName, columnKey: column.columnKey, columnType: column.columnType, isRequired: !!column.isRequired, sortOrder: index, options: column.options ? JSON.stringify(column.options) : null },
  })));
  return template;
}

async function seedWorkingPaperRows(areaId: string, templateId: string, rows: Record<string, string>[] = []) {
  if (!rows.length) return;
  const existing = await prisma.checklistRow.count({ where: { auditAreaId: areaId, templateId } });
  if (existing) return;
  await prisma.checklistRow.createMany({
    data: rows.map((rowData, index) => ({
      auditAreaId: areaId,
      templateId,
      rowData: JSON.stringify(rowData),
      status: 'Pending',
      sortOrder: index,
    })),
  });
}

async function createAreaWithWorkingPapers(projectId: string, area: any, auditManagerId?: string | null) {
  if (area.isCustom) {
    const areaName = area.customAreaName || area.areaName;
    return prisma.projectAreaAllocation.create({
      data: {
        projectId,
        areaName,
        assignedUserId: area.makerUserId || area.assignedUserId || null,
        makerUserId: area.makerUserId || area.assignedUserId || null,
        reviewerUserId: area.reviewerUserId || null,
        checklistType: 'QUESTION_CHECKLIST',
        checklistTemplateId: null,
        workpaperKind: 'WORKING_PAPER',
        status: area.status || 'Not Started',
        workStatus: area.workStatus || 'NOT_STARTED',
        reviewStatus: area.reviewStatus || 'NOT_REVIEWED',
        remarks: area.remarks || null,
        dueDate: parseDate(area.dueDate),
        checklistSnapshot: checklistSnapshot(areaName, area.checklistSnapshot),
      },
    });
  }
  const option = checklistAreaOption(area.areaKey);
  if (option) {
    area = { ...area, areaName: option.areaName, checklistType: 'TABLE_CHECKLIST' };
  }
  const makerUserId = area.makerUserId || area.assignedUserId || null;
  const reviewerUserId = area.reviewerUserId || null;
  const paperNames = workingPaperNamesForArea(area.areaName || '');
  const primaryDefinition = paperNames.length
    ? checklistTemplateForArea(paperNames[0])
    : checklistTemplateForArea(area.areaName || 'Audit Area');
  const groupTemplate = await syncChecklistTemplate(primaryDefinition);
  const parent = await prisma.projectAreaAllocation.create({
    data: {
      projectId,
      areaName: area.areaName,
      assignedUserId: makerUserId,
      makerUserId,
      reviewerUserId,
      checklistType: 'TABLE_CHECKLIST',
      checklistTemplateId: groupTemplate.id,
      workpaperKind: 'WORKING_PAPER',
      status: area.status || 'Not Started',
      workStatus: area.workStatus || 'NOT_STARTED',
      reviewStatus: area.reviewStatus || 'NOT_REVIEWED',
      remarks: area.remarks || null,
      dueDate: parseDate(area.dueDate),
      checklistSnapshot: JSON.stringify([]),
    },
  });
  if (!paperNames.length) {
    await seedWorkingPaperRows(parent.id, groupTemplate.id, checklistTemplateForArea(area.areaName || 'Audit Area').seedRows || []);
    return parent;
  }
  for (const paperName of paperNames) {
    const definition = checklistTemplateForArea(paperName);
    const template = await syncChecklistTemplate(definition);
    await seedWorkingPaperRows(parent.id, template.id, definition.seedRows || []);
  }
  return parent;
}

function projectData(body: any, req: AuthRequest) {
  const natureOfProject = body.natureOfProject || body.frameworks || 'ISO 27001 ISMS';
  const projectName = body.projectName || `${body.clientName || 'New Client'} - ${natureOfProject}`;
  const periodStart = parseDate(body.assignmentPeriodStartDate);
  const periodEnd = parseDate(body.assignmentPeriodEndDate);
  const periodCoverage = periodStart && periodEnd
    ? `${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`
    : body.assignmentPeriodCoverage;

  return {
    projectName,
    clientName: body.clientName,
    frameworks: body.frameworks || natureOfProject,
    natureOfProject,
    assignmentPeriodCoverage: periodCoverage,
    assignmentPeriodStartDate: periodStart,
    assignmentPeriodEndDate: periodEnd,
    assignmentExecutionStartDate: parseDate(body.assignmentExecutionStartDate),
    assignmentExecutionEndDate: parseDate(body.assignmentExecutionEndDate),
    reportingDeadline: parseDate(body.reportingDeadline),
    auditManagerId: body.auditManagerId || null,
    typeOfIndustry: body.typeOfIndustry,
    geographicalPresence: body.geographicalPresence,
    listingOnExchanges: body.listingOnExchanges,
    registeredOfficeAddress: body.registeredOfficeAddress,
    corporateOfficeAddress: body.corporateOfficeAddress,
    email: body.email,
    telephone: body.telephone,
    cinNo: body.cinNo,
    pan: body.pan,
    gst: body.gst,
    website: body.website,
    createdBy: req.user?.id,
    currentStage: lifecycleStages[0],
  };
}

router.get('/', authenticateJWT, async (_req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: includeProject,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (err) {
    console.error('Project list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

function queueAreaPayload(area: any) {
  const effectiveReviewerId = area.reviewerUserId || area.project.auditManagerId || null;
  return {
    area: {
      id: area.id,
      projectId: area.projectId,
      areaName: area.areaName,
      assignedUserId: area.assignedUserId,
      makerUserId: area.makerUserId,
      reviewerUserId: area.reviewerUserId,
      status: area.status,
      workStatus: area.workStatus,
      reviewStatus: area.reviewStatus,
      dueDate: area.dueDate,
      checklistSnapshot: area.checklistSnapshot,
      evidenceRecords: area.evidenceRecords,
      checklistRows: area.checklistRows || [],
      submittedAt: area.submittedAt,
      effectiveReviewerId,
    },
    project: {
      id: area.project.id,
      projectName: area.project.projectName,
      clientName: area.project.clientName,
      natureOfProject: area.project.natureOfProject,
      frameworks: area.project.frameworks,
      auditManagerId: area.project.auditManagerId,
    },
    submittedBy: area.makerUserId || area.assignedUserId ? null : null,
  };
}

router.get('/my-assignments', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const areas = await prisma.projectAreaAllocation.findMany({
      where: {
        parentAreaId: null,
        OR: [{ makerUserId: req.user?.id }, { assignedUserId: req.user?.id }],
      },
      include: { project: true, checklistRows: true },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
    });
    res.json(areas.map(queueAreaPayload));
  } catch (err) {
    console.error('My assignments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my-reviews', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const areas = await prisma.projectAreaAllocation.findMany({
      where: {
        parentAreaId: null,
        reviewStatus: 'AWAITING_REVIEW',
        OR: [
          { reviewerUserId: req.user?.id },
          { reviewerUserId: null, project: { auditManagerId: req.user?.id } },
        ],
      },
      include: { project: true, checklistRows: true },
      orderBy: [{ submittedAt: 'asc' }, { updatedAt: 'desc' }],
    });
    const submitterIds = Array.from(new Set(areas.map((area) => area.makerUserId || area.assignedUserId).filter(Boolean))) as string[];
    const submitters = submitterIds.length
      ? await prisma.user.findMany({ where: { id: { in: submitterIds } }, select: { id: true, name: true } })
      : [];
    const submitterMap = new Map(submitters.map((user) => [user.id, user.name]));
    res.json(areas.map((area) => ({
      ...queueAreaPayload(area),
      submittedBy: {
        id: area.makerUserId || area.assignedUserId,
        name: submitterMap.get(area.makerUserId || area.assignedUserId || '') || 'Unassigned',
      },
    })));
  } catch (err) {
    console.error('My reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const sendProjectOverview = async (req: AuthRequest, res) => {
  try {
    const dashboard = await getProjectOverviewDashboard(prisma, req.params.id, {
      area: req.query.area ? String(req.query.area) : undefined,
      owner: req.query.owner ? String(req.query.owner) : undefined,
      reviewer: req.query.reviewer ? String(req.query.reviewer) : undefined,
      milestone: req.query.milestone ? String(req.query.milestone) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      severity: req.query.severity ? String(req.query.severity) : undefined,
      framework: req.query.framework ? String(req.query.framework) : undefined,
      dueDateRange: req.query.dueDateRange ? String(req.query.dueDateRange) : undefined,
    });
    if (!dashboard) return res.status(404).json({ message: 'Project not found' });
    res.json(dashboard);
  } catch (err) {
    console.error('Project overview dashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/:id/overview', authenticateJWT, sendProjectOverview);
router.get('/:id/overview-dashboard', authenticateJWT, sendProjectOverview);

router.get('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: includeProject,
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const auditLogs = await prisma.auditLog.findMany({
      where: { document: { projectId: req.params.id } },
      include: {
        user: { select: { name: true, role: true } },
        document: { select: { title: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 25,
    });

    res.json({ ...project, auditLogs });
  } catch (err) {
    console.error('Project details error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    if (!body.clientName) return res.status(400).json({ message: 'Client name is required' });
    if (!body.auditManagerId) return res.status(400).json({ message: 'Audit Manager is required for project creation.' });

    const project = await prisma.project.create({
      data: {
        ...projectData(body, req),
        status: 'ACTIVE',
        progressPercentage: 0,
      },
    });

    const memberIds = Array.from(new Set([body.auditManagerId, ...(body.teamMemberIds || [])].filter(Boolean))) as string[];
    await Promise.all(memberIds.map((userId) => prisma.userProject.upsert({
      where: { userId_projectId: { userId, projectId: project.id } },
      update: { projectRole: userId === body.auditManagerId ? 'Audit Manager' : 'Team Member' },
      create: {
        userId,
        projectId: project.id,
        assignedById: req.user!.id,
        projectRole: userId === body.auditManagerId ? 'Audit Manager' : 'Team Member',
      },
    })));

    await prisma.projectStage.createMany({
      data: lifecycleStages.map((stageName, index) => ({
        projectId: project.id,
        stageName,
        stageOrder: index + 1,
        status: index === 0 ? 'In Progress' : 'Pending',
        assignedTo: body.auditManagerId || null,
      })),
    });
    await seedProjectMilestones(prisma, project.id, body.auditManagerId || null);

    await prisma.projectBilling.create({ data: { projectId: project.id, billingStatus: 'Not Billed', collectionStatus: 'Pending' } });
    await prisma.projectBackup.create({ data: { projectId: project.id, backupStatus: 'Pending' } });
    await logProjectAction(project.id, req, 'PROJECT_CREATED', `Project created for ${body.clientName}`);
    await recalculateProject(project.id);
    await Promise.all(memberIds.map((userId) => calculateUserPerformance(userId)));

    const created = await prisma.project.findUnique({ where: { id: project.id }, include: includeProject });
    res.status(201).json(created);
  } catch (err) {
    console.error('Project create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Project not found' });
    if (!canEditProject(existing, req)) return res.status(403).json({ message: 'Only Admin and Audit Manager can edit project details' });

    const data = projectData({ ...existing, ...req.body }, req);
    await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...data,
        createdBy: existing.createdBy,
        status: req.body.status ?? existing.status,
        progressPercentage: req.body.progressPercentage !== undefined ? Number(req.body.progressPercentage) : existing.progressPercentage,
      },
    });

    if (Array.isArray(req.body.teamMemberIds) || req.body.auditManagerId !== undefined) {
      const desiredIds = Array.from(new Set([req.body.auditManagerId, ...(req.body.teamMemberIds || [])].filter(Boolean))) as string[];
      const currentAssignments = await prisma.userProject.findMany({ where: { projectId: req.params.id } });

      await Promise.all(currentAssignments
        .filter((assignment) => !desiredIds.includes(assignment.userId))
        .map((assignment) => prisma.userProject.delete({ where: { id: assignment.id } })));

      await Promise.all(desiredIds.map((userId) => prisma.userProject.upsert({
        where: { userId_projectId: { userId, projectId: req.params.id } },
        update: { projectRole: userId === req.body.auditManagerId ? 'Audit Manager' : 'Team Member' },
        create: {
          userId,
          projectId: req.params.id,
          assignedById: req.user!.id,
          projectRole: userId === req.body.auditManagerId ? 'Audit Manager' : 'Team Member',
        },
      })));
    }

    await logProjectAction(req.params.id, req, 'PROJECT_UPDATED', 'Project details updated');
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: includeProject });
    res.json(project);
  } catch (err) {
    console.error('Project update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    await logProjectAction(req.params.id, req, 'PROJECT_UPDATED', 'Project deleted');
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Project delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/archive', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
      include: includeProject,
    });
    await logProjectAction(req.params.id, req, 'PROJECT_UPDATED', 'Project archived');
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/report', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: includeProject });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ generatedAt: new Date().toISOString(), project });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/areas', authenticateJWT, async (req: AuthRequest, res) => {
  const areas = await prisma.projectAreaAllocation.findMany({ where: { projectId: req.params.id, parentAreaId: null }, orderBy: { createdAt: 'asc' } });
  res.json(areas);
});

router.post('/:id/areas', authenticateJWT, async (req: AuthRequest, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!canEditProject(project, req)) return res.status(403).json({ message: 'Access denied' });
  const makerUserId = req.body.makerUserId || req.body.assignedUserId || null;
  const reviewerUserId = req.body.reviewerUserId || null;
  const makerReviewerError = validateMakerReviewer({ makerUserId, reviewerUserId }, project.auditManagerId);
  if (makerReviewerError) return res.status(400).json({ message: makerReviewerError });

  const area = await createAreaWithWorkingPapers(req.params.id, { ...req.body, makerUserId, assignedUserId: makerUserId, reviewerUserId }, project.auditManagerId);
  const memberIds = Array.from(new Set([area.makerUserId, area.reviewerUserId].filter(Boolean))) as string[];
  await Promise.all(memberIds.map((userId) =>
    prisma.userProject.upsert({
      where: { userId_projectId: { userId, projectId: req.params.id } },
      update: {},
      create: { userId, projectId: req.params.id, assignedById: req.user!.id, projectRole: 'Team Member' },
    })
  ));
  await Promise.all(memberIds.map((userId) => calculateUserPerformance(userId)));
  await logProjectAction(req.params.id, req, 'Task Assigned', `Area allocated: ${area.areaName}`);
  await recalculateProject(req.params.id);
  res.status(201).json(area);
});

router.get('/:id/stages', authenticateJWT, async (req: AuthRequest, res) => {
  const stages = await prisma.projectStage.findMany({ where: { projectId: req.params.id }, orderBy: { stageOrder: 'asc' } });
  res.json(stages);
});

router.get('/:id/queries', authenticateJWT, async (req: AuthRequest, res) => {
  const queries = await prisma.projectQuery.findMany({ where: { projectId: req.params.id }, orderBy: { createdAt: 'desc' } });
  res.json(queries);
});

router.post('/:id/queries', authenticateJWT, async (req: AuthRequest, res) => {
  const query = await prisma.projectQuery.create({
    data: {
      projectId: req.params.id,
      raisedBy: req.user?.id,
      assignedTo: req.body.assignedTo || null,
      queryText: req.body.queryText,
      priority: req.body.priority || 'Medium',
      status: req.body.status || 'Open',
      dueDate: parseDate(req.body.dueDate),
      response: req.body.response,
    },
  });
  await logProjectAction(req.params.id, req, 'QUERY_RAISED', query.queryText);
  res.status(201).json(query);
});

router.get('/:id/billing', authenticateJWT, async (req: AuthRequest, res) => {
  const billing = await prisma.projectBilling.findMany({ where: { projectId: req.params.id }, orderBy: { updatedAt: 'desc' } });
  res.json(billing);
});

router.post('/:id/billing', authenticateJWT, async (req: AuthRequest, res) => {
  const totalAmount = numberValue(req.body.totalAmount) || numberValue(req.body.invoiceAmount) + numberValue(req.body.taxAmount);
  const amountReceived = numberValue(req.body.amountReceived);
  const billing = await prisma.projectBilling.create({
    data: {
      projectId: req.params.id,
      invoiceNumber: req.body.invoiceNumber,
      invoiceDate: parseDate(req.body.invoiceDate),
      invoiceAmount: numberValue(req.body.invoiceAmount),
      taxAmount: numberValue(req.body.taxAmount),
      totalAmount,
      billingStatus: req.body.billingStatus || 'Invoice Raised',
      paymentDueDate: parseDate(req.body.paymentDueDate),
      amountReceived,
      paymentDate: parseDate(req.body.paymentDate),
      paymentMode: req.body.paymentMode,
      outstandingAmount: totalAmount - amountReceived,
      collectionStatus: req.body.collectionStatus || (amountReceived > 0 ? 'Partially Paid' : 'Pending'),
    },
  });
  await logProjectAction(req.params.id, req, billing.invoiceNumber ? 'INVOICE_RAISED' : 'PAYMENT_RECEIVED', billing.invoiceNumber || 'Billing updated');
  res.status(201).json(billing);
});

router.get('/:id/feedback', authenticateJWT, async (req: AuthRequest, res) => {
  const feedback = await prisma.projectFeedback.findMany({ where: { projectId: req.params.id }, orderBy: { updatedAt: 'desc' } });
  res.json(feedback);
});

router.post('/:id/feedback', authenticateJWT, async (req: AuthRequest, res) => {
  const feedback = await prisma.projectFeedback.create({
    data: {
      projectId: req.params.id,
      feedbackRating: req.body.feedbackRating ? Number(req.body.feedbackRating) : null,
      feedbackComments: req.body.feedbackComments,
      receivedFrom: req.body.receivedFrom,
      feedbackDate: parseDate(req.body.feedbackDate),
      improvementNotes: req.body.improvementNotes,
    },
  });
  await logProjectAction(req.params.id, req, 'FEEDBACK_ADDED', `Feedback from ${feedback.receivedFrom || 'client'}`);
  res.status(201).json(feedback);
});

router.get('/:id/backup', authenticateJWT, async (req: AuthRequest, res) => {
  const backup = await prisma.projectBackup.findMany({ where: { projectId: req.params.id }, orderBy: { updatedAt: 'desc' } });
  res.json(backup);
});

router.post('/:id/backup', authenticateJWT, async (req: AuthRequest, res) => {
  const backup = await prisma.projectBackup.create({
    data: {
      projectId: req.params.id,
      evidenceBackedUp: !!req.body.evidenceBackedUp,
      reportsBackedUp: !!req.body.reportsBackedUp,
      clientDocumentsBackedUp: !!req.body.clientDocumentsBackedUp,
      workingPapersBackedUp: !!req.body.workingPapersBackedUp,
      finalArchiveCompleted: !!req.body.finalArchiveCompleted,
      backupStatus: req.body.backupStatus || 'Pending',
      backupLocation: req.body.backupLocation,
      backupCompletedBy: req.body.backupCompletedBy || req.user?.id,
      backupDate: parseDate(req.body.backupDate),
      remarks: req.body.remarks,
    },
  });
  if (backup.finalArchiveCompleted) await logProjectAction(req.params.id, req, 'DATA_BACKUP_COMPLETED', 'Final archive completed');
  res.status(201).json(backup);
});

export default router;
