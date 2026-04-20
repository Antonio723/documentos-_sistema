import { api } from '../lib/axios';
import type { AuditLog, PaginatedResult } from '../types';

export const auditService = {
  findAll: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<AuditLog> }>('/audit', { params });
    return data.data;
  },
  getResources: async () => {
    const { data } = await api.get<{ data: string[] }>('/audit/resources');
    return data.data;
  },
};
