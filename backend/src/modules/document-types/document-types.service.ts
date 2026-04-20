import { DocumentTypesRepository } from './document-types.repository';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from './dto/document-type.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { ConflictError, NotFoundError, AppError } from '../../shared/errors/AppError';

const repo = new DocumentTypesRepository();

export class DocumentTypesService {
  async findAll(companyId: string, page: number, limit: number, search?: string) {
    const { data, total } = await repo.findAll(companyId, page, limit, search);
    return buildPaginatedResult(data, total, page, limit);
  }

  async findAllActive(companyId: string) {
    const { data } = await repo.findAll(companyId, 1, 1000);
    return data.filter((dt) => dt.isActive);
  }

  async findById(id: string, companyId: string) {
    const dt = await repo.findById(id, companyId);
    if (!dt) throw new NotFoundError('Document type');
    return dt;
  }

  async create(companyId: string, dto: CreateDocumentTypeDto) {
    const existing = await repo.findByCode(dto.code, companyId);
    if (existing) throw new ConflictError(`Code "${dto.code}" is already in use`);
    return repo.create({ company: { connect: { id: companyId } }, ...dto });
  }

  async update(id: string, companyId: string, dto: UpdateDocumentTypeDto) {
    await this.findById(id, companyId);
    if (dto.code) {
      const existing = await repo.findByCode(dto.code, companyId);
      if (existing && existing.id !== id) throw new ConflictError(`Code "${dto.code}" is already in use`);
    }
    return repo.update(id, dto);
  }

  async delete(id: string, companyId: string) {
    const dt = await this.findById(id, companyId);
    if (dt._count.documents > 0) throw new AppError('Cannot delete type with existing documents', 409, 'CONFLICT');
    return repo.delete(id);
  }
}
