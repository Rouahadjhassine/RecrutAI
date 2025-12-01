// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { User, LoginFormData, RegisterFormData } from '../types';

type ApiError = {
  username?: string[];
  email?: string[];
  password?: string[];
  non_field_errors?: string[];
  detail?: string;
  [key: string]: any;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authErrors, setAuthErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          console.log('Utilisateur chargé depuis le stockage local:', currentUser);
          setUser(currentUser);
        } else {
          console.log('Aucun utilisateur connecté trouvé');
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'utilisateur:', err);
        setError('Impossible de charger les informations de l\'utilisateur');
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Écouter les changements d'état d'authentification
    const unsubscribe = authService.onAuthStateChanged((updatedUser) => {
      console.log('Changement d\'état d\'authentification détecté:', updatedUser);
      setUser(updatedUser);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const login = useCallback(async (credentials: LoginFormData) => {
    try {
      setError(null);
      setAuthErrors({});
      console.log('Tentative de connexion avec les identifiants:', {
        ...credentials,
        password: '***'
      });
      
      const { user } = await authService.login(credentials);
      console.log('Connexion réussie, utilisateur:', user);
      setUser(user);
      return user;
    } catch (err: any) {
      console.error('Erreur de connexion:', {
        message: err.message,
        response: err.response?.data,
      });
      
      // Gestion des erreurs spécifiques
      const errorMessage = err.response?.data?.detail || 
                         err.response?.data?.error ||
                         err.message || 
                         'Échec de la connexion. Veuillez réessayer.';
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const register = useCallback(async (userData: RegisterFormData) => {
    try {
      setError(null);
      setAuthErrors({});
      console.log('Tentative d\'inscription avec les données:', {
        ...userData,
        password: '***',
        password2: '***'
      });
      
      const { user } = await authService.register(userData);
      console.log('Inscription réussie, utilisateur:', user);
      setUser(user);
      return user;
    } catch (err: any) {
      console.error('Erreur d\'inscription:', {
        message: err.message,
        response: err.response?.data,
      });
      
      // Réinitialiser les erreurs précédentes
      const newErrors: Record<string, string> = {};
      
      // Si c'est une erreur de validation (400)
      if (err.response?.status === 400) {
        const errorData: ApiError = err.response.data;
        
        // Extraire les messages d'erreur du backend
        Object.keys(errorData).forEach((key) => {
          if (Array.isArray(errorData[key])) {
            newErrors[key] = errorData[key]?.join(' ') || '';
          } else if (typeof errorData[key] === 'string') {
            newErrors[key] = errorData[key] as string;
          }
        });
        
        // Si nous n'avons pas de champs spécifiques, utiliser le message d'erreur général
        if (Object.keys(newErrors).length === 0 && errorData.detail) {
          setError(errorData.detail);
        } else {
          setAuthErrors(newErrors);
        }
      } 
      // Erreur réseau
      else if (err.message === 'Network Error') {
        setError('Impossible de se connecter au serveur. Vérifiez votre connexion Internet.');
      }
      // Erreur serveur
      else if (err.response?.status >= 500) {
        setError('Une erreur est survenue sur le serveur. Veuillez réessayer plus tard.');
      }
      // Autres erreurs
      else {
        const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.error ||
                           err.message || 
                           'Échec de l\'inscription. Veuillez réessayer.';
        setError(errorMessage);
      }
      
      // Propager l'erreur pour permettre une gestion supplémentaire dans le composant
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    console.log('Déconnexion de l\'utilisateur');
    authService.logout();
    setUser(null);
    setError(null);
    setAuthErrors({});
    navigate('/login');
  }, [navigate]);

  return {
    user,
    loading,
    error,
    authErrors,
    login,
    register,
    logout,
    setError,
  };
};