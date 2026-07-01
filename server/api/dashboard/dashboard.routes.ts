import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthRequest } from '../../middleware/auth.middleware.ts';
import { getAdminDashboard } from '../../services/admin-dashboard.service.ts';
import { getAuditorDashboard } from '../../services/auditor-dashboard.service.ts';

const router = Router();
const prisma = new PrismaClient();

router.get('/dashboard/admin', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const dashboard = await getAdminDashboard(prisma, req.user, {
      search: req.query.search ? String(req.query.search) : undefined,
      framework: req.query.framework ? String(req.query.framework) : undefined,
      manager: req.query.manager ? String(req.query.manager) : undefined,
      reviewer: req.query.reviewer ? String(req.query.reviewer) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      industry: req.query.industry ? String(req.query.industry) : undefined,
      client: req.query.client ? String(req.query.client) : undefined,
      dateRange: req.query.dateRange ? String(req.query.dateRange) : undefined,
      health: req.query.health ? String(req.query.health) : undefined,
    });
    res.json(dashboard);
  } catch (err: any) {
    console.error('Admin dashboard error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
});

router.get('/my-dashboard', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const dashboard = await getAuditorDashboard(prisma, req.user);
    res.json(dashboard);
  } catch (err: any) {
    console.error('Auditor dashboard error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
});

router.get('/my-tasks', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const dashboard = await getAuditorDashboard(prisma, req.user);
    res.json(dashboard.tasks);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
});

router.get('/my-projects', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const dashboard = await getAuditorDashboard(prisma, req.user);
    res.json(dashboard.projects);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
});

router.get('/my-reviews', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const dashboard = await getAuditorDashboard(prisma, req.user);
    res.json(dashboard.reviews);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
});

router.get('/my-deadlines', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const dashboard = await getAuditorDashboard(prisma, req.user);
    res.json(dashboard.deadlines);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
});

router.get('/my-activity', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const dashboard = await getAuditorDashboard(prisma, req.user);
    res.json(dashboard.activity);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
});

router.get('/notifications', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const dashboard = await getAuditorDashboard(prisma, req.user);
    res.json(dashboard.notifications);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
});

export default router;
