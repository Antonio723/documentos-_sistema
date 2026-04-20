import { Prisma, ApprovalStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildPrismaSkipTake } from '../../shared/utils/pagination';

const INCLUDE = {
  document: { select: { id: true, code: true, title: true, status: true, currentVersion: true, documentTypeId: true } },
  workflowTemplate: {
    include: { steps: { orderBy: { order: 'asc' as const } } },
  },
  requestedBy: { select: { id: true, name: true, email: true } },
  actions: {
    orderBy: { createdAt: 'asc' as const },
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} satisfies Prisma.ApprovalRequestInclude;

export class ApprovalsRepository {
  async findAll(companyId: string, filters: { page: number; limit: number; status?: ApprovalStatus; documentId?: string; myPending?: boolean; userId?: string }) {
    const { page, limit, status, documentId, myPending, userId } = filters;

    const where: Prisma.ApprovalRequestWhereInput = {
      companyId,
      ...(status && { status }),
      ...(documentId && { documentId }),
    };

    if (myPending && userId) {
      where.status = 'in_progress';
      where.workflowTemplate = {
        steps: {
          some: {
            OR: [
              { approverUserId: userId },
              { approverRole: { userRoles: { some: { userId } } } },
            ],
          },
        },
      };
    }

    const [data, total] = await prisma.$transaction([
      prisma.approvalRequest.findMany({ where, ...buildPrismaSkipTake(page, limit), orderBy: { createdAt: 'desc' }, include: INCLUDE }),
      prisma.approvalRequest.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string, companyId: string) {
    return prisma.approvalRequest.findFirst({ where: { id, companyId }, include: INCLUDE });
  }

  async findActiveByDocument(documentId: string) {
    return prisma.approvalRequest.findFirst({
      where: { documentId, status: 'in_progress' },
      include: INCLUDE,
    });
  }

  async create(data: Prisma.ApprovalRequestCreateInput) {
    return prisma.approvalRequest.create({ data, include: INCLUDE });
  }

  async update(id: string, data: Prisma.ApprovalRequestUpdateInput) {
    return prisma.approvalRequest.update({ where: { id }, data, include: INCLUDE });
  }
}
