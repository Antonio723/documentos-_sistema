import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../logger/logger';

export interface AuditContext {
  companyId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditEntry {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Prisma.InputJsonValue;
}

export async function logAudit(ctx: AuditContext, entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.userId,
        userName: ctx.userName,
        userEmail: ctx.userEmail,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details ?? undefined,
      },
    });
  } catch (err) {
    logger.error({ msg: 'Failed to write audit log', err, entry });
  }
}
