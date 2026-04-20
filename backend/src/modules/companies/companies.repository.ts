import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildPrismaSkipTake } from '../../shared/utils/pagination';

export class CompaniesRepository {
  async findAll(page: number, limit: number, search?: string) {
    const where: Prisma.CompanyWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { cnpj: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await prisma.$transaction([
      prisma.company.findMany({
        where,
        ...buildPrismaSkipTake(page, limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          cnpj: true,
          email: true,
          phone: true,
          plan: true,
          isActive: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { users: true, roles: true } } },
    });
  }

  async create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({ data });
  }

  async update(id: string, data: Prisma.CompanyUpdateInput) {
    return prisma.company.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.company.delete({ where: { id } });
  }
}
