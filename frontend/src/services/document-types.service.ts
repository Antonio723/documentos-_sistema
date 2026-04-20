import { api } from '../lib/axios';
import type { DocumentType, PaginatedResult } from '../types';

export const documentTypesService = {
  findAll: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<DocumentType> }>('/document-types', { params });
    return data.data;
  },
  findAllActive: async () => {
    const { data } = await api.get<{ data: DocumentType[] }>('/document-types/active');
    return data.data;
  },
  findById: async (id: string) => {
    const { data } = await api.get<{ data: DocumentType }>(`/document-types/${id}`);
    return data.data;
  },
  create: async (payload: unknown) => {
    const { data } = await api.post<{ data: DocumentType }>('/document-types', payload);
    return data.data;
  },
  update: async (id: string, payload: unknown) => {
    const { data } = await api.patch<{ data: DocumentType }>(`/document-types/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => api.delete(`/document-types/${id}`),
};
