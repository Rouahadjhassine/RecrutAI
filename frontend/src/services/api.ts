import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Configuration de l'URL de base de l'API pour le développement
const API_BASE_URL = 'http://localhost:8000/api/v1/';

console.log('=== API Configuration ===');
console.log('API Base URL:', API_BASE_URL);
console.log('Mode: Développement (sans proxy)');
console.log('========================');

// Création d'une instance axios avec une configuration de base
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
  timeout: 30000,
});

// Intercepteur de requête pour ajouter le token d'authentification
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    
    // Ajout du token d'authentification s'il existe
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log de la requête
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url ? `${config.baseURL}${config.url}` : 'unknown';
    
    console.groupCollapsed(`%cAPI ${method} ${url}`, 'color: #4CAF50; font-weight: bold');
    console.log('Headers:', config.headers);
    if (config.data) {
      console.log('Data:', config.data);
    }
    console.groupEnd();
    
    return config;
  },
  (error: AxiosError) => {
    console.error('Erreur de configuration de la requête:', {
      message: error.message,
      config: error.config,
    });
    return Promise.reject(error);
  }
);

// Intercepteur de réponse pour la gestion des erreurs
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log de la réponse
    console.groupCollapsed(
      `%cAPI Response ${response.status} ${response.config.url}`,
      `color: ${response.status >= 200 && response.status < 300 ? '#4CAF50' : '#FF9800'};
      font-weight: bold`
    );
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', response.headers);
    console.log('Data:', response.data);
    console.groupEnd();
    
    return response;
  },
  async (error: AxiosError) => {
    // Log de l'erreur
    if (error.response) {
      console.groupCollapsed(
        `%cAPI Error ${error.response.status} ${error.config?.url}`,
        'color: #F44336; font-weight: bold'
      );
      console.log('Status:', error.response.status, error.response.statusText);
      console.log('Headers:', error.response.headers);
      console.log('Data:', error.response.data);
      console.log('Request Config:', error.config);
      console.groupEnd();
    } else if (error.request) {
      console.error('Aucune réponse reçue du serveur:', error.request);
    } else {
      console.error('Erreur lors de la configuration de la requête:', error.message);
    }
    const url = error.config?.url || 'unknown';
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      url: url,
    });

    
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Ne pas intercepter les erreurs 404 pour les requêtes de rafraîchissement de token
    if (url.includes('/auth/token/refresh/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        console.log('Attempting to refresh token...');

        // Créer une instance d'axios sans intercepteur pour éviter la boucle infinie
        const refreshClient = axios.create({
          baseURL: API_BASE_URL,
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
          timeout: 10000,
        });

        const response = await refreshClient.post('/auth/token/refresh/', {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);
        console.log('Token refreshed successfully');

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Ne pas rediriger automatiquement, laisser le composant gérer la déconnexion
        return Promise.reject(refreshError);
      }
    }

    // Ne pas rediriger automatiquement pour les autres erreurs
    return Promise.reject(error);
  }
);

export default api;