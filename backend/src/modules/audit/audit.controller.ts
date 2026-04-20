import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { auditFilterSchema } from './dto/audit.dto';
import { sendSuccess } from '../../shared/utils/response';

const service = new AuditService();

export class AuditController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = auditFilterSchema.parse(req.query);
      sendSuccess(res, await service.findAll(req.companyId!, filters));
    } catch (err) { next(err); }
  }

  async getResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getResources(req.companyId!));
    } catch (err) { next(err); }
  }
}
