import { PrismaClient } from '@prisma/client';
import { iso27001ReviewProgramMilestones, iso27001ReviewProgramTemplate } from '../data/review-program-library.ts';

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
      description: milestone.description,
      defaultDurationDays: milestone.defaultDurationDays || null,
      dependencySequence: milestone.dependencySequence || null,
      isRequired: milestone.isRequired ?? true,
    },
    create: {
      templateId: template.id,
      sequence: milestone.sequence,
      milestoneName: milestone.milestoneName,
      description: milestone.description,
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
      milestoneName: milestone.milestoneName,
      description: milestone.description,
      ownerId: ownerId || null,
      status: index === 0 ? 'IN_PROGRESS' : 'PENDING',
      startedAt: index === 0 ? new Date() : null,
      progressPercentage: index === 0 ? 50 : 0,
    })),
  });

  return { seeded: iso27001ReviewProgramMilestones.length, existing: 0, templateId: template.id };
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
  const milestones = await prisma.projectMilestone.findMany({
    where: { projectId },
    include: milestoneInclude,
    orderBy: { sequence: 'asc' },
  });
  return milestones.map(normalizeMilestone);
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
  const milestones = await prisma.projectMilestone.findMany({
    where: { projectId },
    include: milestoneInclude,
    orderBy: { sequence: 'asc' },
  });
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
