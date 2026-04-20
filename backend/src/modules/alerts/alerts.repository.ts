import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

export class AlertsRepository {
  async create(data: Prisma.AlertNotificationCreateInput) {
    return prisma.alertNotification.create({ data });
  }

  async createMany(items: Prisma.AlertNotificationCreateManyInput[]) {
    return prisma.alertNotification.createMany({ data: items, skipDuplicates: false });
  }

  async findMine(userId: string, companyId: string, onlyUnread = false) {
    return prisma.alertNotification.findMany({
      where: { userId, companyId, ...(onlyUnread ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(userId: string, companyId: string) {
    return prisma.alertNotification.count({ where: { userId, companyId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    return prisma.alertNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string, companyId: string) {
    return prisma.alertNotification.updateMany({
      where: { userId, companyId, isRead: false },
      data: { isRead: true },
    });
  }

  async existsByResourceAndType(userId: string, resourceId: string, type: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await prisma.alertNotification.count({
      where: { userId, resourceId, type, createdAt: { gte: today } },
    });
    return count > 0;
  }
}
