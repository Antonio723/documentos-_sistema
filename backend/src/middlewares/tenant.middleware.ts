import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors/AppError';
import { env } from '../config/env';

export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (env.AUTH_DISABLED) return next();

  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  const companyId = req.user.companyId;

  if (!companyId) {
    throw new ForbiddenError('Tenant context missing');
  }

  req.companyId = companyId;
  next();
}
