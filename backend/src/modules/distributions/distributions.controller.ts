import { Request, Response, NextFunction } from 'express';
import { DistributionsService } from './distributions.service';
import { createDistributionSchema, distributionFilterSchema } from './dto/distribution.dto';
import { sendSuccess, sendCreated } from '../../shared/utils/response';

const service = new DistributionsService();

export class DistributionsController {
  async distribute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createDistributionSchema.parse(req.body);
      const result = await service.distribute(req.params.documentId, req.companyId!, req.user!.id, dto);
      sendCreated(res, result, 'Distribuição realizada');
    } catch (err) { next(err); }
  }

  async findByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.findByDocument(req.params.documentId, req.companyId!));
    } catch (err) { next(err); }
  }

  async findMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = distributionFilterSchema.parse(req.query);
      sendSuccess(res, await service.findMine(req.user!.id, req.companyId!, filters));
    } catch (err) { next(err); }
  }

  async findMyPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.findMyPending(req.user!.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.findById(req.params.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'unknown';
      const userAgent = req.headers['user-agent'] ?? 'unknown';
      sendSuccess(res, await service.confirmReading(req.params.id, req.companyId!, req.user!.id, ip, userAgent));
    } catch (err) { next(err); }
  }

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { buffer, filename } = await service.downloadWithWatermark(req.params.id, req.companyId!, req.user!.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) { next(err); }
  }
}
