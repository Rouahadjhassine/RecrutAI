// ============================================
// FILE: src/hooks/useAuth.ts
// ============================================

import { useState, useEffect } from 'react';
import { User, RegisterFormData, UserRole } from '../types';
import { authService } from '../services/authService';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterFormData) => Promise<User>;
  logout: () => void;
  setError: (error: string) => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fonction pour normaliser le rôle de l'utilisateur
  const normalizeUserRole = (user: User | null): User | null => {
    if (!user) return null;
    
    let normalizedRole: UserRole = 'candidat';
    if (user.role) {
      const roleStr = String(user.role).toLowerCase().trim();
      if (['candidat', 'recruteur'].includes(roleStr)) {
        normalizedRole = roleStr as UserRole;
      } else {
        console.warn(`Rôle invalide '${user.role}' détecté, utilisation de 'candidat' par défaut`);
      }
    }
    
    return { ...user, role: normalizedRole };
  };

  // Initialisation de l'authentification au chargement du composant
  useEffect(() => {
    const initAuth = async () => {
      console.log('Initialisation de l\'authentification...');
      const isAuthenticated = authService.isAuthenticated();
      console.log('Est authentifié ?', isAuthenticated);
      
      if (isAuthenticated) {
        try {
          console.log('Récupération des informations de l\'utilisateur...');
          const currentUser = await authService.getCurrentUser();
          
          if (currentUser) {
            const normalizedUser = normalizeUserRole(currentUser);
            console.log('Utilisateur récupéré avec rôle:', normalizedUser?.role);
            // Forcer la mise à jour de l'état utilisateur
            setUser(prevUser => {
              console.log('Mise à jour de l\'utilisateur dans le state:', normalizedUser);
              return normalizedUser;
            });
          } else {
            console.log('Aucun utilisateur trouvé malgré l\'authentification, déconnexion...');
            authService.logout();
            setUser(null);
          }
        } catch (err) {
          console.error('Erreur lors de la récupération de l\'utilisateur:', err);
          setError('Échec de la récupération de l\'utilisateur');
          authService.logout();
          setUser(null);
        }
      } else {
        console.log('Aucun utilisateur connecté');
        setUser(null);
      }
      setLoading(false);
    };

    // Appel initial
    initAuth();

    // Écouter les changements d'authentification
    const handleStorageChange = () => {
      console.log('Changement détecté dans le stockage local, mise à jour de l\'état...');
      initAuth();
    };

    // S'abonner aux changements de stockage local
    window.addEventListener('storage', handleStorageChange);

    // Nettoyage
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fonction de connexion
  const login = async (email: string, password: string): Promise<User> => {
    console.log('Tentative de connexion avec:', email);
    setLoading(true);
    setError('');
    
    try {
      // Appel au service d'authentification
      const { user } = await authService.login({ email, password });
      
      if (!user) {
        throw new Error('Aucun utilisateur retourné après connexion');
      }
      
      console.log('Utilisateur connecté avec succès:', user);
      
      // Normaliser et mettre à jour l'utilisateur
      const normalizedUser = normalizeUserRole(user);
      if (!normalizedUser) {
        throw new Error('Échec de la normalisation des données utilisateur');
      }
      
      // Mise à jour explicite de l'état utilisateur
      console.log('Mise à jour de l\'utilisateur après connexion:', normalizedUser);
      setUser(prevUser => {
        console.log('Ancien état utilisateur:', prevUser);
        console.log('Nouvel état utilisateur:', normalizedUser);
        return normalizedUser;
      });
      
      // S'assurer que le localStorage est à jour
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      
      return normalizedUser;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Échec de la connexion';
      console.error('Erreur de connexion:', errorMessage, err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fonction d'inscription
  const register = async (data: RegisterFormData): Promise<User> => {
    setLoading(true);
    setError('');
    
    try {
      const { user } = await authService.register(data);
      
      if (!user) {
        throw new Error('Aucun utilisateur retourné après inscription');
      }
      
      // Normaliser et mettre à jour l'utilisateur
      const normalizedUser = normalizeUserRole(user);
      if (!normalizedUser) {
        throw new Error('Échec de la normalisation des données utilisateur après inscription');
      }
      
      setUser(normalizedUser);
      return normalizedUser;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Échec de l\'inscription';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = (): void => {
    authService.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    setError,
  };
}
