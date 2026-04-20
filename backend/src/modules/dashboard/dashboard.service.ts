import { prisma } from '../../config/database';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export class DashboardService {
  async getKpis(companyId: string) {
    const now = new Date();
    const in30 = addDays(now, 30);
    const in60 = addDays(now, 60);

    const [
      docsByStatus,
      pendingApprovals,
      expiringIn30,
      expiringIn60,
      trainingStats,
      pendingReadings,
      overdueReadings,
      recentAudit,
      alertsUnread,
    ] = await Promise.all([
      prisma.document.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { _all: true },
      }),

      prisma.approvalRequest.count({
        where: { companyId, status: 'in_progress' },
      }),

      prisma.document.count({
        where: {
          companyId,
          status: 'published',
          validityEnd: { gte: now, lte: in30 },
        },
      }),

      prisma.document.count({
        where: {
          companyId,
          status: 'published',
          validityEnd: { gt: in30, lte: in60 },
        },
      }),

      prisma.trainingAssignment.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { _all: true },
      }),

      prisma.documentDistribution.count({
        where: {
          companyId,
          isActive: true,
          confirmation: null,
        },
      }),

      prisma.documentDistribution.count({
        where: {
          companyId,
          isActive: true,
          confirmation: null,
          dueDate: { lt: now },
        },
      }),

      prisma.auditLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      prisma.alertNotification.count({
        where: { companyId, isRead: false },
      }),
    ]);

    const docStatusMap: Record<string, number> = {};
    for (const row of docsByStatus) {
      docStatusMap[row.status] = row._count._all;
    }

    const trainingStatusMap: Record<string, number> = {};
    for (const row of trainingStats) {
      trainingStatusMap[row.status] = row._count._all;
    }

    const totalAssignments = Object.values(trainingStatusMap).reduce((a, b) => a + b, 0);
    const completedAssignments = trainingStatusMap['completed'] ?? 0;
    const complianceRate = totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;

    return {
      documents: {
        total: Object.values(docStatusMap).reduce((a, b) => a + b, 0),
        byStatus: docStatusMap,
        expiringIn30,
        expiringIn60,
      },
      approvals: {
        pending: pendingApprovals,
      },
      trainings: {
        total: totalAssignments,
        byStatus: trainingStatusMap,
        complianceRate,
      },
      readings: {
        pending: pendingReadings,
        overdue: overdueReadings,
      },
      alerts: {
        unread: alertsUnread,
      },
      recentActivity: recentAudit.map(l => ({
        id: l.id,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        user: l.userName ?? 'Sistema',
        createdAt: l.createdAt,
      })),
    };
  }

  async getDocumentTrend(companyId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const docs = await prisma.document.findMany({
      where: { companyId, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true },
    });

    const byMonth: Record<string, { created: number; published: number }> = {};
    for (const doc of docs) {
      const key = doc.createdAt.toISOString().slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { created: 0, published: 0 };
      byMonth[key].created++;
      if (doc.status === 'published') byMonth[key].published++;
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => ({ month, ...counts }));
  }

  async getTrainingCompliance(companyId: string) {
    const trainings = await prisma.training.findMany({
      where: { companyId, status: 'active' },
      select: {
        id: true,
        title: true,
        _count: { select: { assignments: true } },
        assignments: {
          select: { status: true },
          where: { companyId },
        },
      },
      take: 10,
    });

    return trainings.map(t => {
      const total = t._count.assignments;
      const completed = t.assignments.filter(a => a.status === 'completed').length;
      const overdue = t.assignments.filter(a => a.status === 'overdue').length;
      return {
        id: t.id,
        title: t.title.length > 30 ? t.title.slice(0, 30) + '…' : t.title,
        total,
        completed,
        overdue,
        pending: total - completed - overdue,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }).filter(t => t.total > 0);
  }
}
