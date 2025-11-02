// src/services/api.ts
import axios, { 
  AxiosError, 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosProgressEvent 
} from 'axios';
import { AuthResponse } from '../types';

interface UploadFileConfig extends AxiosRequestConfig {
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}

// Ensure the API base URL is properly formatted
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Méode pour uploader des fichiers
api.uploadFile = async function<T = any>(
  url: string,
  file: File,
  config?: UploadFileConfig
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await this.post<T>(url, formData, {
    ...config,
    headers: {
      ...config?.headers,
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer le rafraîchissement du token
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          // Rediriger vers la page de connexion
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        return api(originalRequest);
      } catch (error) {
        // En cas d'erreur de rafraîchissement du token, déconnecter l'utilisateur
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

declare module 'axios' {
  interface AxiosInstance {
    uploadFile<T = any>(
      url: string,
      file: File,
      config?: UploadFileConfig
    ): Promise<T>;
  }
}

export default api;