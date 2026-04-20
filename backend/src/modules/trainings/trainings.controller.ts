import { Request, Response, NextFunction } from 'express';
import { TrainingsService } from './trainings.service';
import {
  createTrainingSchema, updateTrainingSchema, assignUsersSchema,
  recordCompletionSchema, trainingsFilterSchema, myAssignmentsFilterSchema,
} from './dto/training.dto';
import { sendSuccess, sendCreated } from '../../shared/utils/response';

const service = new TrainingsService();

export class TrainingsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = trainingsFilterSchema.parse(req.query);
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
      const dto = createTrainingSchema.parse(req.body);
      sendCreated(res, await service.create(req.companyId!, req.user!.id, dto));
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = updateTrainingSchema.parse(req.body);
      sendSuccess(res, await service.update(req.params.id, req.companyId!, req.user!.id, dto));
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.delete(req.params.id, req.companyId!, req.user!.id);
      sendSuccess(res, null);
    } catch (err) { next(err); }
  }

  async assignUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = assignUsersSchema.parse(req.body);
      sendCreated(res, await service.assignUsers(req.params.id, req.companyId!, req.user!.id, dto));
    } catch (err) { next(err); }
  }

  async recordCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = recordCompletionSchema.parse(req.body);
      sendSuccess(res, await service.recordCompletion(req.params.assignmentId, req.companyId!, req.user!.id, dto));
    } catch (err) { next(err); }
  }

  async findMyAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = myAssignmentsFilterSchema.parse(req.query);
      sendSuccess(res, await service.findMyAssignments(req.user!.id, req.companyId!, filters));
    } catch (err) { next(err); }
  }

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await service.getCategories(req.companyId!));
    } catch (err) { next(err); }
  }
}
