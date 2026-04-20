import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ForbiddenError } from '../shared/errors/AppError';
import { redis } from '../config/redis';

export function requirePermission(resource: string, action: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) throw new ForbiddenError();

    // Master users bypass RBAC
    if (user.isMaster) {
      return next();
    }

    const cacheKey = `rbac:${user.id}:${resource}:${action}`;
    const cached = await redis.get(cacheKey);

    if (cached !== null) {
      if (cached === '1') return next();
      throw new ForbiddenError(`Missing permission: ${resource}:${action}`);
    }

    const permissionRecord = await prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    });

    if (!permissionRecord) {
      await redis.setex(cacheKey, 300, '0');
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

    const result = hasPermission ? '1' : '0';
    await redis.setex(cacheKey, 300, result);

    if (!hasPermission) {
      throw new ForbiddenError(`Missing permission: ${resource}:${action}`);
    }

    next();
  };
}

export function invalidateUserPermissionsCache(userId: string): Promise<void> {
  return redis.keys(`rbac:${userId}:*`).then((keys) => {
    if (keys.length > 0) {
      return redis.del(...keys).then(() => undefined);
    }
    return Promise.resolve();
  });
}
