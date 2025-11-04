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
    const initializeAuth = async () => {
      try {
        setLoading(true);
        await authService.initialize();
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
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
      setUser(result.user);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Une erreur est survenue';
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
    authService.logout();
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