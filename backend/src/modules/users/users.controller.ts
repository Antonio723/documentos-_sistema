import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { createUserSchema, updateUserSchema } from './dto/create-user.dto';
import { paginationSchema } from '../../shared/utils/pagination';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response';

const service = new UsersService();

export class UsersController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const search = req.query.search as string | undefined;
      const result = await service.findAll(req.companyId!, page, limit, search);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await service.findById(req.params.id, req.companyId!);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createUserSchema.parse(req.body);
      const user = await service.create(req.companyId!, dto);
      sendCreated(res, user, 'User created successfully');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = updateUserSchema.parse(req.body);
      const user = await service.update(req.params.id, req.companyId!, dto);
      sendSuccess(res, user, 200, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.delete(req.params.id, req.companyId!);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
}
