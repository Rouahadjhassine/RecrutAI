import React from 'react';
import { Users, Briefcase, Mail } from 'lucide-react';
import { User } from '../../types';

interface RecruteurDashboardProps {
  user: User;
}

export const RecruteurDashboard: React.FC<RecruteurDashboardProps> = ({ user }) => {
  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-8 mb-8">
        <h1 className="text-3xl font-bold mb-2">Tableau de bord RH</h1>
        <p className="text-purple-100">Trouvez les meilleurs candidats</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <Users className="w-8 h-8 text-purple-600 mb-2" />
          <p className="text-gray-600 text-sm">Candidats en attente</p>
          <p className="text-2xl font-bold text-gray-800">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <Briefcase className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-gray-600 text-sm">Offres actives</p>
          <p className="text-2xl font-bold text-gray-800">3</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <Mail className="w-8 h-8 text-green-600 mb-2" />
          <p className="text-gray-600 text-sm">Emails envoyés</p>
          <p className="text-2xl font-bold text-gray-800">0</p>
        </div>
      </div>
    </div>
  );
};