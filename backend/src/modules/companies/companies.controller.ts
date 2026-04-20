import { Request, Response, NextFunction } from 'express';
import { CompaniesService } from './companies.service';
import { createCompanySchema, updateCompanySchema } from './dto/create-company.dto';
import { paginationSchema } from '../../shared/utils/pagination';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response';

const service = new CompaniesService();

export class CompaniesController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const search = req.query.search as string | undefined;
      const result = await service.findAll(page, limit, search);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const company = await service.findById(req.params.id);
      sendSuccess(res, company);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createCompanySchema.parse(req.body);
      const company = await service.create(dto);
      sendCreated(res, company, 'Company created successfully');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = updateCompanySchema.parse(req.body);
      const company = await service.update(req.params.id, dto);
      sendSuccess(res, company, 200, 'Company updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await service.delete(req.params.id);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
}
