import { Request, Response, NextFunction } from 'express';
import { DocumentsService } from './documents.service';
import { createDocumentSchema, updateDocumentSchema, changeStatusSchema, documentFiltersSchema } from './dto/document.dto';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response';

const service = new DocumentsService();

export class DocumentsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = documentFiltersSchema.parse(req.query);
      sendSuccess(res, await service.findAll(req.companyId!, filters));
    } catch (err) { next(err); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.findById(req.params.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createDocumentSchema.parse(req.body);
      const doc = await service.create(req.companyId!, req.user!.id, dto);
      sendCreated(res, doc, 'Document created successfully');
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = updateDocumentSchema.parse(req.body);
      sendSuccess(res, await service.update(req.params.id, req.companyId!, req.user!.id, dto));
    } catch (err) { next(err); }
  }

  async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = changeStatusSchema.parse(req.body);
      sendSuccess(res, await service.changeStatus(req.params.id, req.companyId!, req.user!.id, dto));
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.delete(req.params.id, req.companyId!);
      sendNoContent(res);
    } catch (err) { next(err); }
  }

  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(422).json({ success: false, code: 'NO_FILE', message: 'No file provided' });
        return;
      }
      const result = await service.uploadFile(req.params.id, req.companyId!, req.user!.id, req.file);
      sendCreated(res, result, 'File uploaded successfully');
    } catch (err) { next(err); }
  }

  async getFileUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await service.getFileUrl(req.params.id, req.companyId!, req.params.fileId);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }
}
