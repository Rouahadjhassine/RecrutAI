// src/components/Dashboard/RecruteurDashboard.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, History, Loader2 } from 'lucide-react';
import Navbar from '../Layout/Navbar';
import { User } from '../../types';

interface Props {
  user: User | null;
  onLogout: () => void;
  loading: boolean;
}

const RecruteurDashboard: React.FC<Props> = ({ user, onLogout, loading }) => {
  const navigate = useNavigate();

  // Redirect if user is not authenticated
  useEffect(() => {
    // Only redirect if we're not loading and there's no user
    if (!loading && !user) {
      console.log('RecruteurDashboard: Redirection vers /login');
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading state while checking authentication
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <Navbar user={user} onLogout={onLogout} role="recruteur" />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-2">
            Bienvenue, {user.first_name || 'recruteur'} !
          </h2>
          <p className="text-purple-100 text-lg">
            Trouvez les meilleurs talents en un clic
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div
            onClick={() => navigate('/rank')}
            className="bg-white rounded-xl shadow-2xl p-8 text-center cursor-pointer transform hover:scale-105 transition duration-300"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Classement IA</h3>
            <p className="text-gray-600">CVs triés par pertinence</p>
          </div>

          <div
            onClick={() => navigate('/history')}
            className="bg-white rounded-xl shadow-2xl p-8 text-center cursor-pointer transform hover:scale-105 transition duration-300"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Historique</h3>
            <p className="text-gray-600">Toutes les analyses effectuées</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruteurDashboard;