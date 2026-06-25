const fs = require('fs');
const path = require('path');

const REPOSITORY_ROOT = path.join(process.cwd(), 'data', 'repository');

function nowStamp() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, '-');
}

function main() {
  if (!fs.existsSync(REPOSITORY_ROOT)) {
    console.log('Repository root does not exist');
    return;
  }

  const entries = fs.readdirSync(REPOSITORY_ROOT);
  const files = entries.filter(e => fs.statSync(path.join(REPOSITORY_ROOT, e)).isFile());
  if (files.length === 0) {
    console.log('No loose files found in repository root');
    return;
  }

  const recoveredDir = path.join(REPOSITORY_ROOT, `Recovered-${nowStamp()}`);
  fs.mkdirSync(recoveredDir, { recursive: true });

  for (const f of files) {
    const src = path.join(REPOSITORY_ROOT, f);
    const dest = path.join(recoveredDir, f);
    try {
      fs.renameSync(src, dest);
      console.log(`Moved: ${f} -> ${path.relative(process.cwd(), dest)}`);
    } catch (err) {
      console.warn(`Failed to move ${f}:`, err.message || err);
    }
  }

  console.log(`Done. Moved ${files.length} files to ${recoveredDir}`);
}

main();
