import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import { authenticateJWT, AuthRequest } from '../../middleware/auth.middleware.ts';

const router = Router();
const prisma = new PrismaClient();
const tempRoot = path.join(process.cwd(), 'uploads', 'registers-temp');
fs.mkdirSync(tempRoot, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempRoot),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\- ]+/g, '')}`),
  }),
});

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function colIndex(ref: string) {
  const letters = (ref.match(/[A-Z]+/)?.[0] || 'A').split('');
  return letters.reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseSharedStrings(zip: PizZip) {
  const xml = zip.file('xl/sharedStrings.xml')?.asText() || '';
  return Array.from(xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)).map((item) => {
    const text = Array.from(item[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((m) => decodeXml(m[1])).join('');
    return text.trim();
  });
}

function parseWorkbook(filePath: string) {
  if (!filePath.toLowerCase().endsWith('.xlsx')) {
    return { sheetNames: ['Workbook'], detectedColumns: [], previewRows: [], lastModified: fs.statSync(filePath).mtime };
  }

  const zip = new PizZip(fs.readFileSync(path.resolve(filePath), 'binary'));
  const workbookXml = zip.file('xl/workbook.xml')?.asText() || '';
  const sheetNames = Array.from(workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"/g)).map((m) => decodeXml(m[1]));
  const sharedStrings = parseSharedStrings(zip);
  const firstSheetPath = Object.keys(zip.files).find((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const sheetXml = firstSheetPath ? zip.file(firstSheetPath)?.asText() || '' : '';
  const rows = Array.from(sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)).slice(0, 21).map((row) => {
    const values: string[] = [];
    for (const cell of row[1].matchAll(/<c[^>]*r="([^"]+)"[^>]*(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)) {
      const index = colIndex(cell[1]);
      const type = cell[2];
      const raw = cell[3].match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] || cell[3].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || '';
      values[index] = type === 's' ? sharedStrings[Number(raw)] || '' : decodeXml(raw);
    }
    return values.map((value) => value || '');
  });
  const detectedColumns = (rows[0] || []).filter(Boolean);

  return {
    sheetNames: sheetNames.length ? sheetNames : ['Sheet1'],
    detectedColumns,
    previewRows: rows.slice(1, 21),
    lastModified: fs.statSync(filePath).mtime,
  };
}

function detectRegisterType(name: string, columns: string[]) {
  const haystack = `${name} ${columns.join(' ')}`.toLowerCase();
  const types: Array<[string, string[]]> = [
    ['Risk Register', ['risk', 'likelihood', 'impact', 'inherent', 'residual']],
    ['Asset Register', ['asset', 'owner', 'serial', 'classification']],
    ['Access Review Tracker', ['access', 'user', 'privilege', 'review']],
    ['Vendor Register', ['vendor', 'supplier', 'third party']],
    ['Evidence Tracker', ['evidence', 'request', 'control', 'artifact']],
    ['CAPA Register', ['capa', 'corrective', 'preventive']],
    ['Incident Register', ['incident', 'severity', 'root cause']],
    ['Change Register', ['change', 'cab', 'release']],
    ['Training Register', ['training', 'employee', 'completion']],
  ];
  return types.find(([, keys]) => keys.some((key) => haystack.includes(key)))?.[0] || 'Working Register';
}

function registerVersionPath(projectId: string, registerId: string, versionNo: number, originalName: string) {
  const dir = path.join(process.cwd(), 'repository', 'projects', projectId, 'registers', registerId, 'versions');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `v${versionNo}-${originalName.replace(/[^\w.\- ]+/g, '')}`);
}

router.post('/projects/:projectId/registers/upload', authenticateJWT, upload.single('register'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ message: 'No register uploaded' });
  const projectId = req.params.projectId;
  const meta = parseWorkbook(req.file.path);
  const registerType = req.body.registerType || detectRegisterType(req.body.registerName || req.file.originalname, meta.detectedColumns);

  const created = await prisma.register.create({
    data: {
      projectId,
      registerName: req.body.registerName || req.file.originalname.replace(/\.[^.]+$/, ''),
      registerType,
      framework: req.body.framework || null,
      linkedAuditArea: req.body.linkedAuditArea || null,
      linkedControl: req.body.linkedControl || null,
      filePath: req.file.path,
      sheetNames: JSON.stringify(meta.sheetNames),
      detectedColumns: JSON.stringify(meta.detectedColumns),
      previewRows: JSON.stringify(meta.previewRows),
      uploadedBy: req.user!.id,
      status: req.body.status || 'Draft',
    },
  });

  const finalPath = registerVersionPath(projectId, created.id, 1, req.file.originalname);
  fs.renameSync(req.file.path, finalPath);

  const register = await prisma.register.update({ where: { id: created.id }, data: { filePath: finalPath } });
  await prisma.registerVersion.create({
    data: { registerId: register.id, versionNo: 1, filePath: finalPath, uploadedBy: req.user!.id, changeSummary: req.body.changeSummary || 'Initial upload' },
  });
  await prisma.auditLog.create({ data: { userId: req.user!.id, actionType: 'REGISTER_UPLOADED', details: `Register uploaded: ${register.registerName}` } });
  res.json(register);
});

router.get('/projects/:projectId/registers', authenticateJWT, async (req, res) => {
  const registers = await prisma.register.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { updatedAt: 'desc' },
    include: { versions: { orderBy: { versionNo: 'desc' } } },
  });
  res.json(registers);
});

router.get('/registers/:id', authenticateJWT, async (req, res) => {
  const register = await prisma.register.findUnique({ where: { id: req.params.id }, include: { versions: { orderBy: { versionNo: 'desc' } } } });
  if (!register) return res.status(404).json({ message: 'Register not found' });
  res.json(register);
});

router.get('/registers/:id/preview', authenticateJWT, async (req, res) => {
  const register = await prisma.register.findUnique({ where: { id: req.params.id }, include: { versions: { orderBy: { versionNo: 'desc' } } } });
  if (!register) return res.status(404).json({ message: 'Register not found' });
  const stat = fs.existsSync(register.filePath) ? fs.statSync(register.filePath) : null;
  res.json({
    ...register,
    sheetNames: JSON.parse(register.sheetNames || '[]'),
    detectedColumns: JSON.parse(register.detectedColumns || '[]'),
    previewRows: JSON.parse(register.previewRows || '[]'),
    lastModified: stat?.mtime || register.updatedAt,
  });
});

router.get('/registers/:id/download', authenticateJWT, async (req: AuthRequest, res) => {
  const register = await prisma.register.findUnique({ where: { id: req.params.id } });
  if (!register) return res.status(404).json({ message: 'Register not found' });
  await prisma.auditLog.create({ data: { userId: req.user!.id, actionType: 'DOWNLOAD_FILE', details: `Downloaded register: ${register.registerName}` } });
  res.download(path.resolve(register.filePath));
});

router.post('/registers/:id/upload-new-version', authenticateJWT, upload.single('register'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ message: 'No register uploaded' });
  const register = await prisma.register.findUnique({ where: { id: req.params.id } });
  if (!register) return res.status(404).json({ message: 'Register not found' });
  const versionNo = register.currentVersion + 1;
  const finalPath = registerVersionPath(register.projectId, register.id, versionNo, req.file.originalname);
  fs.renameSync(req.file.path, finalPath);
  const meta = parseWorkbook(finalPath);

  await prisma.registerVersion.create({
    data: { registerId: register.id, versionNo, filePath: finalPath, uploadedBy: req.user!.id, changeSummary: req.body.changeSummary || null },
  });
  const updated = await prisma.register.update({
    where: { id: register.id },
    data: {
      currentVersion: versionNo,
      filePath: finalPath,
      sheetNames: JSON.stringify(meta.sheetNames),
      detectedColumns: JSON.stringify(meta.detectedColumns),
      previewRows: JSON.stringify(meta.previewRows),
      status: 'Under Review',
    },
  });
  await prisma.auditLog.create({ data: { userId: req.user!.id, actionType: 'REGISTER_VERSION_CREATED', details: `Register ${register.registerName} v${versionNo} uploaded` } });
  res.json(updated);
});

router.get('/registers/:id/versions', authenticateJWT, async (req, res) => {
  const versions = await prisma.registerVersion.findMany({ where: { registerId: req.params.id }, orderBy: { versionNo: 'desc' } });
  res.json(versions);
});

router.post('/registers/:id/approve', authenticateJWT, async (req: AuthRequest, res) => {
  const updated = await prisma.register.update({ where: { id: req.params.id }, data: { status: 'Approved' } });
  await prisma.auditLog.create({ data: { userId: req.user!.id, actionType: 'REGISTER_APPROVED', details: `Register approved: ${updated.registerName}` } });
  res.json(updated);
});

router.post('/registers/:id/request-update', authenticateJWT, async (req: AuthRequest, res) => {
  const updated = await prisma.register.update({ where: { id: req.params.id }, data: { status: 'Needs Update' } });
  await prisma.auditLog.create({ data: { userId: req.user!.id, actionType: 'REGISTER_UPDATE_REQUESTED', details: req.body?.details || `Update requested: ${updated.registerName}` } });
  res.json(updated);
});

export default router;
