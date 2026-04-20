import { WorkflowsRepository } from './workflows.repository';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { NotFoundError, AppError } from '../../shared/errors/AppError';

const repo = new WorkflowsRepository();

export class WorkflowsService {
  async findAll(companyId: string, page: number, limit: number) {
    const { data, total } = await repo.findAll(companyId, page, limit);
    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string, companyId: string) {
    const wf = await repo.findById(id, companyId);
    if (!wf) throw new NotFoundError('Workflow template');
    return wf;
  }

  async create(companyId: string, dto: CreateWorkflowDto) {
    return repo.create(companyId, dto);
  }

  async update(id: string, companyId: string, dto: UpdateWorkflowDto) {
    await this.findById(id, companyId);
    return repo.update(id, dto);
  }

  async delete(id: string, companyId: string) {
    const wf = await this.findById(id, companyId);
    if (wf._count.requests > 0) {
      throw new AppError('Cannot delete workflow with existing approval requests', 409, 'CONFLICT');
    }
    return repo.delete(id);
  }
}
