// src/services/authService.ts
import api from './api';
import { AuthResponse, LoginFormData, RegisterFormData, User } from '../types';

class AuthService {
  private user: User | null = null;

  async login(credentials: LoginFormData): Promise<{ user: User }> {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login/', credentials);
      const { access, refresh, user } = response.data;
      
      // Stocker les tokens dans le localStorage
      localStorage.setItem('access_token', access);
      if (refresh) {
        localStorage.setItem('refresh_token', refresh);
      }
      
      // Mettre à jour l'utilisateur actuel
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
      
      return { user };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData: RegisterFormData): Promise<{ user: User }> {
    try {
      const response = await api.post<AuthResponse>('/api/auth/register/', userData);
      const { access, refresh, user } = response.data;
      
      // Stocker les tokens dans le localStorage
      localStorage.setItem('access_token', access);
      if (refresh) {
        localStorage.setItem('refresh_token', refresh);
      }
      
      // Mettre à jour l'utilisateur actuel
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
      
      return { user };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    // Si l'utilisateur est déjà en mémoire, on le retourne
    if (this.user) {
      return this.user;
    }

    // Sinon, on essaie de le récupérer depuis le localStorage
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const parsedUser = JSON.parse(userJson);
        if (parsedUser && typeof parsedUser === 'object') {
          this.user = parsedUser as User;
          return this.user;
        }
        throw new Error('Invalid user data in localStorage');
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
        localStorage.removeItem('user');
      }
    }

    // Si on n'a pas pu récupérer l'utilisateur, on fait une requête au serveur
    try {
      const response = await api.get<User>('/api/auth/me/');
      if (response.data) {
        this.user = response.data;
        localStorage.setItem('user', JSON.stringify(this.user));
        return this.user;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch current user', error);
      return null;
    }
  }

  logout(): void {
    // Supprimer les tokens et les données utilisateur
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.user = null;
    window.location.href = '/login';
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

export const authService = new AuthService();