import { api } from '../lib/axios';
import type { Company, PaginatedResult } from '../types';

export const companiesService = {
  findAll: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<Company> }>('/companies', { params });
    return data.data;
  },
  findById: async (id: string) => {
    const { data } = await api.get<{ data: Company }>(`/companies/${id}`);
    return data.data;
  },
  create: async (payload: unknown) => {
    const { data } = await api.post<{ data: Company }>('/companies', payload);
    return data.data;
  },
  update: async (id: string, payload: unknown) => {
    const { data } = await api.patch<{ data: Company }>(`/companies/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => {
    await api.delete(`/companies/${id}`);
  },
};
