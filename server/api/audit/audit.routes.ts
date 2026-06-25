import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, authorizeRoles } from '../../middleware/auth.middleware.ts';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticateJWT, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, role: true } },
        document: { select: { title: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin stats
router.get('/stats', authenticateJWT, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const [projects, documents, pending, users] = await Promise.all([
      prisma.project.count(),
      prisma.document.count(),
      prisma.document.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.user.count(),
    ]);
    res.json({ projects, documents, pending, users });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
