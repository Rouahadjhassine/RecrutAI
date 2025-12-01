// src/components/Auth/Register.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RegisterFormData } from '../../types';
import { Briefcase } from 'lucide-react';

const Register: React.FC<{ onRegisterSuccess: (role: string) => void }> = ({ onRegisterSuccess }) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    password2: '',
    role: 'candidat',
    first_name: '',
    last_name: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, error, authErrors } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur du champ lorsqu'il est modifié
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      errors.username = "Le nom d'utilisateur est requis";
    }
    
    if (!formData.first_name.trim()) {
      errors.first_name = 'Le prénom est requis';
    }
    
    if (!formData.last_name.trim()) {
      errors.last_name = 'Le nom est requis';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Veuillez entrer un email valide';
    }
    
    if (!formData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    
    if (formData.password !== formData.password2) {
      errors.password2 = 'Les mots de passe ne correspondent pas';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('Le formulaire contient des erreurs de validation');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Soumission du formulaire d\'inscription...');
      await register(formData);
      console.log('Inscription réussie, redirection...');
      onRegisterSuccess(formData.role);
      
      // Redirection en fonction du rôle
      if (formData.role === 'candidat') {
        navigate('/candidat/dashboard');
      } else {
        navigate('/recruteur/dashboard');
      }
    } catch (err) {
      console.error('Erreur lors de l\'inscription:', err);
      // Les erreurs sont déjà gérées dans le hook useAuth
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction utilitaire pour afficher les erreurs
  const renderError = (field: string) => {
    const errorMessage = formErrors[field] || authErrors[field];
    return errorMessage ? (
      <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
    ) : null;
  };

  // Gestion des erreurs globales
  const renderGlobalError = () => {
    if (!error) return null;
    
    return (
      <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
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
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Créer un compte
          </h2>
        
          {renderGlobalError()}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Je m'inscris en tant que
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="candidat">Candidat</option>
                <option value="recruteur">Recruteur</option>
              </select>
            </div>
              
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border ${
                    formErrors.first_name || authErrors.first_name 
                      ? 'border-red-300' 
                      : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  placeholder="Prénom"
                />
                {renderError('first_name')}
              </div>
              
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border ${
                    formErrors.last_name || authErrors.last_name 
                      ? 'border-red-300' 
                      : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  placeholder="Nom"
                />
                {renderError('last_name')}
              </div>
            </div>
              
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">Nom d'utilisateur</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className={`w-full px-4 py-2 border ${
                  formErrors.username || authErrors.username 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="Nom d'utilisateur"
              />
              {renderError('username')}
            </div>
              
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 border ${
                  formErrors.email || authErrors.email 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="votre@email.com"
              />
              {renderError('email')}
            </div>
              
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-2 border ${
                  formErrors.password || authErrors.password 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="••••••••"
              />
              {renderError('password')}
            </div>
              
            <div className="mb-6">
              <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
              <input
                id="password2"
                name="password2"
                type="password"
                required
                value={formData.password2}
                onChange={handleChange}
                className={`w-full px-4 py-2 border ${
                  formErrors.password2 || authErrors.password2 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="••••••••"
              />
              {renderError('password2')}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 px-6 rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Inscription en cours...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  S'inscrire
                </span>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Déjà un compte ?</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full bg-transparent border-2 border-blue-600 text-blue-600 py-2.5 px-6 rounded-lg font-semibold hover:bg-blue-50 hover:border-blue-700 hover:text-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
              </svg>
              Se connecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;