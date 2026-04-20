import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildPrismaSkipTake } from '../../shared/utils/pagination';

export class DocumentTypesRepository {
  async findAll(companyId: string, page: number, limit: number, search?: string) {
    const where: Prisma.DocumentTypeWhereInput = {
      companyId,
      ...(search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] }
        : {}),
    };
    const [data, total] = await prisma.$transaction([
      prisma.documentType.findMany({
        where,
        ...buildPrismaSkipTake(page, limit),
        orderBy: { code: 'asc' },
        include: { _count: { select: { documents: true } } },
      }),
      prisma.documentType.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string, companyId: string) {
    return prisma.documentType.findFirst({
      where: { id, companyId },
      include: { _count: { select: { documents: true } } },
    });
  }

  async findByCode(code: string, companyId: string) {
    return prisma.documentType.findUnique({ where: { code_companyId: { code, companyId } } });
  }

  async create(data: Prisma.DocumentTypeCreateInput) {
    return prisma.documentType.create({ data });
  }

  async update(id: string, data: Prisma.DocumentTypeUpdateInput) {
    return prisma.documentType.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.documentType.delete({ where: { id } });
  }
}
