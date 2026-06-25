import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../../middleware/auth.middleware.ts';

const router = Router();
const prisma = new PrismaClient();

// Get all documents for a project
router.get('/project/:projectId', authenticateJWT, async (req, res) => {
  try {
    const docs = await prisma.document.findMany({
      where: { projectId: req.params.projectId },
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create document (Maker or Admin)
router.post('/', authenticateJWT, authorizeRoles('MAKER', 'ADMIN'), async (req: AuthRequest, res) => {
  const { title, type, frameworkMapping, projectId } = req.body;
  try {
    const doc = await prisma.document.create({
      data: {
        title,
        type,
        frameworkMapping,
        projectId,
        status: 'DRAFT',
        versionNumber: 1,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        actionType: 'UPLOAD',
        documentId: doc.id,
        details: 'Initial document upload',
      },
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit for review (Maker)
router.post('/:id/submit', authenticateJWT, authorizeRoles('MAKER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { status: 'PENDING_REVIEW' },
    });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/Reject (Checker or Admin)
router.post('/:id/review', authenticateJWT, authorizeRoles('CHECKER', 'ADMIN'), async (req: AuthRequest, res) => {
  const { action } = req.body; // 'APPROVE' or 'REJECT'
  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'DRAFT';

  try {
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        actionType: action,
        documentId: doc.id,
        details: `Document ${action.toLowerCase()}ed`,
      },
    });

    // Update Project Progress if approved
    if (action === 'APPROVE') {
      const project = await prisma.project.findUnique({
        where: { id: doc.projectId },
        include: { documents: true },
      });
      if (project) {
        const approvedCount = project.documents.filter(d => d.status === 'APPROVED').length;
        const totalCount = project.documents.length;
        const progress = Math.round((approvedCount / totalCount) * 100);
        await prisma.project.update({
          where: { id: doc.projectId },
          data: { progressPercentage: progress },
        });
      }
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticateJWT, authorizeRoles('MAKER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { project: { include: { documents: true } } },
    });

    if (!document) return res.status(404).json({ message: 'Document not found' });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        actionType: 'DELETE',
        documentId: document.id,
        details: `Evidence deleted: ${document.title}`,
      },
    });

    await prisma.document.delete({
      where: { id: document.id },
    });

    const remainingDocuments = document.project.documents.filter((item) => item.id !== document.id);
    const approvedCount = remainingDocuments.filter((item) => item.status === 'APPROVED').length;
    const totalCount = remainingDocuments.length;
    const progress = totalCount ? Math.round((approvedCount / totalCount) * 100) : 0;

    await prisma.project.update({
      where: { id: document.projectId },
      data: { progressPercentage: progress },
    });

    res.json({ id: document.id, deleted: true });
  } catch (err) {
    console.error('Document delete error:', err);
    res.status(500).json({ message: 'Unable to delete evidence' });
  }
});

export default router;
