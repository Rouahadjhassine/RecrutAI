// src/pages/HistoryPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import AnalysisResultCard from '../components/CV/AnalysisResultCard';
import { User } from '../types';
import { cvService } from '../services/cvService';

export default function HistoryPage({ user }: { user: User | null }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Charger l'historique uniquement si l'utilisateur est connecté
    cvService.getHistory().then(res => {
      setHistory(res);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [user, navigate]);

  if (!user) {
    return null; // ou un composant de chargement
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={() => {}} role={user.role} />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Historique des analyses
        </h2>

        {loading ? (
          <div className="bg-white rounded-xl shadow-2xl p-12 text-center">
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-xl shadow-2xl p-12 text-center">
            <p className="text-gray-600">Aucune analyse effectuée</p>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((item, i) => (
              <AnalysisResultCard key={i} result={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}