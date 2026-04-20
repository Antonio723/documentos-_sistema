import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { buildPrismaSkipTake } from '../../shared/utils/pagination';

export class RolesRepository {
  async findAll(companyId: string, page: number, limit: number, search?: string) {
    const where: Prisma.RoleWhereInput = {
      companyId,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        ...buildPrismaSkipTake(page, limit),
        orderBy: { name: 'asc' },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
          _count: { select: { userRoles: true } },
        },
      }),
      prisma.role.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, companyId: string) {
    return prisma.role.findFirst({
      where: { id, companyId },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });
  }

  async create(data: Prisma.RoleCreateInput) {
    return prisma.role.create({
      data,
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async update(id: string, data: Prisma.RoleUpdateInput) {
    return prisma.role.update({
      where: { id },
      data,
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async delete(id: string) {
    return prisma.role.delete({ where: { id } });
  }

  async syncPermissions(roleId: string, permissionIds: string[]) {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
  }

  async findAllPermissions() {
    return prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }
}
