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
    console.log('authService - getCurrentUser - Début');
    
    if (this.user) {
      console.log('authService - Utilisateur déjà en mémoire:', {
        ...this.user,
        hasRole: 'role' in this.user,
        roleValue: (this.user as any).role,
        keys: Object.keys(this.user)
      });
      return this.user;
    }

    const token = this.getAccessToken();
    console.log('authService - Token d\'accès trouvé:', !!token);
    
    if (!token) {
      console.log('authService - Aucun token d\'accès trouvé');
      return null;
    }

    try {
      console.log('authService - Récupération des données utilisateur depuis l\'API...');
      const response = await api.get<{ user: User }>('/api/auth/me/');

      console.log('authService - Réponse complète de l\'API:', response);
      console.log('authService - Données utilisateur brutes:', response.data);
      
      // Vérifier si la réponse contient un objet user imbriqué
      const userData = response.data.user || response.data;
      
      console.log('authService - Données utilisateur traitées:', {
        ...userData,
        hasRole: 'role' in userData,
        roleValue: (userData as any).role,
        keys: Object.keys(userData)
      });
      
      // S'assurer que le rôle est correctement défini
      if (!userData.role) {
        console.warn('authService - Aucun rôle défini pour l\'utilisateur, utilisation de "candidat" par défaut');
        userData.role = 'candidat';
      }
      
      this._saveUser(userData);
      
      return userData;
    } catch (error: any) {
      console.error('authService - Erreur lors de la récupération de l\'utilisateur:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 401) {
        console.log('authService - Tentative de rafraîchissement du token...');
        const refreshed = await this.refreshToken();
        if (refreshed) {
          console.log('authService - Token rafraîchi avec succès, nouvelle tentative...');
          return this.getCurrentUser();
        } else {
          console.log('authService - Échec du rafraîchissement du token');
        }
      }
      
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
    const token = this.getAccessToken();
    console.log('authService - Vérification de l\'authentification, token présent:', !!token);
    
    // Si pas de token, l'utilisateur n'est pas authentifié
    if (!token) {
      console.log('authService - Aucun token trouvé');
      return false;
    }

    // Vérifier si le token est expiré (optionnel, nécessite une librairie comme jwt-decode)
    // Pour l'instant, on considère que si le token existe, il est valide
    // Vous pouvez décommenter le code ci-dessous pour ajouter une vérification d'expiration
    /*
    try {
      const decoded = jwtDecode<{ exp: number }>(token);
      const isExpired = decoded.exp < Date.now() / 1000;
      if (isExpired) {
        console.log('authService - Token expiré');
        return false;
      }
    } catch (error) {
      console.error('authService - Erreur lors de la vérification du token:', error);
      return false;
    }
    */
    
    return true;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

export const authService = new AuthService();