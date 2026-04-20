import { Request, Response, NextFunction } from 'express';
import { AlertsService } from './alerts.service';
import { sendSuccess } from '../../shared/utils/response';

const service = new AlertsService();

export class AlertsController {
  async findMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.findMine(req.user!.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async countUnread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await service.countUnread(req.user!.id, req.companyId!);
      sendSuccess(res, { count });
    } catch (err) { next(err); }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.markRead(req.params.id, req.user!.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.markAllRead(req.user!.id, req.companyId!));
    } catch (err) { next(err); }
  }
}
