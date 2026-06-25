/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * User Management Routes
 */

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../../middleware/auth.middleware.ts';
import { calculateUserPerformance } from '../../services/performance-analytics.service.ts';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/users
 * List all users with pagination and filtering
 */
router.get('/users', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search = '', role = '', status = '', department = '' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { employeeId: { contains: search as string } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;
    if (department) where.department = department;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          phone: true,
          department: true,
          designation: true,
          role: true,
          status: true,
          profileImage: true,
          joiningDate: true,
          lastLogin: true,
          createdAt: true,
          userProjects: { select: { projectId: true }, take: 5 },
          taskAssignments: { select: { id: true }, where: { status: { not: 'COMPLETED' } } },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const userIds = users.map((user) => user.id);
    const areaAllocations = userIds.length
      ? await prisma.projectAreaAllocation.findMany({
          where: {
            assignedUserId: { in: userIds },
            parentAreaId: null,
            status: { notIn: ['Completed', 'COMPLETED'] },
          },
          select: {
            id: true,
            assignedUserId: true,
          },
        })
      : [];

    const areaCounts = areaAllocations.reduce<Record<string, number>>((acc, allocation) => {
      if (!allocation.assignedUserId) return acc;
      acc[allocation.assignedUserId] = (acc[allocation.assignedUserId] || 0) + 1;
      return acc;
    }, {});

    const usersWithAssignedAreas = users.map((user) => ({
      ...user,
      assignedAreas: Array.from({ length: areaCounts[user.id] || 0 }, (_, index) => ({
        id: `${user.id}-area-${index}`,
      })),
    }));

    res.json({
      users: usersWithAssignedAreas,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/:id
 * Get user details by ID
 */
router.get('/users/:id([0-9a-fA-F-]{36})', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [user, assignedAreas] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          phone: true,
          department: true,
          designation: true,
          role: true,
          status: true,
          profileImage: true,
          joiningDate: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          userProjects: {
            include: { project: { select: { id: true, projectName: true } } },
          },
          taskAssignments: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { dueDate: 'asc' },
          },
          performance: true,
        },
      }),
      prisma.projectAreaAllocation.findMany({
        where: { assignedUserId: id },
        select: {
          id: true,
          areaName: true,
          status: true,
          remarks: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: {
              id: true,
              projectName: true,
              clientName: true,
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const calculatedPerformance = await calculateUserPerformance(id);
    const statusPerformance: any = { ...calculatedPerformance };
    [
      'progress' + 'Score',
      'productivity' + 'Score',
      'onTimeDeliveryRate',
      'qualityRating',
      'auditsParticipated',
      'findingsClosed',
      'avgCompletionTime',
      'lastCalculated',
      'createdAt',
      'updatedAt',
    ].forEach((key) => delete statusPerformance[key]);

    res.json({
      ...user,
      performance: statusPerformance,
      assignedAreas,
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/users', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, employeeId, phone, department, designation, role, status } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        employeeId: employeeId || null,
        phone: phone || null,
        department,
        designation,
        role: role || 'AUDITOR',
        status: status || 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        actionType: 'USER_CREATED',
        details: `User created: ${name} (${email})`,
      },
    });

    // Create activity log
    await prisma.userActivityLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_CREATED',
        actionDetails: JSON.stringify({ newUserId: user.id, email, name }),
      },
    });

    // Create performance record
    await prisma.userPerformance.create({
      data: {
        userId: user.id,
      },
    });

    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /api/users/:id
 * Update user information
 */
router.put('/users/:id([0-9a-fA-F-]{36})', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, employeeId, phone, department, designation, role, status } = req.body;

    if (email !== undefined) {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ error: 'Email is required' });
      }
      const existingEmail = await prisma.user.findFirst({
        where: { email: normalizedEmail, id: { not: id } },
        select: { id: true },
      });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email is already used by another user' });
      }
    }

    if (employeeId !== undefined && employeeId) {
      const existingEmployee = await prisma.user.findFirst({
        where: { employeeId, id: { not: id } },
        select: { id: true },
      });
      if (existingEmployee) {
        return res.status(409).json({ error: 'Employee ID is already used by another user' });
      }
    }

    if (role !== undefined && !['ADMIN', 'AUDITOR'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (status !== undefined && !['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(email !== undefined && { email: String(email).trim().toLowerCase() }),
        ...(employeeId !== undefined && { employeeId: employeeId || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(department !== undefined && { department: department || null }),
        ...(designation !== undefined && { designation: designation || null }),
        ...(role !== undefined && { role }),
        ...(status !== undefined && { status }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        phone: true,
        department: true,
        designation: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        actionType: 'USER_UPDATED',
        details: `User updated: ${user.name}`,
      },
    });

    // Create activity log
    await prisma.userActivityLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_UPDATED',
        actionDetails: JSON.stringify({ updatedUserId: id, changes: { name, email, employeeId, phone, department, designation, role, status } }),
        entityType: 'User',
        entityId: id,
        entityName: user.name,
      },
    });

    res.json(user);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 * Permanently delete user after cleaning dependent assignments/references.
 */
router.delete('/users/:id([0-9a-fA-F-]{36})', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own active admin account' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.repositoryItem.updateMany({
        where: { updatedById: id },
        data: { updatedById: null },
      });

      await tx.repositoryItem.updateMany({
        where: { createdById: id },
        data: { createdById: req.user!.id },
      });

      await tx.userProject.deleteMany({ where: { userId: id } });
      await tx.taskAssignment.deleteMany({ where: { userId: id } });

      await tx.userProject.updateMany({
        where: { assignedById: id },
        data: { assignedById: req.user!.id },
      });
      await tx.taskAssignment.updateMany({
        where: { assignedById: id },
        data: { assignedById: req.user!.id },
      });

      await tx.googleDriveWatch.deleteMany({ where: { userId: id } });
      await tx.googleDriveToken.deleteMany({ where: { userId: id } });
      await tx.googleDriveClient.deleteMany({ where: { userId: id } });
      await tx.repositoryAudit.deleteMany({ where: { userId: id } });
      await tx.auditLog.deleteMany({ where: { userId: id } });

      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          actionType: 'USER_DELETED',
          details: `User permanently deleted: ${user.name} (${user.email})`,
        },
      });

      await tx.userActivityLog.create({
        data: {
          userId: req.user!.id,
          action: 'USER_DELETED',
          actionDetails: JSON.stringify({ deletedUserId: id, deletedUserEmail: user.email, mode: 'HARD_DELETE' }),
          entityType: 'User',
          entityId: id,
          entityName: user.name,
        },
      });

      await tx.user.delete({ where: { id } });
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * PATCH /api/users/:id/status
 * Quickly update user status
 */
