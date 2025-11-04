// src/services/authService.ts
import api from './api';
import { AuthResponse, LoginFormData, RegisterFormData, User } from '../types';

class AuthService {
  private user: User | null = null;
  private userPromise: Promise<User | null> | null = null;
  private authStateListeners: Array<(user: User | null) => void> = [];
  private isInitialized = false;

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

  // === AUTH STATE MANAGEMENT ===
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);
    // Call immediately with current user
    callback(this.user);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(
        listener => listener !== callback
      );
    };
  }

  private notifyAuthStateChanged() {
    this.authStateListeners.forEach(listener => listener(this.user));
  }

  // === INITIALIZATION ===
  async initialize(): Promise<User | null> {
    if (this.isInitialized) {
      return this.user;
    }

    try {
      // Vérifier d'abord si on a un token d'accès
      const accessToken = this.getAccessToken();
      
      if (accessToken) {
        // Définir le token dans les en-têtes API
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        // Récupérer les informations de l'utilisateur
        const user = await this.getCurrentUser();
        this.isInitialized = true;
        return user;
      }
      
      // Si pas de token, vérifier si on a un refresh token
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          const user = await this.getCurrentUser();
          this.isInitialized = true;
          return user;
        }
      }
      
      // Si on arrive ici, on n'est pas authentifié
      this.isInitialized = true;
      return null;
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.isInitialized = true;
      return null;
    }
  }

  // === GET CURRENT USER ===
  async getCurrentUser(forceRefresh = false): Promise<User | null> {
    // If we already have a user and not forcing refresh
    if (this.user && !forceRefresh) {
      return this.user;
    }

    // If a request is already in progress, return the existing promise
    if (this.userPromise && !forceRefresh) {
      return this.userPromise;
    }

    const token = this.getAccessToken();
    if (!token) {
      return null;
    }

    // Créer une nouvelle promesse pour la requête utilisateur
    this.userPromise = (async (): Promise<User | null> => {
      try {
        console.log('authService - Fetching user data from /api/auth/me/');
        const response = await api.get<{ user: User }>('/api/auth/me/');
        
        if (!response || !response.data) {
          throw new Error('Invalid response from server');
        }
        
        const userData = response.data.user || response.data;
        
        if (!userData) {
          throw new Error('No user data in response');
        }
        
        if (!userData.role) {
          console.warn('authService - Aucun rôle défini pour l\'utilisateur, utilisation de "candidat" par défaut');
          userData.role = 'candidat';
        }
        
        console.log('authService - User data received:', userData);
        this._saveUser(userData);
        return userData;
      } catch (error: any) {
        console.error('authService - Erreur lors de la récupération de l\'utilisateur:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        
        // Si le token a expiré, on tente de le rafraîchir
        if (error.response?.status === 401) {
          try {
            const refreshed = await this.refreshToken();
            if (refreshed) {
              // Si le rafraîchissement a réussi, on réessaye une seule fois
              return this.getCurrentUser(true);
            }
          } catch (refreshError) {
            console.error('authService - Erreur lors du rafraîchissement du token:', refreshError);
          }
          // Si le rafraîchissement échoue, on se déconnecte
          this.logout();
        }
        
        return null;
      } finally {
        // Toujours réinitialiser la promesse actuelle
        this.userPromise = null;
      }
    })();

    return this.userPromise;
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
    this.user = null;
    this.userPromise = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.notifyAuthStateChanged();
    window.location.href = '/login';
  }

  // === HELPERS ===
  private _saveTokens(access: string, refresh?: string): void {
    try {
      localStorage.setItem('access_token', access);
      if (refresh) {
        localStorage.setItem('refresh_token', refresh);
      }
      // Mettre à jour l'en-tête d'autorisation
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      console.log('Tokens enregistrés avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des tokens:', error);
      throw new Error('Impossible d\'enregistrer les jetons d\'authentification');
    }
  }

  private _saveUser(user: User): void {
    try {
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Utilisateur enregistré:', user);
      this.notifyAuthStateChanged();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'utilisateur:', error);
      throw new Error('Impossible d\'enregistrer les informations de l\'utilisateur');
    }
  }

  private lastAuthCheck: number = 0;
  private authCheckCache: { result: boolean; expiresAt: number } | null = null;
  private readonly AUTH_CACHE_DURATION = 1000; // Cache for 1 second

  isAuthenticated(): boolean {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.authCheckCache && now < this.authCheckCache.expiresAt) {
      return this.authCheckCache.result;
    }

    const token = this.getAccessToken();
    const isAuthenticated = !!token;
    
    // Cache the result
    this.authCheckCache = {
      result: isAuthenticated,
      expiresAt: now + this.AUTH_CACHE_DURATION
    };
    
    // Log only when the result changes
    if (this.lastAuthCheck === 0 || (this.authCheckCache.result !== (this.lastAuthCheck > 0))) {
      console.log(`authService - État d'authentification: ${isAuthenticated ? 'Connecté' : 'Non connecté'}`);
    }
    
    this.lastAuthCheck = isAuthenticated ? now : -now;
    
    return isAuthenticated;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

export const authService = new AuthService();