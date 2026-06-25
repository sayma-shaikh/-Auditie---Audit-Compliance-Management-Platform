import { PrismaClient } from '@prisma/client';
import { iso27001ReviewProgramMilestones, iso27001ReviewProgramTemplate } from '../data/review-program-library.ts';
import { calculateMilestoneProgress } from './milestone-progress.service.ts';

type PrismaLike = PrismaClient;

const milestoneInclude = {
  owner: { select: { id: true, name: true, email: true, role: true } },
  repositoryLinks: {
    include: {
      repositoryItem: { select: { id: true, name: true, type: true, path: true, source: true, mimeType: true, size: true } },
      linkedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { linkedAt: 'desc' as const },
  },
  comments: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  histories: {
    include: { performer: { select: { id: true, name: true, email: true } } },
    orderBy: { performedAt: 'desc' as const },
  },
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function syncReviewProgramTemplate(prisma: PrismaLike) {
  const template = await prisma.reviewProgramTemplate.upsert({
    where: {
      name_framework_version: {
        name: iso27001ReviewProgramTemplate.name,
        framework: iso27001ReviewProgramTemplate.framework,
        version: iso27001ReviewProgramTemplate.version,
      },
    },
    update: {
      id: iso27001ReviewProgramTemplate.id,
      description: iso27001ReviewProgramTemplate.description,
    },
    create: iso27001ReviewProgramTemplate,
  });

  await Promise.all(iso27001ReviewProgramMilestones.map((milestone) => prisma.reviewProgramTemplateMilestone.upsert({
    where: { templateId_sequence: { templateId: template.id, sequence: milestone.sequence } },
    update: {
      milestoneName: milestone.milestoneName,
      milestoneKey: milestone.milestoneKey,
      description: milestone.description,
      workspaceType: milestone.workspaceType,
      defaultWeight: milestone.defaultWeight || 1,
      defaultOwnerRole: milestone.defaultOwnerRole || null,
      defaultDurationDays: milestone.defaultDurationDays || null,
      dependencySequence: milestone.dependencySequence || null,
      isRequired: milestone.isRequired ?? true,
    },
    create: {
      templateId: template.id,
      sequence: milestone.sequence,
      milestoneKey: milestone.milestoneKey,
      milestoneName: milestone.milestoneName,
      description: milestone.description,
      workspaceType: milestone.workspaceType,
      defaultWeight: milestone.defaultWeight || 1,
      defaultOwnerRole: milestone.defaultOwnerRole || null,
      defaultDurationDays: milestone.defaultDurationDays || null,
      dependencySequence: milestone.dependencySequence || null,
      isRequired: milestone.isRequired ?? true,
    },
  })));

  return template;
}

export async function seedProjectMilestones(prisma: PrismaLike, projectId: string, ownerId?: string | null) {
  const template = await syncReviewProgramTemplate(prisma);
  const existingCount = await prisma.projectMilestone.count({ where: { projectId } });
  if (existingCount) return { seeded: 0, existing: existingCount, templateId: template.id };

  await prisma.projectMilestone.createMany({
    data: iso27001ReviewProgramMilestones.map((milestone, index) => ({
      projectId,
      sequence: milestone.sequence,
      milestoneKey: milestone.milestoneKey,
      milestoneName: milestone.milestoneName,
      description: milestone.description,
      workspaceType: milestone.workspaceType,
      ownerId: ownerId || null,
      status: index === 0 ? 'IN_PROGRESS' : 'PENDING',
      startedAt: index === 0 ? new Date() : null,
      progressPercentage: index === 0 ? 50 : 0,
      requiredAction: index === 0 ? 'Complete planning requirements' : 'Open milestone workspace',
    })),
  });
  await ensureProjectMilestoneWorkspaces(prisma, projectId);

  return { seeded: iso27001ReviewProgramMilestones.length, existing: 0, templateId: template.id };
}

export function definitionForMilestone(milestone: any) {
  return iso27001ReviewProgramMilestones.find((item) => item.sequence === milestone.sequence || item.milestoneName === milestone.milestoneName);
}

export async function ensureMilestoneWorkspace(prisma: PrismaLike, milestone: any) {
  const definition = definitionForMilestone(milestone);
  const workspaceType = milestone.workspaceType || definition?.workspaceType || 'PROJECT_MANAGEMENT_WORKSPACE';
  const milestoneKey = milestone.milestoneKey || definition?.milestoneKey || milestone.milestoneName?.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  let workspaceId = milestone.workspaceId || null;

  const updateMilestone = async (id: string | null) => {
    if (milestone.workspaceType === workspaceType && milestone.milestoneKey === milestoneKey && milestone.workspaceId === id) return;
    await prisma.projectMilestone.update({
      where: { id: milestone.id },
      data: { workspaceType, milestoneKey, workspaceId: id },
    });
  };

  if (workspaceType === 'PLANNING_WORKSPACE') {
    const workspace = await prisma.planningWorkspace.upsert({
      where: { milestoneId: milestone.id },
      update: {},
      create: { projectId: milestone.projectId, milestoneId: milestone.id },
    });
    workspaceId = workspace.id;
  } else if (workspaceType === 'PROJECT_MANAGEMENT_WORKSPACE') {
    const workspace = await prisma.projectManagementWorkspace.upsert({
      where: { milestoneId: milestone.id },
      update: {},
      create: { projectId: milestone.projectId, milestoneId: milestone.id },
    });
    workspaceId = workspace.id;
  } else if (['MEETING_WORKSPACE', 'CLOSING_MEETING_WORKSPACE', 'COMMITTEE_MEETING_WORKSPACE'].includes(workspaceType)) {
    const workspace = await prisma.meetingWorkspace.upsert({
      where: { milestoneId: milestone.id },
      update: {},
      create: { projectId: milestone.projectId, milestoneId: milestone.id, meetingType: milestone.milestoneName },
    });
    workspaceId = workspace.id;
  } else if (workspaceType === 'AREA_CHECKLIST_WORKSPACE') {
    const workspace = await prisma.areaChecklistWorkspace.upsert({
      where: { milestoneId: milestone.id },
      update: {},
      create: { projectId: milestone.projectId, milestoneId: milestone.id },
    });
    workspaceId = workspace.id;
  }

  await updateMilestone(workspaceId);
  return { workspaceType, milestoneKey, workspaceId };
}

export async function ensureProjectMilestoneWorkspaces(prisma: PrismaLike, projectId: string) {
  const milestones = await prisma.projectMilestone.findMany({ where: { projectId }, orderBy: { sequence: 'asc' } });
  for (const milestone of milestones) {
    await ensureMilestoneWorkspace(prisma, milestone);
  }
}

export async function refreshMilestoneProgress(prisma: PrismaLike, milestone: any) {
  await ensureMilestoneWorkspace(prisma, milestone);
  const current = await prisma.projectMilestone.findUnique({ where: { id: milestone.id } });
  if (!current) return milestone;
  const calculated = await calculateMilestoneProgress(prisma, current);
  const nextStatus = calculated.progressPercentage >= 100 && current.status !== 'COMPLETED' ? current.status : current.status;
  return prisma.projectMilestone.update({
    where: { id: current.id },
    data: {
      progressPercentage: current.status === 'COMPLETED' ? 100 : calculated.progressPercentage,
      requiredAction: current.status === 'COMPLETED' ? 'Completed' : calculated.requiredAction,
      status: nextStatus,
    },
    include: milestoneInclude,
  });
}

export function normalizeMilestone(milestone: any) {
  const isOverdue = !!milestone.targetDate && new Date(milestone.targetDate) < startOfToday() && milestone.status !== 'COMPLETED';
  return {
    ...milestone,
    isOverdue,
    attachmentCount: milestone.repositoryLinks?.length || 0,
    commentCount: milestone.comments?.length || 0,
  };
}

export async function getProjectMilestones(prisma: PrismaLike, projectId: string) {
  await ensureProjectMilestoneWorkspaces(prisma, projectId);
  const milestones = await prisma.projectMilestone.findMany({
    where: { projectId },
    include: milestoneInclude,
    orderBy: { sequence: 'asc' },
  });
  const refreshed = [];
  for (const milestone of milestones) {
    refreshed.push(await refreshMilestoneProgress(prisma, milestone));
  }
  return refreshed.map(normalizeMilestone);
}

export function summarizeMilestones(milestones: any[]) {
  const normalized = milestones.map(normalizeMilestone);
  const totalMilestones = normalized.length;
  const completedCount = normalized.filter((item) => item.status === 'COMPLETED').length;
  const inProgressCount = normalized.filter((item) => item.status === 'IN_PROGRESS').length;
  const pendingCount = normalized.filter((item) => item.status === 'PENDING').length;
  const blockedCount = normalized.filter((item) => item.status === 'BLOCKED').length;
  const overdueCount = normalized.filter((item) => item.isOverdue).length;
  const overallProgressPercentage = totalMilestones
    ? Math.round(normalized.reduce((sum, item) => sum + Math.max(0, Math.min(100, Number(item.progressPercentage) || 0)), 0) / totalMilestones)
    : 0;
  const current = normalized.find((item) => item.status === 'IN_PROGRESS')
    || normalized.find((item) => item.status !== 'COMPLETED')
    || normalized[normalized.length - 1]
    || null;
  const nextMilestone = normalized.find((item) => item.status === 'PENDING') || null;

  return {
    totalMilestones,
    completedCount,
    inProgressCount,
    pendingCount,
    overdueCount,
    blockedCount,
    overallProgressPercentage,
    currentStage: current?.milestoneName || null,
    currentMilestone: current,
    nextMilestone,
  };
}

export async function getProjectMilestoneSummary(prisma: PrismaLike, projectId: string) {
  const milestones = await getProjectMilestones(prisma, projectId);
  return summarizeMilestones(milestones);
}

export async function recalculateProjectFromMilestones(prisma: PrismaLike, projectId: string) {
  const summary = await getProjectMilestoneSummary(prisma, projectId);
  if (!summary.totalMilestones) return null;
  return prisma.project.update({
    where: { id: projectId },
    data: {
      progressPercentage: summary.overallProgressPercentage,
      currentStage: summary.currentStage,
      status: summary.overallProgressPercentage >= 100 ? 'COMPLETED' : 'ACTIVE',
    },
  });
}

export const projectMilestoneInclude = milestoneInclude;
