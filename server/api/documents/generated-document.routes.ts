import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { authenticateJWT, AuthRequest } from '../../middleware/auth.middleware.ts';

const router = Router();
const prisma = new PrismaClient();

router.get('/projects/:projectId/generated-documents', authenticateJWT, async (req, res) => {
  const docs = await prisma.generatedDocument.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { generatedAt: 'desc' },
  });
  res.json(docs);
});

router.get('/generated-documents', authenticateJWT, async (_req, res) => {
  const docs = await prisma.generatedDocument.findMany({ orderBy: { generatedAt: 'desc' } });
  res.json(docs);
});

router.get('/document-generation-batches', authenticateJWT, async (_req, res) => {
  const batches = await prisma.documentGenerationBatch.findMany({
    orderBy: { generatedAt: 'desc' },
    include: { generatedDocuments: { orderBy: { generatedAt: 'desc' } } },
  });
  res.json(batches);
});

router.get('/document-generation-batches/:id/download-zip', authenticateJWT, async (req, res) => {
  const batch = await prisma.documentGenerationBatch.findUnique({ where: { id: req.params.id } });
  if (!batch?.zipPath) return res.status(404).json({ message: 'ZIP file is not available for this batch' });
  res.download(path.resolve(batch.zipPath), `${batch.batchName.replace(/[^\w.\-]+/g, '_')}.zip`);
});

router.get('/generated-documents/:id/download-docx', authenticateJWT, async (req: AuthRequest, res) => {
  const doc = await prisma.generatedDocument.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ message: 'Generated document not found' });
  res.download(path.resolve(doc.filePath), doc.documentName);
});

router.get('/generated-documents/:id/download-pdf', authenticateJWT, async (req, res) => {
  const doc = await prisma.generatedDocument.findUnique({ where: { id: req.params.id } });
  if (!doc?.pdfPath) return res.status(404).json({ message: 'PDF export is not available for this document yet' });
  res.download(path.resolve(doc.pdfPath));
});

router.post('/generated-documents/:id/save-to-repository', authenticateJWT, async (req, res) => {
  const doc = await prisma.generatedDocument.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ message: 'Generated document not found' });
  const updated = await prisma.generatedDocument.update({
    where: { id: doc.id },
    data: { status: 'SAVED_TO_REPOSITORY' },
  });
  res.json(updated);
});

export default router;
