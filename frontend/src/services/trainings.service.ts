import { api } from '../lib/axios';
import type { Training, TrainingAssignment, TrainingCompletion, PaginatedResult } from '../types';

export interface CreateTrainingPayload {
  title: string; description?: string; documentId?: string; category?: string;
  durationHours?: number; validityMonths?: number; passingScore?: number;
  status: 'draft' | 'active' | 'archived';
}

export interface AssignUsersPayload {
  userIds: string[]; dueDate?: string; notes?: string;
}

export interface RecordCompletionPayload {
  score?: number; passed?: boolean; notes?: string;
}

export const trainingsService = {
  findAll: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<Training> }>('/trainings', { params });
    return data.data;
  },
  findById: async (id: string) => {
    const { data } = await api.get<{ data: Training }>(`/trainings/${id}`);
    return data.data;
  },
  create: async (payload: CreateTrainingPayload) => {
    const { data } = await api.post<{ data: Training }>('/trainings', payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<CreateTrainingPayload>) => {
    const { data } = await api.patch<{ data: Training }>(`/trainings/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => api.delete(`/trainings/${id}`),
  assign: async (trainingId: string, payload: AssignUsersPayload) => {
    const { data } = await api.post<{ data: TrainingAssignment[] }>(`/trainings/${trainingId}/assign`, payload);
    return data.data;
  },
  recordCompletion: async (assignmentId: string, payload: RecordCompletionPayload) => {
    const { data } = await api.post<{ data: TrainingCompletion }>(`/trainings/assignments/${assignmentId}/complete`, payload);
    return data.data;
  },
  findMine: async (params?: Record<string, unknown>) => {
    const { data } = await api.get<{ data: PaginatedResult<TrainingAssignment> }>('/trainings/my', { params });
    return data.data;
  },
  getCategories: async () => {
    const { data } = await api.get<{ data: string[] }>('/trainings/categories');
    return data.data;
  },
};
