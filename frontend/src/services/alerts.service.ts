import { api } from '../lib/axios';
import type { AlertNotification } from '../types';

export const alertsService = {
  findMine: async () => {
    const { data } = await api.get<{ data: AlertNotification[] }>('/alerts/my');
    return data.data;
  },
  getUnreadCount: async () => {
    const { data } = await api.get<{ data: { count: number } }>('/alerts/unread-count');
    return data.data.count;
  },
  markRead: async (id: string) => {
    await api.post(`/alerts/${id}/read`);
  },
  markAllRead: async () => {
    await api.post('/alerts/read-all');
  },
};
