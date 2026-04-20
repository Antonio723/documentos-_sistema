import { api } from '../lib/axios';

export interface DashboardKpis {
  documents: {
    total: number;
    byStatus: Record<string, number>;
    expiringIn30: number;
    expiringIn60: number;
  };
  approvals: { pending: number };
  trainings: {
    total: number;
    byStatus: Record<string, number>;
    complianceRate: number;
  };
  readings: { pending: number; overdue: number };
  alerts: { unread: number };
  recentActivity: {
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    user: string;
    createdAt: string;
  }[];
}

export interface DocumentTrendItem {
  month: string;
  created: number;
  published: number;
}

export interface TrainingComplianceItem {
  id: string;
  title: string;
  total: number;
  completed: number;
  overdue: number;
  pending: number;
  rate: number;
}

export const dashboardService = {
  getKpis: async (): Promise<DashboardKpis> => {
    const { data } = await api.get<{ data: DashboardKpis }>('/dashboard/kpis');
    return data.data;
  },
  getDocumentTrend: async (): Promise<DocumentTrendItem[]> => {
    const { data } = await api.get<{ data: DocumentTrendItem[] }>('/dashboard/document-trend');
    return data.data;
  },
  getTrainingCompliance: async (): Promise<TrainingComplianceItem[]> => {
    const { data } = await api.get<{ data: TrainingComplianceItem[] }>('/dashboard/training-compliance');
    return data.data;
  },
};
