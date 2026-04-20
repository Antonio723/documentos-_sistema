import { Request, Response, NextFunction } from 'express';
import { ApprovalsService } from './approvals.service';
import { createApprovalSchema, approvalActionSchema, approvalsFilterSchema } from './dto/approval.dto';
import { sendSuccess, sendCreated } from '../../shared/utils/response';

const service = new ApprovalsService();

export class ApprovalsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = approvalsFilterSchema.parse(req.query);
      sendSuccess(res, await service.findAll(req.companyId!, req.user!.id, filters));
    } catch (err) { next(err); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.findById(req.params.id, req.companyId!));
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workflowTemplateId } = createApprovalSchema.parse(req.body);
      const result = await service.createForDocument(req.params.documentId, req.companyId!, req.user!.id, workflowTemplateId);
      sendCreated(res, result, 'Approval request created');
    } catch (err) { next(err); }
  }

  async act(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = approvalActionSchema.parse(req.body);
      const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'unknown';
      const userAgent = req.headers['user-agent'] ?? 'unknown';
      sendSuccess(res, await service.act(req.params.id, req.companyId!, req.user!.id, ip, userAgent, dto));
    } catch (err) { next(err); }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.cancel(req.params.id, req.companyId!, req.user!.id));
    } catch (err) { next(err); }
  }

  async getMyPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getMyPending(req.companyId!, req.user!.id));
    } catch (err) { next(err); }
  }
}
