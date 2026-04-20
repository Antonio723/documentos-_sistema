import { Request, Response, NextFunction } from 'express';
import { WorkflowsService } from './workflows.service';
import { createWorkflowSchema, updateWorkflowSchema } from './dto/workflow.dto';
import { paginationSchema } from '../../shared/utils/pagination';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response';

const service = new WorkflowsService();

export class WorkflowsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      sendSuccess(res, await service.findAll(req.companyId!, page, limit));
    } catch (err) { next(err); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.findById(req.params.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendCreated(res, await service.create(req.companyId!, createWorkflowSchema.parse(req.body)));
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.update(req.params.id, req.companyId!, updateWorkflowSchema.parse(req.body)));
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.delete(req.params.id, req.companyId!);
      sendNoContent(res);
    } catch (err) { next(err); }
  }
}
