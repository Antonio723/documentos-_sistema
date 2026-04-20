import { api } from '../lib/axios';
import type { User, Role, Permission, PaginatedResult } from '../types';

export const usersService = {
  findAll: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<User> }>('/users', { params });
    return data.data;
  },
  findById: async (id: string) => {
    const { data } = await api.get<{ data: User }>(`/users/${id}`);
    return data.data;
  },
  create: async (payload: unknown) => {
    const { data } = await api.post<{ data: User }>('/users', payload);
    return data.data;
  },
  update: async (id: string, payload: unknown) => {
    const { data } = await api.patch<{ data: User }>(`/users/${id}`, payload);
    return data.data;
  },
  syncRoles: async (id: string, roleIds: string[]) => {
    const { data } = await api.put<{ data: User }>(`/users/${id}/roles`, { roleIds });
    return data.data;
  },
  delete: async (id: string) => {
    await api.delete(`/users/${id}`);
  },
};

export const rolesService = {
  findAll: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<Role> }>('/roles', { params });
    return data.data;
  },
  findById: async (id: string) => {
    const { data } = await api.get<{ data: Role }>(`/roles/${id}`);
    return data.data;
  },
  findAllPermissions: async () => {
    const { data } = await api.get<{ data: Permission[] }>('/roles/permissions');
    return data.data;
  },
  create: async (payload: unknown) => {
    const { data } = await api.post<{ data: Role }>('/roles', payload);
    return data.data;
  },
  update: async (id: string, payload: unknown) => {
    const { data } = await api.patch<{ data: Role }>(`/roles/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => {
    await api.delete(`/roles/${id}`);
  },
};
