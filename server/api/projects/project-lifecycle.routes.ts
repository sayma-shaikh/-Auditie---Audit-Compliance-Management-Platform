import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { authenticateJWT, AuthRequest } from '../../middleware/auth.middleware.ts';
import { calculateUserPerformance } from '../../services/performance-analytics.service.ts';
import { allChecklistTemplates, checklistTemplateByName, checklistTemplateForArea, checklistTemplateOptions, workingPaperNamesForArea } from '../../data/checklist-library.ts';
import { ensureMilestoneWorkspace, getProjectMilestones, getProjectMilestoneSummary, normalizeMilestone, projectMilestoneInclude, recalculateProjectFromMilestones, refreshMilestoneProgress, seedProjectMilestones } from '../../services/review-program.service.ts';

const router = Router();
const prisma = new PrismaClient();
const evidenceRoot = path.join(process.cwd(), 'uploads', 'audit-evidence');
fs.mkdirSync(evidenceRoot, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, evidenceRoot),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomUUID()}-${file.originalname.replace(/[^\w.\-]+/g, '_')}`),
  }),
});
const rowEvidenceUpload = upload.fields([{ name: 'file', maxCount: 1 }, { name: 'files', maxCount: 100 }]);

function parseDate(value: unknown) {
  return value ? new Date(String(value)) : undefined;
}

function numberValue(value: unknown) {
  return value === undefined || value === null || value === '' ? 0 : Number(value);
}

function canManage(project: any, req: AuthRequest) {
  return req.user?.role === 'ADMIN' || project?.auditManagerId === req.user?.id;
}

function canWorkArea(area: any, req: AuthRequest) {
  return canManage(area.project, req) || area.makerUserId === req.user?.id || area.assignedUserId === req.user?.id;
}

function canReviewArea(area: any, req: AuthRequest) {
  const effectiveReviewerId = area.reviewerUserId || area.project?.auditManagerId;
  return canManage(area.project, req) || effectiveReviewerId === req.user?.id;
}

function validateMakerReviewer(makerUserId?: string | null, reviewerUserId?: string | null) {
  if (makerUserId && reviewerUserId && makerUserId === reviewerUserId) return 'Maker and reviewer cannot be the same person. Please assign a different reviewer.';
  return null;
}

async function existingUserIds(ids: Array<string | null | undefined>) {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id && id.trim().length > 0)));
  if (!uniqueIds.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  const valid = new Set(users.map((user) => user.id));
  const stale = uniqueIds.filter((id) => !valid.has(id));
  if (stale.length) console.warn(`Ignoring stale user id(s): ${stale.join(', ')}`);
  return uniqueIds.filter((id) => valid.has(id));
}

async function calculatePerformanceForExistingUsers(userIds: string[]) {
  const results = await Promise.allSettled(userIds.map((userId) => calculateUserPerformance(userId)));
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length) console.warn(`Performance refresh skipped for ${failed.length} user(s).`);
}

async function assignmentActorId(preferredUserId: string | undefined, fallbackUserIds: string[]) {
  const ids = Array.from(new Set([preferredUserId, ...fallbackUserIds].filter((id): id is string => !!id)));
  if (!ids.length) return null;
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const valid = new Set(users.map((user) => user.id));
  return (preferredUserId && valid.has(preferredUserId))
    ? preferredUserId
    : ids.find((id) => valid.has(id)) || null;
}

function parseEvidence(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function logProjectAction(projectId: string, req: AuthRequest, action: string, details?: string) {
  const user = req.user?.id ? await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }) : null;
  await prisma.projectActivityLog.create({
    data: { projectId, actor: req.user?.id || 'System', action, details, actionType: action, performedByName: user?.name || req.user?.email || 'System', message: details },
  });
}

async function logAreaActivity({
  projectId,
  areaId,
  checklistItemId,
  req,
  actionType,
  oldValue,
  newValue,
  message,
}: {
  projectId: string;
  areaId: string;
  checklistItemId?: string | null;
  req: AuthRequest;
  actionType: string;
  oldValue?: string | null;
  newValue?: string | null;
  message: string;
}) {
  const user = req.user?.id ? await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }) : null;
  await prisma.projectActivityLog.create({
    data: {
      projectId,
      auditAreaId: areaId,
      checklistItemId: checklistItemId || null,
      actor: req.user?.id || 'System',
      action: actionType,
      actionType,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
      performedByName: user?.name || req.user?.email || 'System',
      message,
      details: message,
    },
  });
}

async function logMilestoneHistory(milestone: any, req: AuthRequest, action: string, next?: any) {
  await prisma.projectMilestoneHistory.create({
    data: {
      milestoneId: milestone.id,
      action,
      oldStatus: milestone.status || null,
      newStatus: next?.status ?? milestone.status ?? null,
      oldProgress: milestone.progressPercentage ?? null,
      newProgress: next?.progressPercentage ?? milestone.progressPercentage ?? null,
      performedBy: req.user?.id || null,
    },
  });
}

function parseChecklist(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJson(value?: string | null, fallback: any = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toColumnKey(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9]+(.)/g, (_match, letter) => letter.toUpperCase()).replace(/^[A-Z]/, (letter) => letter.toLowerCase()) || `column${Date.now()}`;
}

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

  if (definition.columns?.length) {
    const columnKeys = definition.columns.map((column) => column.columnKey);
    await prisma.checklistColumn.deleteMany({
      where: { templateId: template.id, columnKey: { notIn: columnKeys } },
    });
    await Promise.all(definition.columns.map((column, index) => prisma.checklistColumn.upsert({
      where: { templateId_columnKey: { templateId: template.id, columnKey: column.columnKey } },
      update: {
        columnName: column.columnName,
        columnType: column.columnType,
        isRequired: !!column.isRequired,
        sortOrder: index,
        options: column.options ? JSON.stringify(column.options) : null,
      },
      create: {
        templateId: template.id,
        columnName: column.columnName,
        columnKey: column.columnKey,
        columnType: column.columnType,
        isRequired: !!column.isRequired,
        sortOrder: index,
        options: column.options ? JSON.stringify(column.options) : null,
      },
    })));
  }

  return prisma.checklistTemplate.findUnique({
    where: { id: template.id },
    include: { columns: { orderBy: { sortOrder: 'asc' } } },
  });
}

function normalizeTemplate(template: any) {
  if (!template) return null;
  return {
    ...template,
    validationRules: parseJson(template.validationRules, null),
    columns: (template.columns || []).map((column: any) => ({
      ...column,
      options: parseJson(column.options, null),
    })),
  };
}

function normalizeRow(row: any) {
  return {
    ...row,
    rowData: parseJson(row.rowData, {}),
    comments: row.comments || '',
  };
}

async function seedWorkingPaperRows(areaId: string, templateId: string, rows: Record<string, string>[]) {
  if (!rows.length) return 0;
  const existing = await prisma.checklistRow.count({ where: { auditAreaId: areaId, templateId } });
  if (existing) return 0;
  await prisma.checklistRow.createMany({
    data: rows.map((rowData, index) => ({
      auditAreaId: areaId,
      templateId,
      rowData: JSON.stringify(rowData),
      status: rowData.status || 'Pending',
      observation: rowData.auditorObservation || '',
      sortOrder: index,
    })),
  });
  return rows.length;
}

async function generateMappedWorkingPapers(area: any) {
  const paperNames = workingPaperNamesForArea(area.areaName || '');
  if (!paperNames.length) {
    const definition = checklistTemplateForArea(area.areaName);
    const template = await syncChecklistTemplate(definition);
    if (!template) return { createdPapers: 0, createdRows: 0 };
    const createdRows = await seedWorkingPaperRows(area.id, template.id, definition.seedRows || []);
    await prisma.projectAreaAllocation.update({
      where: { id: area.id },
      data: { checklistType: definition.type, checklistTemplateId: template.id, workpaperKind: 'WORKING_PAPER' },
    });
    return { createdPapers: 0, createdRows };
  }

  let primaryTemplateId: string | null = null;
  let createdRows = 0;
  for (const paperName of paperNames) {
    const definition = checklistTemplateByName(paperName) || checklistTemplateForArea(paperName);
    const template = await syncChecklistTemplate(definition);
    if (!template) continue;
    if (!primaryTemplateId) primaryTemplateId = template.id;
    createdRows += await seedWorkingPaperRows(area.id, template.id, definition.seedRows || []);
  }
  await prisma.projectAreaAllocation.update({
    where: { id: area.id },
    data: {
      checklistType: 'TABLE_CHECKLIST',
      checklistTemplateId: primaryTemplateId,
      workpaperKind: 'WORKING_PAPER',
      parentAreaId: null,
      checklistSnapshot: JSON.stringify([]),
    },
  });
  return { createdPapers: paperNames.length, createdRows };
}

function hasUserEnteredChecklistWork(rows: any[]) {
  return rows.some((row) => {
    const evidence = Array.isArray(row.evidence) ? row.evidence : [];
    return row.status !== 'Pending' || !!row.comments || !!row.observation || !!row.evidenceLink || evidence.length > 0;
  });
}

async function replaceGeneratedWorkingPapers(area: any) {
  const rows = await prisma.checklistRow.findMany({
    where: {
      OR: [
        { auditAreaId: area.id },
        { auditArea: { parentAreaId: area.id } },
      ],
    },
    include: { evidence: true },
  });
  if (hasUserEnteredChecklistWork(rows)) {
    const error = new Error('This area already contains checklist responses or evidence. Clear or export the existing work before changing its checklist area.');
    (error as any).code = 'CHECKLIST_WORK_EXISTS';
    throw error;
  }
  await prisma.checklistRow.deleteMany({
    where: {
      OR: [
        { auditAreaId: area.id },
        { auditArea: { parentAreaId: area.id } },
      ],
    },
  });
  await prisma.projectAreaAllocation.deleteMany({ where: { parentAreaId: area.id } });
  return generateMappedWorkingPapers(area);
}

function statusForLegacy(workStatus: string, reviewStatus: string) {
  if (reviewStatus === 'APPROVED') return 'Approved';
  if (reviewStatus === 'REWORK_REQUIRED') return 'Rework Required';
  if (workStatus === 'SUBMITTED') return 'Submitted For Review';
  if (workStatus === 'IN_PROGRESS') return 'In Progress';
  return 'Not Started';
}

function isMaker(area: any, req: AuthRequest) {
  return !!req.user?.id && (area.makerUserId || area.assignedUserId) === req.user.id;
}

function isReviewer(area: any, req: AuthRequest) {
  const effectiveReviewerId = area.reviewerUserId || area.project?.auditManagerId;
  return !!req.user?.id && effectiveReviewerId === req.user.id && (area.makerUserId || area.assignedUserId) !== req.user.id;
}

function itemLabel(item: any) {
  return item?.text || 'Checklist item';
}

async function userName(userId?: string | null) {
  if (!userId) return 'Unassigned';
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name || 'Unassigned';
}

async function recalculateProject(projectId: string) {
  const milestoneProject = await recalculateProjectFromMilestones(prisma, projectId);
  if (milestoneProject) return;

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
  await prisma.project.update({
    where: { id: projectId },
    data: {
      progressPercentage: progress,
      currentStage: activeStage?.stageName,
      status: progress >= 100 ? 'COMPLETED' : 'ACTIVE',
    },
  });
}

async function stageGate(stage: any, nextStatus?: string) {
  if (!nextStatus || nextStatus !== 'In Progress') return null;
  const stages = await prisma.projectStage.findMany({ where: { projectId: stage.projectId } });
  const completed = (name: string) => stages.some((item) => item.stageName === name && item.status === 'Completed');

  if (stage.stageName === 'Final Reporting' && !completed('Draft Reporting')) return 'Project cannot move to Final Reporting until Draft Reporting is completed.';
  if (stage.stageName === 'Billing' && !completed('Final Reporting')) return 'Project cannot move to Billing until Final Reporting is completed.';
  if (stage.stageName === 'Collection') {
    const invoice = await prisma.projectBilling.findFirst({
      where: { projectId: stage.projectId, billingStatus: { in: ['Invoice Raised', 'Partially Paid', 'Paid', 'Overdue'] } },
    });
    if (!invoice) return 'Project cannot move to Collection until invoice is raised.';
  }
  if (stage.stageName === 'Data Backup' && !completed('Client Feedback')) return 'Project cannot move to Data Backup until Client Feedback is completed.';
  return null;
}

function baseAreaName(area: any) {
  const name = area.parentArea?.areaName || area.areaName || 'Audit';
  if (name.toLowerCase().startsWith('application')) return 'Application';
  return name.split(' ')[0];
}

async function syncRegisterRows(projectId: string, baseArea: string) {
  const observations = await prisma.observation.findMany({
    where: { projectId, department: baseArea },
    include: { auditArea: true, capa: true },
    orderBy: { createdAt: 'asc' },
  });
  const [observationRegister, capaRegister] = await Promise.all([
    prisma.projectAreaAllocation.findFirst({ where: { projectId, areaName: `${baseArea} Observation Register` } }),
    prisma.projectAreaAllocation.findFirst({ where: { projectId, areaName: `${baseArea} CAPA Register` } }),
  ]);
  const parentArea = await prisma.projectAreaAllocation.findFirst({
    where: {
      projectId,
      parentAreaId: null,
      OR: [
        { areaName: baseArea },
        { areaName: { startsWith: baseArea } },
      ],
    },
  });
  const observationTemplate = checklistTemplateByName(`${baseArea} Observation Register`);
  const capaTemplate = checklistTemplateByName(`${baseArea} CAPA Register`);
  const effectiveObservationTarget = observationRegister || parentArea;
  const effectiveCapaTarget = capaRegister || parentArea;
  const effectiveObservationTemplate = observationRegister?.checklistTemplateId
    ? { id: observationRegister.checklistTemplateId }
    : observationTemplate ? await syncChecklistTemplate(observationTemplate) : null;
  const effectiveCapaTemplate = capaRegister?.checklistTemplateId
    ? { id: capaRegister.checklistTemplateId }
    : capaTemplate ? await syncChecklistTemplate(capaTemplate) : null;
  if (effectiveObservationTarget?.id && effectiveObservationTemplate?.id) {
    await prisma.checklistRow.deleteMany({ where: { auditAreaId: effectiveObservationTarget.id, templateId: effectiveObservationTemplate.id } });
    await prisma.checklistRow.createMany({
      data: observations.map((observation, index) => ({
        auditAreaId: effectiveObservationTarget.id,
        templateId: effectiveObservationTemplate.id,
        rowData: JSON.stringify({
          isoClause: observation.isoClause || '',
          department: observation.department || '',
          auditArea: observation.auditArea.areaName,
          controlArea: observation.controlArea || '',
          observationDescription: observation.description,
          evidenceReference: observation.evidenceReference || '',
          auditorName: observation.auditorName || '',
          reviewStatus: observation.reviewed ? 'Reviewed' : observation.status,
        }),
        status: observation.reviewed ? 'Compliant' : 'Pending',
        sortOrder: index,
      })),
    });
  }
  if (effectiveCapaTarget?.id && effectiveCapaTemplate?.id) {
    const capas = observations.map((observation) => observation.capa).filter(Boolean) as any[];
    await prisma.checklistRow.deleteMany({ where: { auditAreaId: effectiveCapaTarget.id, templateId: effectiveCapaTemplate.id } });
    await prisma.checklistRow.createMany({
      data: capas.map((capa, index) => ({
        auditAreaId: effectiveCapaTarget.id,
        templateId: effectiveCapaTemplate.id,
        rowData: JSON.stringify({
          riskRating: capa.riskRating || '',
          rootCause: capa.rootCause || '',
          correctiveAction: capa.correctiveAction || '',
          preventiveAction: capa.preventiveAction || '',
          targetDate: capa.targetDate ? capa.targetDate.toISOString().slice(0, 10) : '',
          closureEvidence: capa.closureEvidence || '',
          verification: capa.verification || '',
          closureStatus: capa.closureStatus || 'Open',
        }),
        status: capa.closureStatus === 'Closed' ? 'Compliant' : 'Pending',
        sortOrder: index,
      })),
    });
  }
}

router.put('/project-areas/:areaId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({
      where: { id: req.params.areaId },
      include: { project: true },
    });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!canWorkArea(area, req) && !canReviewArea(area, req)) return res.status(403).json({ message: 'Access denied' });
    if ((req.body.checklistSnapshot !== undefined || req.body.evidenceRecords !== undefined) && !isMaker(area, req)) {
      return res.status(403).json({ message: 'Only the assigned maker can edit checklist responses or evidence.' });
    }
    if ((req.body.checklistSnapshot !== undefined || req.body.evidenceRecords !== undefined) && area.workStatus === 'SUBMITTED' && area.reviewStatus !== 'REWORK_REQUIRED') {
      return res.status(400).json({ message: 'Audit area is submitted and locked until rework is requested.' });
    }

    const nextMakerId = req.body.makerUserId ?? req.body.assignedUserId ?? area.makerUserId ?? area.assignedUserId;
    const nextReviewerOverrideId = req.body.reviewerUserId !== undefined ? (req.body.reviewerUserId || null) : area.reviewerUserId;
    const effectiveReviewerId = nextReviewerOverrideId || area.project.auditManagerId || null;
    const makerReviewerError = validateMakerReviewer(nextMakerId, effectiveReviewerId);
    if (makerReviewerError) return res.status(400).json({ message: makerReviewerError });

    const affectedUserIds = await existingUserIds([area.assignedUserId, area.makerUserId, area.reviewerUserId, area.project.auditManagerId, nextMakerId, nextReviewerOverrideId]);
    const reviewerChanged = nextReviewerOverrideId !== area.reviewerUserId;
    const oldReviewerName = reviewerChanged ? (area.reviewerUserId ? await userName(area.reviewerUserId) : 'Default Audit Manager') : '';
    const newReviewerName = reviewerChanged ? (nextReviewerOverrideId ? await userName(nextReviewerOverrideId) : 'Default Audit Manager') : '';

    const nextAreaName = req.body.areaName ?? area.areaName;
    const areaNameChanged = req.body.areaName !== undefined && nextAreaName !== area.areaName;
    const shouldRegenerateWorkingPapers = areaNameChanged || !!req.body.regenerateWorkingPapers;

    let updated = await prisma.projectAreaAllocation.update({
      where: { id: area.id },
      data: {
        areaName: nextAreaName,
        assignedUserId: req.body.assignedUserId ?? req.body.makerUserId ?? area.assignedUserId,
        makerUserId: req.body.makerUserId ?? req.body.assignedUserId ?? area.makerUserId,
        reviewerUserId: nextReviewerOverrideId,
        checklistType: req.body.checklistType ?? area.checklistType,
        status: req.body.status ?? area.status,
        workStatus: req.body.workStatus ?? area.workStatus,
        reviewStatus: req.body.reviewStatus ?? area.reviewStatus,
        remarks: req.body.remarks ?? area.remarks,
        dueDate: req.body.dueDate !== undefined ? parseDate(req.body.dueDate) : area.dueDate,
        checklistSnapshot: req.body.checklistSnapshot !== undefined
          ? (typeof req.body.checklistSnapshot === 'string' ? req.body.checklistSnapshot : JSON.stringify(req.body.checklistSnapshot))
          : area.checklistSnapshot,
        evidenceRecords: req.body.evidenceRecords !== undefined
          ? (typeof req.body.evidenceRecords === 'string' ? req.body.evidenceRecords : JSON.stringify(req.body.evidenceRecords))
          : area.evidenceRecords,
      },
    });
    if (shouldRegenerateWorkingPapers) {
      await replaceGeneratedWorkingPapers(updated);
      updated = await prisma.projectAreaAllocation.findUnique({ where: { id: area.id } }) || updated;
    }
    if (reviewerChanged) {
      await logAreaActivity({
        projectId: area.projectId,
        areaId: area.id,
        req,
        actionType: 'REVIEWER_CHANGED',
        oldValue: area.reviewerUserId || null,
        newValue: nextReviewerOverrideId || null,
        message: `Reviewer for ${updated.areaName} changed from ${oldReviewerName} to ${newReviewerName}.`,
      });
    } else {
      await logProjectAction(area.projectId, req, req.body.checklistSnapshot !== undefined ? 'Checklist Updated' : 'Task Reassigned', `${updated.areaName} updated to ${updated.status}`);
    }
    const assignedById = await assignmentActorId(req.user?.id, affectedUserIds);
    if (affectedUserIds.length && !assignedById) return res.status(400).json({ message: 'No valid user available to record this assignment.' });

    await Promise.all(affectedUserIds.map((userId) =>
      prisma.userProject.upsert({
        where: { userId_projectId: { userId, projectId: area.projectId } },
        update: {},
        create: { userId, projectId: area.projectId, assignedById: assignedById!, projectRole: userId === effectiveReviewerId ? 'Reviewer' : 'Team Member' },
      })
    ));
    await recalculateProject(area.projectId);
    await calculatePerformanceForExistingUsers(affectedUserIds);
    res.json(updated);
  } catch (err) {
    if ((err as any)?.code === 'CHECKLIST_WORK_EXISTS') {
      return res.status(409).json({ message: (err as Error).message });
    }
    console.error('Area update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/project-areas/:areaId', authenticateJWT, async (req: AuthRequest, res) => {
  const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true } });
  if (!area) return res.status(404).json({ message: 'Area allocation not found' });
  if (!canManage(area.project, req)) return res.status(403).json({ message: 'Access denied' });
  await prisma.projectAreaAllocation.delete({ where: { id: area.id } });
  await recalculateProject(area.projectId);
  await calculatePerformanceForExistingUsers(await existingUserIds([area.assignedUserId, area.makerUserId, area.reviewerUserId, area.project.auditManagerId]));
  res.json({ ok: true });
});

router.put('/project-areas/:areaId/checklist/:itemId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true } });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!isMaker(area, req)) return res.status(403).json({ message: 'Only the assigned maker can edit this checklist.' });
    if (area.reviewStatus === 'APPROVED') return res.status(400).json({ message: 'Approved checklist is locked.' });
    if (area.workStatus === 'SUBMITTED' && area.reviewStatus !== 'REWORK_REQUIRED') return res.status(400).json({ message: 'Checklist is submitted and locked until reviewer requests rework.' });

    const checklist = parseChecklist(area.checklistSnapshot);
    const index = checklist.findIndex((item: any) => item.id === req.params.itemId);
    if (index === -1) return res.status(404).json({ message: 'Checklist item not found' });

    const oldItem = checklist[index];
    const nextItem = {
      ...oldItem,
      status: req.body.status ?? oldItem.status,
      observation: req.body.observation ?? oldItem.observation ?? '',
      auditorRemarks: req.body.auditorRemarks ?? oldItem.auditorRemarks ?? '',
    };
    checklist[index] = nextItem;

    const reopenedFromRework = area.reviewStatus === 'REWORK_REQUIRED' && area.workStatus !== 'IN_PROGRESS';
    const updated = await prisma.projectAreaAllocation.update({
      where: { id: area.id },
      data: {
        checklistSnapshot: JSON.stringify(checklist),
        workStatus: 'IN_PROGRESS',
        reviewStatus: area.reviewStatus === 'REWORK_REQUIRED' ? 'REWORK_REQUIRED' : 'NOT_REVIEWED',
        status: statusForLegacy('IN_PROGRESS', area.reviewStatus === 'REWORK_REQUIRED' ? 'REWORK_REQUIRED' : 'NOT_REVIEWED'),
      },
    });

    const actorUser = req.user?.id ? await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }) : null;
    const actor = actorUser?.name || req.user?.email || 'User';
    if (oldItem.status !== nextItem.status) {
      await logAreaActivity({
        projectId: area.projectId,
        areaId: area.id,
        checklistItemId: nextItem.id,
        req,
        actionType: 'CHECKLIST_STATUS_UPDATED',
        oldValue: oldItem.status,
        newValue: nextItem.status,
        message: `${actor} updated checklist item '${itemLabel(nextItem)}' to ${nextItem.status}.`,
      });
    }
    if ((oldItem.observation || '') !== (nextItem.observation || '')) {
      await logAreaActivity({
        projectId: area.projectId,
        areaId: area.id,
        checklistItemId: nextItem.id,
        req,
        actionType: 'OBSERVATION_UPDATED',
        oldValue: oldItem.observation || '',
        newValue: nextItem.observation || '',
        message: `${actor} added observation for '${itemLabel(nextItem)}'.`,
      });
    }
    if ((oldItem.auditorRemarks || '') !== (nextItem.auditorRemarks || '')) {
      await logAreaActivity({
        projectId: area.projectId,
        areaId: area.id,
        checklistItemId: nextItem.id,
        req,
        actionType: 'REMARKS_UPDATED',
        oldValue: oldItem.auditorRemarks || '',
        newValue: nextItem.auditorRemarks || '',
        message: `${actor} added remarks for '${itemLabel(nextItem)}'.`,
      });
    }
    if (reopenedFromRework) {
      await logAreaActivity({
        projectId: area.projectId,
        areaId: area.id,
        req,
        actionType: 'TASK_REOPENED_AFTER_REWORK',
        oldValue: area.workStatus,
        newValue: 'IN_PROGRESS',
        message: `${actor} reopened ${area.areaName} after rework.`,
      });
    }
    await logAreaActivity({
      projectId: area.projectId,
      areaId: area.id,
      checklistItemId: nextItem.id,
      req,
      actionType: 'CHECKLIST_SAVED',
      message: `${actor} saved checklist item '${itemLabel(nextItem)}'.`,
    });

    res.json(updated);
  } catch (err) {
    console.error('Checklist item save error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/project-areas/:areaId/activity', authenticateJWT, async (req: AuthRequest, res) => {
  const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true } });
  if (!area) return res.status(404).json({ message: 'Area allocation not found' });
  if (!canManage(area.project, req) && !isMaker(area, req) && !isReviewer(area, req)) return res.status(403).json({ message: 'Access denied' });
  const logs = await prisma.projectActivityLog.findMany({
    where: { auditAreaId: area.id },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });
  res.json(logs);
});

router.get('/checklist-templates', authenticateJWT, async (_req: AuthRequest, res) => {
  try {
    const definitions = allChecklistTemplates();
    const synced = await Promise.all(definitions.map((definition) => syncChecklistTemplate(definition)));
    res.json(synced.map(normalizeTemplate));
  } catch (err) {
    console.error('Checklist template list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/checklist-template-options', authenticateJWT, async (_req: AuthRequest, res) => {
  res.json(checklistTemplateOptions());
});

router.get('/projects/:projectId/milestones', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    let milestones = await getProjectMilestones(prisma, project.id);
    if (!milestones.length) {
      await seedProjectMilestones(prisma, project.id, project.auditManagerId || null);
      milestones = await getProjectMilestones(prisma, project.id);
      await recalculateProject(project.id);
    }
    res.json(milestones);
  } catch (err) {
    console.error('Milestone list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/milestones/:milestoneId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: req.params.milestoneId },
      include: { ...projectMilestoneInclude, project: true },
    });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    res.json(normalizeMilestone(milestone));
  } catch (err) {
    console.error('Milestone detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/projects/:projectId/milestones/seed', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canManage(project, req)) return res.status(403).json({ message: 'Only Admin or Audit Manager can seed milestones.' });
    const result = await seedProjectMilestones(prisma, project.id, project.auditManagerId || null);
    await logProjectAction(project.id, req, 'MILESTONES_SEEDED', `Review Program milestones seeded. Created: ${result.seeded}.`);
    await recalculateProject(project.id);
    res.status(result.seeded ? 201 : 200).json({ ...result, milestones: await getProjectMilestones(prisma, project.id) });
  } catch (err) {
    console.error('Milestone seed error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/projects/:projectId/milestone-summary', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    let summary = await getProjectMilestoneSummary(prisma, project.id);
    if (!summary.totalMilestones) {
      await seedProjectMilestones(prisma, project.id, project.auditManagerId || null);
      summary = await getProjectMilestoneSummary(prisma, project.id);
      await recalculateProject(project.id);
    }
    res.json(summary);
  } catch (err) {
    console.error('Milestone summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

async function getMilestoneForAccess(milestoneId: string, req: AuthRequest) {
  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
    include: { project: true, owner: { select: { id: true, name: true, email: true, role: true } } },
  });
  if (!milestone) return null;
  if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) throw new Error('ACCESS_DENIED');
  await ensureMilestoneWorkspace(prisma, milestone);
  return prisma.projectMilestone.findUnique({
    where: { id: milestone.id },
    include: { ...projectMilestoneInclude, project: true },
  });
}

async function workspacePayload(milestone: any) {
  const workspaceType = milestone.workspaceType;
  if (workspaceType === 'PLANNING_WORKSPACE') return prisma.planningWorkspace.findUnique({ where: { milestoneId: milestone.id } });
  if (workspaceType === 'PROJECT_MANAGEMENT_WORKSPACE') return prisma.projectManagementWorkspace.findUnique({ where: { milestoneId: milestone.id } });
  if (['MEETING_WORKSPACE', 'CLOSING_MEETING_WORKSPACE', 'COMMITTEE_MEETING_WORKSPACE'].includes(workspaceType)) return prisma.meetingWorkspace.findUnique({ where: { milestoneId: milestone.id } });
  if (workspaceType === 'AREA_CHECKLIST_WORKSPACE') {
    const workspace = await prisma.areaChecklistWorkspace.findUnique({ where: { milestoneId: milestone.id } });
    const areas = await prisma.projectAreaAllocation.findMany({
      where: { projectId: milestone.projectId, parentAreaId: null },
      orderBy: { areaName: 'asc' },
    });
    return { ...workspace, areas };
  }
  if (workspaceType === 'DATA_REQUEST_WORKSPACE') return prisma.dataRequest.findMany({ where: { milestoneId: milestone.id }, orderBy: { createdAt: 'desc' } });
  if (workspaceType === 'PROCESS_WALKTHROUGH_WORKSPACE') return prisma.processWalkthrough.findMany({ where: { milestoneId: milestone.id }, orderBy: { createdAt: 'desc' } });
  if (workspaceType === 'RCM_WORKSPACE') return prisma.riskControlMatrixItem.findMany({ where: { milestoneId: milestone.id }, orderBy: { createdAt: 'desc' } });
  if (workspaceType === 'SAMPLING_WORKSPACE') return prisma.samplingItem.findMany({ where: { milestoneId: milestone.id }, orderBy: { createdAt: 'desc' } });
  if (workspaceType === 'EXECUTION_WORKSPACE') {
    return prisma.projectAreaAllocation.findMany({
      where: { projectId: milestone.projectId, parentAreaId: null },
      include: { observations: { include: { capa: true } } },
      orderBy: { areaName: 'asc' },
    });
  }
  if (workspaceType === 'WEEKLY_STATUS_WORKSPACE') return prisma.weeklyStatusUpdate.findMany({ where: { milestoneId: milestone.id }, orderBy: { weekStartDate: 'desc' } });
  if (workspaceType === 'INTERIM_REVIEW_WORKSPACE') return prisma.interimReview.findMany({ where: { milestoneId: milestone.id }, orderBy: { createdAt: 'desc' } });
  if (workspaceType === 'QUERY_WORKSPACE') return prisma.projectQuery.findMany({ where: { projectId: milestone.projectId }, orderBy: { createdAt: 'desc' } });
  if (workspaceType === 'REPORT_WORKSPACE') return prisma.reportVersion.findMany({ where: { milestoneId: milestone.id }, orderBy: { uploadedAt: 'desc' } });
  if (workspaceType === 'REPORT_REVIEW_WORKSPACE') return prisma.reportReviewComment.findMany({ where: { milestoneId: milestone.id }, orderBy: { createdAt: 'desc' } });
  if (workspaceType === 'REPORT_SUBMISSION_WORKSPACE') return prisma.reportSubmission.findMany({ where: { milestoneId: milestone.id }, orderBy: { createdAt: 'desc' } });
  return null;
}

async function sendMilestoneDetail(milestoneId: string, req: AuthRequest, res: any) {
  const milestone = await getMilestoneForAccess(milestoneId, req);
  if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
  const refreshed = await refreshMilestoneProgress(prisma, milestone);
  const latest = await prisma.projectMilestone.findUnique({ where: { id: milestone.id }, include: { ...projectMilestoneInclude, project: true } });
  res.json({ milestone: normalizeMilestone(latest || refreshed), workspace: await workspacePayload(latest || refreshed) });
}

router.get('/project-milestones/:milestoneId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    await sendMilestoneDetail(req.params.milestoneId, req, res);
  } catch (err: any) {
    if (err.message === 'ACCESS_DENIED') return res.status(403).json({ message: 'Access denied' });
    console.error('Project milestone detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

async function updateSingletonWorkspace(req: AuthRequest, res: any, modelName: 'planningWorkspace' | 'projectManagementWorkspace' | 'meetingWorkspace' | 'areaChecklistWorkspace') {
  try {
    const milestone = await getMilestoneForAccess(req.params.milestoneId, req);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    const data = { ...req.body };
    delete data.id; delete data.projectId; delete data.milestoneId; delete data.createdAt; delete data.updatedAt;
    if (data.meetingDate !== undefined) data.meetingDate = parseDate(data.meetingDate) || null;
    const updated = await (prisma as any)[modelName].update({ where: { milestoneId: milestone.id }, data });
    await refreshMilestoneProgress(prisma, milestone);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_WORKSPACE_UPDATED', `${milestone.milestoneName} workspace updated.`);
    res.json(updated);
  } catch (err: any) {
    if (err.message === 'ACCESS_DENIED') return res.status(403).json({ message: 'Access denied' });
    console.error('Workspace update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

router.patch('/milestone-workspaces/planning/:milestoneId', authenticateJWT, (req: AuthRequest, res) => updateSingletonWorkspace(req, res, 'planningWorkspace'));
router.patch('/milestone-workspaces/project-management/:milestoneId', authenticateJWT, (req: AuthRequest, res) => updateSingletonWorkspace(req, res, 'projectManagementWorkspace'));
router.patch('/milestone-workspaces/meeting/:milestoneId', authenticateJWT, (req: AuthRequest, res) => updateSingletonWorkspace(req, res, 'meetingWorkspace'));
router.patch('/milestone-workspaces/area-checklist/:milestoneId', authenticateJWT, (req: AuthRequest, res) => updateSingletonWorkspace(req, res, 'areaChecklistWorkspace'));

function trackerConfig(type: string) {
  const configs: Record<string, any> = {
    'data-requests': { model: 'dataRequest', required: ['requestTitle'], dates: ['dueDate', 'closedAt'] },
    walkthroughs: { model: 'processWalkthrough', required: ['processName'], dates: ['walkthroughDate'] },
    rcm: { model: 'riskControlMatrixItem', required: ['processArea', 'riskDescription', 'controlDescription'], dates: [] },
    sampling: { model: 'samplingItem', required: ['populationName'], dates: [] },
    weekly: { model: 'weeklyStatusUpdate', required: ['weekStartDate', 'summary'], dates: ['weekStartDate'] },
    interim: { model: 'interimReview', required: [], dates: ['reviewDate'] },
    reports: { model: 'reportVersion', required: ['reportType', 'version'], dates: ['uploadedAt'] },
    'report-reviews': { model: 'reportReviewComment', required: ['comment'], dates: ['resolvedAt'] },
    submissions: { model: 'reportSubmission', required: [], dates: ['submittedDate'] },
  };
  return configs[type];
}

function sanitizeTrackerData(body: any, config: any) {
  const data = { ...body };
  delete data.id; delete data.projectId; delete data.milestoneId; delete data.createdAt; delete data.updatedAt;
  for (const field of config.dates) if (data[field] !== undefined) data[field] = parseDate(data[field]) || null;
  if (data.populationSize !== undefined) data.populationSize = data.populationSize === '' ? null : Number(data.populationSize);
  if (data.sampleSize !== undefined) data.sampleSize = data.sampleSize === '' ? null : Number(data.sampleSize);
  if (data.gapsIdentified !== undefined) data.gapsIdentified = Number(data.gapsIdentified) || 0;
  if (data.openPoints !== undefined) data.openPoints = Number(data.openPoints) || 0;
  if (data.resolvedPoints !== undefined) data.resolvedPoints = Number(data.resolvedPoints) || 0;
  if (data.selectedSamples !== undefined && typeof data.selectedSamples !== 'string') data.selectedSamples = JSON.stringify(data.selectedSamples || []);
  return data;
}

router.post('/milestone-workspaces/:type/:milestoneId/items', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const config = trackerConfig(req.params.type);
    if (!config) return res.status(404).json({ message: 'Workspace type not found' });
    const milestone = await getMilestoneForAccess(req.params.milestoneId, req);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    const data = sanitizeTrackerData(req.body, config);
    for (const field of config.required) if (!data[field]) return res.status(400).json({ message: `${field} is required.` });
    const item = await (prisma as any)[config.model].create({
      data: { ...data, projectId: milestone.projectId, milestoneId: milestone.id, createdBy: config.model === 'dataRequest' ? req.user?.id || null : data.createdBy, submittedBy: config.model === 'weeklyStatusUpdate' ? req.user?.id || null : data.submittedBy, uploadedBy: config.model === 'reportVersion' ? req.user?.id || null : data.uploadedBy },
    });
    await refreshMilestoneProgress(prisma, milestone);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_WORKSPACE_ITEM_CREATED', `${milestone.milestoneName} workspace item created.`);
    res.status(201).json(item);
  } catch (err: any) {
    if (err.message === 'ACCESS_DENIED') return res.status(403).json({ message: 'Access denied' });
    console.error('Workspace item create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/milestone-workspace-items/:type/:itemId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const config = trackerConfig(req.params.type);
    if (!config) return res.status(404).json({ message: 'Workspace type not found' });
    const current = await (prisma as any)[config.model].findUnique({ where: { id: req.params.itemId }, include: { milestone: { include: { project: true } } } });
    if (!current) return res.status(404).json({ message: 'Workspace item not found' });
    if (!canManage(current.milestone.project, req) && current.milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    const item = await (prisma as any)[config.model].update({ where: { id: current.id }, data: sanitizeTrackerData(req.body, config) });
    await refreshMilestoneProgress(prisma, current.milestone);
    await logProjectAction(current.projectId, req, 'MILESTONE_WORKSPACE_ITEM_UPDATED', `${current.milestone.milestoneName} workspace item updated.`);
    res.json(item);
  } catch (err) {
    console.error('Workspace item update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/milestone-workspace-items/:type/:itemId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const config = trackerConfig(req.params.type);
    if (!config) return res.status(404).json({ message: 'Workspace type not found' });
    const current = await (prisma as any)[config.model].findUnique({ where: { id: req.params.itemId }, include: { milestone: { include: { project: true } } } });
    if (!current) return res.status(404).json({ message: 'Workspace item not found' });
    if (!canManage(current.milestone.project, req) && current.milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    await (prisma as any)[config.model].delete({ where: { id: current.id } });
    await refreshMilestoneProgress(prisma, current.milestone);
    await logProjectAction(current.projectId, req, 'MILESTONE_WORKSPACE_ITEM_DELETED', `${current.milestone.milestoneName} workspace item deleted.`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Workspace item delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

function milestoneUpdateData(body: any, current: any = {}) {
  const data: any = {};
  if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
  if (body.status !== undefined) data.status = String(body.status || 'PENDING').toUpperCase();
  if (body.targetDate !== undefined) data.targetDate = parseDate(body.targetDate) || null;
  if (body.startedAt !== undefined) data.startedAt = parseDate(body.startedAt) || null;
  if (body.completedAt !== undefined) data.completedAt = parseDate(body.completedAt) || null;
  if (body.progressPercentage !== undefined && body.allowManualProgress === true) {
    const progress = Number(body.progressPercentage);
    if (Number.isNaN(progress) || progress < 0 || progress > 100) throw new Error('Progress must be between 0 and 100.');
    data.progressPercentage = Math.round(progress);
  }
  if (body.remarks !== undefined) data.remarks = body.remarks || null;

  const nextStatus = data.status || current.status;
  if (nextStatus === 'COMPLETED') {
    data.progressPercentage = 100;
    if (data.completedAt === undefined) data.completedAt = current.completedAt || new Date();
    if (data.startedAt === undefined && !current.startedAt) data.startedAt = new Date();
  }
  if (nextStatus === 'IN_PROGRESS' && data.startedAt === undefined && !current.startedAt) {
    data.startedAt = new Date();
  }
  if (nextStatus === 'IN_PROGRESS' && data.progressPercentage === undefined && !current.progressPercentage) {
    data.progressPercentage = 50;
  }
  if (nextStatus === 'PENDING' && body.completedAt === undefined) {
    data.completedAt = null;
    if (data.progressPercentage === undefined) data.progressPercentage = 0;
  }
  return data;
}

router.put('/project-milestones/:milestoneId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: req.params.milestoneId },
      include: { project: true },
    });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    const data = milestoneUpdateData(req.body, milestone);
    const updated = await prisma.projectMilestone.update({
      where: { id: milestone.id },
      data,
      include: projectMilestoneInclude,
    });
    const action = data.ownerId !== undefined && data.ownerId !== milestone.ownerId ? 'OWNER_CHANGED'
      : data.status !== undefined && data.status !== milestone.status ? 'STATUS_CHANGED'
      : data.progressPercentage !== undefined && data.progressPercentage !== milestone.progressPercentage ? 'PROGRESS_UPDATED'
      : 'MILESTONE_UPDATED';
    await logMilestoneHistory(milestone, req, action, updated);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_UPDATED', `${milestone.milestoneName} updated.`);
    await refreshMilestoneProgress(prisma, updated);
    await recalculateProject(milestone.projectId);
    const latest = await prisma.projectMilestone.findUnique({ where: { id: milestone.id }, include: projectMilestoneInclude });
    res.json(normalizeMilestone(latest || updated));
  } catch (err: any) {
    console.error('Milestone update error:', err);
    res.status(err.message?.includes('Progress must') ? 400 : 500).json({ message: err.message || 'Server error' });
  }
});

router.patch('/project-milestones/:milestoneId', authenticateJWT, async (req: AuthRequest, res) => {
  req.url = `/project-milestones/${req.params.milestoneId}`;
  req.method = 'PUT';
  (router as any).handle(req, res);
});

router.patch('/milestones/:milestoneId', authenticateJWT, async (req: AuthRequest, res) => {
  req.url = `/project-milestones/${req.params.milestoneId}`;
  req.method = 'PUT';
  (router as any).handle(req, res);
});

router.post('/project-milestones/:milestoneId/start', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    const updated = await prisma.projectMilestone.update({
      where: { id: milestone.id },
      data: { status: 'IN_PROGRESS', startedAt: milestone.startedAt || new Date(), progressPercentage: Math.max(50, milestone.progressPercentage || 50), completedAt: null },
      include: projectMilestoneInclude,
    });
    await logMilestoneHistory(milestone, req, 'MILESTONE_STARTED', updated);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_STARTED', `${milestone.milestoneName} started.`);
    await recalculateProject(milestone.projectId);
    res.json(normalizeMilestone(updated));
  } catch (err) {
    console.error('Milestone start error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-milestones/:milestoneId/complete', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    const updated = await prisma.projectMilestone.update({
      where: { id: milestone.id },
      data: { status: 'COMPLETED', startedAt: milestone.startedAt || new Date(), completedAt: new Date(), progressPercentage: 100 },
      include: projectMilestoneInclude,
    });
    await logMilestoneHistory(milestone, req, 'MILESTONE_COMPLETED', updated);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_COMPLETED', `${milestone.milestoneName} completed.`);
    await recalculateProject(milestone.projectId);
    res.json(normalizeMilestone(updated));
  } catch (err) {
    console.error('Milestone complete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-milestones/:milestoneId/reopen', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    const nextStatus = req.body?.status === 'PENDING' ? 'PENDING' : 'IN_PROGRESS';
    const updated = await prisma.projectMilestone.update({
      where: { id: milestone.id },
      data: { status: nextStatus, completedAt: null, progressPercentage: nextStatus === 'PENDING' ? 0 : Math.min(Math.max(milestone.progressPercentage || 50, 50), 99) },
      include: projectMilestoneInclude,
    });
    await logMilestoneHistory(milestone, req, 'MILESTONE_REOPENED', updated);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_REOPENED', `${milestone.milestoneName} reopened.`);
    await recalculateProject(milestone.projectId);
    res.json(normalizeMilestone(updated));
  } catch (err) {
    console.error('Milestone reopen error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-milestones/:milestoneId/pause', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    const updated = await prisma.projectMilestone.update({
      where: { id: milestone.id },
      data: { status: 'BLOCKED' },
      include: projectMilestoneInclude,
    });
    await logMilestoneHistory(milestone, req, 'MILESTONE_PAUSED', updated);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_PAUSED', `${milestone.milestoneName} paused.`);
    await recalculateProject(milestone.projectId);
    res.json(normalizeMilestone(updated));
  } catch (err) {
    console.error('Milestone pause error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-milestones/:milestoneId/resume', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    const updated = await prisma.projectMilestone.update({
      where: { id: milestone.id },
      data: { status: 'IN_PROGRESS', startedAt: milestone.startedAt || new Date(), progressPercentage: Math.max(milestone.progressPercentage || 50, 50) },
      include: projectMilestoneInclude,
    });
    await logMilestoneHistory(milestone, req, 'MILESTONE_RESUMED', updated);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_RESUMED', `${milestone.milestoneName} resumed.`);
    await recalculateProject(milestone.projectId);
    res.json(normalizeMilestone(updated));
  } catch (err) {
    console.error('Milestone resume error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-milestones/:milestoneId/attachments', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    const repositoryItemId = req.body.repositoryItemId ? String(req.body.repositoryItemId) : null;
    const googleDriveFileId = req.body.googleDriveFileId ? String(req.body.googleDriveFileId) : null;
    if (!repositoryItemId && !googleDriveFileId) return res.status(400).json({ message: 'repositoryItemId or googleDriveFileId is required.' });
    const repositoryItem = repositoryItemId ? await prisma.repositoryItem.findUnique({ where: { id: repositoryItemId } }) : null;
    if (repositoryItemId && !repositoryItem) return res.status(404).json({ message: 'Repository item not found.' });
    const createData = {
      milestoneId: milestone.id,
      repositoryItemId,
      googleDriveFileId,
      source: req.body.source || (googleDriveFileId ? 'gdrive' : repositoryItem?.source || 'repository'),
      fileName: req.body.fileName || repositoryItem?.name || null,
      filePath: req.body.filePath || req.body.webViewLink || repositoryItem?.path || null,
      linkedById: req.user?.id || null,
    };
    const link = repositoryItemId ? await prisma.projectMilestoneRepositoryLink.upsert({
      where: { milestoneId_repositoryItemId: { milestoneId: milestone.id, repositoryItemId } },
      update: { ...createData },
      create: createData,
      include: { repositoryItem: true, linkedBy: { select: { id: true, name: true, email: true } } },
    }) : await prisma.projectMilestoneRepositoryLink.create({
      data: createData,
      include: { repositoryItem: true, linkedBy: { select: { id: true, name: true, email: true } } },
    });
    await logMilestoneHistory(milestone, req, 'ATTACHMENT_LINKED', milestone);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_ATTACHMENT_LINKED', `${createData.fileName || 'Attachment'} linked to ${milestone.milestoneName}.`);
    res.status(201).json(link);
  } catch (err) {
    console.error('Milestone attachment link error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/project-milestones/:milestoneId/attachments/:linkId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    await prisma.projectMilestoneRepositoryLink.delete({ where: { id: req.params.linkId } });
    await logMilestoneHistory(milestone, req, 'ATTACHMENT_REMOVED', milestone);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_ATTACHMENT_UNLINKED', `Attachment unlinked from ${milestone.milestoneName}.`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Milestone attachment unlink error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-milestones/:milestoneId/comments', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (!canManage(milestone.project, req) && milestone.ownerId !== req.user?.id) return res.status(403).json({ message: 'Access denied' });
    const commentText = String(req.body.comment || '').trim();
    if (!commentText) return res.status(400).json({ message: 'Comment is required.' });
    const comment = await prisma.projectMilestoneComment.create({
      data: { milestoneId: milestone.id, userId: req.user?.id || null, comment: commentText },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await logMilestoneHistory(milestone, req, 'COMMENT_ADDED', milestone);
    await logProjectAction(milestone.projectId, req, 'MILESTONE_COMMENT_ADDED', `Comment added to ${milestone.milestoneName}.`);
    res.status(201).json(comment);
  } catch (err) {
    console.error('Milestone comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/milestones/:milestoneId/comments', authenticateJWT, async (req: AuthRequest, res) => {
  const comments = await prisma.projectMilestoneComment.findMany({
    where: { milestoneId: req.params.milestoneId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(comments);
});

router.post('/milestones/:milestoneId/comment', authenticateJWT, async (req: AuthRequest, res) => {
  req.url = `/project-milestones/${req.params.milestoneId}/comments`;
  req.method = 'POST';
  (router as any).handle(req, res);
});

router.post('/milestones/:milestoneId/attachment', authenticateJWT, async (req: AuthRequest, res) => {
  req.url = `/project-milestones/${req.params.milestoneId}/attachments`;
  req.method = 'POST';
  (router as any).handle(req, res);
});

router.delete('/milestones/:milestoneId/attachment/:linkId', authenticateJWT, async (req: AuthRequest, res) => {
  req.url = `/project-milestones/${req.params.milestoneId}/attachments/${req.params.linkId}`;
  req.method = 'DELETE';
  (router as any).handle(req, res);
});

router.get('/milestones/:milestoneId/history', authenticateJWT, async (req: AuthRequest, res) => {
  const history = await prisma.projectMilestoneHistory.findMany({
    where: { milestoneId: req.params.milestoneId },
    include: { performer: { select: { id: true, name: true, email: true } } },
    orderBy: { performedAt: 'desc' },
  });
  res.json(history);
});

router.get('/project-areas/:areaId/table-checklist', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({
      where: { id: req.params.areaId },
      include: { project: true, parentArea: true, observations: { include: { capa: true } }, checklistTemplate: { include: { columns: { orderBy: { sortOrder: 'asc' } } } } },
    });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!canWorkArea(area, req) && !canReviewArea(area, req)) return res.status(403).json({ message: 'Access denied' });

    let fallbackTemplate = area.checklistTemplate;
    const existingRows = await prisma.checklistRow.findMany({
      where: { auditAreaId: area.id },
      include: {
        evidence: { orderBy: { uploadedAt: 'desc' } },
        template: { include: { columns: { orderBy: { sortOrder: 'asc' } } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const definition = checklistTemplateForArea(area.areaName || 'Audit Area');
    let selectedTemplate = await syncChecklistTemplate(definition);
    const expectedTemplateIds = new Set(selectedTemplate ? [selectedTemplate.id] : []);

    if (fallbackTemplate?.id !== selectedTemplate?.id) {
      fallbackTemplate = selectedTemplate;
    }
    const hasExpectedRows = expectedTemplateIds.size > 0 && existingRows.some((row: any) => expectedTemplateIds.has(row.templateId));
    if (existingRows.length && expectedTemplateIds.size > 0 && !hasExpectedRows && !hasUserEnteredChecklistWork(existingRows)) {
      await replaceGeneratedWorkingPapers(area);
      const refreshed = await prisma.projectAreaAllocation.findUnique({
        where: { id: area.id },
        include: { checklistTemplate: { include: { columns: { orderBy: { sortOrder: 'asc' } } } } },
      });
      fallbackTemplate = refreshed?.checklistTemplate || null;
      selectedTemplate = fallbackTemplate || selectedTemplate;
      const regeneratedRows = await prisma.checklistRow.findMany({
        where: { auditAreaId: area.id },
        include: {
          evidence: { orderBy: { uploadedAt: 'desc' } },
          template: { include: { columns: { orderBy: { sortOrder: 'asc' } } } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
      existingRows.splice(0, existingRows.length, ...regeneratedRows);
    }

    const staleGeneratedRows = expectedTemplateIds.size > 0
      ? existingRows.filter((row: any) => row.templateId && !expectedTemplateIds.has(row.templateId) && row.templateId !== fallbackTemplate?.id)
      : [];
    if (staleGeneratedRows.length && !hasUserEnteredChecklistWork(staleGeneratedRows)) {
      await prisma.checklistRow.deleteMany({ where: { id: { in: staleGeneratedRows.map((row: any) => row.id) } } });
      const staleIds = new Set(staleGeneratedRows.map((row: any) => row.id));
      existingRows.splice(0, existingRows.length, ...existingRows.filter((row: any) => !staleIds.has(row.id)));
    }

    if (!existingRows.length) {
      const result = await generateMappedWorkingPapers(area);
      const refreshed = await prisma.projectAreaAllocation.findUnique({
        where: { id: area.id },
        include: { checklistTemplate: { include: { columns: { orderBy: { sortOrder: 'asc' } } } } },
      });
      fallbackTemplate = refreshed?.checklistTemplate || null;
      selectedTemplate = fallbackTemplate || selectedTemplate;
      if (result.createdRows) {
        const regeneratedRows = await prisma.checklistRow.findMany({
          where: { auditAreaId: area.id },
          include: {
            evidence: { orderBy: { uploadedAt: 'desc' } },
            template: { include: { columns: { orderBy: { sortOrder: 'asc' } } } },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        existingRows.splice(0, existingRows.length, ...regeneratedRows);
      }
    }

    const rows = selectedTemplate?.id
      ? existingRows.filter((row: any) => row.templateId === selectedTemplate.id)
      : existingRows;

    res.json({ template: normalizeTemplate(selectedTemplate || fallbackTemplate), templates: [], rows: rows.map(normalizeRow) });
  } catch (err) {
    console.error('Table checklist load error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-areas/:areaId/regenerate-working-papers', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({
      where: { id: req.params.areaId },
      include: { project: true, workingPapers: { include: { checklistRows: true } }, checklistRows: true },
    });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!canManage(area.project, req)) return res.status(403).json({ message: 'Only Admin or Audit Manager can regenerate working papers.' });

    const hasFilledRows = [
      ...(area.checklistRows || []),
      ...(area.workingPapers || []).flatMap((paper: any) => paper.checklistRows || []),
    ].some((row: any) => {
      const data = parseJson(row.rowData, {});
      return row.status !== 'Pending' || row.comments || row.observation || row.evidenceLink || Object.values(data).some((value) => String(value || '').trim());
    });
    if (hasFilledRows && !req.body?.confirmOverwrite) {
      return res.status(409).json({ message: 'This area already contains row data. Confirm overwrite before regenerating.' });
    }

    if (req.body?.confirmOverwrite) {
      await prisma.checklistRow.deleteMany({
        where: {
          OR: [
            { auditAreaId: area.id },
            { auditArea: { parentAreaId: area.id } },
          ],
        },
      });
      await prisma.projectAreaAllocation.deleteMany({ where: { parentAreaId: area.id } });
    }

    const result = await generateMappedWorkingPapers(area);
    await logAreaActivity({
      projectId: area.projectId,
      areaId: area.id,
      req,
      actionType: 'WORKING_PAPERS_REGENERATED',
      newValue: JSON.stringify(result),
      message: `Working papers regenerated for ${area.areaName}.`,
    });
    await recalculateProject(area.projectId);
    const updated = await prisma.projectAreaAllocation.findUnique({
      where: { id: area.id },
      include: { workingPapers: { include: { checklistRows: true } }, checklistRows: true },
    });
    res.json({ area: updated, ...result });
  } catch (err) {
    console.error('Working paper regeneration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-areas/:areaId/table-rows', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true } });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!isMaker(area, req)) return res.status(403).json({ message: 'Only the assigned maker can edit this working paper.' });
    if (area.workStatus === 'SUBMITTED' && area.reviewStatus !== 'REWORK_REQUIRED') return res.status(400).json({ message: 'Audit area is submitted and locked until rework is requested.' });

    const requestedTemplateId = req.body.templateId ? String(req.body.templateId) : null;
    const template = requestedTemplateId
      ? await prisma.checklistTemplate.findUnique({ where: { id: requestedTemplateId }, include: { columns: { orderBy: { sortOrder: 'asc' } } } })
      : await syncChecklistTemplate(checklistTemplateForArea(area.areaName));
    const rowCount = await prisma.checklistRow.count({ where: { auditAreaId: area.id, templateId: template?.id || area.checklistTemplateId || undefined } });
    const row = await prisma.checklistRow.create({
      data: {
        auditAreaId: area.id,
        templateId: template?.id || area.checklistTemplateId,
        rowData: JSON.stringify(req.body.rowData || {}),
        status: req.body.status || 'Pending',
        comments: req.body.comments || '',
        sortOrder: rowCount,
      },
      include: { evidence: true, template: { include: { columns: { orderBy: { sortOrder: 'asc' } } } } },
    });
    await prisma.projectAreaAllocation.update({
      where: { id: area.id },
      data: { checklistType: 'TABLE_CHECKLIST', checklistTemplateId: area.checklistTemplateId || template?.id || null, workStatus: 'IN_PROGRESS', status: 'In Progress' },
    });
    await logAreaActivity({ projectId: area.projectId, areaId: area.id, req, actionType: 'TABLE_ROW_CREATED', message: `${req.user?.email || 'User'} added a working paper row to ${area.areaName}.` });
    res.status(201).json(normalizeRow(row));
  } catch (err) {
    console.error('Table row create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/table-rows/:rowId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const row = await prisma.checklistRow.findUnique({ where: { id: req.params.rowId }, include: { auditArea: { include: { project: true } } } });
    if (!row) return res.status(404).json({ message: 'Checklist row not found' });
    if (!isMaker(row.auditArea, req)) return res.status(403).json({ message: 'Only the assigned maker can edit this working paper.' });
    if (row.auditArea.workStatus === 'SUBMITTED' && row.auditArea.reviewStatus !== 'REWORK_REQUIRED') return res.status(400).json({ message: 'Audit area is submitted and locked until rework is requested.' });

    const updated = await prisma.checklistRow.update({
      where: { id: row.id },
      data: {
        rowData: req.body.rowData !== undefined ? JSON.stringify(req.body.rowData || {}) : row.rowData,
        status: req.body.status ?? row.status,
        comments: req.body.comments ?? row.comments,
        observation: req.body.observation ?? row.observation,
        evidenceLink: req.body.evidenceLink ?? row.evidenceLink,
      },
      include: { evidence: { orderBy: { uploadedAt: 'desc' } } },
    });
    await prisma.projectAreaAllocation.update({ where: { id: row.auditAreaId }, data: { workStatus: 'IN_PROGRESS', status: 'In Progress' } });
    await logAreaActivity({ projectId: row.auditArea.projectId, areaId: row.auditAreaId, req, actionType: 'TABLE_ROW_UPDATED', message: `${req.user?.email || 'User'} updated a working paper row in ${row.auditArea.areaName}.` });
    await recalculateProject(row.auditArea.projectId);
    res.json(normalizeRow(updated));
  } catch (err) {
    console.error('Table row update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/table-rows/:rowId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const row = await prisma.checklistRow.findUnique({ where: { id: req.params.rowId }, include: { auditArea: { include: { project: true } } } });
    if (!row) return res.status(404).json({ message: 'Checklist row not found' });
    if (!isMaker(row.auditArea, req)) return res.status(403).json({ message: 'Only the assigned maker can edit this working paper.' });
    await prisma.checklistRow.delete({ where: { id: row.id } });
    await logAreaActivity({ projectId: row.auditArea.projectId, areaId: row.auditAreaId, req, actionType: 'TABLE_ROW_DELETED', message: `${req.user?.email || 'User'} deleted a working paper row from ${row.auditArea.areaName}.` });
    res.json({ ok: true });
  } catch (err) {
    console.error('Table row delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/table-rows/:rowId/evidence', authenticateJWT, rowEvidenceUpload, async (req: AuthRequest, res) => {
  try {
    const row = await prisma.checklistRow.findUnique({ where: { id: req.params.rowId }, include: { auditArea: { include: { project: true } } } });
    if (!row) return res.status(404).json({ message: 'Checklist row not found' });
    if (!isMaker(row.auditArea, req) && !canManage(row.auditArea.project, req)) return res.status(403).json({ message: 'Only the assigned maker can upload row evidence.' });
    const uploaded = req.files as Record<string, any[]> | undefined;
    const files = [...(uploaded?.file || []), ...(uploaded?.files || [])];
    if (!files.length) return res.status(400).json({ message: 'Evidence file is required.' });
    const evidence = await Promise.all(files.map((file) => prisma.rowEvidence.create({
      data: {
        rowId: row.id,
        fileName: file.originalname,
        filePath: `/uploads/audit-evidence/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size,
        reviewStatus: 'PENDING_REVIEW',
        uploadedBy: req.user?.id,
      },
    })));
    await logAreaActivity({ projectId: row.auditArea.projectId, areaId: row.auditAreaId, req, actionType: 'ROW_EVIDENCE_UPLOADED', newValue: evidence.map((item) => item.fileName).join(', '), message: `${req.user?.email || 'User'} uploaded ${evidence.length} row evidence item(s) for ${row.auditArea.areaName}.` });
    await recalculateProject(row.auditArea.projectId);
    res.status(201).json(evidence.length === 1 ? evidence[0] : evidence);
  } catch (err) {
    console.error('Row evidence upload error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/row-evidence/:evidenceId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const evidence = await prisma.rowEvidence.findUnique({
      where: { id: req.params.evidenceId },
      include: { row: { include: { auditArea: { include: { project: true } } } } },
    });
    if (!evidence) return res.status(404).json({ message: 'Evidence not found' });
    if (!isMaker(evidence.row.auditArea, req) && !canManage(evidence.row.auditArea.project, req)) return res.status(403).json({ message: 'Access denied' });

    await prisma.rowEvidence.delete({ where: { id: evidence.id } });
    if (evidence.repositoryPath && evidence.row.evidenceLink === evidence.repositoryPath) {
      const remainingRepositoryEvidence = await prisma.rowEvidence.findFirst({
        where: { rowId: evidence.rowId, id: { not: evidence.id }, repositoryPath: { not: null } },
        orderBy: { uploadedAt: 'desc' },
      });
      await prisma.checklistRow.update({
        where: { id: evidence.rowId },
        data: { evidenceLink: remainingRepositoryEvidence?.repositoryPath || null },
      });
    }
    await logAreaActivity({
      projectId: evidence.row.auditArea.projectId,
      areaId: evidence.row.auditAreaId,
      req,
      actionType: 'ROW_EVIDENCE_DELETED',
      oldValue: evidence.fileName,
      message: `${req.user?.email || 'User'} deleted row evidence '${evidence.fileName}' from ${evidence.row.auditArea.areaName}.`,
    });
    await recalculateProject(evidence.row.auditArea.projectId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Row evidence delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/table-rows/:rowId/repository-evidence', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const row = await prisma.checklistRow.findUnique({
      where: { id: req.params.rowId },
      include: { auditArea: { include: { project: true } } },
    });
    if (!row) return res.status(404).json({ message: 'Checklist row not found' });
    if (!isMaker(row.auditArea, req) && !canManage(row.auditArea.project, req)) return res.status(403).json({ message: 'Access denied' });

    const repositoryPath = String(req.body?.repositoryPath || row.evidenceLink || '').trim();
    await prisma.rowEvidence.deleteMany({
      where: {
        rowId: row.id,
        fileType: 'repository-link',
        ...(repositoryPath ? { OR: [{ repositoryPath }, { filePath: repositoryPath }, { fileName: repositoryPath }] } : {}),
      },
    });
    await prisma.checklistRow.update({ where: { id: row.id }, data: { evidenceLink: null } });
    await logAreaActivity({
      projectId: row.auditArea.projectId,
      areaId: row.auditAreaId,
      req,
      actionType: 'REPOSITORY_EVIDENCE_DELETED',
      oldValue: repositoryPath || row.evidenceLink || '',
      message: `${req.user?.email || 'User'} removed repository evidence from ${row.auditArea.areaName}.`,
    });
    await recalculateProject(row.auditArea.projectId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Repository evidence delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/table-rows/:rowId/repository-evidence', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const row = await prisma.checklistRow.findUnique({ where: { id: req.params.rowId }, include: { auditArea: { include: { project: true } } } });
    if (!row) return res.status(404).json({ message: 'Checklist row not found' });
    if (!isMaker(row.auditArea, req) && !canManage(row.auditArea.project, req)) return res.status(403).json({ message: 'Only the assigned maker can link row evidence.' });
    const repositoryPath = String(req.body.repositoryPath || req.body.evidenceLink || req.body.filePath || '').trim();
    if (!repositoryPath) return res.status(400).json({ message: 'Repository evidence link is required.' });
    const fileName = String(req.body.fileName || repositoryPath).trim();
    const filePath = String(req.body.filePath || repositoryPath).trim();
    const evidence = await prisma.rowEvidence.create({
      data: {
        rowId: row.id,
        fileName,
        filePath,
        fileType: req.body.fileType || 'repository-link',
        repositoryItemId: req.body.repositoryItemId || null,
        repositoryPath,
        reviewStatus: 'PENDING_REVIEW',
        uploadedBy: req.user?.id,
      },
    });
    const updated = await prisma.checklistRow.update({
      where: { id: row.id },
      data: { evidenceLink: repositoryPath },
      include: { evidence: { orderBy: { uploadedAt: 'desc' } } },
    });
    await logAreaActivity({ projectId: row.auditArea.projectId, areaId: row.auditAreaId, req, actionType: 'REPOSITORY_EVIDENCE_LINKED', newValue: repositoryPath, message: `${req.user?.email || 'User'} linked repository evidence '${fileName}' for ${row.auditArea.areaName}.` });
    await recalculateProject(row.auditArea.projectId);
    res.status(201).json({ evidence, row: normalizeRow(updated) });
  } catch (err) {
    console.error('Repository evidence link error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/table-rows/:rowId/observations', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const row = await prisma.checklistRow.findUnique({ where: { id: req.params.rowId }, include: { auditArea: { include: { project: true, parentArea: true } }, evidence: true } });
    if (!row) return res.status(404).json({ message: 'Checklist row not found' });
    if (!isMaker(row.auditArea, req) && !canManage(row.auditArea.project, req)) return res.status(403).json({ message: 'Access denied' });
    const rowData = parseJson(row.rowData, {});
    const baseArea = baseAreaName(row.auditArea);
    const user = req.user?.id ? await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }) : null;
    const observation = await prisma.observation.create({
      data: {
        projectId: row.auditArea.projectId,
        auditAreaId: row.auditAreaId,
        rowId: row.id,
        isoClause: req.body.isoClause || rowData.isoClause || '',
        department: baseArea,
        controlArea: req.body.controlArea || rowData.controlArea || rowData.area || rowData.configurationCheck || rowData.check || '',
        description: req.body.description || row.observation || row.comments || rowData.observationDescription || rowData.configurationCheck || rowData.check || 'Observation created from working paper row.',
        evidenceReference: req.body.evidenceReference || row.evidenceLink || row.evidence[0]?.filePath || '',
        auditorName: user?.name || req.user?.email || '',
        createdBy: req.user?.id,
      },
    });
    await prisma.checklistRow.update({ where: { id: row.id }, data: { observation: observation.description, status: row.status === 'Pending' ? 'Non-Compliant' : row.status } });
    await syncRegisterRows(row.auditArea.projectId, baseArea);
    await logAreaActivity({ projectId: row.auditArea.projectId, areaId: row.auditAreaId, checklistItemId: row.id, req, actionType: 'OBSERVATION_CREATED', newValue: observation.id, message: `${req.user?.email || 'User'} created an observation from ${row.auditArea.areaName}.` });
    await recalculateProject(row.auditArea.projectId);
    res.status(201).json(observation);
  } catch (err) {
    console.error('Observation create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/observations/:observationId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const observation = await prisma.observation.findUnique({ where: { id: req.params.observationId }, include: { auditArea: { include: { project: true, parentArea: true } } } });
    if (!observation) return res.status(404).json({ message: 'Observation not found' });
    if (!canManage(observation.auditArea.project, req) && !isReviewer(observation.auditArea, req)) return res.status(403).json({ message: 'Access denied' });
    const updated = await prisma.observation.update({
      where: { id: observation.id },
      data: {
        status: req.body.status ?? observation.status,
        reviewed: req.body.reviewed !== undefined ? !!req.body.reviewed : observation.reviewed,
        reviewedAt: req.body.reviewed ? new Date() : observation.reviewedAt,
      },
    });
    const baseArea = baseAreaName(observation.auditArea);
    await syncRegisterRows(observation.projectId, baseArea);
    await recalculateProject(observation.projectId);
    res.json(updated);
  } catch (err) {
    console.error('Observation update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/observations/:observationId/capa', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const observation = await prisma.observation.findUnique({ where: { id: req.params.observationId }, include: { auditArea: { include: { project: true, parentArea: true } } } });
    if (!observation) return res.status(404).json({ message: 'Observation not found' });
    if (!isMaker(observation.auditArea, req) && !canManage(observation.auditArea.project, req)) return res.status(403).json({ message: 'Access denied' });
    const capa = await prisma.cAPA.upsert({
      where: { observationId: observation.id },
      update: {
        riskRating: req.body.riskRating ?? undefined,
        rootCause: req.body.rootCause ?? undefined,
        correctiveAction: req.body.correctiveAction ?? undefined,
        preventiveAction: req.body.preventiveAction ?? undefined,
        targetDate: req.body.targetDate ? parseDate(req.body.targetDate) : undefined,
        closureEvidence: req.body.closureEvidence ?? undefined,
        verification: req.body.verification ?? undefined,
        closureStatus: req.body.closureStatus ?? undefined,
      },
      create: {
        projectId: observation.projectId,
        auditAreaId: observation.auditAreaId,
        observationId: observation.id,
        riskRating: req.body.riskRating || 'Medium',
        rootCause: req.body.rootCause || '',
        correctiveAction: req.body.correctiveAction || '',
        preventiveAction: req.body.preventiveAction || '',
        targetDate: parseDate(req.body.targetDate),
        closureEvidence: req.body.closureEvidence || '',
        verification: req.body.verification || '',
        closureStatus: req.body.closureStatus || 'Open',
        createdBy: req.user?.id,
      },
    });
    const baseArea = baseAreaName(observation.auditArea);
    await syncRegisterRows(observation.projectId, baseArea);
    await recalculateProject(observation.projectId);
    res.status(201).json(capa);
  } catch (err) {
    console.error('CAPA create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-areas/:areaId/table-import', authenticateJWT, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true } });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!isMaker(area, req)) return res.status(403).json({ message: 'Only the assigned maker can import working paper rows.' });
    const file = req.file as any;
    if (!file) return res.status(400).json({ message: 'Excel file is required.' });

    const requestedTemplateId = req.body.templateId ? String(req.body.templateId) : null;
    const template = requestedTemplateId
      ? await prisma.checklistTemplate.findUnique({ where: { id: requestedTemplateId }, include: { columns: { orderBy: { sortOrder: 'asc' } } } })
      : await syncChecklistTemplate(checklistTemplateForArea(area.areaName));
    const workbook = XLSX.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const columns = template?.columns || [];
    const existingCount = await prisma.checklistRow.count({ where: { auditAreaId: area.id, templateId: template?.id || area.checklistTemplateId || undefined } });
    const created = await Promise.all(records.map((record, index) => {
      const rowData = columns.length
        ? Object.fromEntries(columns.map((column: any) => [column.columnKey, record[column.columnName] ?? record[column.columnKey] ?? '']))
        : Object.fromEntries(Object.entries(record).map(([key, value]) => [toColumnKey(key), value]));
      return prisma.checklistRow.create({
        data: {
          auditAreaId: area.id,
          templateId: template?.id || area.checklistTemplateId,
          rowData: JSON.stringify(rowData),
          status: 'Pending',
          sortOrder: existingCount + index,
        },
        include: { evidence: true },
      });
    }));
    await prisma.projectAreaAllocation.update({ where: { id: area.id }, data: { checklistType: 'TABLE_CHECKLIST', checklistTemplateId: area.checklistTemplateId || template?.id || null, workStatus: 'IN_PROGRESS', status: 'In Progress' } });
    await logAreaActivity({ projectId: area.projectId, areaId: area.id, req, actionType: 'TABLE_ROWS_IMPORTED', newValue: String(created.length), message: `${req.user?.email || 'User'} imported ${created.length} working paper rows into ${area.areaName}.` });
    res.status(201).json(created.map(normalizeRow));
  } catch (err) {
    console.error('Table import error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/project-areas/:areaId/table-export', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true, checklistTemplate: { include: { columns: { orderBy: { sortOrder: 'asc' } } } } } });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!canWorkArea(area, req) && !canReviewArea(area, req)) return res.status(403).json({ message: 'Access denied' });
    const requestedTemplateId = req.query.templateId ? String(req.query.templateId) : null;
    const selectedTemplate = requestedTemplateId
      ? await prisma.checklistTemplate.findUnique({ where: { id: requestedTemplateId }, include: { columns: { orderBy: { sortOrder: 'asc' } } } })
      : area.checklistTemplate;
    const rows = await prisma.checklistRow.findMany({ where: { auditAreaId: area.id, ...(selectedTemplate?.id ? { templateId: selectedTemplate.id } : {}) }, include: { evidence: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    const columns = selectedTemplate?.columns || area.checklistTemplate?.columns || [];
    const data = rows.map((row) => {
      const rowData = parseJson(row.rowData, {});
      const mapped = Object.fromEntries(columns.map((column) => [column.columnName, rowData[column.columnKey] ?? '']));
      return { ...mapped, Status: row.status, Comments: row.comments || '', Evidence: row.evidence.length };
    });
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, area.areaName.slice(0, 31) || 'Working Paper');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${area.areaName.replace(/[^a-z0-9]+/gi, '_')}_working_paper.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error('Table export error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-areas/:areaId/submit', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true } });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!isMaker(area, req)) return res.status(403).json({ message: 'Only the assigned maker can submit this audit area.' });
    const makerId = area.makerUserId || area.assignedUserId;
    const effectiveReviewerId = area.reviewerUserId || area.project.auditManagerId || null;
    if (!makerId) return res.status(400).json({ message: 'Maker is not assigned. Please assign a maker before submission.' });
    if (!effectiveReviewerId) return res.status(400).json({ message: 'No reviewer available. Assign a reviewer or set an Audit Manager for this project.' });
    if (makerId === effectiveReviewerId) return res.status(400).json({ message: 'Maker and reviewer cannot be the same person. Please assign a different reviewer.' });
    if (area.reviewStatus === 'APPROVED') return res.status(400).json({ message: 'Approved audit area cannot be resubmitted.' });

    let hasUpdatedResponse = false;
    let hasEvidence = false;
    if (area.checklistType === 'TABLE_CHECKLIST') {
      const rows = await prisma.checklistRow.findMany({ where: { auditAreaId: area.id }, include: { evidence: true } });
      if (!rows.length) return res.status(400).json({ message: 'Working paper table is empty. Add or import rows before submitting.' });
      hasUpdatedResponse = rows.some((row) => row.status && row.status !== 'Pending');
      hasEvidence = rows.some((row) => row.evidence.length > 0 || !!row.evidenceLink);
    } else {
      const checklist = parseChecklist(area.checklistSnapshot);
      if (!checklist.length) return res.status(400).json({ message: 'Checklist is empty. Add checklist items before submitting.' });
      const evidence = parseEvidence(area.evidenceRecords);
      hasUpdatedResponse = checklist.some((item: any) => item.status && item.status !== 'Pending');
      hasEvidence = evidence.length > 0;
      const missingObservation = checklist.filter((item: any) => item.status === 'Non-Compliant' && !String(item.observation || '').trim());
      if (missingObservation.length) return res.status(400).json({ message: 'Add observations for all Non-Compliant checklist items before submitting.' });
    }
    if (!hasUpdatedResponse && !hasEvidence) return res.status(400).json({ message: 'Update at least one checklist response or upload evidence before submission.' });

    const updated = await prisma.projectAreaAllocation.update({
      where: { id: area.id },
      data: {
        status: 'Submitted For Review',
        workStatus: 'SUBMITTED',
        reviewStatus: 'AWAITING_REVIEW',
        submittedAt: new Date(),
      },
    });
    const [makerUser, reviewerUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: makerId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: effectiveReviewerId }, select: { name: true } }),
    ]);
    await logAreaActivity({
      projectId: area.projectId,
      areaId: area.id,
      req,
      actionType: 'SUBMITTED_FOR_REVIEW',
      oldValue: `${area.workStatus}/${area.reviewStatus}`,
      newValue: 'SUBMITTED/AWAITING_REVIEW',
      message: `${makerUser?.name || req.user?.email || 'User'} submitted ${area.areaName} for review to ${reviewerUser?.name || 'Unassigned'}.`,
    });
    await recalculateProject(area.projectId);
    res.json(updated);
  } catch (err) {
    console.error('Area submit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-areas/:areaId/review', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true } });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!isReviewer(area, req) && !canManage(area.project, req)) return res.status(403).json({ message: 'Only the assigned reviewer can review this task.' });
    if ((area.makerUserId || area.assignedUserId) === req.user?.id) return res.status(403).json({ message: 'Maker cannot approve or review own work.' });

    const action = String(req.body.action || '').toLowerCase();
    if (!['approve', 'rework'].includes(action)) return res.status(400).json({ message: 'Review action must be approve or rework.' });
    if (area.workStatus !== 'SUBMITTED' || area.reviewStatus !== 'AWAITING_REVIEW') return res.status(400).json({ message: 'This audit area is not awaiting review.' });
    const existingComments = area.reviewComments ? JSON.parse(area.reviewComments) : [];
    const reviewComment = req.body.comment
      ? [{ id: randomUUID(), actor: req.user?.id, action, text: req.body.comment, createdAt: new Date().toISOString() }, ...existingComments]
      : existingComments;

    const updated = await prisma.projectAreaAllocation.update({
      where: { id: area.id },
      data: {
        status: action === 'approve' ? 'Approved' : 'Rework Required',
        reviewStatus: action === 'approve' ? 'APPROVED' : 'REWORK_REQUIRED',
        workStatus: action === 'approve' ? 'SUBMITTED' : 'IN_PROGRESS',
        approvedAt: action === 'approve' ? new Date() : area.approvedAt,
        reworkCount: action === 'rework' ? area.reworkCount + 1 : area.reworkCount,
        reviewComments: JSON.stringify(reviewComment),
      },
    });
    const user = req.user?.id ? await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }) : null;
    await logAreaActivity({
      projectId: area.projectId,
      areaId: area.id,
      req,
      actionType: action === 'approve' ? 'REVIEW_APPROVED' : 'REWORK_REQUESTED',
      oldValue: `${area.workStatus}/${area.reviewStatus}`,
      newValue: action === 'approve' ? 'SUBMITTED/APPROVED' : 'IN_PROGRESS/REWORK_REQUIRED',
      message: action === 'approve'
        ? `${user?.name || req.user?.email || 'User'} approved ${area.areaName}.`
        : `${user?.name || req.user?.email || 'User'} requested rework on ${area.areaName}.`,
    });
    await recalculateProject(area.projectId);
    res.json(updated);
  } catch (err) {
    console.error('Area review error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-areas/:areaId/evidence', authenticateJWT, upload.array('files'), async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true } });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!isMaker(area, req) && !canManage(area.project, req)) return res.status(403).json({ message: 'Only the assigned maker can upload evidence.' });
    if (area.reviewStatus === 'APPROVED') return res.status(400).json({ message: 'Approved audit area is locked.' });
    if (area.workStatus === 'SUBMITTED' && area.reviewStatus !== 'REWORK_REQUIRED') return res.status(400).json({ message: 'Audit area is submitted and locked until rework is requested.' });

    const existing = area.evidenceRecords ? JSON.parse(area.evidenceRecords) : [];
    const checklist = parseChecklist(area.checklistSnapshot);
    const checklistItem = checklist.find((item: any) => item.id === req.body.checklistItemId);
    const files = ((req.files || []) as any[]).map((file) => ({
      id: randomUUID(),
      type: req.body.kind || 'file',
      name: file.originalname,
      storedName: file.filename,
      url: `/uploads/audit-evidence/${file.filename}`,
      size: file.size,
      uploadedBy: req.user?.id,
      uploadedAt: new Date().toISOString(),
      checklistItemId: req.body.checklistItemId || null,
      reviewStatus: 'PENDING_REVIEW',
    }));
    const repositoryAttachments = req.body.repositoryFolder
      ? [{
          id: randomUUID(),
          type: 'repository-folder',
          name: req.body.repositoryFolder,
          url: req.body.repositoryFolder,
          uploadedBy: req.user?.id,
          uploadedAt: new Date().toISOString(),
          checklistItemId: req.body.checklistItemId || null,
          reviewStatus: 'PENDING_REVIEW',
        }]
      : [];

    const updated = await prisma.projectAreaAllocation.update({
      where: { id: area.id },
      data: {
        evidenceRecords: JSON.stringify([...files, ...repositoryAttachments, ...existing]),
        workStatus: 'IN_PROGRESS',
        status: area.status === 'Not Started' ? 'In Progress' : area.status,
      },
    });
    const user = req.user?.id ? await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }) : null;
    for (const file of files) {
      await logAreaActivity({
        projectId: area.projectId,
        areaId: area.id,
        checklistItemId: file.checklistItemId,
        req,
        actionType: 'EVIDENCE_UPLOADED',
        newValue: file.name,
        message: `${user?.name || req.user?.email || 'User'} uploaded evidence for '${itemLabel(checklistItem)}'.`,
      });
    }
    for (const attachment of repositoryAttachments) {
      await logAreaActivity({
        projectId: area.projectId,
        areaId: area.id,
        checklistItemId: attachment.checklistItemId,
        req,
        actionType: 'REPOSITORY_FOLDER_ATTACHED',
        newValue: attachment.name,
        message: `${user?.name || req.user?.email || 'User'} attached repository folder for '${itemLabel(checklistItem)}'.`,
      });
    }
    res.status(201).json(updated);
  } catch (err) {
    console.error('Evidence upload error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/project-areas/:areaId/evidence/:evidenceId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const area = await prisma.projectAreaAllocation.findUnique({ where: { id: req.params.areaId }, include: { project: true } });
    if (!area) return res.status(404).json({ message: 'Area allocation not found' });
    if (!isMaker(area, req) && !canManage(area.project, req)) return res.status(403).json({ message: 'Access denied' });

    const existing = parseEvidence(area.evidenceRecords);
    const removed = existing.find((record: any) => record.id === req.params.evidenceId);
    const next = existing.filter((record: any) => record.id !== req.params.evidenceId);
    if (!removed) return res.status(404).json({ message: 'Evidence not found' });

    await prisma.projectAreaAllocation.update({
      where: { id: area.id },
      data: { evidenceRecords: JSON.stringify(next) },
    });
    await logAreaActivity({
      projectId: area.projectId,
      areaId: area.id,
      checklistItemId: removed.checklistItemId || null,
      req,
      actionType: 'EVIDENCE_DELETED',
      oldValue: removed.name || removed.url || req.params.evidenceId,
      message: `${req.user?.email || 'User'} deleted evidence '${removed.name || req.params.evidenceId}' from ${area.areaName}.`,
    });
    await recalculateProject(area.projectId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Evidence delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/project-stages/:stageId', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const stage = await prisma.projectStage.findUnique({ where: { id: req.params.stageId }, include: { project: true } });
    if (!stage) return res.status(404).json({ message: 'Stage not found' });
    if (!canManage(stage.project, req) && stage.assignedTo !== req.user?.id) return res.status(403).json({ message: 'Access denied' });

    const blockReason = await stageGate(stage, req.body.status);
    if (blockReason) return res.status(400).json({ message: blockReason });

    const nextStatus = req.body.status ?? stage.status;
    const updated = await prisma.projectStage.update({
      where: { id: stage.id },
      data: {
        status: nextStatus,
        assignedTo: req.body.assignedTo ?? stage.assignedTo,
        startDate: nextStatus === 'In Progress' && !stage.startDate ? new Date() : (req.body.startDate !== undefined ? parseDate(req.body.startDate) : stage.startDate),
        targetDate: req.body.targetDate !== undefined ? parseDate(req.body.targetDate) : stage.targetDate,
        completedDate: nextStatus === 'Completed' ? new Date() : (req.body.completedDate !== undefined ? parseDate(req.body.completedDate) : stage.completedDate),
        remarks: req.body.remarks ?? stage.remarks,
      },
    });

    await logProjectAction(
      stage.projectId,
      req,
      nextStatus === 'Completed' ? 'STAGE_COMPLETED' : 'STAGE_STARTED',
      `${updated.stageName} ${nextStatus}`,
    );
    await recalculateProject(stage.projectId);
    res.json(updated);
  } catch (err) {
    console.error('Stage update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/project-stages/:stageId/comments', authenticateJWT, async (req: AuthRequest, res) => {
  const stage = await prisma.projectStage.findUnique({ where: { id: req.params.stageId } });
  if (!stage) return res.status(404).json({ message: 'Stage not found' });
  const existing = stage.comments ? JSON.parse(stage.comments) : [];
  const comment = { id: randomUUID(), actor: req.user?.id, text: req.body.comment || req.body.text, createdAt: new Date().toISOString() };
  const updated = await prisma.projectStage.update({
    where: { id: stage.id },
    data: { comments: JSON.stringify([comment, ...existing]) },
  });
  res.status(201).json(updated);
});

router.post('/project-stages/:stageId/documents', authenticateJWT, async (req: AuthRequest, res) => {
  const stage = await prisma.projectStage.findUnique({ where: { id: req.params.stageId } });
  if (!stage) return res.status(404).json({ message: 'Stage not found' });
  const existing = stage.documents ? JSON.parse(stage.documents) : [];
  const document = { id: randomUUID(), title: req.body.title, url: req.body.url, uploadedBy: req.user?.id, createdAt: new Date().toISOString() };
  const updated = await prisma.projectStage.update({
    where: { id: stage.id },
    data: { documents: JSON.stringify([document, ...existing]) },
  });
  await logProjectAction(stage.projectId, req, stage.stageName.includes('Final') ? 'FINAL_REPORT_UPLOADED' : 'DRAFT_REPORT_UPLOADED', document.title);
  res.status(201).json(updated);
});

router.put('/project-queries/:queryId', authenticateJWT, async (req: AuthRequest, res) => {
  const query = await prisma.projectQuery.findUnique({ where: { id: req.params.queryId } });
  if (!query) return res.status(404).json({ message: 'Query not found' });
  const updated = await prisma.projectQuery.update({
    where: { id: query.id },
    data: {
      assignedTo: req.body.assignedTo ?? query.assignedTo,
      queryText: req.body.queryText ?? query.queryText,
      priority: req.body.priority ?? query.priority,
      status: req.body.status ?? query.status,
      dueDate: req.body.dueDate !== undefined ? parseDate(req.body.dueDate) : query.dueDate,
      response: req.body.response ?? query.response,
      closedAt: ['Resolved', 'Closed'].includes(req.body.status) ? new Date() : query.closedAt,
    },
  });
  if (['Resolved', 'Closed'].includes(updated.status)) await logProjectAction(updated.projectId, req, 'QUERY_RESOLVED', updated.queryText);
  res.json(updated);
});

router.put('/project-billing/:billingId', authenticateJWT, async (req: AuthRequest, res) => {
  const billing = await prisma.projectBilling.findUnique({ where: { id: req.params.billingId } });
  if (!billing) return res.status(404).json({ message: 'Billing record not found' });
  const totalAmount = req.body.totalAmount !== undefined ? numberValue(req.body.totalAmount) : billing.totalAmount;
  const amountReceived = req.body.amountReceived !== undefined ? numberValue(req.body.amountReceived) : billing.amountReceived;
  const updated = await prisma.projectBilling.update({
    where: { id: billing.id },
    data: {
      invoiceNumber: req.body.invoiceNumber ?? billing.invoiceNumber,
      invoiceDate: req.body.invoiceDate !== undefined ? parseDate(req.body.invoiceDate) : billing.invoiceDate,
      invoiceAmount: req.body.invoiceAmount !== undefined ? numberValue(req.body.invoiceAmount) : billing.invoiceAmount,
      taxAmount: req.body.taxAmount !== undefined ? numberValue(req.body.taxAmount) : billing.taxAmount,
      totalAmount,
      billingStatus: req.body.billingStatus ?? billing.billingStatus,
      paymentDueDate: req.body.paymentDueDate !== undefined ? parseDate(req.body.paymentDueDate) : billing.paymentDueDate,
      amountReceived,
      paymentDate: req.body.paymentDate !== undefined ? parseDate(req.body.paymentDate) : billing.paymentDate,
      paymentMode: req.body.paymentMode ?? billing.paymentMode,
      outstandingAmount: totalAmount - amountReceived,
      collectionStatus: req.body.collectionStatus ?? billing.collectionStatus,
    },
  });
  await logProjectAction(updated.projectId, req, amountReceived > billing.amountReceived ? 'PAYMENT_RECEIVED' : 'INVOICE_RAISED', updated.invoiceNumber || 'Billing updated');
  res.json(updated);
});

router.put('/project-backup/:backupId', authenticateJWT, async (req: AuthRequest, res) => {
  const backup = await prisma.projectBackup.findUnique({ where: { id: req.params.backupId } });
  if (!backup) return res.status(404).json({ message: 'Backup record not found' });
  const updated = await prisma.projectBackup.update({
    where: { id: backup.id },
    data: {
      evidenceBackedUp: req.body.evidenceBackedUp ?? backup.evidenceBackedUp,
      reportsBackedUp: req.body.reportsBackedUp ?? backup.reportsBackedUp,
      clientDocumentsBackedUp: req.body.clientDocumentsBackedUp ?? backup.clientDocumentsBackedUp,
      workingPapersBackedUp: req.body.workingPapersBackedUp ?? backup.workingPapersBackedUp,
      finalArchiveCompleted: req.body.finalArchiveCompleted ?? backup.finalArchiveCompleted,
      backupStatus: req.body.backupStatus ?? backup.backupStatus,
      backupLocation: req.body.backupLocation ?? backup.backupLocation,
      backupCompletedBy: req.body.backupCompletedBy ?? backup.backupCompletedBy,
      backupDate: req.body.backupDate !== undefined ? parseDate(req.body.backupDate) : backup.backupDate,
      remarks: req.body.remarks ?? backup.remarks,
    },
  });
  if (updated.finalArchiveCompleted) await logProjectAction(updated.projectId, req, 'DATA_BACKUP_COMPLETED', 'Final archive completed');
  res.json(updated);
});

export default router;
