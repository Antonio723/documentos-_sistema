import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors/AppError';

export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
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
