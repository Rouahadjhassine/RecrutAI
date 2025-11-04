// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('useAuth - Vérification de l\'authentification...');
        const isAuth = authService.isAuthenticated();
        console.log('useAuth - Utilisateur authentifié ?', isAuth);
        
        if (isAuth) {
          console.log('useAuth - Récupération des données utilisateur...');
          const userData = await authService.getCurrentUser();
          console.log('useAuth - Données utilisateur récupérées:', userData);
          setUser(userData);
        } else {
          console.log('useAuth - Aucun utilisateur connecté');
        }
      } catch (err) {
        console.error('useAuth - Échec du chargement de l\'utilisateur:', err);
        authService.logout();
      } finally {
        console.log('useAuth - Fin du chargement');
        setLoading(false);
      }
    };

    console.log('useAuth - Démarrage du chargement de l\'utilisateur');
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const { user } = await authService.login({ email, password });
      setUser(user);
      return user;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Échec de la connexion';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any) => {
    setError(null);
    setLoading(true);
    try {
      const { user } = await authService.register(userData);
      setUser(user);
      return user;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Échec de l\'inscription';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const clearError = () => setError(null);

  return { 
    user, 
    loading, 
    error, 
    login, 
    logout, 
    register,
    clearError 
  };
};