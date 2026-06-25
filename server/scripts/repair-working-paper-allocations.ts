import { PrismaClient } from '@prisma/client';
import { checklistTemplateByName, checklistTemplateForArea, workingPaperNamesForArea } from '../data/checklist-library.ts';

const prisma = new PrismaClient();

type TemplateDefinition = ReturnType<typeof checklistTemplateForArea>;

async function syncChecklistTemplate(definition: TemplateDefinition) {
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
  await prisma.checklistColumn.deleteMany({
    where: { templateId: template.id, columnKey: { notIn: columns.map((column) => column.columnKey) } },
  });
  await Promise.all(columns.map((column, index) => prisma.checklistColumn.upsert({
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
  })));

  return template;
}

async function seedTemplateRows(areaId: string, templateId: string, rows: Record<string, string>[] = []) {
  if (!rows.length) return 0;
  const existing = await prisma.checklistRow.count({ where: { auditAreaId: areaId, templateId } });
  if (existing) return 0;
  await prisma.checklistRow.createMany({
    data: rows.map((rowData, index) => ({
      auditAreaId: areaId,
      templateId,
      rowData: JSON.stringify(rowData),
      status: rowData.status || 'Pending',
      observation: rowData.auditorObservation || '',
      sortOrder: index,
    })),
  });
  return rows.length;
}

async function main() {
  const parents = await prisma.projectAreaAllocation.findMany({
    where: {
      OR: [
        { workpaperKind: 'AREA_GROUP' },
        { workingPapers: { some: {} } },
      ],
    },
    include: { workingPapers: true },
  });

  let movedRows = 0;
  let movedObservations = 0;
  let movedCapas = 0;
  let deletedChildAreas = 0;
  let seededRows = 0;

  for (const parent of parents) {
    const paperNames = workingPaperNamesForArea(parent.areaName || '');
    let primaryTemplateId: string | null = parent.checklistTemplateId;

    for (const paperName of paperNames) {
      const definition = checklistTemplateByName(paperName) || checklistTemplateForArea(paperName);
      const template = await syncChecklistTemplate(definition);
      if (!primaryTemplateId) primaryTemplateId = template.id;
      seededRows += await seedTemplateRows(parent.id, template.id, definition.seedRows || []);
    }

    for (const child of parent.workingPapers) {
      const [rows, observations, capas] = await Promise.all([
        prisma.checklistRow.updateMany({ where: { auditAreaId: child.id }, data: { auditAreaId: parent.id } }),
        prisma.observation.updateMany({ where: { auditAreaId: child.id }, data: { auditAreaId: parent.id } }),
        prisma.cAPA.updateMany({ where: { auditAreaId: child.id }, data: { auditAreaId: parent.id } }),
      ]);
      movedRows += rows.count;
      movedObservations += observations.count;
      movedCapas += capas.count;
    }

    const deleted = await prisma.projectAreaAllocation.deleteMany({ where: { parentAreaId: parent.id } });
    deletedChildAreas += deleted.count;

    await prisma.projectAreaAllocation.update({
      where: { id: parent.id },
      data: {
        parentAreaId: null,
        workpaperKind: 'WORKING_PAPER',
        workpaperType: null,
        checklistType: 'TABLE_CHECKLIST',
        checklistTemplateId: primaryTemplateId,
        checklistSnapshot: JSON.stringify([]),
      },
    });
  }

  console.log(JSON.stringify({
    repairedParentAreas: parents.length,
    movedRows,
    movedObservations,
    movedCapas,
    seededRows,
    deletedChildAreas,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
