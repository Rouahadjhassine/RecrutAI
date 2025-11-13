// src/components/Auth/Login.tsx
import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

interface LoginProps {
  onLoginSuccess?: (role: 'candidat' | 'recruteur') => void;
  onShowRegister?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onShowRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  // La navigation est maintenant gérée via window.location.href

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      const role = user.role as 'candidat' | 'recruteur';
      
      // Attendre que l'état soit mis à jour
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Vérifier à nouveau l'état d'authentification
      const isAuthenticated = authService.isAuthenticated();
      console.log('Login - isAuthenticated after login:', isAuthenticated);
      
      // Appeler le callback de succès si fourni
      if (onLoginSuccess) {
        onLoginSuccess(role);
      }
      
      // Forcer un rechargement complet de la page pour s'assurer que tout est bien initialisé
      const redirectPath = role === 'candidat' ? '/candidat/dashboard' : '/recruteur/dashboard';
      console.log('Redirecting to:', redirectPath);
      window.location.href = redirectPath;
    } catch (err) {
      console.error('Échec de la connexion:', err);
      // L'erreur est déjà gérée par le hook useAuth
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <Briefcase className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-white">RecrutAI</h1>
          <p className="text-blue-100 mt-2">IA pour le recrutement</p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="votre@email.com"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          
          {onShowRegister && (
            <div className="mt-6 text-center">
              <button 
                onClick={onShowRegister} 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Créer un compte
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};