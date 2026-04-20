import { Request, Response, NextFunction } from 'express';
import { RolesService } from './roles.service';
import { createRoleSchema, updateRoleSchema } from './dto/create-role.dto';
import { paginationSchema } from '../../shared/utils/pagination';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response';

const service = new RolesService();

export class RolesController {
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
      const role = await service.findById(req.params.id, req.companyId!);
      sendSuccess(res, role);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createRoleSchema.parse(req.body);
      const role = await service.create(req.companyId!, dto);
      sendCreated(res, role, 'Role created successfully');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = updateRoleSchema.parse(req.body);
      const role = await service.update(req.params.id, req.companyId!, dto);
      sendSuccess(res, role, 200, 'Role updated successfully');
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

  async findAllPermissions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await service.findAllPermissions();
      sendSuccess(res, permissions);
    } catch (err) {
      next(err);
    }
  }
}
