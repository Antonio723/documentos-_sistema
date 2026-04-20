import { api } from '../lib/axios';
import type { Document, DocumentVersion, StatusHistory, PaginatedResult } from '../types';

export const documentsService = {
  findAll: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<Document> }>('/documents', { params });
    return data.data;
  },
  findById: async (id: string) => {
    const { data } = await api.get<{ data: Document }>(`/documents/${id}`);
    return data.data;
  },
  create: async (payload: unknown) => {
    const { data } = await api.post<{ data: Document }>('/documents', payload);
    return data.data;
  },
  update: async (id: string, payload: unknown) => {
    const { data } = await api.patch<{ data: Document }>(`/documents/${id}`, payload);
    return data.data;
  },
  changeStatus: async (id: string, status: string, comment?: string) => {
    const { data } = await api.patch<{ data: Document }>(`/documents/${id}/status`, { status, comment });
    return data.data;
  },
  delete: async (id: string) => api.delete(`/documents/${id}`),
  uploadFile: async (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(`/documents/${id}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
  getFileUrl: async (id: string, fileId: string) => {
    const { data } = await api.get<{ data: { url: string; expiresIn: number } }>(
      `/documents/${id}/files/${fileId}/url`,
    );
    return data.data;
  },
  getVersions: async (id: string) => {
    const { data } = await api.get<{ data: DocumentVersion[] }>(`/documents/${id}/versions`);
    return data.data;
  },
  getHistory: async (id: string) => {
    const { data } = await api.get<{ data: StatusHistory[] }>(`/documents/${id}/versions/history`);
    return data.data;
  },
  createNewVersion: async (id: string, reason: string) => {
    const { data } = await api.post(`/documents/${id}/versions/new-version`, { reason });
    return data.data;
  },
};
