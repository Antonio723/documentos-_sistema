import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { AuditFilterDto } from './dto/audit.dto';

export class AuditRepository {
  async findAll(companyId: string, filters: AuditFilterDto) {
    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(filters.resource   ? { resource: filters.resource }     : {}),
      ...(filters.action     ? { action: filters.action }         : {}),
      ...(filters.userId     ? { userId: filters.userId }         : {}),
      ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
      ...(filters.search
        ? {
            OR: [
              { userName: { contains: filters.search, mode: 'insensitive' } },
              { userEmail: { contains: filters.search, mode: 'insensitive' } },
              { action: { contains: filters.search, mode: 'insensitive' } },
              { resource: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  async getResources(companyId: string): Promise<string[]> {
    const rows = await prisma.auditLog.findMany({
      where: { companyId },
      select: { resource: true },
      distinct: ['resource'],
    });
    return rows.map(r => r.resource);
  }
}
