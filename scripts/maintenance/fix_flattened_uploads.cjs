const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const REPOSITORY_ROOT = path.join(process.cwd(), 'data', 'repository');

function normalizePosixPath(value) {
  return value.split(/[\\/]+/).filter(Boolean).join('/');
}

function resolveRepoAbsolutePath(relativePath) {
  const segments = normalizePosixPath(relativePath).split('/').filter(Boolean);
  return path.join(REPOSITORY_ROOT, ...segments);
}

async function main() {
  console.log('Repairing flattened uploads...');
  try {
    if (!fs.existsSync(REPOSITORY_ROOT)) {
      console.log('Repository root does not exist, nothing to do.');
      return;
    }

    const filesInRoot = fs.readdirSync(REPOSITORY_ROOT).filter(f => fs.statSync(path.join(REPOSITORY_ROOT, f)).isFile());

    const items = await prisma.repositoryItem.findMany({ where: { type: 'FILE' } });

    let moved = 0;

    for (const item of items) {
      if (!item.path) continue;
      const expected = resolveRepoAbsolutePath(item.path);
      if (fs.existsSync(expected)) continue; // already in place

      // try to find candidate in root
      const candidates = filesInRoot.filter(f => f.endsWith(item.name) || f.includes(item.name));
      if (candidates.length === 0) continue;

      const candidate = candidates[0];
      const src = path.join(REPOSITORY_ROOT, candidate);
      fs.mkdirSync(path.dirname(expected), { recursive: true });
      try {
        fs.renameSync(src, expected);
        console.log(`Moved ${candidate} -> ${expected}`);
        moved++;
      } catch (err) {
        console.warn(`Failed to move ${candidate}:`, err.message || err);
      }
    }

    console.log(`Done. Files moved: ${moved}`);
  } catch (err) {
    console.error('Error during repair:', err);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main();
