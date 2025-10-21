
import { apiClient } from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiClient.post('/api/auth/login/', { email, password });
  },

  async register(email: string, password: string, role: 'candidat' | 'recruteur'): Promise<AuthResponse> {
    return apiClient.post('/api/auth/register/', { email, password, role });
  },

  async logout(): Promise<void> {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async getCurrentUser(): Promise<User> {
    return apiClient.get('/api/auth/me/');
  },

  setToken(token: string) {
    localStorage.setItem('access_token', token);
  },

  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },
};

