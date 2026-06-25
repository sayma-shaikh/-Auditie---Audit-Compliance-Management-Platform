/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * User Performance Analytics Service
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type StatusBreakdown = {
  completed: number;
  underReview: number;
  inProgress: number;
  delayed: number;
  notStarted: number;
};

type UserPerformanceSnapshot = {
  tasksAssigned: number;
  tasksCompleted: number;
  overdueTasks: number;
  avgCompletionTime: number;
  progressScore: number;
  assignedControls: number;
  completed: number;
  underReview: number;
  inProgress: number;
  delayed: number;
  notStarted: number;
};

function bucketTaskStatus(status: string): keyof StatusBreakdown {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'UNDER_REVIEW':
      return 'underReview';
    case 'IN_PROGRESS':
      return 'inProgress';
    case 'OVERDUE':
      return 'delayed';
    case 'NOT_STARTED':
    default:
      return 'notStarted';
  }
}

function bucketAreaStatus(status: string): keyof StatusBreakdown {
  switch (status) {
    case 'Completed':
    case 'COMPLETED':
      return 'completed';
    case 'Under Review':
    case 'UNDER_REVIEW':
      return 'underReview';
    case 'In Progress':
    case 'IN_PROGRESS':
      return 'inProgress';
    case 'Delayed':
    case 'OVERDUE':
      return 'delayed';
    case 'Not Started':
    case 'NOT_STARTED':
    default:
      return 'notStarted';
  }
}

function createEmptyBreakdown(): StatusBreakdown {
  return {
    completed: 0,
    underReview: 0,
    inProgress: 0,
    delayed: 0,
    notStarted: 0,
  };
}

async function buildUserPerformanceSnapshot(userId: string): Promise<UserPerformanceSnapshot> {
  const [tasks, areaAllocations] = await Promise.all([
    prisma.taskAssignment.findMany({
      where: { userId },
    }),
    prisma.projectAreaAllocation.findMany({
      where: { assignedUserId: userId, parentAreaId: null },
    }),
  ]);

  const breakdown = createEmptyBreakdown();

  tasks.forEach((task) => {
    breakdown[bucketTaskStatus(task.status)] += 1;
  });

  areaAllocations.forEach((area) => {
    breakdown[bucketAreaStatus(area.status)] += 1;
  });

  const assignedControls = tasks.length + areaAllocations.length;
  const tasksCompleted = breakdown.completed;
  const overdueTasks = breakdown.delayed;

  const completedWorkItems = [
    ...tasks
      .filter((task) => task.status === 'COMPLETED')
      .map((task) => ({
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      })),
    ...areaAllocations
      .filter((area) => area.status === 'Completed' || area.status === 'COMPLETED')
      .map((area) => ({
        createdAt: area.createdAt,
        completedAt: area.updatedAt,
      })),
  ];

  let avgCompletionTime = 0;
  if (completedWorkItems.length > 0) {
    const totalTime = completedWorkItems.reduce((sum, item) => {
      if (!item.completedAt) return sum;
      const daysToComplete = (item.completedAt.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + daysToComplete;
    }, 0);
    avgCompletionTime = totalTime / completedWorkItems.length;
  }

  const weightedScore = (
    (breakdown.completed * 100) +
    (breakdown.underReview * 70) +
    (breakdown.inProgress * 50) +
    (breakdown.delayed * 10)
  );

  const progressScore = assignedControls > 0
    ? Math.round((weightedScore / (assignedControls * 100)) * 100)
    : 0;

  return {
    tasksAssigned: assignedControls,
    tasksCompleted,
    overdueTasks,
    avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
    progressScore,
    assignedControls,
    completed: breakdown.completed,
    underReview: breakdown.underReview,
    inProgress: breakdown.inProgress,
    delayed: breakdown.delayed,
    notStarted: breakdown.notStarted,
  };
}

export async function calculateUserPerformance(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      console.warn(`Skipping performance calculation for missing user: ${userId}`);
      return null;
    }

    const snapshot = await buildUserPerformanceSnapshot(userId);

    const persistedPayload = {
      tasksAssigned: snapshot.tasksAssigned,
      tasksCompleted: snapshot.tasksCompleted,
      overdueTasks: snapshot.overdueTasks,
      avgCompletionTime: snapshot.avgCompletionTime,
      auditsParticipated: 0,
      findingsClosed: 0,
      productivityScore: snapshot.progressScore,
      onTimeDeliveryRate: 0,
      qualityRating: 0,
      lastCalculated: new Date(),
    };

    const performance = await prisma.userPerformance.upsert({
      where: { userId },
      create: {
        userId,
        ...persistedPayload,
      },
      update: persistedPayload,
    });

    return {
      ...performance,
      progressScore: snapshot.progressScore,
      assignedControls: snapshot.assignedControls,
      completed: snapshot.completed,
      underReview: snapshot.underReview,
      inProgress: snapshot.inProgress,
      delayed: snapshot.delayed,
      notStarted: snapshot.notStarted,
    };
  } catch (error) {
    console.error('Error calculating user performance:', error);
    throw error;
  }
}

export async function calculateAllUserPerformance() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    const results = await Promise.allSettled(
      users.map((user) => calculateUserPerformance(user.id))
    );

    const successful = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.filter((result) => result.status === 'rejected').length;

    return {
      total: users.length,
      successful,
      failed,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error calculating all user performance:', error);
    throw error;
  }
}

export async function getPerformanceAnalytics() {
  try {
    const performances = await prisma.userPerformance.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            department: true,
            role: true,
          },
        },
      },
    });

    const totalUsers = performances.length;
    const avgProductivityScore = performances.length > 0
      ? performances.reduce((sum, performance) => sum + performance.productivityScore, 0) / performances.length
      : 0;

    const topPerformers = [...performances]
      .sort((a, b) => b.productivityScore - a.productivityScore)
      .slice(0, 10);

    const lowPerformers = [...performances]
      .sort((a, b) => a.productivityScore - b.productivityScore)
      .slice(0, 5);

    const departmentStats = performances.reduce((acc: any, performance) => {
      if (!performance.user.department) return acc;
      if (!acc[performance.user.department]) {
        acc[performance.user.department] = {
          count: 0,
          totalScore: 0,
          avgScore: 0,
        };
      }
      acc[performance.user.department].count++;
      acc[performance.user.department].totalScore += performance.productivityScore;
      return acc;
    }, {});

    Object.keys(departmentStats).forEach((department) => {
      departmentStats[department].avgScore =
        Math.round((departmentStats[department].totalScore / departmentStats[department].count) * 10) / 10;
    });

    return {
      totalUsers,
      avgProductivityScore: Math.round(avgProductivityScore * 10) / 10,
      topPerformers,
      lowPerformers,
      departmentStats,
    };
  } catch (error) {
    console.error('Error getting performance analytics:', error);
    throw error;
  }
}
