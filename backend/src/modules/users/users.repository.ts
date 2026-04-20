import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildPrismaSkipTake } from '../../shared/utils/pagination';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  isMaster: true,
  lastLoginAt: true,
  createdAt: true,
  companyId: true,
  userRoles: {
    include: { role: { select: { id: true, name: true } } },
  },
} satisfies Prisma.UserSelect;

export class UsersRepository {
  async findAll(companyId: string, page: number, limit: number, search?: string) {
    const where: Prisma.UserWhereInput = {
      companyId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        ...buildPrismaSkipTake(page, limit),
        orderBy: { createdAt: 'desc' },
        select: USER_SELECT,
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, companyId: string) {
    return prisma.user.findFirst({
      where: { id, companyId },
      select: USER_SELECT,
    });
  }

  async findByEmail(email: string, companyId: string) {
    return prisma.user.findFirst({ where: { email, companyId } });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data, select: USER_SELECT });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  async syncRoles(userId: string, roleIds: string[]) {
    await prisma.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
        skipDuplicates: true,
      });
    }
  }
}
