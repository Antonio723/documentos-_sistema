import { api } from '../lib/axios';
import type { ApprovalRequest, PaginatedResult } from '../types';

export const approvalsService = {
  findAll: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<ApprovalRequest> }>('/approvals', { params });
    return data.data;
  },
  findById: async (id: string) => {
    const { data } = await api.get<{ data: ApprovalRequest }>(`/approvals/${id}`);
    return data.data;
  },
  getMyPending: async () => {
    const { data } = await api.get<{ data: ApprovalRequest[] }>('/approvals/my-pending');
    return data.data;
  },
  create: async (documentId: string, workflowTemplateId: string) => {
    const { data } = await api.post<{ data: ApprovalRequest }>(`/approvals/documents/${documentId}`, { workflowTemplateId });
    return data.data;
  },
  act: async (id: string, action: string, comment?: string) => {
    const { data } = await api.post<{ data: ApprovalRequest }>(`/approvals/${id}/act`, { action, comment });
    return data.data;
  },
  cancel: async (id: string) => {
    const { data } = await api.post<{ data: ApprovalRequest }>(`/approvals/${id}/cancel`);
    return data.data;
  },
};
