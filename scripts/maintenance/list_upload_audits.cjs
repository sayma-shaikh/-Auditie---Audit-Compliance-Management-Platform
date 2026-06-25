const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const audits = await prisma.repositoryAudit.findMany({ where: { action: 'UPLOAD_FILE' }, orderBy: { id: 'asc' }, take: 100 });
  for (const a of audits) {
    console.log({ id: a.id, itemId: a.itemId, action: a.action, details: a.details, timestamp: a.timestamp });
  }
  await prisma.$disconnect();
}
main();
