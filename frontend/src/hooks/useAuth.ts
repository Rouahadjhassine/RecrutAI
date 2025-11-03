// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { user } = await authService.login({ email, password });
      setUser(user);
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      throw err;
    }
  };

  const register = async (userData: any) => {
    setError(null);
    try {
      const { user } = await authService.register(userData);
      setUser(user);
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
      throw err;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return { user, loading, error, login, logout, register };
};