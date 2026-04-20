import { AuditRepository } from './audit.repository';
import { AuditFilterDto } from './dto/audit.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';

const repo = new AuditRepository();

export class AuditService {
  async findAll(companyId: string, filters: AuditFilterDto) {
    const { data, total } = await repo.findAll(companyId, filters);
    return buildPaginatedResult(data, total, filters.page, filters.limit);
  }

  async getResources(companyId: string) {
    return repo.getResources(companyId);
  }
}
