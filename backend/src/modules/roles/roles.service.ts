import { RolesRepository } from './roles.repository';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError';

const repo = new RolesRepository();

export class RolesService {
  async findAll(companyId: string, page: number, limit: number, search?: string) {
    const { data, total } = await repo.findAll(companyId, page, limit, search);
    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string, companyId: string) {
    const role = await repo.findById(id, companyId);
    if (!role) throw new NotFoundError('Role');
    return role;
  }

  async create(companyId: string, dto: CreateRoleDto) {
    const role = await repo.create({
      company: { connect: { id: companyId } },
      name: dto.name,
      description: dto.description,
      rolePermissions: {
        create: dto.permissionIds.map((permissionId) => ({
          permission: { connect: { id: permissionId } },
        })),
      },
    });
    return role;
  }

  async update(id: string, companyId: string, dto: UpdateRoleDto) {
    const role = await this.findById(id, companyId);
    if (role.isSystem && dto.name) {
      throw new ForbiddenError('Cannot rename system roles');
    }

    const updated = await repo.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
    });

    if (dto.permissionIds !== undefined) {
      await repo.syncPermissions(id, dto.permissionIds);
    }

    return updated;
  }

  async delete(id: string, companyId: string) {
    const role = await this.findById(id, companyId);
    if (role.isSystem) throw new ForbiddenError('Cannot delete system roles');
    if (role._count.userRoles > 0) {
      throw new ConflictError('Cannot delete role with assigned users');
    }
    return repo.delete(id);
  }

  async findAllPermissions() {
    return repo.findAllPermissions();
  }
}
