import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '../../shared/utils/response';

const svc = new DashboardService();

export class DashboardController {
  async getKpis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await svc.getKpis(req.companyId!));
    } catch (err) { next(err); }
  }

  async getDocumentTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await svc.getDocumentTrend(req.companyId!));
    } catch (err) { next(err); }
  }

  async getTrainingCompliance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await svc.getTrainingCompliance(req.companyId!));
    } catch (err) { next(err); }
  }
}
