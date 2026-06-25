const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const REPOSITORY_ROOT = path.join(process.cwd(), 'data', 'repository');
function normalizePosixPath(value) { return value.split(/[\\/]+/).filter(Boolean).join('/'); }
function resolveRepoAbsolutePath(relativePath) { const segments = normalizePosixPath(relativePath).split('/').filter(Boolean); return path.join(REPOSITORY_ROOT, ...segments); }

async function main() {
  const items = await prisma.repositoryItem.findMany({ where: { type: 'FILE' }, select: { id: true, name: true, path: true, parentId: true } });
  const missing = [];
  for (const it of items) {
    if (!it.path) {
      missing.push({ id: it.id, name: it.name, path: null, reason: 'no path' });
      continue;
    }
    const expected = resolveRepoAbsolutePath(it.path);
    const exists = fs.existsSync(expected);
    const inRoot = fs.existsSync(path.join(REPOSITORY_ROOT, it.name)) || fs.existsSync(path.join(REPOSITORY_ROOT, `${it.name}`));
    if (!exists) missing.push({ id: it.id, name: it.name, path: it.path, expected, exists, inRoot });
  }
  console.log('Total files:', items.length);
  console.log('Missing files count:', missing.length);
  console.log(missing.slice(0,50));
  await prisma.$disconnect();
}
main();