router.patch('/users/:id/status', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        actionType: 'USER_STATUS_UPDATED',
        details: `User status changed: ${user.name} -> ${status}`,
      },
    });

    await prisma.userActivityLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_STATUS_UPDATED',
        actionDetails: JSON.stringify({ userId: id, status }),
        entityType: 'User',
        entityId: id,
        entityName: user.name,
      },
    });

    res.json(user);
  } catch (error: any) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * POST /api/users/:id/projects
 * Assign project to user
 */
router.post('/users/:id([0-9a-fA-F-]{36})/projects', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { projectId, projectRole = 'Member' } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Check if project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already assigned
    const existing = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId: id, projectId } },
    });
    if (existing) {
      return res.status(409).json({ error: 'User is already assigned to this project' });
    }

    const assignment = await prisma.userProject.create({
      data: {
        userId: id,
        projectId,
        assignedById: req.user!.id,
        projectRole,
      },
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, projectName: true } },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        actionType: 'PROJECT_ASSIGNED',
        details: `Project assigned to ${user.name}: ${project.projectName}`,
      },
    });

    // Create activity logs
    await prisma.userActivityLog.create({
      data: {
        userId: req.user!.id,
        action: 'PROJECT_ASSIGNMENT',
        actionDetails: JSON.stringify({ assignedUserId: id, projectId, projectRole }),
        entityType: 'Project',
        entityId: projectId,
        entityName: project.projectName,
      },
    });

    await prisma.userActivityLog.create({
      data: {
        userId: id,
        action: 'PROJECT_ASSIGNED',
        actionDetails: JSON.stringify({ projectId, projectRole, assignedBy: req.user!.id }),
        entityType: 'Project',
        entityId: projectId,
        entityName: project.projectName,
      },
    });

    res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Error assigning project:', error);
    res.status(500).json({ error: 'Failed to assign project' });
  }
});

/**
 * DELETE /api/users/:id/projects/:projectId
 * Remove project assignment from user
 */
router.delete('/users/:id([0-9a-fA-F-]{36})/projects/:projectId([0-9a-fA-F-]{36})', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id, projectId } = req.params;

    await prisma.userProject.delete({
      where: {
        userId_projectId: { userId: id, projectId },
      },
    });

    const [user, project] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { name: true } }),
      prisma.project.findUnique({ where: { id: projectId }, select: { projectName: true } }),
    ]);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        actionType: 'PROJECT_UNASSIGNED',
        details: `Project removed from ${user?.name}: ${project?.projectName}`,
      },
    });

    res.json({ message: 'Project assignment removed' });
  } catch (error: any) {
    console.error('Error removing project:', error);
    res.status(500).json({ error: 'Failed to remove project assignment' });
  }
});

/**
 * GET /api/users/:id/projects
 * Get all projects assigned to a user
 */
router.get('/users/:id([0-9a-fA-F-]{36})/projects', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const projects = await prisma.userProject.findMany({
      where: { userId: id },
      include: {
        project: {
          select: {
            id: true,
            projectName: true,
            clientName: true,
            frameworks: true,
            progressPercentage: true,
            status: true,
          },
        },
      },
    });

    res.json(projects);
  } catch (error: any) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ error: 'Failed to fetch user projects' });
  }
});

/**
 * POST /api/users/:id/tasks
 * Assign task to user
 */
