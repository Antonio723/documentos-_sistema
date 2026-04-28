import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ForbiddenError } from '../shared/errors/AppError';
import { env } from '../config/env';

export function requirePermission(resource: string, action: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (env.AUTH_DISABLED) return next();

    const user = req.user;
    if (!user) throw new ForbiddenError();

    if (user.isMaster) {
      return next();
    }

    const permissionRecord = await prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    });

    if (!permissionRecord) {
      throw new ForbiddenError(`Missing permission: ${resource}:${action}`);
    }

    const hasPermission = await prisma.rolePermission.findFirst({
      where: {
        permissionId: permissionRecord.id,
        role: {
          companyId: user.companyId,
          userRoles: { some: { userId: user.id } },
        },
      },
    });

    if (!hasPermission) {
      throw new ForbiddenError(`Missing permission: ${resource}:${action}`);
    }

    next();
  };
}

export function invalidateUserPermissionsCache(_userId: string): Promise<void> {
  return Promise.resolve();
}
