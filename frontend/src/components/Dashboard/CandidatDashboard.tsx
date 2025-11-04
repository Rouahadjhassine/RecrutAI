// src/components/Dashboard/CandidatDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, History } from 'lucide-react';
import Navbar from '../Layout/Navbar';
import { User } from '../../types';

interface Props {
  user: User;
  onLogout: () => void;
  loading: boolean;
}

const CandidatDashboard: React.FC<Props> = ({ user, onLogout, loading }) => {
  const navigate = useNavigate();

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={onLogout} role="candidat" />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-2">
            Bienvenue, {user?.first_name || 'utilisateur'} !
          </h2>
          <p className="text-blue-100 text-lg">
            Analysez votre CV et boostez vos chances
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div
            onClick={() => navigate('/candidat/analyze')}
            className="bg-white rounded-xl shadow-2xl p-8 text-center cursor-pointer transform hover:scale-105 transition duration-300"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Analyser mon CV</h3>
            <p className="text-gray-600">Upload + Offre → Score IA instantané</p>
          </div>

          <div
            onClick={() => navigate('/history')}
            className="bg-white rounded-xl shadow-2xl p-8 text-center cursor-pointer transform hover:scale-105 transition duration-300"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Historique</h3>
            <p className="text-gray-600">Toutes mes analyses passées</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatDashboard;