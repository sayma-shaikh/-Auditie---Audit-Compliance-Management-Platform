import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthRequest } from '../../middleware/auth.middleware.ts';
import { getAdminDashboard } from '../../services/admin-dashboard.service.ts';

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

export default router;
