import { PrismaClient } from '@prisma/client';
import { checklistTemplateForArea, ChecklistTemplateDefinition } from '../server/data/checklist-library.ts';

const prisma = new PrismaClient();

function isTableConversionTarget(areaName: string) {
  return checklistTemplateForArea(areaName).type === 'TABLE_CHECKLIST';
}

async function syncChecklistTemplate(definition: ChecklistTemplateDefinition) {
  const template = await prisma.checklistTemplate.upsert({
    where: { id: `${definition.areaKey}-${definition.type}` },
    update: {
      name: definition.name,
      type: definition.type,
      framework: definition.framework || null,
      areaKey: definition.areaKey,
      evidenceRequirement: definition.evidenceRequirement || null,
      validationRules: definition.validationRules ? JSON.stringify(definition.validationRules) : null,
    },
    create: {
      id: `${definition.areaKey}-${definition.type}`,
      name: definition.name,
      type: definition.type,
      framework: definition.framework || null,
      areaKey: definition.areaKey,
      evidenceRequirement: definition.evidenceRequirement || null,
      validationRules: definition.validationRules ? JSON.stringify(definition.validationRules) : null,
    },
  });

  const columns = definition.columns || [];
  if (columns.length) {
    await prisma.checklistColumn.deleteMany({
      where: { templateId: template.id, columnKey: { notIn: columns.map((column) => column.columnKey) } },
    });
  }

  for (const [index, column] of columns.entries()) {
    await prisma.checklistColumn.upsert({
      where: { templateId_columnKey: { templateId: template.id, columnKey: column.columnKey } },
      update: {
        columnName: column.columnName,
        columnType: column.columnType,
        isRequired: !!column.isRequired,
        sortOrder: index,
        options: column.options ? JSON.stringify(column.options) : null,
      },
      create: {
        templateId: template.id,
        columnName: column.columnName,
        columnKey: column.columnKey,
        columnType: column.columnType,
        isRequired: !!column.isRequired,
        sortOrder: index,
        options: column.options ? JSON.stringify(column.options) : null,
      },
    });
  }

  return template;
}

async function main() {
  const areas = await prisma.projectAreaAllocation.findMany({
    include: { project: { select: { projectName: true } } },
    orderBy: [{ projectId: 'asc' }, { areaName: 'asc' }],
  });

  let converted = 0;
  for (const area of areas) {
    if (!isTableConversionTarget(area.areaName)) continue;
    const definition = checklistTemplateForArea(area.areaName);
    const template = await syncChecklistTemplate(definition);
    await prisma.projectAreaAllocation.update({
      where: { id: area.id },
      data: {
        checklistType: 'TABLE_CHECKLIST',
        checklistTemplateId: template.id,
      },
    });
    converted += 1;
    console.log(`Converted: ${area.project.projectName} / ${area.areaName} -> ${template.name}`);
  }

  console.log(`Converted ${converted} audit area(s) to TABLE_CHECKLIST.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
