// src/components/Auth/Register.tsx
import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface RegisterProps {
  onRegisterSuccess: (role: 'candidat' | 'recruteur') => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
  const [role, setRole] = useState<'candidat' | 'recruteur'>('candidat');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormErrors({});
    
    const errors: Record<string, string> = {};
    
    if (!firstName.trim()) errors.firstName = 'Le prénom est requis';
    if (!lastName.trim()) errors.lastName = 'Le nom est requis';
    if (!email.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Veuillez entrer un email valide';
    }
    if (!password) {
      errors.password = 'Le mot de passe est requis';
    } else if (password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      await register({
        email,
        password,
        role,
        first_name: firstName,
        last_name: lastName
      });
      
      onRegisterSuccess(role);
      
      // Navigation selon le rôle
      if (role === 'candidat') {
        navigate('/candidat/dashboard');
      } else {
        navigate('/recruteur/dashboard');
      }
    } catch (err) {
      console.error('Erreur lors de l\'inscription:', err);
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
          <p className="text-blue-100 mt-2">Créer un compte</p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setRole('candidat')}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                role === 'candidat' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Candidat
            </button>
            <button
              onClick={() => setRole('recruteur')}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                role === 'recruteur' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Recruteur
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (formErrors.firstName) setFormErrors({...formErrors, firstName: ''});
                }}
                className={`w-full px-4 py-2 border ${formErrors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="Votre prénom"
              />
              {formErrors.firstName && (
                <p className="mt-1 text-sm text-red-600">{formErrors.firstName}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (formErrors.lastName) setFormErrors({...formErrors, lastName: ''});
                }}
                className={`w-full px-4 py-2 border ${formErrors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="Votre nom"
              />
              {formErrors.lastName && (
                <p className="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formErrors.email) setFormErrors({...formErrors, email: ''});
                }}
                className={`w-full px-4 py-2 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="votre@email.com"
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formErrors.password) setFormErrors({...formErrors, password: ''});
                }}
                className={`w-full px-4 py-2 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                placeholder="••••••••"
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
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
              {loading ? 'Inscription...' : "S'inscrire"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};