import { Request, Response, NextFunction } from 'express';
import { DocumentVersionsService } from './document-versions.service';
import { createVersionSchema } from './dto/version.dto';
import { sendSuccess, sendCreated } from '../../shared/utils/response';

const service = new DocumentVersionsService();

export class DocumentVersionsController {
  async findByDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.findByDocument(req.params.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getHistory(req.params.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async createNewVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createVersionSchema.parse(req.body);
      const result = await service.createNewVersion(req.params.id, req.companyId!, req.user!.id, dto);
      sendCreated(res, result, 'New revision created successfully');
    } catch (err) { next(err); }
  }
}
