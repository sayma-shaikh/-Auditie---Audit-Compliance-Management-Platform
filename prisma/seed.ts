import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { allChecklistTemplates } from '../server/data/checklist-library.ts';
import { seedProjectMilestones, syncReviewProgramTemplate } from '../server/services/review-program.service.ts';

const prisma = new PrismaClient();

const isoAreas = [
  'Organization Context',
  'Leadership',
  'Risk Assessment',
  'Asset Management',
  'Access Control',
  'HR Security',
  'Physical Security',
  'Operations Security',
  'Communications Security',
  'Supplier Relationships',
  'Incident Management',
  'Business Continuity',
  'Compliance',
];

const lifecycleStages = [
  'Planning',
  'Kickoff Meeting',
  'Execution',
  'Queries and Discussions',
  'Draft Reporting',
  'Final Reporting',
  'Billing',
  'Collection',
  'Client Feedback',
  'Data Backup',
];

async function seedChecklistTemplates() {
  const definitions = allChecklistTemplates();
  for (const definition of definitions) {
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

    const definitionColumns = definition.columns || [];
    if (definitionColumns.length) {
      await prisma.checklistColumn.deleteMany({
        where: {
          templateId: template.id,
          columnKey: { notIn: definitionColumns.map((column) => column.columnKey) },
        },
      });
    }

    for (const [index, column] of definitionColumns.entries()) {
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
  }
}

async function main() {
  await seedChecklistTemplates();
  await syncReviewProgramTemplate(prisma);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@comp.com' },
    update: {},
    create: {
      email: 'admin@comp.com',
      name: 'System Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const sayma = await prisma.user.upsert({
    where: { email: 'sayma@auditie.local' },
    update: { name: 'Sayma', role: 'AUDITOR' },
    create: {
      email: 'sayma@auditie.local',
      name: 'Sayma',
      password: hashedPassword,
      role: 'AUDITOR',
      department: 'Audit',
      designation: 'Auditor',
    },
  });

  const wahid = await prisma.user.upsert({
    where: { email: 'wahid@auditie.local' },
    update: { name: 'Wahid', role: 'AUDITOR' },
    create: {
      email: 'wahid@auditie.local',
      name: 'Wahid',
      password: hashedPassword,
      role: 'AUDITOR',
      department: 'Audit',
      designation: 'Reviewer',
    },
  });

  const auditManager = await prisma.user.upsert({
    where: { email: 'imtiyaz.kochra@auditie.local' },
    update: { name: 'Imtiyaz Kochra', role: 'ADMIN' },
    create: {
      email: 'imtiyaz.kochra@auditie.local',
      name: 'Imtiyaz Kochra',
      password: hashedPassword,
      role: 'ADMIN',
      department: 'Audit',
      designation: 'Audit Manager',
    },
  });

  const existing = await prisma.project.findFirst({
    where: { clientName: 'XYZ India Private Limited', natureOfProject: 'ISO 27001 ISMS' },
  });

  if (!existing) {
    const project = await prisma.project.create({
      data: {
        projectName: 'XYZ India Private Limited - ISO 27001 ISMS',
        clientName: 'XYZ India Private Limited',
        frameworks: 'ISO 27001 ISMS',
        natureOfProject: 'ISO 27001 ISMS',
        assignmentPeriodCoverage: 'February - March 2026',
        assignmentExecutionStartDate: new Date('2026-02-12'),
        assignmentExecutionEndDate: new Date('2026-04-03'),
        reportingDeadline: new Date('2026-03-20'),
        auditManagerId: auditManager.id,
        currentStage: 'Planning',
        createdBy: admin.id,
        status: 'ACTIVE',
        progressPercentage: 0,
      },
    });

    await prisma.userProject.create({
      data: {
        userId: auditManager.id,
        projectId: project.id,
        assignedById: admin.id,
        projectRole: 'Audit Manager',
      },
    });

    await prisma.projectAreaAllocation.createMany({
      data: isoAreas.map((areaName, index) => ({
        projectId: project.id,
        areaName,
        assignedUserId: index % 2 === 0 ? sayma.id : auditManager.id,
        makerUserId: index % 2 === 0 ? sayma.id : auditManager.id,
        reviewerUserId: index % 2 === 0 ? wahid.id : sayma.id,
        status: 'Not Started',
      })),
    });

    await prisma.projectStage.createMany({
      data: lifecycleStages.map((stageName, index) => ({
        projectId: project.id,
        stageName,
        stageOrder: index + 1,
        status: index === 0 ? 'In Progress' : 'Pending',
        assignedTo: auditManager.id,
      })),
    });
    await seedProjectMilestones(prisma, project.id, auditManager.id);

    await prisma.projectBilling.create({ data: { projectId: project.id, billingStatus: 'Not Billed', collectionStatus: 'Pending' } });
    await prisma.projectBackup.create({ data: { projectId: project.id, backupStatus: 'Pending' } });
    await prisma.projectActivityLog.create({
      data: {
        projectId: project.id,
        actor: admin.id,
        action: 'PROJECT_CREATED',
        details: 'Seeded sample assignment for XYZ India Private Limited',
      },
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
