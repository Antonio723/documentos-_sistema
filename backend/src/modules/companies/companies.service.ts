import { CompaniesRepository } from './companies.repository';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { NotFoundError } from '../../shared/errors/AppError';

const repo = new CompaniesRepository();

export class CompaniesService {
  async findAll(page: number, limit: number, search?: string) {
    const { data, total } = await repo.findAll(page, limit, search);
    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string) {
    const company = await repo.findById(id);
    if (!company) throw new NotFoundError('Company');
    return company;
  }

  async create(dto: CreateCompanyDto) {
    return repo.create({
      name: dto.name,
      cnpj: dto.cnpj,
      email: dto.email,
      phone: dto.phone,
      plan: dto.plan,
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findById(id);
    return repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return repo.delete(id);
  }
}
