import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

const DISTRIBUTION_INCLUDE = {
  document: { select: { id: true, code: true, title: true, currentVersion: true, status: true, documentTypeId: true } },
  user: { select: { id: true, name: true, email: true } },
  sentBy: { select: { id: true, name: true, email: true } },
  confirmation: {
    select: { id: true, confirmedAt: true, signature: true },
  },
} satisfies Prisma.DocumentDistributionInclude;

export class DistributionsRepository {
  async create(data: Prisma.DocumentDistributionCreateInput) {
    return prisma.documentDistribution.create({ data, include: DISTRIBUTION_INCLUDE });
  }

  async createMany(dataArray: Prisma.DocumentDistributionCreateManyInput[]) {
    return prisma.documentDistribution.createMany({ data: dataArray, skipDuplicates: true });
  }

  async findById(id: string, companyId: string) {
    return prisma.documentDistribution.findFirst({
      where: { id, companyId },
      include: DISTRIBUTION_INCLUDE,
    });
  }

  async findByDocument(documentId: string, companyId: string) {
    return prisma.documentDistribution.findMany({
      where: { documentId, companyId, isActive: true },
      include: DISTRIBUTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyPending(userId: string, companyId: string) {
    return prisma.documentDistribution.findMany({
      where: {
        userId,
        companyId,
        isActive: true,
        confirmation: null,
      },
      include: DISTRIBUTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(userId: string, companyId: string, filters: { status?: string; page: number; limit: number }) {
    const where: Prisma.DocumentDistributionWhereInput = {
      userId,
      companyId,
      isActive: true,
      ...(filters.status === 'pending' ? { confirmation: null } : {}),
      ...(filters.status === 'confirmed' ? { confirmation: { isNot: null } } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.documentDistribution.findMany({
        where,
        include: DISTRIBUTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.documentDistribution.count({ where }),
    ]);

    return { data, total };
  }

  async findExisting(documentId: string, userId: string, version: string) {
    return prisma.documentDistribution.findUnique({
      where: { documentId_userId_version: { documentId, userId, version } },
    });
  }

  async getNextCopyNumber(documentId: string): Promise<number> {
    const max = await prisma.documentDistribution.aggregate({
      where: { documentId, copyType: 'controlled' },
      _max: { copyNumber: true },
    });
    return (max._max.copyNumber ?? 0) + 1;
  }

  async createConfirmation(data: Prisma.ReadConfirmationCreateInput) {
    return prisma.readConfirmation.create({
      data,
      include: { distribution: { include: DISTRIBUTION_INCLUDE } },
    });
  }

  async findConfirmation(distributionId: string) {
    return prisma.readConfirmation.findUnique({ where: { distributionId } });
  }
}
