// src/services/authService.ts
import api from './api';
import { AuthResponse, LoginFormData, RegisterFormData, User } from '../types';

class AuthService {
  private user: User | null = null;

  // === LOGIN ===
  async login(credentials: LoginFormData): Promise<{ user: User }> {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login/', credentials);
      const { access, refresh, user } = response.data;

      this._saveTokens(access, refresh);
      this._saveUser(user);

      return { user };
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error);
      throw error;
    }
  }

  // === REGISTER ===
  async register(userData: RegisterFormData): Promise<{ user: User }> {
    try {
      const response = await api.post<AuthResponse>('/api/auth/register/', userData);
      const { access, refresh, user } = response.data;

      this._saveTokens(access, refresh);
      this._saveUser(user);

      return { user };
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error);
      throw error;
    }
  }

  // === GET CURRENT USER ===
  async getCurrentUser(): Promise<User | null> {
    if (this.user) return this.user;

    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const response = await api.get<User>('/api/auth/me/', {
        headers: {
          Authorization: `Bearer ${token}`, // CORRIGÉ
        },
      });

      this._saveUser(response.data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.getCurrentUser();
        }
      }
      console.error('Failed to fetch user:', error);
      this.logout();
      return null;
    }
  }

  // === REFRESH TOKEN ===
  async refreshToken(): Promise<boolean> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;

    try {
      const response = await api.post<{ access: string }>('/api/auth/token/refresh/', {
        refresh,
      });

      const { access } = response.data;
      this._saveTokens(access, refresh);
      return true;
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error);
      this.logout();
      return false;
    }
  }

  // === LOGOUT ===
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.user = null;
    window.location.href = '/login';
  }

  // === HELPERS ===
  private _saveTokens(access: string, refresh?: string): void {
    localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
  }

  private _saveUser(user: User): void {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

export const authService = new AuthService();