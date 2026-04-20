import { prisma } from '../../config/database';
import { buildPrismaSkipTake } from '../../shared/utils/pagination';

const INCLUDE = {
  documentType: { select: { id: true, name: true, code: true } },
  steps: {
    orderBy: { order: 'asc' as const },
    include: {
      approverUser: { select: { id: true, name: true, email: true } },
      approverRole: { select: { id: true, name: true } },
    },
  },
  _count: { select: { requests: true } },
};

export class WorkflowsRepository {
  async findAll(companyId: string, page: number, limit: number) {
    const where = { companyId };
    const [data, total] = await prisma.$transaction([
      prisma.workflowTemplate.findMany({ where, ...buildPrismaSkipTake(page, limit), orderBy: { createdAt: 'desc' }, include: INCLUDE }),
      prisma.workflowTemplate.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string, companyId: string) {
    return prisma.workflowTemplate.findFirst({ where: { id, companyId }, include: INCLUDE });
  }

  async findByDocumentType(documentTypeId: string, companyId: string) {
    return prisma.workflowTemplate.findFirst({
      where: { companyId, documentTypeId, isActive: true },
      include: { steps: { orderBy: { order: 'asc' } } },
    }) ?? prisma.workflowTemplate.findFirst({
      where: { companyId, documentTypeId: null, isActive: true },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async create(companyId: string, data: { name: string; description?: string; documentTypeId?: string; steps: { order: number; name: string; description?: string; approverUserId?: string; approverRoleId?: string; slaHours?: number; isRequired: boolean }[] }) {
    return prisma.workflowTemplate.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        documentTypeId: data.documentTypeId,
        steps: { create: data.steps },
      },
      include: INCLUDE,
    });
  }

  async update(id: string, data: { name?: string; description?: string; documentTypeId?: string | null; isActive?: boolean; steps?: { order: number; name: string; description?: string; approverUserId?: string; approverRoleId?: string; slaHours?: number; isRequired: boolean }[] }) {
    const { steps, ...rest } = data;
    return prisma.$transaction(async (tx) => {
      if (steps) {
        await tx.workflowStep.deleteMany({ where: { workflowTemplateId: id } });
        await tx.workflowStep.createMany({ data: steps.map((s) => ({ ...s, workflowTemplateId: id })) });
      }
      return tx.workflowTemplate.update({ where: { id }, data: rest, include: INCLUDE });
    });
  }

  async delete(id: string) {
    return prisma.workflowTemplate.delete({ where: { id } });
  }
}
