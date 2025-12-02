// src/components/Dashboard/CandidatDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, FileSearch } from 'lucide-react';
import { User } from '../../types';
import Navbar from '../Layout/Navbar';

interface Props {
  user: User & { username?: string };
  onLogout: () => void;
}

const CandidatDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={onLogout} role="candidat" />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-4 text-center">
          Bonjour, {user.first_name || user.username || 'Utilisateur'} !
        </h1>

        <p className="text-xl text-white/90 text-center mb-12">
          Que souhaitez-vous faire aujourd'hui ?
        </p>

        {/* Grille de boutons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bouton Analyse de CV */}
          <button
            onClick={() => navigate('/candidat/analyze')}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
          >
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <FileSearch className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Analyser un CV</h2>
            <p className="text-gray-600 text-center">
              Analysez votre CV avec une offre d'emploi pour évaluer votre adéquation
            </p>
          </button>

          {/* Bouton Historique */}
          <button
            onClick={() => navigate('/candidat/history')}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
          >
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <History className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Historique</h2>
            <p className="text-gray-600 text-center">
              Consultez vos analyses précédentes et vos statistiques
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidatDashboard;