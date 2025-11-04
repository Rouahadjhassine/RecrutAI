// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ user: User }>;
  register: (userData: any) => Promise<{ user: User }>;
  logout: () => void;
  isAuthenticated: boolean;
  initialized: boolean;
}

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize with user from localStorage if available
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        if (isMounted) setLoading(true);
        
        console.log('Initialisation de l\'authentification...');
        const user = await authService.initialize();
        
        if (isMounted) {
          setUser(user);
          setError(null);
        }
      } catch (err) {
        console.error('Échec de l\'initialisation de l\'authentification:', err);
        if (isMounted) {
          setError('Impossible de charger l\'état d\'authentification');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // S'abonner aux changements d'état d'authentification
    const unsubscribe = authService.onAuthStateChanged((currentUser) => {
      console.log('Changement d\'état d\'authentification détecté:', currentUser);
      if (isMounted) {
        setUser(currentUser);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Helper to handle auth operations with loading and error states
  const executeAuthOperation = async (
    operation: () => Promise<{ user: User }>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      // Ne pas mettre à jour l'état ici car cela sera géré par l'écouteur d'état
      // Le setUser est déjà géré par l'écouteur d'état dans le useEffect
      return result;
    } catch (err: any) {
      console.error('Erreur lors de l\'opération d\'authentification:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Une erreur est survenue';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    return executeAuthOperation(() => 
      authService.login({ email, password })
    );
  };

  const register = async (userData: any) => {
    return executeAuthOperation(() => 
      authService.register(userData)
    );
  };

  const logout = () => {
    try {
      console.log('Déconnexion en cours...');
      authService.logout();
      // Le setUser sera effectué par l'écouteur d'état
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      setError('Erreur lors de la déconnexion');
    }
  };

  return {
    user,
    loading: loading || !initialized,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    initialized
  };
}