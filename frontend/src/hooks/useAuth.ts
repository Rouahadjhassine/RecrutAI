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
        if (authService.isAuthenticated()) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error('Failed to load user', err);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      // On ne stocke pas le user de la réponse car on va le récupérer avec getCurrentUser
      await authService.login({ email, password });
      // Forcer une mise à jour de l'état utilisateur avec un délai
      await new Promise(resolve => setTimeout(resolve, 100));
      const currentUser = await authService.getCurrentUser();
      
      // S'assurer que l'utilisateur est bien défini
      if (!currentUser) {
        throw new Error('Impossible de récupérer les informations utilisateur');
      }
      
      // Mettre à jour l'état utilisateur
      setUser(currentUser);
      
      return currentUser;
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