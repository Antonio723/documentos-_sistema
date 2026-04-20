import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, ValidationError } from '../shared/errors/AppError';
import { logger } from '../shared/logger/logger';

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = req.headers['x-request-id'] as string | undefined;

  if (err instanceof ZodError) {
    logger.warn({ msg: 'Validation error', requestId, issues: err.issues });
    res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ msg: err.message, code: err.code, requestId, stack: err.stack });
    } else {
      logger.warn({ msg: err.message, code: err.code, requestId });
    }
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      logger.warn({ msg: 'Unique constraint violation', meta: err.meta, requestId });
      res.status(409).json({
        success: false,
        code: 'CONFLICT',
        message: 'A record with this data already exists',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Record not found',
      });
      return;
    }
  }

  logger.error({
    msg: 'Unhandled error',
    requestId,
    err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });

  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}
