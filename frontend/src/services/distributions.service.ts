import { api } from '../lib/axios';
import type { DocumentDistribution, PaginatedResult } from '../types';

export interface CreateDistributionPayload {
  userIds: string[];
  copyType: 'controlled' | 'uncontrolled';
  dueDate?: string;
  notes?: string;
}

export const distributionsService = {
  distribute: async (documentId: string, payload: CreateDistributionPayload) => {
    const { data } = await api.post<{ data: DocumentDistribution[] }>(
      `/documents/${documentId}/distributions`,
      payload,
    );
    return data.data;
  },

  findByDocument: async (documentId: string) => {
    const { data } = await api.get<{ data: DocumentDistribution[] }>(
      `/documents/${documentId}/distributions`,
    );
    return data.data;
  },

  findMine: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<DocumentDistribution> }>(
      '/distributions/my',
      { params },
    );
    return data.data;
  },

  findMyPending: async () => {
    const { data } = await api.get<{ data: DocumentDistribution[] }>('/distributions/my-pending');
    return data.data;
  },

  findById: async (id: string) => {
    const { data } = await api.get<{ data: DocumentDistribution }>(`/distributions/${id}`);
    return data.data;
  },

  confirm: async (id: string) => {
    const { data } = await api.post<{ data: unknown }>(`/distributions/${id}/confirm`);
    return data.data;
  },

  getDownloadUrl: (id: string) => `/distributions/${id}/download`,
};
