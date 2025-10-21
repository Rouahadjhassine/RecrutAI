import React from 'react';
import { FileText, Briefcase, Check } from 'lucide-react';
import { User } from '../../types';

interface CandidatDashboardProps {
  user: User;
}

export const CandidatDashboard: React.FC<CandidatDashboardProps> = ({ user }) => {
  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-8 mb-8">
        <h1 className="text-3xl font-bold mb-2">Bienvenue, {user.first_name}! 👋</h1>
        <p className="text-blue-100">Analysez vos compatibilités avec les offres d'emploi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <FileText className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-gray-600 text-sm">CV uploadé</p>
          <p className="text-2xl font-bold text-gray-800">1</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <Briefcase className="w-8 h-8 text-green-600 mb-2" />
          <p className="text-gray-600 text-sm">Offres analysées</p>
          <p className="text-2xl font-bold text-gray-800">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <Check className="w-8 h-8 text-purple-600 mb-2" />
          <p className="text-gray-600 text-sm">Compatibilité moyenne</p>
          <p className="text-2xl font-bold text-gray-800">0%</p>
        </div>
      </div>
    </div>
  );
};