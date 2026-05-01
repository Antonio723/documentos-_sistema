import bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError';
import { invalidateUserPermissionsCache } from '../../middlewares/rbac.middleware';

const repo = new UsersRepository();

type WithUserRoles = { userRoles: { role: { id: string; name: string } }[] };

function serializeUser<T extends WithUserRoles>(user: T) {
  const { userRoles, ...rest } = user;
  return { ...rest, roles: userRoles.map((ur) => ur.role) };
}

export class UsersService {
  async findAll(companyId: string, page: number, limit: number, search?: string) {
    const { data, total } = await repo.findAll(companyId, page, limit, search);
    return buildPaginatedResult(data.map(serializeUser), total, page, limit);
  }

  async findById(id: string, companyId: string) {
    const user = await repo.findById(id, companyId);
    if (!user) throw new NotFoundError('User');
    return serializeUser(user);
  }

  async create(companyId: string, dto: CreateUserDto) {
    const existing = await repo.findByEmail(dto.email, companyId);
    if (existing) throw new ConflictError('Email already in use within this company');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await repo.create({
      company: { connect: { id: companyId } },
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      userRoles: {
        create: dto.roleIds.map((roleId) => ({ role: { connect: { id: roleId } } })),
      },
    });

    return serializeUser(user);
  }

  async update(id: string, companyId: string, dto: UpdateUserDto) {
    await this.findById(id, companyId);

    if (dto.email) {
      const existing = await repo.findByEmail(dto.email, companyId);
      if (existing && existing.id !== id) {
        throw new ConflictError('Email already in use');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, 12);

    if (dto.roleIds) {
      await repo.syncRoles(id, dto.roleIds);
      await invalidateUserPermissionsCache(id);
    }

    const user = await repo.update(id, updateData);
    return serializeUser(user);
  }

  async delete(id: string, companyId: string) {
    await this.findById(id, companyId);
    await invalidateUserPermissionsCache(id);
    return repo.delete(id);
  }
}
