import { Request, Response, NextFunction } from 'express';
import { DocumentTypesService } from './document-types.service';
import { createDocumentTypeSchema, updateDocumentTypeSchema } from './dto/document-type.dto';
import { paginationSchema } from '../../shared/utils/pagination';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response';

const service = new DocumentTypesService();

export class DocumentTypesController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await service.findAll(req.companyId!, page, limit, req.query.search as string);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }

  async findAllActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await service.findAllActive(req.companyId!);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.findById(req.params.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createDocumentTypeSchema.parse(req.body);
      sendCreated(res, await service.create(req.companyId!, dto));
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = updateDocumentTypeSchema.parse(req.body);
      sendSuccess(res, await service.update(req.params.id, req.companyId!, dto));
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.delete(req.params.id, req.companyId!);
      sendNoContent(res);
    } catch (err) { next(err); }
  }
}
