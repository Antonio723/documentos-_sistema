import { api } from '../lib/axios';
import type { WorkflowTemplate, PaginatedResult } from '../types';

export const workflowsService = {
  findAll: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<WorkflowTemplate> }>('/workflows', { params });
    return data.data;
  },
  findById: async (id: string) => {
    const { data } = await api.get<{ data: WorkflowTemplate }>(`/workflows/${id}`);
    return data.data;
  },
  create: async (payload: unknown) => {
    const { data } = await api.post<{ data: WorkflowTemplate }>('/workflows', payload);
    return data.data;
  },
  update: async (id: string, payload: unknown) => {
    const { data } = await api.patch<{ data: WorkflowTemplate }>(`/workflows/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => api.delete(`/workflows/${id}`),
};
