import api from './api';
import { LoginFormData, RegisterFormData, User } from '../types';

class AuthService {
  private user: User | null = null;
  private userPromise: Promise<User | null> | null = null;
  private authStateListeners: Array<(user: User | null) => void> = [];
  private isInitialized = false;

  /* ---------------------------------- LOGIN ---------------------------------- */
  async login(credentials: LoginFormData): Promise<{ user: User }> {
    try {
      const response = await api.post('/auth/login/', credentials, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const { access, refresh, user } = response.data;
      this._saveTokens(access, refresh);
      this._saveUser(user);
      return { user };
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error);
      throw error;
    }
  }

  /* -------------------------------- REGISTER --------------------------------- */
  async register(userData: RegisterFormData): Promise<{ user: User }> {
    try {
      console.log('Envoi des données d\'inscription au serveur:', {
        ...userData,
        password: '***',
        password2: '***'
      });
      
      const response = await api.post('/auth/register/', userData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        withCredentials: true
      });
      
      console.log('Réponse d\'inscription reçue:', response.data);
      
      if (!response.data.access || !response.data.refresh || !response.data.user) {
        console.error('Réponse d\'inscription incomplète:', response.data);
        throw new Error('Réserve de données incomplète du serveur');
      }
      
      const { access, refresh, user } = response.data;
      this._saveTokens(access, refresh);
      this._saveUser(user);
      this.notifyAuthStateChanged();
      
      console.log('Utilisateur enregistré avec succès:', user);
      return { user };
      
    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      
      // Gestion des erreurs spécifiques
      if (error.response) {
        // Erreur 400 - Validation error
        if (error.response.status === 400) {
          // Renvoyer l'objet d'erreur complet pour un traitement plus fin
          throw error.response.data;
        }
        // Erreur 500 - Erreur serveur
        else if (error.response.status >= 500) {
          throw new Error('Erreur du serveur. Veuillez réessayer plus tard.');
        }
        // Autres erreurs
        else {
          const errorMessage = error.response.data?.detail || 
                             error.response.data?.error ||
                             error.response.data?.message ||
                             'Erreur lors de l\'inscription';
          throw new Error(errorMessage);
        }
      } 
      // Erreur réseau
      else if (error.request) {
        console.error('Aucune réponse du serveur:', error.request);
        throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion Internet.');
      }
      // Erreur de configuration de la requête
      else {
        console.error('Erreur de configuration de la requête:', error.message);
        throw new Error('Erreur de configuration. Veuillez réessayer.');
      }
    }
  }

  /* ------------------------- AUTH STATE LISTENER ---------------------------- */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);
    callback(this.user);

    return () => {
      this.authStateListeners = this.authStateListeners.filter(
        listener => listener !== callback
      );
    };
  }

  private notifyAuthStateChanged() {
    this.authStateListeners.forEach(listener => listener(this.user));
  }

  /* ------------------------------ AUTH HELPERS ------------------------------ */
  private _saveTokens(access: string, refresh: string): void {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
  }

  private _saveUser(userData: User): void {
    this.user = userData;
    localStorage.setItem('user', JSON.stringify(userData));
    this.notifyAuthStateChanged();
  }

  private _clearAuth(): void {
    this.user = null;
    this.userPromise = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    this.notifyAuthStateChanged();
  }

  /* ---------------------------- PUBLIC METHODS ------------------------------ */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getCurrentUser(): User | null {
    if (this.user) return this.user;
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
        return this.user;
      } catch (e) {
        console.error('Failed to parse user data', e);
        return null;
      }
    }
    return null;
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken
      });

      const { access } = response.data;
      localStorage.setItem('access_token', access);
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      return true;
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error);
      this.logout();
      return false;
    }
  }

  logout(): void {
    this._clearAuth();
  }
}

export const authService = new AuthService();