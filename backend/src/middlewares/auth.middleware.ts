import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/AppError';
import { JwtPayload } from '../modules/auth/auth.types';
import { prisma } from '../config/database';

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (env.AUTH_DISABLED) {
    const master = await prisma.user.findFirst({ where: { isMaster: true } });
    if (!master) {
      throw new UnauthorizedError('AUTH_DISABLED is on but no master user found — run: npx prisma db seed');
    }
    req.user = { id: master.id, email: master.email, companyId: master.companyId, isMaster: true, sub: master.id };
    req.companyId = master.companyId;
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    req.companyId = payload.companyId;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}