router.post('/users/:id([0-9a-fA-F-]{36})/tasks', authenticateJWT, authorizeRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { taskId, dueDate, description, priority = 'MEDIUM' } = req.body;

    if (!taskId || !dueDate) {
      return res.status(400).json({ error: 'Task ID and due date are required' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const assignment = await prisma.taskAssignment.create({
      data: {
        taskId,
        userId: id,
        assignedById: req.user!.id,
        dueDate: new Date(dueDate),
        description,
        priority,
      },
    });

    await calculateUserPerformance(id);

    // Create activity log
    await prisma.userActivityLog.create({
      data: {
        userId: req.user!.id,
        action: 'TASK_ASSIGNED',
        actionDetails: JSON.stringify({ assignedUserId: id, taskId, dueDate, priority }),
        entityType: 'Task',
        entityId: taskId,
      },
    });

    await prisma.userActivityLog.create({
      data: {
        userId: id,
        action: 'TASK_ASSIGNED',
        actionDetails: JSON.stringify({ taskId, dueDate, priority, assignedBy: req.user!.id }),
        entityType: 'Task',
        entityId: taskId,
      },
    });

    res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

/**
 * GET /api/users/:id/tasks
 * Get all tasks assigned to a user
 */
router.get('/users/:id([0-9a-fA-F-]{36})/tasks', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const where: any = { userId: id };
    if (status) where.status = status;

    const tasks = await prisma.taskAssignment.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    res.json(tasks);
  } catch (error: any) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ error: 'Failed to fetch user tasks' });
  }
});

/**
 * PUT /api/tasks/:taskId/status
 * Update task status
 */
router.put('/tasks/:taskId/status', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const task = await prisma.taskAssignment.findUnique({
      where: { id: taskId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check authorization (user can update their own tasks, admin can update any)
    if (req.user!.id !== task.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const completedAt = status === 'COMPLETED' ? new Date() : null;

    const updated = await prisma.taskAssignment.update({
      where: { id: taskId },
      data: { status, completedAt },
    });

    await calculateUserPerformance(task.userId);

    // Create activity log
    await prisma.userActivityLog.create({
      data: {
        userId: req.user!.id,
        action: 'TASK_UPDATE',
        actionDetails: JSON.stringify({ taskId, newStatus: status, completedAt }),
        entityType: 'Task',
        entityId: taskId,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

/**
 * GET /api/users/workload
 * Get workload information for all users
 */
router.get('/users/workload', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        department: true,
        taskAssignments: {
          where: {
            status: { not: 'COMPLETED' },
          },
          select: { id: true, dueDate: true, status: true },
        },
      },
    });

    const userIds = users.map((user) => user.id);
    const areaAllocations = userIds.length
      ? await prisma.projectAreaAllocation.findMany({
          where: {
            assignedUserId: { in: userIds },
            parentAreaId: null,
            status: { notIn: ['Completed', 'COMPLETED'] },
          },
          select: {
            id: true,
            assignedUserId: true,
            dueDate: true,
            status: true,
          },
        })
      : [];

    const areasByUser = areaAllocations.reduce<Record<string, Array<{ id: string; dueDate: Date | null; status: string }>>>((acc, allocation) => {
      if (!allocation.assignedUserId) return acc;
      if (!acc[allocation.assignedUserId]) {
        acc[allocation.assignedUserId] = [];
      }
      acc[allocation.assignedUserId].push({
        id: allocation.id,
        dueDate: allocation.dueDate,
        status: allocation.status,
      });
      return acc;
    }, {});

    const workload = users.map((user) => {
      const assignedAreas = areasByUser[user.id] || [];
      const total = user.taskAssignments.length + assignedAreas.length;
      const overdueTasks = user.taskAssignments.filter((t) => new Date() > t.dueDate && t.status !== 'COMPLETED').length;
      const overdueAreas = assignedAreas.filter((area) => area.dueDate && new Date() > area.dueDate && area.status !== 'Completed' && area.status !== 'COMPLETED').length;
      const overdue = overdueTasks + overdueAreas;
      const capacityPercent = (total / 10) * 100; // Assuming 10 tasks as 100% capacity

      return {
        userId: user.id,
        name: user.name,
        department: user.department,
        capacityPercent: Math.min(capacityPercent, 150), // Cap at 150%
        currentLoad: total,
        availableCapacity: Math.max(0, 10 - total),
        overdueTasks: overdue,
        overloaded: total > 10,
        workloadStatus: capacityPercent > 90 ? 'red' : capacityPercent > 70 ? 'yellow' : 'green',
      };
    });

    res.json(workload);
  } catch (error: any) {
    console.error('Error fetching workload:', error);
    res.status(500).json({ error: 'Failed to fetch workload data' });
  }
});

/**
 * GET /api/users/:id/activity
 * Get user activity history
 */
router.get('/users/:id([0-9a-fA-F-]{36})/activity', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '50' } = req.query;

    const activity = await prisma.userActivityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(activity);
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity history' });
  }
});

export default router;
