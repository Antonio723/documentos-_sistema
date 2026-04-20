import { api } from '../lib/axios';
import type { User } from '../types';

export interface LoginResponse {
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  user: User;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post<{ data: LoginResponse }>('/auth/login', { email, password });
    return data.data;
  },
  logout: () => api.post('/auth/logout'),
  me: async (): Promise<User> => {
    const { data } = await api.get<{ data: User }>('/auth/me');
    return data.data;
  },
};
