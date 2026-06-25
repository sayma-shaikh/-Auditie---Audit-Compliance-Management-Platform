const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const REPOSITORY_ROOT = path.join(process.cwd(), 'data', 'repository');
function normalizePosixPath(value) { return value.split(/[\\/]+/).filter(Boolean).join('/'); }
function resolveRepoAbsolutePath(relativePath) { const segments = normalizePosixPath(relativePath).split('/').filter(Boolean); return path.join(REPOSITORY_ROOT, ...segments); }

async function main() {
  console.log('Attempting timestamp-prefix repair...');
  if (!fs.existsSync(REPOSITORY_ROOT)) {
    console.log('No repository root.');
    return;
  }
  const files = fs.readdirSync(REPOSITORY_ROOT).filter(f => fs.statSync(path.join(REPOSITORY_ROOT,f)).isFile());
  let moved = 0;
  for (const f of files) {
    const stripped = f.replace(/^\d+-/, '');
    // try exact match by name
    const item = await prisma.repositoryItem.findFirst({ where: { type: 'FILE', name: stripped } });
    if (!item) continue;
    if (!item.path) continue;
    const expected = resolveRepoAbsolutePath(item.path);
    if (fs.existsSync(expected)) continue;
    const src = path.join(REPOSITORY_ROOT, f);
    fs.mkdirSync(path.dirname(expected), { recursive: true });
    try {
      fs.renameSync(src, expected);
      console.log(`Moved ${f} -> ${expected}`);
      moved++;
    } catch (err) {
      console.warn('Failed move', f, err.message || err);
    }
  }
  console.log(`Done. moved: ${moved}`);
  await prisma.$disconnect();
}
main();
